#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import { renderTimeline } from "./timeline-renderer.js";
import { renderSummary } from "./summary-renderer.js";
import { AuditLogNotFoundError, runTrace } from "./trace-service.js";
import type { Digest } from "./digest.js";

const program = new Command();

program.name("spica").description("spica Trace 層 v1 — aidlc-docs のパースと CLI タイムライン表示");

function withTrace(aidlcDocsPath: string, render: (result: ReturnType<typeof runTrace>, digest: Digest) => string) {
  try {
    const result = runTrace(aidlcDocsPath);
    const digest: Digest = {
      skippedEntries: result.parseInfo.skipped.length,
      added: result.storeInfo.added,
      duplicates: result.storeInfo.duplicates,
      skippedLines: result.storeInfo.skippedLines,
    };
    console.log(render(result, digest));
    process.exitCode = 0;
  } catch (error) {
    if (error instanceof AuditLogNotFoundError) {
      console.error(pc.red(error.message));
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}

program
  .command("timeline")
  .description("イベントのタイムラインを表示する")
  .argument("[path]", "aidlc-docs のパス", "./aidlc-docs")
  .action((path: string) => {
    withTrace(path, (result, digest) => renderTimeline(result.timeline, digest, result.parseInfo.skipped));
  });

program
  .command("summary")
  .description("ステージ別の所要時間サマリーを表示する")
  .argument("[path]", "aidlc-docs のパス", "./aidlc-docs")
  .action((path: string) => {
    withTrace(path, (result, digest) => renderSummary(result.summary, digest));
  });

program.parse();
