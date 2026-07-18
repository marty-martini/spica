# Application Design Plan — spica Trace 層 v1(minimal depth)

## 設計方針

requirements.md に基づき、単一ユニット `trace-cli` の内部を高水準コンポーネントに分割する。
minimal depth のため、成果物は簡潔に保ち、詳細なビジネスルールは Functional Design で定義する。

## 設計ステップ(チェックボックス)

- [x] 1. コンポーネント境界の確定(parser / event store / analyzer / renderer / CLI)
- [x] 2. components.md の生成(コンポーネント定義と責務)
- [x] 3. component-methods.md の生成(メソッドシグネチャ、入出力型)
- [x] 4. services.md の生成(オーケストレーション: CLI 実行フロー)
- [x] 5. component-dependency.md の生成(依存関係と通信パターン、データフロー)
- [x] 6. application-design.md の生成(上記の統合ドキュメント)
- [x] 7. 設計の完全性・一貫性の検証(要件 FR-1〜FR-6 とのトレース)

## 設計確認質問

以下の質問に `[Answer]:` タグで回答してください。

## Question 1
実行時依存パッケージの方針はどうしますか?(CLI 引数解析や色付き出力に関わります)

A) ゼロ依存 — Node 標準機能のみ(`node:util` の parseArgs、色は ANSI エスケープ直書きまたはなし)。最小・追従容易

B) 最小限の定番ライブラリを許可 — 例: commander(引数解析)+ picocolors(色)程度まで

C) 開発体験優先 — 便利なら躊躇なく追加(clack, chalk, cli-table3 など)

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 2
CLI のコマンド構造はどうしますか?

A) 単一コマンド — 実行するとタイムライン+サマリーを常に両方表示(オプションなしで完結)

B) サブコマンド分割 — `timeline` / `summary` を分け、将来 `conformance` / `health` を同列に追加できる構造にする

C) 単一コマンド+フラグ — デフォルトはタイムライン、`--summary` でサマリー表示を切り替え

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 3
ソースディレクトリの構成はどうしますか?

A) フラット — `src/` 直下にモジュールを並べる(小規模のうちはこれで十分)

B) 層分割 — `src/core/`(パース・分析・ストア: 純ロジック)と `src/cli/`(表示・エントリ)を分け、将来層(Conformance/Health)は core の隣に足す

X) Other (please describe after [Answer]: tag below)

[Answer]: B
