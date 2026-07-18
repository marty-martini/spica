# spica

AI-DLC ワークフロー(`aidlc-docs/audit.md`)の実行を観測事実として見えるようにする CLI。
Trace 層 v1: audit.md のパースと CLI タイムライン表示。

## 使い方

```bash
npm install

# タイムライン表示
npm run trace -- timeline [aidlc-docs のパス、省略時は ./aidlc-docs]

# ステージ別所要時間サマリー表示
npm run trace -- summary [aidlc-docs のパス、省略時は ./aidlc-docs]
```

実行するとパース結果が `.spica/events.jsonl`(ワークスペースルート直下)に冪等に追記されます。

## 開発

```bash
npm test        # Vitest
npm run typecheck  # tsc --noEmit
```

詳細な設計は `aidlc-docs/inception/application-design/` と
`aidlc-docs/construction/trace-cli/functional-design/` を参照してください。
