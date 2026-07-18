import { describe, expect, it } from "vitest";
import { buildSummary, buildTimeline } from "../../src/core/analyzer.js";
import type { TraceEvent } from "../../src/core/types.js";

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

describe("buildTimeline", () => {
  it("区間所要時間(durationFromPrev)を計算する。先頭は null", () => {
    const events = [
      makeEvent({ id: "1", timestamp: "2026-07-17T00:00:00Z", type: "stage-start", order: 0 }),
      makeEvent({ id: "2", timestamp: "2026-07-17T00:10:00Z", type: "stage-complete", order: 1 }),
    ];
    const timeline = buildTimeline(events);
    expect(timeline.items[0].durationFromPrev).toBeNull();
    expect(timeline.items[1].durationFromPrev).toBe(10 * 60 * 1000);
  });

  it("承認待ちが計測可能な場合は waitMs を算出する", () => {
    const events = [
      makeEvent({ id: "prompt", timestamp: "2026-07-17T00:00:00Z", type: "gate-prompt", order: 0 }),
      makeEvent({ id: "response", timestamp: "2026-07-17T00:05:00Z", type: "user-input", hasUserInput: true, order: 1 }),
    ];
    const timeline = buildTimeline(events);
    const promptItem = timeline.items.find((i) => i.event.id === "prompt")!;
    expect(promptItem.approvalWait).toEqual({
      measurable: true,
      waitMs: 5 * 60 * 1000,
      respondedBy: "response",
    });
  });

  it("応答が見つからない場合は計測不能として理由付きで報告する", () => {
    const events = [makeEvent({ id: "prompt", timestamp: "2026-07-17T00:00:00Z", type: "gate-prompt", order: 0 })];
    const timeline = buildTimeline(events);
    expect(timeline.items[0].approvalWait).toEqual({
      measurable: false,
      waitMs: null,
      respondedBy: null,
      unmeasurableReason: "no-response-found",
    });
  });

  it("連続する複数の gate-prompt は同一の応答イベントを重複参照しない(1対1対応)", () => {
    const events = [
      makeEvent({ id: "prompt1", timestamp: "2026-07-17T00:00:00Z", type: "gate-prompt", order: 0 }),
      makeEvent({ id: "prompt2", timestamp: "2026-07-17T00:01:00Z", type: "gate-prompt", order: 1 }),
      makeEvent({ id: "response", timestamp: "2026-07-17T00:05:00Z", type: "user-input", hasUserInput: true, order: 2 }),
    ];
    const timeline = buildTimeline(events);
    const wait1 = timeline.items.find((i) => i.event.id === "prompt1")!.approvalWait!;
    const wait2 = timeline.items.find((i) => i.event.id === "prompt2")!.approvalWait!;

    expect(wait1.measurable).toBe(true);
    expect(wait1.respondedBy).toBe("response");
    expect(wait2.measurable).toBe(false);
    expect(wait2.unmeasurableReason).toBe("no-response-found");
  });

  it("gate-prompt 以外のイベントには approvalWait が設定されない", () => {
    const events = [makeEvent({ id: "1", timestamp: "2026-07-17T00:00:00Z", type: "stage-start", order: 0 })];
    const timeline = buildTimeline(events);
    expect(timeline.items[0].approvalWait).toBeNull();
  });

  it("timestamp 昇順・同時刻は order 昇順でソートされる", () => {
    const events = [
      makeEvent({ id: "b", timestamp: "2026-07-17T00:00:00Z", type: "stage-start", order: 1 }),
      makeEvent({ id: "a", timestamp: "2026-07-17T00:00:00Z", type: "stage-start", order: 0 }),
    ];
    const timeline = buildTimeline(events);
    expect(timeline.items.map((i) => i.event.id)).toEqual(["a", "b"]);
  });
});

describe("buildSummary", () => {
  it("ステージごとにイベント数・所要時間・承認待ちを集計する", () => {
    const events = [
      makeEvent({ id: "1", timestamp: "2026-07-17T00:00:00Z", type: "stage-start", stage: "INCEPTION - X", order: 0 }),
      makeEvent({ id: "2", timestamp: "2026-07-17T00:10:00Z", type: "gate-prompt", stage: "INCEPTION - X", order: 1 }),
      makeEvent({
        id: "3",
        timestamp: "2026-07-17T00:15:00Z",
        type: "user-input",
        hasUserInput: true,
        stage: "INCEPTION - X",
        order: 2,
      }),
    ];
    const summary = buildSummary(events);
    expect(summary.stages).toHaveLength(1);
    expect(summary.stages[0]).toMatchObject({
      stage: "INCEPTION - X",
      eventCount: 3,
      durationMs: 15 * 60 * 1000,
      approvalWaits: { measurable: 1, unmeasurable: 0, totalWaitMs: 5 * 60 * 1000 },
    });
  });

  it("stage が null のイベントは (不明) として集計される", () => {
    const events = [makeEvent({ id: "1", timestamp: "2026-07-17T00:00:00Z", type: "unknown", stage: null, order: 0 })];
    const summary = buildSummary(events);
    expect(summary.stages[0].stage).toBe("(不明)");
  });

  it("イベントが1件のステージは durationMs が null になる", () => {
    const events = [makeEvent({ id: "1", timestamp: "2026-07-17T00:00:00Z", type: "stage-start", stage: "X", order: 0 })];
    const summary = buildSummary(events);
    expect(summary.stages[0].durationMs).toBeNull();
  });

  it("全体の totalDurationMs は先頭〜末尾の経過時間", () => {
    const events = [
      makeEvent({ id: "1", timestamp: "2026-07-17T00:00:00Z", type: "stage-start", order: 0 }),
      makeEvent({ id: "2", timestamp: "2026-07-17T01:00:00Z", type: "stage-complete", order: 1 }),
    ];
    const summary = buildSummary(events);
    expect(summary.totalDurationMs).toBe(60 * 60 * 1000);
  });
});
