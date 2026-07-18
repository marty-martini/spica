import { describe, expect, it } from "vitest";
import { renderSummary } from "../../src/cli/summary-renderer.js";
import type { Digest } from "../../src/cli/digest.js";
import type { Summary } from "../../src/core/types.js";

const zeroDigest: Digest = { skippedEntries: 0, added: 0, duplicates: 0, skippedLines: 0 };

describe("renderSummary", () => {
  it("イベントがない場合は「イベントなし」と表示する", () => {
    const summary: Summary = { stages: [], totalDurationMs: null };
    const output = renderSummary(summary, zeroDigest);
    expect(output).toContain("イベントなし");
  });

  it("ステージごとにイベント数・所要時間・承認待ちを表示する", () => {
    const summary: Summary = {
      totalDurationMs: 3600000,
      stages: [
        {
          stage: "INCEPTION - Requirements Analysis",
          eventCount: 3,
          durationMs: 600000,
          approvalWaits: { measurable: 1, unmeasurable: 1, totalWaitMs: 300000 },
        },
      ],
    };
    const output = renderSummary(summary, zeroDigest);
    expect(output).toContain("INCEPTION - Requirements Analysis");
    expect(output).toContain("イベント 3 件");
    expect(output).toContain("計測可 1 件");
    expect(output).toContain("計測不能 1 件");
  });

  it("承認待ちが1件もないステージは「承認待ちなし」と表示する", () => {
    const summary: Summary = {
      totalDurationMs: null,
      stages: [
        {
          stage: "X",
          eventCount: 1,
          durationMs: null,
          approvalWaits: { measurable: 0, unmeasurable: 0, totalWaitMs: 0 },
        },
      ],
    };
    const output = renderSummary(summary, zeroDigest);
    expect(output).toContain("承認待ちなし");
  });
});
