import { existsSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import { dirname } from "node:path";
import type { AppendResult, LoadResult, TraceEvent } from "./types.js";

/** `.spica/events.jsonl` を読み込む(ファイル不在なら空)。壊れた行は読み飛ばして件数を報告する */
export function loadEvents(storePath: string): LoadResult {
  if (!existsSync(storePath)) {
    return { events: [], skippedLines: 0 };
  }

  const content = readFileSync(storePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim().length > 0);

  const events: TraceEvent[] = [];
  let skippedLines = 0;

  for (const line of lines) {
    try {
      events.push(JSON.parse(line) as TraceEvent);
    } catch {
      skippedLines++;
    }
  }

  return { events, skippedLines };
}

/** 新規イベントのみを追記する(イベント ID で重複排除・冪等) */
export function appendEvents(storePath: string, events: TraceEvent[]): AppendResult {
  const dir = dirname(storePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const { events: existingEvents } = loadEvents(storePath);
  const existingIds = new Set(existingEvents.map((e) => e.id));

  let added = 0;
  let duplicates = 0;
  const lines: string[] = [];

  for (const event of events) {
    if (existingIds.has(event.id)) {
      duplicates++;
      continue;
    }
    existingIds.add(event.id);
    lines.push(JSON.stringify(event));
    added++;
  }

  if (lines.length > 0) {
    appendFileSync(storePath, lines.join("\n") + "\n", "utf-8");
  }

  return { added, duplicates };
}
