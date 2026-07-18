# Functional Design Plan — unit: trace-cli

## 設計ステップ(チェックボックス)

- [x] 1. ドメインエンティティの詳細定義(TraceEvent / AuditEntry / Timeline / Summary)— domain-entities.md
- [x] 2. パース・イベント分類ロジックの詳細設計(audit.md → AuditEntry → TraceEvent)— business-logic-model.md
- [x] 3. 時間計算ロジックの詳細設計(区間所要時間・承認待ち判定・ステージ集計)— business-logic-model.md
- [x] 4. 冪等永続化ロジックの詳細設計(イベント ID 生成・重複排除)— business-logic-model.md
- [x] 5. ビジネスルール・バリデーション・エッジケースの明文化 — business-rules.md
- [x] 6. 要件受入基準とのトレース検証

## 設計確認質問

コアロジックの判定ルールを左右する 3 点です。`[Answer]:` タグに回答してください。

## Question 1
audit.md のエントリを TraceEvent の種別(ステージ開始/完了・承認ゲート・ユーザー入力)に分類する方法はどうしますか?
(audit.md は AI が自由文で書くため、見出しや Context の表記は揺れます)

A) キーワードヒューリスティクス — 見出し・Context 内の定型語(「開始」「完了」「承認」「差し戻し」「ゲート待ち」等、日英対応)でマッチング。ルールは設計書に明文化し、マッチしなければ Question 2 の扱いに従う

B) 構造のみ — 種別分類はせず、全エントリを汎用イベントとして時系列表示する(v1 では種別を諦める)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2
構造としては読めた(タイムスタンプあり)が種別を分類できなかったエントリの扱いはどうしますか?

A) 汎用イベント(type: "unknown")としてタイムラインに含める — 記録を落とさない。「本当に何が起きたか」の思想に合致

B) スキップ扱いにして件数だけ報告する — タイムラインは分類済みイベントのみで構成

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3
所要時間サマリーの「セッション」の区切りはどう定義しますか?
(audit.md には明示的なセッション境界の記録がありません)

A) 時間ギャップ方式 — 隣接イベントの間隔が閾値(例: 60 分)を超えたら新しいセッションとみなす。閾値は CLI オプションで変更可能

B) 暦日方式 — ローカルタイムゾーンの日付が変わったら新しいセッション

C) セッション分割しない — v1 はステージごとの集計のみ(セッション概念は導入しない)

X) Other (please describe after [Answer]: tag below)

[Answer]: C
