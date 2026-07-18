# Integration Test Instructions — spica Trace 層 v1

## Purpose
本プロジェクトは単一ユニット(trace-cli)で、他ユニット/外部サービスとの連携がないため、
「ユニット間統合」ではなく **core 層 と cli 層の統合**(parser → store → analyzer → renderer の一連のフロー)
を統合テストの対象とする。

## Test Scenarios

### Scenario 1: audit.md → イベント永続化 → タイムライン/サマリー表示までの一気通貫フロー
- **Description**: `runTrace()`(trace-service.ts)が parser / store / analyzer を正しく連携させることを検証
- **Setup**: 一時ディレクトリに `aidlc-docs/audit.md` を用意(`tests/cli/trace-service.test.ts` で実施)
- **Test Steps**: `runTrace()` を実行し、timeline / summary / parseInfo / storeInfo の各結果を検証
- **Expected Results**: パース結果が store に反映され、store 全体から timeline/summary が構築される
- **Cleanup**: `afterEach` で一時ディレクトリを削除

### Scenario 2: 冪等性(2回実行しても状態が変化しない)
- **Description**: 同一 audit.md に対する2回目の実行で `added: 0` となることを検証
- **Setup**: Scenario 1 と同じ
- **Test Steps**: `runTrace()` を2回連続実行し、2回目の `storeInfo.added` / `duplicates` を確認
- **Expected Results**: 2回目は `added: 0`、`duplicates` はイベント件数と一致
- **Cleanup**: 同上

## 実行方法

上記シナリオは `tests/cli/trace-service.test.ts` としてユニットテストに含まれているため、
個別の統合テストコマンドは不要(`npm test` の実行で兼ねる)。

## 実リポジトリでの手動検証(実施済み)

Code Generation 完了時に、本リポジトリ自身の `aidlc-docs/audit.md`(実データ)に対して
`npm run trace -- timeline` / `npm run trace -- summary` を実行し、以下を確認済み:
- タイムライン・サマリーが正しく表示される
- 2回目実行で `.spica/events.jsonl` への追記が 0 件(冪等性)
- 存在しない `aidlc-docs` パスを指定した場合、終了コード 1 で明確なエラーメッセージが出る
