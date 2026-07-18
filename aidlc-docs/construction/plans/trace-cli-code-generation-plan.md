# Code Generation Plan — unit: trace-cli

## Unit Context

- **要件**: requirements.md(FR-1〜FR-6, NFR-1〜NFR-5)
- **設計**: application-design/*(core/cli 層分割、cli→core 一方向依存、core はゼロ依存)、
  construction/trace-cli/functional-design/*(TraceEvent スキーマ、イベント分類ロジック、承認待ち算出、冪等永続化)
- **依存**: なし(単一ユニット、外部サービスなし)
- **ワークスペースルート**: `/Users/shomiyake/works/github.com/marty-martini/spica`(greenfield single unit → `src/`, `tests/` を直下に作成)

## ステップ

### Step 1: Project Structure Setup
- [x] 1.1 `package.json` 作成(TypeScript, vitest, tsx, commander, picocolors 等の devDependencies/dependencies)
- [x] 1.2 `tsconfig.json` 作成(strict, ESM or CJS 選定は tsx 実行との整合を優先)
- [x] 1.3 `.gitignore` に `node_modules/`, `.spica/`, `dist/` を追加
- [x] 1.4 `src/core/`, `src/cli/`, `tests/` ディレクトリ作成

### Step 2: Business Logic Generation(core — ゼロ依存)
- [x] 2.1 `src/core/types.ts` — TraceEvent, AuditEntry, ParseResult, Timeline, TimelineItem, ApprovalWait, Summary, StageSummary(domain-entities.md 準拠)
- [x] 2.2 `src/core/parser.ts` — parseAuditMarkdown / toTraceEvents / parseAuditLog(business-logic-model.md 1〜4章準拠。優先順位付きキーワード分類、決定的ID生成、スキップ処理)
- [x] 2.3 `src/core/store.ts` — loadEvents / appendEvents(JSONL 冪等追記、壊れた行の読み飛ばし)
- [x] 2.4 `src/core/analyzer.ts` — buildTimeline / buildSummary(区間所要時間、承認待ちの1対1対応判定、ステージ集計)

### Step 3: Business Logic Unit Testing(core)
- [x] 3.1 `tests/core/parser.test.ts` — 正常系(各種分類)、スキップ系(タイムスタンプ欠落)、unknown 分類、優先順位の検証(差し戻し>プロンプト>承認)
- [x] 3.2 `tests/core/store.test.ts` — 新規追記、重複排除(冪等性 BR-4)、壊れた行の読み飛ばし
- [x] 3.3 `tests/core/analyzer.test.ts` — 区間所要時間計算、承認待ちの measurable/unmeasurable 判定、連続 gate-prompt の1対1対応(重複排除)、ステージ集計

### Step 4: Business Logic Summary
- [ ] 4.1 `aidlc-docs/construction/trace-cli/code/core-summary.md` に core 実装の要約を記録

### Step 5: CLI Layer Generation(cli)
- [x] 5.1 `src/cli/trace-service.ts` — runTrace(path解決、audit.md読込、パース、永続化、分析のオーケストレーション。services.md 準拠)
- [x] 5.2 `src/cli/timeline-renderer.ts` — renderTimeline(タイムスタンプ・種別・ステージ・所要時間・計測不能表示)。`src/cli/digest.ts` にダイジェスト表示(BR-7)を分離
- [x] 5.3 `src/cli/summary-renderer.ts` — renderSummary(ステージ別集計・承認待ち集計)
- [x] 5.4 `src/cli/index.ts` — commander によるサブコマンド定義(`timeline` / `summary`)、エラー時の終了コード制御(BR-7)

### Step 6: CLI Layer Unit Testing
- [x] 6.1 `tests/cli/timeline-renderer.test.ts` — 計測不能・unknownReason の表示確認
- [x] 6.2 `tests/cli/summary-renderer.test.ts` — ステージ集計表示確認
- [x] 6.3 `tests/cli/trace-service.test.ts` — 一連のフロー(パース→永続化→分析)を一時ディレクトリで検証、audit.md 不在時の例外(index.ts でエラー終了コードに変換)

### Step 7: CLI Layer Summary
- [ ] 7.1 `aidlc-docs/construction/trace-cli/code/cli-summary.md` に CLI 実装の要約を記録

### Step 8: Documentation Generation
- [x] 8.1 ルート `README.md` に spica の使い方(`npm run trace -- timeline` 等)を記載

### Step 9: Deployment Artifacts
- [x] 9.1 該当なし(ローカル CLI・配布なし。FR-6 により npm scripts のみ)。`package.json` の scripts に `"test"`, `"typecheck"` を定義済み

## 要件・設計トレーサビリティ

| ステップ | 対応要件/ルール |
|---|---|
| 2.2 | FR-1, BR-2 |
| 2.3 | FR-5, BR-1, BR-4 |
| 2.4 | FR-3, FR-4, BR-3, BR-5, BR-8 |
| 5.1 | FR-2, FR-6 |
| 5.4 | FR-6, BR-7 |
| 全体 | NFR-1〜NFR-5 |

## 完了の定義

- 全ステップ [x]
- `npm test`(Vitest)と `npm run typecheck` がパス
- 本リポジトリの `aidlc-docs/audit.md` に対して `timeline` / `summary` サブコマンドを実行し、requirements.md の受入基準5項目を満たすことを確認(Build and Test で実施)
