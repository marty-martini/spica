import { describe, expect, it } from "vitest";
import { parseAuditLog, parseAuditMarkdown, toTraceEvents } from "../../src/core/parser.js";

describe("parseAuditMarkdown", () => {
  it("正常系: 標準フォーマットのエントリを分類できるフィールドとともに抽出する", () => {
    const markdown = `# Audit Log

## Workspace Detection
**Timestamp**: 2026-07-16T14:27:38Z
**User Input**: (なし - 自動実行フェーズ)
**AI Response**: ワークスペースをスキャンした。
**Context**: INCEPTION - Workspace Detection 完了

---
`;
    const { entries, skipped } = parseAuditMarkdown(markdown);
    expect(skipped).toHaveLength(0);
    expect(entries).toHaveLength(1);
    expect(entries[0].heading).toBe("Workspace Detection");
    expect(entries[0].timestamp).toBe("2026-07-16T14:27:38Z");
    expect(entries[0].userInput).toBeNull();
    expect(entries[0].context).toBe("INCEPTION - Workspace Detection 完了");
  });

  it("スキップ系: Timestamp が欠落したエントリはスキップされ理由が記録される", () => {
    const markdown = `## 壊れたエントリ
**AI Response**: タイムスタンプがない
**Context**: 何か

---
`;
    const { entries, skipped } = parseAuditMarkdown(markdown);
    expect(entries).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].heading).toBe("壊れたエントリ");
    expect(skipped[0].reason).toContain("Timestamp");
  });

  it("スキップ系: Timestamp が ISO 8601 として解釈できない場合スキップされる", () => {
    const markdown = `## 不正な日時
**Timestamp**: not-a-date
**Context**: 何か

---
`;
    const { skipped } = parseAuditMarkdown(markdown);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toContain("ISO 8601");
  });

  it("既知の4フィールド以外のボールド見出し(Build Status 等)が続く場合でも Timestamp を正しく切り出す", () => {
    const markdown = `## Build and Test Stage
**Timestamp**: 2026-07-18T12:12:00Z
**Build Status**: Success
**Test Status**: Pass(40/40, typecheck OK)
**Files Generated**:
- build-instructions.md
**Context**: 受入基準5項目すべて満たすことを確認。

---
`;
    const { entries, skipped } = parseAuditMarkdown(markdown);
    expect(skipped).toHaveLength(0);
    expect(entries).toHaveLength(1);
    expect(entries[0].timestamp).toBe("2026-07-18T12:12:00Z");
    expect(entries[0].context).toBe("受入基準5項目すべて満たすことを確認。");
  });

  it("ユーザー入力があるエントリは userInput に本文を保持する", () => {
    const markdown = `## 承認
**Timestamp**: 2026-07-17T00:15:00Z
**User Input**: "承認します"
**AI Response**: 承認を記録した
**Context**: INCEPTION - Requirements Analysis 承認ゲート通過

---
`;
    const { entries } = parseAuditMarkdown(markdown);
    expect(entries[0].userInput).toBe('"承認します"');
  });
});

describe("toTraceEvents — イベント分類の優先順位", () => {
  const baseEntry = {
    aiResponse: null,
    userInput: null,
    order: 0,
  };

  it("差し戻しキーワードは承認より優先される", () => {
    const events = toTraceEvents([
      { ...baseEntry, heading: "差し戻し", timestamp: "2026-07-17T00:00:00Z", context: "承認ゲートで差し戻し・修正依頼" },
    ]);
    expect(events[0].type).toBe("gate-rework");
  });

  it("承認ゲート待ちは承認より優先される(誤マッチ防止)", () => {
    const events = toTraceEvents([
      { ...baseEntry, heading: "確認質問の提示", timestamp: "2026-07-17T00:00:00Z", context: "承認ゲート待ち" },
    ]);
    expect(events[0].type).toBe("gate-prompt");
  });

  it("承認は完了より優先される分類ルールの並びで判定される", () => {
    const events = toTraceEvents([
      { ...baseEntry, heading: "承認", timestamp: "2026-07-17T00:00:00Z", context: "要件承認を記録" },
    ]);
    expect(events[0].type).toBe("gate-approved");
  });

  it("完了キーワードは stage-complete に分類される", () => {
    const events = toTraceEvents([
      { ...baseEntry, heading: "Requirements Analysis 完了", timestamp: "2026-07-17T00:00:00Z", context: "INCEPTION - Requirements Analysis 完了" },
    ]);
    expect(events[0].type).toBe("stage-complete");
  });

  it("開始キーワードは stage-start に分類される", () => {
    const events = toTraceEvents([
      { ...baseEntry, heading: "Workspace Detection", timestamp: "2026-07-17T00:00:00Z", context: "ワークスペース検出を開始" },
    ]);
    expect(events[0].type).toBe("stage-start");
  });

  it("キーワードに一致せずユーザー入力がある場合は user-input に分類される", () => {
    const events = toTraceEvents([
      {
        ...baseEntry,
        heading: "自由記述",
        timestamp: "2026-07-17T00:00:00Z",
        context: "特に定型語を含まない文章",
        userInput: "何か書いた",
      },
    ]);
    expect(events[0].type).toBe("user-input");
  });

  it("どの分類キーワードにも一致せずユーザー入力もない場合は unknown になり理由が付与される", () => {
    const events = toTraceEvents([
      { ...baseEntry, heading: "分類不能", timestamp: "2026-07-17T00:00:00Z", context: "定型語を含まない自由記述" },
    ]);
    expect(events[0].type).toBe("unknown");
    expect(events[0].unknownReason).toBeDefined();
  });

  it("同一の timestamp + heading からは同じ決定的 ID が生成される(冪等性)", () => {
    const entry = { ...baseEntry, heading: "同一見出し", timestamp: "2026-07-17T00:00:00Z", context: null };
    const events1 = toTraceEvents([entry]);
    const events2 = toTraceEvents([entry]);
    expect(events1[0].id).toBe(events2[0].id);
  });

  it("Context からステージ名を抽出する", () => {
    const events = toTraceEvents([
      {
        ...baseEntry,
        heading: "Requirements Analysis 完了",
        timestamp: "2026-07-17T00:00:00Z",
        context: "INCEPTION - Requirements Analysis 完了",
      },
    ]);
    expect(events[0].stage).toBe("INCEPTION - Requirements Analysis");
  });
});

describe("parseAuditLog", () => {
  it("パースからイベント変換までを一貫して行う", () => {
    const markdown = `## テスト
**Timestamp**: 2026-07-17T00:00:00Z
**Context**: INCEPTION - Requirements Analysis 開始

---
`;
    const result = parseAuditLog(markdown);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe("stage-start");
    expect(result.skipped).toHaveLength(0);
  });
});
