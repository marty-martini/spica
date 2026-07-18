import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildSummary, buildTimeline } from "../core/analyzer.js";
import { parseAuditLog } from "../core/parser.js";
import { appendEvents, loadEvents } from "../core/store.js";
import type { AppendResult, LoadResult, ParseResult, Summary, Timeline } from "../core/types.js";

export interface TraceResult {
  timeline: Timeline;
  summary: Summary;
  parseInfo: Pick<ParseResult, "skipped">;
  storeInfo: AppendResult & Pick<LoadResult, "skippedLines">;
}

export class AuditLogNotFoundError extends Error {
  constructor(public readonly auditPath: string) {
    super(`audit.md が見つかりません: ${auditPath}`);
  }
}

/** パース → 永続化 → 分析 の一連の流れを実行する */
export function runTrace(aidlcDocsPath: string): TraceResult {
  const auditPath = join(aidlcDocsPath, "audit.md");
  if (!existsSync(auditPath)) {
    throw new AuditLogNotFoundError(auditPath);
  }

  const markdown = readFileSync(auditPath, "utf-8");
  const parseResult = parseAuditLog(markdown);

  const storePath = join(aidlcDocsPath, "..", ".spica", "events.jsonl");
  const appendResult = appendEvents(storePath, parseResult.events);

  const { events: allEvents, skippedLines } = loadEvents(storePath);

  return {
    timeline: buildTimeline(allEvents),
    summary: buildSummary(allEvents),
    parseInfo: { skipped: parseResult.skipped },
    storeInfo: { ...appendResult, skippedLines },
  };
}
