import { describe, expect, it } from "vitest";
import { renderTimeline } from "../../src/cli/timeline-renderer.js";
import type { Digest } from "../../src/cli/digest.js";
import type { Timeline, TraceEvent } from "../../src/core/types.js";

const zeroDigest: Digest = { skippedEntries: 0, added: 0, duplicates: 0, skippedLines: 0 };

function makeEvent(overrides: Partial<TraceEvent> & Pick<TraceEvent, "id" | "timestamp" | "type">): TraceEvent {
  return {
    source: "audit-md",
    stage: null,
    heading: overrides.id,
    hasUserInput: false,
    order: 0,
    ...overrides,
  };
}

describe("renderTimeline", () => {
  it("イベントがない場合は「イベントなし」と表示する", () => {
    const output = renderTimeline({ items: [] }, zeroDigest);
    expect(output).toContain("イベントなし");
  });

  it("計測不能な承認待ちには理由を含めて表示する", () => {
    const timeline: Timeline = {
      items: [
        {
          event: makeEvent({ id: "prompt", timestamp: "2026-07-17T00:00:00Z", type: "gate-prompt" }),
          durationFromPrev: null,
          approvalWait: { measurable: false, waitMs: null, respondedBy: null, unmeasurableReason: "no-response-found" },
        },
      ],
    };
    const output = renderTimeline(timeline, zeroDigest);
    expect(output).toContain("計測不能");
    expect(output).toContain("no-response-found");
  });

  it("unknown イベントは unknownReason を表示する", () => {
    const timeline: Timeline = {
      items: [
        {
          event: makeEvent({ id: "u", timestamp: "2026-07-17T00:00:00Z", type: "unknown", unknownReason: "テスト理由" }),
          durationFromPrev: null,
          approvalWait: null,
        },
      ],
    };
    const output = renderTimeline(timeline, zeroDigest);
    expect(output).toContain("テスト理由");
  });

  it("スキップ詳細を末尾に一覧表示する", () => {
    const output = renderTimeline({ items: [] }, zeroDigest, [{ heading: "壊れたエントリ", reason: "Timestamp なし" }]);
    expect(output).toContain("壊れたエントリ");
    expect(output).toContain("Timestamp なし");
  });

  it("ダイジェストを先頭に表示する", () => {
    const digest: Digest = { skippedEntries: 2, added: 3, duplicates: 1, skippedLines: 0 };
    const output = renderTimeline({ items: [] }, digest);
    const lines = output.split("\n");
    expect(lines[0]).toContain("追記 3 件");
    expect(lines[0]).toContain("重複 1 件");
  });
});
