import type { ApprovalWait, StageSummary, Summary, Timeline, TimelineItem, TraceEvent } from "./types.js";

function sortEvents(events: TraceEvent[]): TraceEvent[] {
  return [...events].sort((a, b) => {
    const tsCompare = Date.parse(a.timestamp) - Date.parse(b.timestamp);
    if (tsCompare !== 0) return tsCompare;
    return a.order - b.order;
  });
}

/** イベント列 → タイムライン(区間所要時間・承認待ちの計測可否を含む) */
export function buildTimeline(events: TraceEvent[]): Timeline {
  const sorted = sortEvents(events);
  const usedResponseIds = new Set<string>();

  const approvalWaitByEventId = new Map<string, ApprovalWait>();

  sorted.forEach((event, index) => {
    if (event.type !== "gate-prompt") return;

    let response: TraceEvent | undefined;
    for (let i = index + 1; i < sorted.length; i++) {
      const candidate = sorted[i];
      if (candidate.hasUserInput && !usedResponseIds.has(candidate.id)) {
        response = candidate;
        break;
      }
    }

    if (response) {
      usedResponseIds.add(response.id);
      approvalWaitByEventId.set(event.id, {
        measurable: true,
        waitMs: Date.parse(response.timestamp) - Date.parse(event.timestamp),
        respondedBy: response.id,
      });
    } else {
      approvalWaitByEventId.set(event.id, {
        measurable: false,
        waitMs: null,
        respondedBy: null,
        unmeasurableReason: "no-response-found",
      });
    }
  });

  const items: TimelineItem[] = sorted.map((event, index) => {
    const prev = index > 0 ? sorted[index - 1] : undefined;
    const durationFromPrev = prev ? Date.parse(event.timestamp) - Date.parse(prev.timestamp) : null;
    return {
      event,
      durationFromPrev,
      approvalWait: approvalWaitByEventId.get(event.id) ?? null,
    };
  });

  return { items };
}

/** イベント列 → セッション/ステージ別サマリー(セッション概念なし) */
export function buildSummary(events: TraceEvent[]): Summary {
  const sorted = sortEvents(events);
  const timeline = buildTimeline(events);
  const approvalWaitByEventId = new Map(timeline.items.map((item) => [item.event.id, item.approvalWait]));

  const stageOrder: string[] = [];
  const eventsByStage = new Map<string, TraceEvent[]>();

  for (const event of sorted) {
    const stage = event.stage ?? "(不明)";
    if (!eventsByStage.has(stage)) {
      eventsByStage.set(stage, []);
      stageOrder.push(stage);
    }
    eventsByStage.get(stage)!.push(event);
  }

  const stages: StageSummary[] = stageOrder.map((stage) => {
    const stageEvents = eventsByStage.get(stage)!;
    const first = stageEvents[0];
    const last = stageEvents[stageEvents.length - 1];
    const durationMs = stageEvents.length > 1 ? Date.parse(last.timestamp) - Date.parse(first.timestamp) : null;

    let measurable = 0;
    let unmeasurable = 0;
    let totalWaitMs = 0;

    for (const event of stageEvents) {
      const wait = approvalWaitByEventId.get(event.id);
      if (!wait) continue;
      if (wait.measurable) {
        measurable++;
        totalWaitMs += wait.waitMs ?? 0;
      } else {
        unmeasurable++;
      }
    }

    return {
      stage,
      eventCount: stageEvents.length,
      durationMs,
      approvalWaits: { measurable, unmeasurable, totalWaitMs },
    };
  });

  const totalDurationMs =
    sorted.length > 1 ? Date.parse(sorted[sorted.length - 1].timestamp) - Date.parse(sorted[0].timestamp) : null;

  return { stages, totalDurationMs };
}
