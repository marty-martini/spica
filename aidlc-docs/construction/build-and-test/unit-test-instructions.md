# Unit Test Execution — spica Trace 層 v1

## Run Unit Tests

### 1. Execute All Unit Tests
```bash
npm test
```

### 2. Review Test Results
- **Expected**: 40 テストすべて Pass、0 Failure(6 テストファイル: `tests/core/*.test.ts` ×3, `tests/cli/*.test.ts` ×3)
- **Test Coverage**: カバレッジ計測ツールは v1 では未導入(過剰と判断。テストは受入基準・ビジネスルールのトレースに基づいて作成済み)
- **Test Report Location**: 標準出力(vitest のデフォルトレポーター)

### 3. Fix Failing Tests
テストが失敗した場合:
1. vitest の出力で失敗ケースと期待値/実際値の差分を確認
2. 対応する `src/core/*.ts` または `src/cli/*.ts` の実装を修正
3. `npm test` を再実行し、全件パスするまで繰り返す

## テストケースと受入基準のトレース

| テストファイル | カバーする受入基準/ビジネスルール |
|---|---|
| `tests/core/parser.test.ts` | 受入基準4(パース不能でも継続)、BR-2(記録を落とさない)、イベント分類優先順位 |
| `tests/core/store.test.ts` | 受入基準3(冪等な JSONL 蓄積)、BR-4 |
| `tests/core/analyzer.test.ts` | 受入基準2(計測可能/不能の表示)、BR-3(1対1対応の排他制御含む)、BR-8(セッション概念なし) |
| `tests/cli/timeline-renderer.test.ts` | 受入基準2、BR-2(unknownReason 表示)、BR-7(スキップ詳細表示) |
| `tests/cli/summary-renderer.test.ts` | 受入基準1(サマリー表示) |
| `tests/cli/trace-service.test.ts` | 受入基準1・3・4 の統合的な検証(パース→永続化→分析の一連のフロー) |
