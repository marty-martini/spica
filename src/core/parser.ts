import { createHash } from "node:crypto";
import type { AuditEntry, ParseResult, SkippedEntry, TraceEvent, TraceEventType } from "./types.js";

const FIELD_NAMES = ["Timestamp", "User Input", "AI Response", "Context"] as const;
type FieldName = (typeof FIELD_NAMES)[number];

const ISO_8601_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?$/;

function isIsoTimestamp(value: string): boolean {
  return ISO_8601_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
}

function stripFieldValue(raw: string): string {
  return raw.replace(/^\*\*[^*]+\*\*:\s*/, "").trim();
}

/** audit.md の生テキストを `## ` 見出し単位のブロックに分割する */
function splitIntoBlocks(markdown: string): { heading: string; body: string }[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: { heading: string; body: string[] }[] = [];

  for (const line of lines) {
    const headingMatch = /^##\s+(.+)$/.exec(line);
    if (headingMatch) {
      blocks.push({ heading: headingMatch[1].trim(), body: [] });
      continue;
    }
    if (blocks.length > 0) {
      blocks[blocks.length - 1].body.push(line);
    }
  }

  return blocks.map((b) => ({ heading: b.heading, body: b.body.join("\n") }));
}

const KNOWN_FIELD_NAMES = new Set<string>(FIELD_NAMES);

/**
 * ブロック本文からフィールド(Timestamp/User Input/AI Response/Context)を抽出する。
 * 境界検出には**任意**のボールド見出し(`**Xxx**:`)を用いる。AI-DLC 公式ルールはステージ種別によって
 * Build Status / Test Status / Files Generated 等、既知4フィールド以外のボールド見出しも使うため、
 * これらを境界として認識しないと次フィールドの値が前フィールドの値に飲み込まれてしまう。
 */
function extractFields(body: string): Partial<Record<FieldName, string>> {
  const boundaryPattern = /\*\*([^*]+)\*\*:/g;
  const matches = [...body.matchAll(boundaryPattern)];
  const result: Partial<Record<FieldName, string>> = {};

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const fieldName = match[1].trim();
    if (!KNOWN_FIELD_NAMES.has(fieldName)) continue;

    const start = match.index! + match[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : body.indexOf("\n---", start) >= 0 ? body.indexOf("\n---", start) : body.length;
    const value = stripFieldValue(body.slice(start, end < 0 ? undefined : end));
    result[fieldName as FieldName] = value;
  }

  return result;
}

/** audit.md の生テキストをエントリ列に分解する */
export function parseAuditMarkdown(markdown: string): { entries: AuditEntry[]; skipped: SkippedEntry[] } {
  const blocks = splitIntoBlocks(markdown);
  const entries: AuditEntry[] = [];
  const skipped: SkippedEntry[] = [];

  blocks.forEach((block, order) => {
    const fields = extractFields(block.body);
    const timestampRaw = fields["Timestamp"];

    if (!timestampRaw || !isIsoTimestamp(timestampRaw)) {
      skipped.push({
        heading: block.heading,
        reason: !timestampRaw ? "Timestamp フィールドが見つからない" : `Timestamp が ISO 8601 として解釈できない: "${timestampRaw}"`,
      });
      return;
    }

    const userInputRaw = fields["User Input"] ?? null;
    const userInput = userInputRaw === null || userInputRaw.startsWith("(なし") ? null : userInputRaw;

    entries.push({
      heading: block.heading,
      timestamp: timestampRaw,
      userInput,
      aiResponse: fields["AI Response"] ?? null,
      context: fields["Context"] ?? null,
      order,
    });
  });

  return { entries, skipped };
}

/** 優先順位付きキーワード分類ルール(1. 差し戻し 2. プロンプト提示 3. 承認 4. 完了 5. 開始 6. ユーザー入力 7. unknown) */
const CLASSIFICATION_RULES: { type: TraceEventType; keywords: string[] }[] = [
  { type: "gate-rework", keywords: ["差し戻し", "修正依頼", "変更依頼", "rework", "changes requested"] },
  { type: "gate-prompt", keywords: ["承認ゲート待ち", "承認プロンプト", "回答待ち", "承認待ち", "awaiting approval", "approval prompt"] },
  { type: "gate-approved", keywords: ["承認", "ゲート通過", "approved", "approval"] },
  { type: "stage-complete", keywords: ["完了", "complete", "completed"] },
  { type: "stage-start", keywords: ["開始", "起動", "start", "started"] },
];

function classify(entry: AuditEntry): { type: TraceEventType; unknownReason?: string } {
  const target = `${entry.heading} ${entry.context ?? ""}`.toLowerCase();

  for (const rule of CLASSIFICATION_RULES) {
    if (rule.keywords.some((k) => target.includes(k.toLowerCase()))) {
      return { type: rule.type };
    }
  }

  if (entry.userInput !== null) {
    return { type: "user-input" };
  }

  return {
    type: "unknown",
    unknownReason: "見出し・Context がどの分類キーワードにも一致しなかった",
  };
}

const STAGE_PATTERN = /(INCEPTION|CONSTRUCTION|OPERATIONS)\s*-\s*([^\n,、。→]+?)(?=\s*(?:承認|完了|開始|→|,|\(|$))/;

function extractStage(entry: AuditEntry): string | null {
  const target = `${entry.heading} ${entry.context ?? ""}`;
  const match = STAGE_PATTERN.exec(target);
  if (!match) return null;
  const stageName = match[2].trim();
  if (stageName.length === 0) return null;
  return `${match[1]} - ${stageName}`;
}

function generateId(timestamp: string, heading: string): string {
  return createHash("sha256").update(`${timestamp}\n${heading}`).digest("hex").slice(0, 16);
}

/** エントリ列を正規化イベントに変換する */
export function toTraceEvents(entries: AuditEntry[]): TraceEvent[] {
  return entries.map((entry) => {
    const { type, unknownReason } = classify(entry);
    return {
      id: generateId(entry.timestamp!, entry.heading),
      source: "audit-md",
      type,
      timestamp: entry.timestamp!,
      stage: extractStage(entry),
      heading: entry.heading,
      hasUserInput: entry.userInput !== null,
      order: entry.order,
      ...(unknownReason ? { unknownReason } : {}),
    };
  });
}

/** audit.md の生テキストをパースし正規化イベントを得る便宜関数 */
export function parseAuditLog(markdown: string): ParseResult {
  const { entries, skipped } = parseAuditMarkdown(markdown);
  return { events: toTraceEvents(entries), skipped };
}
