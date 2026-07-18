# 要件確認質問(Requirements Verification Questions)

spica Trace 層 v1 の要件を確定するための質問です。
各質問の `[Answer]:` タグの後に選択肢の文字を記入してください。
選択肢が合わない場合は最後の「Other」を選び、説明を追記してください。

## Question 1
Trace 層 v1 で audit.md から抽出・表示するイベントの範囲はどこまでにしますか?
(audit.md はステージ名・タイムスタンプ・ユーザー入力・AI応答を記録しています。
「スキル発火・エージェント呼び出し」は audit.md には明示的に記録されない場合があります)

A) audit.md から確実に取れるものだけ: ステージ開始/完了・承認ゲート(承認/差し戻し)・ユーザー入力イベント

B) A に加えて、audit.md の本文からスキル発火・エージェント呼び出しをテキスト解析で推定抽出する(精度は保証しない)

C) A に加えて、aidlc-state.md のステージ進捗チェックボックスも突き合わせて表示する

X) Other (please describe after [Answer]: tag below)

[Answer]: Aだけど、仕様的に不要なら無理に取る必要なし。MVPでは捨ててOK

## Question 2
承認待ち時間(ゲート提示からユーザー応答までの時間)の計測はどう扱いますか?
(audit.md の記録粒度では、承認プロンプト提示時刻と応答時刻が別エントリで記録されている場合のみ計測可能です)

A) 記録がある場合のみ計測して表示し、ない場合は「計測不能」と明示する(v1 はこれで十分)

B) 隣接エントリのタイムスタンプ差分をすべて「区間所要時間」として表示する(承認待ちと作業時間を区別しない)

C) 両方: 区間所要時間を基本とし、承認ゲートと判定できた区間には「承認待ち」ラベルを付ける

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3
CLI が対象とする aidlc-docs の場所はどうしますか?

A) カレントディレクトリ直下の `aidlc-docs/` 固定(v1 は自プロジェクトのみ)

B) パスを引数で指定可能(デフォルトはカレントの `aidlc-docs/`)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 4
CLI の実行・配布形態はどうしますか?

A) このリポジトリ内の npm scripts / `npx tsx` で実行(ビルド・配布なし、最小構成)

B) `npm link` やローカルインストールで `spica` コマンドとして実行できるようにする(bin エントリあり)

C) npm パッケージとして公開可能な形まで整える(v1 では過剰かもしれない)

X) Other (please describe after [Answer]: tag below)

[Answer]: A。まずはドックフーディングだよ。別リポジトリを集計するのはv2以降

## Question 5
タイムライン表示以外に、v1 の CLI に含めたい出力はありますか?(複数該当する場合は列挙してください)

A) タイムライン表示のみ(最小)

B) タイムライン + JSON 出力オプション(将来の Conformance/Health 層への入力を意識)

C) タイムライン + セッション/ステージごとの所要時間サマリー

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 6
パース結果の中間データを永続化しますか?

A) しない。実行のたびに audit.md をパースする(非侵襲・ステートレス、v1 の思想に合致)

B) する。パース結果を JSON ファイルにキャッシュ/蓄積する

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 7
テスト・ツールチェーンの方針はどうしますか?

A) Vitest + tsx + 型チェックのみの最小構成(推奨: 細切れ時間での開発に合う)

B) Jest を使う

C) テストランナーに加えて ESLint/Prettier 等の整備も v1 に含める

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

# 拡張ルール Opt-In 質問

## Question: Security Extensions
このプロジェクトでセキュリティ拡張ルールを強制しますか?

A) Yes — すべての SECURITY ルールをブロッキング制約として強制する(本番品質アプリケーション向け)

B) No — SECURITY ルールをスキップする(PoC・プロトタイプ・実験プロジェクト向け)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question: Property-Based Testing Extension
このプロジェクトでプロパティベーステスト(PBT)ルールを強制しますか?

A) Yes — すべての PBT ルールをブロッキング制約として強制する(ビジネスロジック・データ変換・シリアライズ・ステートフルコンポーネントを持つプロジェクト向け)

B) Partial — 純粋関数とシリアライズのラウンドトリップに限定して PBT ルールを適用する(アルゴリズム的複雑性が限定的なプロジェクト向け)

C) No — PBT ルールをスキップする(単純な CRUD・UI のみ・薄い統合レイヤー向け)

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question: Resiliency Extensions
このプロジェクトにレジリエンシーベースラインを適用しますか?

**この拡張の内容**: AWS Well-Architected Framework(信頼性の柱)に由来する、設計時のベストプラクティス群(フォールトトレランス・高可用性・可観測性・回復性)を要件・設計・コードに適用します。

**この拡張がしないこと**: 有効化しても本番対応を保証するものではなく、可用性・RTO・RPO の達成を証明するものでもありません。

A) Yes — レジリエンシーベースラインを設計時ガイダンスとして適用する(ビジネスクリティカルなワークロード向け)

B) No — スキップする(PoC・プロトタイプ・実験プロジェクト向け)

X) Other (please describe after [Answer]: tag below)

[Answer]: B
