import pc from "picocolors";
import type { SkippedEntry, Timeline } from "../core/types.js";
import { renderDigest, type Digest } from "./digest.js";

function formatDuration(ms: number | null): string {
  if (ms === null) return "-";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m${seconds}s` : `${seconds}s`;
}

function formatLocalTime(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleString();
}

const TYPE_LABEL: Record<string, string> = {
  "stage-start": "開始",
  "stage-complete": "完了",
  "gate-prompt": "承認待ち提示",
  "gate-approved": "承認",
  "gate-rework": "差し戻し",
  "user-input": "入力",
  unknown: "不明",
};

export function renderTimeline(timeline: Timeline, digest: Digest, skipped: SkippedEntry[] = []): string {
  const lines: string[] = [];
  lines.push(renderDigest(digest));
  lines.push("");

  if (timeline.items.length === 0) {
    lines.push("イベントなし");
  }

  for (const item of timeline.items) {
    const { event } = item;
    const time = formatLocalTime(event.timestamp);
    const typeLabel = TYPE_LABEL[event.type] ?? event.type;
    const stage = event.stage ?? "(不明)";
    const duration = formatDuration(item.durationFromPrev);

    let line = `${time}  [${typeLabel}]  ${stage}  (経過 ${duration})  ${event.heading ?? ""}`;

    if (event.type === "unknown" && event.unknownReason) {
      line += pc.dim(`  ※ ${event.unknownReason}`);
    }

    if (item.approvalWait) {
      const wait = item.approvalWait;
      if (wait.measurable) {
        line += pc.cyan(`  承認待ち: ${formatDuration(wait.waitMs)}`);
      } else {
        line += pc.yellow(`  承認待ち: 計測不能(${wait.unmeasurableReason})`);
      }
    }

    lines.push(line);
  }

  if (skipped.length > 0) {
    lines.push("");
    lines.push(pc.yellow(`パース不能エントリ(${skipped.length} 件):`));
    for (const s of skipped) {
      lines.push(`  - ${s.heading}: ${s.reason}`);
    }
  }

  return lines.join("\n");
}
