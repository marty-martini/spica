# サービス定義 — spica Trace 層 v1

## TraceService(src/cli/trace-service.ts)

CLI サブコマンドと core コンポーネントをつなぐ唯一のオーケストレーション層。
`timeline` / `summary` のどちらのサブコマンドも同じ実行フローを通り、最後の表示だけが異なる。

### 実行フロー(runTrace)

1. 対象パス解決: 引数の `aidlc-docs/` パス(デフォルト `./aidlc-docs`)から `audit.md` の場所を決定
2. 読み込み: `audit.md` を読む(不在なら明確なエラーメッセージで終了)
3. パース: `parseAuditLog()` → イベント列+スキップ情報
4. 永続化: `appendEvents()` で `.spica/events.jsonl` に新規イベントのみ追記(冪等)
5. 分析: ストア済みイベント全体に対して `buildTimeline()` / `buildSummary()`
6. 結果返却: `TraceResult` を CLI に返し、CLI がレンダラーで表示

### オーケストレーション上の原則

- core は I/O を持たない純ロジック(パーサー・アナライザー)。ファイル読み書きは TraceService と EventStore に限定する
- 表示(レンダラー)はサービスの結果を受け取るだけで、パースや計算をしない
- 将来の Conformance / Health 層は、同じ `TraceEvent` ストアを入力とする別サービスとして追加する(サブコマンドも同列に追加)
