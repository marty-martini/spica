import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendEvents, loadEvents } from "../../src/core/store.js";
import type { TraceEvent } from "../../src/core/types.js";

function makeEvent(id: string, timestamp = "2026-07-17T00:00:00Z"): TraceEvent {
  return {
    id,
    source: "audit-md",
    type: "stage-start",
    timestamp,
    stage: null,
    heading: "test",
    hasUserInput: false,
    order: 0,
  };
}

describe("EventStore", () => {
  let dir: string;
  let storePath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "spica-store-test-"));
    storePath = join(dir, ".spica", "events.jsonl");
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("ファイル不在なら空を返す", () => {
    const result = loadEvents(storePath);
    expect(result.events).toEqual([]);
    expect(result.skippedLines).toBe(0);
  });

  it("新規イベントを追記できる(ディレクトリも自動作成)", () => {
    const result = appendEvents(storePath, [makeEvent("a"), makeEvent("b")]);
    expect(result).toEqual({ added: 2, duplicates: 0 });
    expect(loadEvents(storePath).events).toHaveLength(2);
  });

  it("冪等性: 同じイベントを再度追記しても重複登録されない(BR-4)", () => {
    appendEvents(storePath, [makeEvent("a"), makeEvent("b")]);
    const second = appendEvents(storePath, [makeEvent("a"), makeEvent("b")]);
    expect(second).toEqual({ added: 0, duplicates: 2 });
    expect(loadEvents(storePath).events).toHaveLength(2);
  });

  it("一部が新規・一部が重複の場合を正しく報告する", () => {
    appendEvents(storePath, [makeEvent("a")]);
    const result = appendEvents(storePath, [makeEvent("a"), makeEvent("c")]);
    expect(result).toEqual({ added: 1, duplicates: 1 });
  });

  it("壊れた行は読み飛ばして件数を報告する", () => {
    appendEvents(storePath, [makeEvent("a")]);
    writeFileSync(storePath, "not-json\n", { flag: "a" });
    const result = loadEvents(storePath);
    expect(result.events).toHaveLength(1);
    expect(result.skippedLines).toBe(1);
  });
});
