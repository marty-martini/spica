import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AuditLogNotFoundError, runTrace } from "../../src/cli/trace-service.js";

describe("runTrace", () => {
  let workDir: string;
  let aidlcDocsPath: string;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), "spica-trace-service-test-"));
    aidlcDocsPath = join(workDir, "aidlc-docs");
    mkdirSync(aidlcDocsPath, { recursive: true });
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it("audit.md が存在しない場合 AuditLogNotFoundError を投げる", () => {
    expect(() => runTrace(aidlcDocsPath)).toThrow(AuditLogNotFoundError);
  });

  it("パース → 永続化 → 分析の一連のフローを実行する", () => {
    writeFileSync(
      join(aidlcDocsPath, "audit.md"),
      `## Workspace Detection
**Timestamp**: 2026-07-17T00:00:00Z
**Context**: INCEPTION - Workspace Detection 開始

---
`,
      "utf-8"
    );

    const result = runTrace(aidlcDocsPath);
    expect(result.timeline.items).toHaveLength(1);
    expect(result.summary.stages).toHaveLength(1);
    expect(result.storeInfo.added).toBe(1);
    expect(result.storeInfo.duplicates).toBe(0);
    expect(result.parseInfo.skipped).toHaveLength(0);
  });

  it("同じ audit.md を2回実行しても events.jsonl は重複しない(冪等性)", () => {
    writeFileSync(
      join(aidlcDocsPath, "audit.md"),
      `## テスト
**Timestamp**: 2026-07-17T00:00:00Z
**Context**: INCEPTION - テスト 開始

---
`,
      "utf-8"
    );

    runTrace(aidlcDocsPath);
    const second = runTrace(aidlcDocsPath);

    expect(second.storeInfo.added).toBe(0);
    expect(second.storeInfo.duplicates).toBe(1);
  });
});
