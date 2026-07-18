# ドメインエンティティ — unit: trace-cli

## AuditEntry(パース中間表現)

audit.md の `## ` 見出し 1 つ分に対応する構造。

| フィールド | 型 | 説明 |
|---|---|---|
| heading | string | 見出しテキスト(`## ` を除く) |
| timestamp | string \| null | `**Timestamp**:` の値(ISO 8601)。null なら分類不能→スキップ対象 |
| userInput | string \| null | `**User Input**:` の値。「(なし」から始まる場合は null 扱い |
| aiResponse | string \| null | `**AI Response**:` の値 |
| context | string \| null | `**Context**:` の値 |
| order | number | ファイル内の出現順(タイムスタンプ同値時のソート安定化用) |

## TraceEvent(正規化イベント・永続化単位)

```typescript
type TraceEventType =
  | "stage-start"
  | "stage-complete"
  | "gate-prompt"     // 承認プロンプト提示・回答待ち
  | "gate-approved"   // 承認
  | "gate-rework"     // 差し戻し・修正依頼
  | "user-input"      // ユーザー入力があるが上記に該当しない
  | "unknown";        // タイムスタンプはあるが分類不能(タイムラインに含める)

interface TraceEvent {
  id: string;              // 決定的 ID。ソースごとに生成式を持つ(audit-md は sha256(timestamp + "\n" + heading) 先頭 16 hex)
  source: "audit-md";      // 将来 "hooks" 等を追加(NFR-5)。追加時は id 生成式もソース別に定義し、ストア全体で衝突しないことを担保する
  type: TraceEventType;
  timestamp: string;       // ISO 8601(記録のまま保持。表示時にローカル時刻へ変換)
  stage: string | null;    // Context から抽出したステージ名(例: "INCEPTION - Requirements Analysis")
  heading?: string;        // 元エントリの見出し(表示用)。audit-md 固有の概念のため任意項目とし、将来ソースが heading 相当を持たない場合も型を壊さない
  hasUserInput: boolean;   // ユーザー入力の有無(承認待ち時間の応答側判定に使用)
  order: number;           // ファイル内出現順(同一ソース内のソート安定化用。複数ソース混在時の扱いは将来課題)
  unknownReason?: string;  // type が "unknown" の場合、分類できなかった理由(例: "見出し・Context がどの分類キーワードにも一致しなかった")
}
```

## ParseResult

| フィールド | 型 | 説明 |
|---|---|---|
| events | TraceEvent[] | 正規化イベント列 |
| skipped | SkippedEntry[] | パース不能エントリ(`{ heading, reason }`)。件数を CLI で報告 |

## Timeline / TimelineItem(分析結果・表示入力)

| フィールド | 型 | 説明 |
|---|---|---|
| Timeline.items | TimelineItem[] | タイムスタンプ昇順(同値は order 順) |
| TimelineItem.event | TraceEvent | 対象イベント |
| TimelineItem.durationFromPrev | number \| null | 直前イベントからの経過ミリ秒。先頭は null |
| TimelineItem.approvalWait | ApprovalWait \| null | このイベントが gate-prompt の場合のみ設定 |

```typescript
interface ApprovalWait {
  measurable: boolean;    // 応答イベントが見つかったか
  waitMs: number | null;  // measurable が false なら null → 表示は「計測不能」
  respondedBy: string | null; // 応答イベントの id
  unmeasurableReason?: "no-response-found"; // measurable が false の場合の理由。ApprovalWait は gate-prompt にのみ設定されるため理由はこの 1 種類のみ
}
```

## Summary / StageSummary(セッション概念なし・ステージ集計のみ)

| フィールド | 型 | 説明 |
|---|---|---|
| Summary.stages | StageSummary[] | ステージ初出順 |
| Summary.totalDurationMs | number \| null | 全イベントの先頭〜末尾の経過時間 |
| StageSummary.stage | string | ステージ名("(不明)" を含む) |
| StageSummary.eventCount | number | イベント数 |
| StageSummary.durationMs | number \| null | ステージ内の先頭〜末尾イベントの経過時間。イベント 1 件なら null |
| StageSummary.approvalWaits | { measurable: number; unmeasurable: number; totalWaitMs: number } | 承認待ちの集計 |
