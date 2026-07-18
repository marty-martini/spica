import pc from "picocolors";
import type { Summary } from "../core/types.js";
import { renderDigest, type Digest } from "./digest.js";

function formatDuration(ms: number | null): string {
  if (ms === null) return "-";
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h${minutes}m` : `${minutes}m`;
}

export function renderSummary(summary: Summary, digest: Digest): string {
  const lines: string[] = [];
  lines.push(renderDigest(digest));
  lines.push("");

  if (summary.stages.length === 0) {
    lines.push("イベントなし");
    return lines.join("\n");
  }

  lines.push(`全体所要時間: ${formatDuration(summary.totalDurationMs)}`);
  lines.push("");

  for (const stage of summary.stages) {
    const { measurable, unmeasurable, totalWaitMs } = stage.approvalWaits;
    const waitSummary =
      measurable + unmeasurable === 0
        ? "承認待ちなし"
        : `承認待ち計測可 ${measurable} 件(合計 ${formatDuration(totalWaitMs)}) / 計測不能 ${unmeasurable} 件`;

    lines.push(`${pc.bold(stage.stage)}  イベント ${stage.eventCount} 件  所要時間 ${formatDuration(stage.durationMs)}`);
    lines.push(`  ${waitSummary}`);
  }

  return lines.join("\n");
}
