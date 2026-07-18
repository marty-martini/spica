# Application Design 統合ドキュメント — spica Trace 層 v1

*詳細は各ドキュメントを参照: [components.md](components.md) / [component-methods.md](component-methods.md) / [services.md](services.md) / [component-dependency.md](component-dependency.md)*

## 設計判断(ユーザー回答に基づく)

| 論点 | 決定 |
|---|---|
| 実行時依存 | 開発体験優先。便利なら躊躇なく追加(commander / chalk / cli-table3 等)。ただし外部依存は cli 層に限定し、core はゼロ依存 |
| コマンド構造 | サブコマンド分割: `timeline` / `summary`。将来 `conformance` / `health` を同列に追加 |
| ディレクトリ構成 | `src/core/`(純ロジック)と `src/cli/`(表示・エントリ)の層分割 |

## 構成サマリー

```
src/
  core/                     # 純ロジック(ゼロ依存・I/O なし ※store のみファイル I/O)
    types.ts                # TraceEvent ほか共有スキーマ
    parser.ts               # audit.md → TraceEvent[](スキップ情報付き)
    store.ts                # .spica/events.jsonl の冪等な読み書き
    analyzer.ts             # 区間所要時間・承認待ち判定・サマリー集計
  cli/                      # 表示・エントリ(外部ライブラリはここに限定)
    index.ts                # commander サブコマンド: timeline / summary
    trace-service.ts        # パース → 永続化 → 分析のオーケストレーション
    timeline-renderer.ts    # タイムライン整形
    summary-renderer.ts     # サマリー整形
```

## 要件トレース

| 要件 | 担当コンポーネント |
|---|---|
| FR-1 audit.md パース(確実に取れるイベントのみ・スキップ報告) | parser |
| FR-2 対象パス引数(デフォルト ./aidlc-docs) | index / trace-service |
| FR-3 タイムライン表示・承認待ち「計測不能」明示 | analyzer / timeline-renderer |
| FR-4 所要時間サマリー | analyzer / summary-renderer |
| FR-5 冪等な JSONL 永続化 | store |
| FR-6 npm scripts / npx tsx 実行 | index(bin なし) |
| NFR-1 非侵襲(audit.md 読み取りのみ・パーサー独立) | parser / store / 依存原則 |
| NFR-2 正直な表示 | analyzer / renderers |
| NFR-5 将来ソース追加(source フィールド) | types |

## 完全性・一貫性の検証結果

- 全 FR/NFR が担当コンポーネントを持つことを確認(上表)
- 依存方向は cli → core の一方向のみ。循環依存なし
- 将来層(Conformance / Health)の拡張点を 2 箇所確保: `src/core/` 隣への追加+サブコマンドの同列追加、および `TraceEvent.source` によるデータソース拡張
- 将来課題(v1 では設計しない): Conformance/Health 層追加時に既存の store / analyzer をそのまま再利用するか新規モジュールにするかは、実際にその層を作る時点で判断する
