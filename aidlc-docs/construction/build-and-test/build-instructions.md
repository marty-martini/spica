# Build Instructions — spica Trace 層 v1

## Prerequisites
- **Build Tool**: Node.js v22 系 / npm 11 系(検証環境: Node v22.14.0, npm 11.1.0)
- **Dependencies**: `package.json` に記載(commander, picocolors, TypeScript, tsx, vitest, @types/node)
- **Environment Variables**: なし
- **System Requirements**: 特になし(ローカル CLI、ネットワーク不要)

## Build Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
不要(環境変数・認証情報なし)。

### 3. Build All Units
このプロジェクトはビルド成果物を持たない(tsx によるトランスパイル実行のみ、FR-6)。型チェックをもってビルド検証とする:
```bash
npm run typecheck
```

### 4. Verify Build Success
- **Expected Output**: `tsc --noEmit` がエラーなしで終了
- **Build Artifacts**: なし(`dist/` は生成しない運用。tsconfig の `outDir` は将来のビルド化に備えた設定のみ)
- **Common Warnings**: `npm install` 時の vitest/vite 系依存の脆弱性警告(esbuild の開発サーバー限定の脆弱性。ローカル CLI の実行には影響しない)

## Troubleshooting

### Build Fails with Dependency Errors
- **Cause**: Node バージョン不一致、`node_modules` の破損
- **Solution**: Node v20 以上を使用し、`rm -rf node_modules && npm install` で再インストール

### Build Fails with Compilation Errors
- **Cause**: `src/core` と `src/cli` 間の型不整合、tsconfig の strict オプション違反
- **Solution**: `npm run typecheck` のエラーメッセージに従い型を修正。`noUncheckedIndexedAccess` は本プロジェクトでは意図的に無効化している(過度に厳格なため)
