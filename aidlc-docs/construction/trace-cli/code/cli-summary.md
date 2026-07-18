# cli 実装サマリー — unit: trace-cli

## 作成ファイル

- `src/cli/trace-service.ts` — `runTrace`(オーケストレーション)、`AuditLogNotFoundError`
- `src/cli/digest.ts` — スキップ件数・追記件数のダイジェスト表示(BR-7、共通化のため timeline/summary で共有)
- `src/cli/timeline-renderer.ts` — `renderTimeline`
- `src/cli/summary-renderer.ts` — `renderSummary`
- `src/cli/index.ts` — commander によるサブコマンドエントリ(`timeline` / `summary`)

## 設計からの実装上の補足

- component-methods.md では `renderTimeline(timeline, parseInfo)` としていたが、実装では BR-7 反映後のダイジェスト表示のため `Digest`(追記/重複/スキップ件数)を明示的な型として切り出し、両レンダラーで共有した
- `.spica/events.jsonl` のパスは `aidlc-docs/` の親ディレクトリ(ワークスペースルート)を基準に解決する(FR-2 の対象パス引数とは独立)
- エラー処理は `AuditLogNotFoundError` を core 層ではなく cli 層(trace-service.ts)で定義し、`index.ts` で捕捉して終了コード 1 に変換する(BR-7)

## テスト

- `tests/cli/timeline-renderer.test.ts` — 空イベント時の表示、計測不能理由、unknownReason、スキップ詳細、ダイジェスト表示
- `tests/cli/summary-renderer.test.ts` — 空イベント時の表示、ステージ集計、承認待ちなしの表示
- `tests/cli/trace-service.test.ts` — audit.md 不在時の例外、パース→永続化→分析のフロー、冪等性(2回実行)
