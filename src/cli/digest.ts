import pc from "picocolors";

export interface Digest {
  skippedEntries: number;
  added: number;
  duplicates: number;
  skippedLines: number;
}

/** スキップ件数・追記件数のダイジェストを先頭に表示する(BR-7) */
export function renderDigest(digest: Digest): string {
  const parts = [
    `追記 ${digest.added} 件`,
    `重複 ${digest.duplicates} 件`,
  ];
  if (digest.skippedEntries > 0) {
    parts.push(pc.yellow(`audit.md パース不能 ${digest.skippedEntries} 件`));
  }
  if (digest.skippedLines > 0) {
    parts.push(pc.yellow(`events.jsonl 壊れた行 ${digest.skippedLines} 件`));
  }
  return pc.dim(`[${parts.join(" / ")}]`);
}
