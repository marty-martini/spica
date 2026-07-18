# コンポーネント定義 — spica Trace 層 v1

構成方針: `src/core/`(純ロジック・I/O 最小)と `src/cli/`(表示・エントリ)の層分割。
将来層(Conformance / Health)は `src/core/` の隣に追加する。

## src/core/

### AuditLogParser(`src/core/parser.ts`)
- **目的**: `aidlc-docs/audit.md` のテキストを構造化する
- **責務**:
  - audit.md をエントリ単位(見出し / Timestamp / User Input / AI Response / Context)に分解する
  - エントリを正規化イベント `TraceEvent` に変換する(ステージ開始/完了・承認ゲート・ユーザー入力のみ。FR-1)
  - パース不能なエントリはスキップし、スキップ情報を結果に含める(エラーで停止しない)
- **インターフェース**: テキスト入力 → `ParseResult`(イベント列+スキップ情報)。ファイル I/O は持たない(呼び出し側が読む)

### EventStore(`src/core/store.ts`)
- **目的**: 正規化イベントの永続化(FR-5)
- **責務**:
  - `.spica/events.jsonl`(1 行 1 イベントの追記型 JSONL)の読み書き
  - イベント ID による重複排除(再パースしても二重登録しない・冪等)
  - audit.md 側には一切書き込まない(NFR-1)

### TraceAnalyzer(`src/core/analyzer.ts`)
- **目的**: イベント列から時間情報を導出する(FR-3, FR-4)
- **責務**:
  - 隣接イベント間の区間所要時間の計算
  - 承認待ち時間の判定: 承認プロンプト提示と応答が別イベントで存在する場合のみ計測、なければ「計測不能」(FR-3, NFR-2)
  - セッション / ステージごとの所要時間サマリーの集計
- **インターフェース**: `TraceEvent[]` → `Timeline` / `Summary`(純関数)

### 型定義(`src/core/types.ts`)
- **目的**: 全コンポーネントが共有するスキーマの単一の置き場
- **責務**: `TraceEvent`(`source: "audit-md"` を持ち将来ソース追加可能。NFR-5)、`ParseResult`、`Timeline`、`Summary` の型定義

## src/cli/

### CLI エントリ(`src/cli/index.ts`)
- **目的**: コマンドラインインターフェース(FR-2, FR-6)
- **責務**:
  - commander によるサブコマンド定義: `timeline` / `summary`
  - 対象 `aidlc-docs/` パスの引数処理(デフォルト: `./aidlc-docs`)
  - core の実行フロー(TraceService)の呼び出しと終了コード管理

### TimelineRenderer(`src/cli/timeline-renderer.ts`)
- **目的**: タイムラインの整形表示(FR-3)
- **責務**: `Timeline` を時系列テキストに整形(タイムスタンプ・種別・ステージ名・所要時間)。「計測不能」の明示。色付け・表整形(chalk / cli-table3 等は自由に使用可)

### SummaryRenderer(`src/cli/summary-renderer.ts`)
- **目的**: 所要時間サマリーの整形表示(FR-4)
- **責務**: `Summary` をセッション / ステージ別の集計テキストに整形。スキップ件数の報告
