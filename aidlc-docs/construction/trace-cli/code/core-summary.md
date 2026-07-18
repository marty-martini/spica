# core 実装サマリー — unit: trace-cli

## 作成ファイル

- `src/core/types.ts` — TraceEvent / AuditEntry / ParseResult / Timeline / TimelineItem / ApprovalWait / Summary / StageSummary / AppendResult / LoadResult
- `src/core/parser.ts` — `parseAuditMarkdown` / `toTraceEvents` / `parseAuditLog`
- `src/core/store.ts` — `loadEvents` / `appendEvents`
- `src/core/analyzer.ts` — `buildTimeline` / `buildSummary`

## 設計からの実装上の補足

- イベント分類は `business-logic-model.md` の優先順位付きキーワード表を `CLASSIFICATION_RULES` 配列として実装し、1 箇所で追加・修正できるようにした
- ステージ名抽出は正規表現ヒューリスティクスであり、Context の書き方次第で抽出に失敗しうる(その場合 `stage: null` → サマリーでは "(不明)" に集計。設計通りの既知の限界)
- 承認待ちの1対1対応は `usedResponseIds` で使用済み応答を管理し、`buildTimeline` 内でタイムスタンプ昇順に処理することで保証した
- `store.ts` は `AppendResult`/`LoadResult` を通じて壊れた行・重複件数を呼び出し側に返す。ファイル自体へのエラー出力は行わない(呼び出し側の責務)

## テスト

- `tests/core/parser.test.ts` — 分類優先順位、スキップ、unknown、決定的ID、ステージ抽出
- `tests/core/store.test.ts` — 新規追記・冪等性・壊れた行の読み飛ばし
- `tests/core/analyzer.test.ts` — 区間所要時間、承認待ちの1対1対応、ステージ集計、ソート安定性
