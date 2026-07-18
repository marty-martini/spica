# ビジネスロジックモデル — unit: trace-cli

技術非依存のロジック定義。実装は Code Generation で行う。

## 1. パースロジック(audit.md → AuditEntry[])

1. 入力テキストを行頭 `## ` の見出しで分割する(`# ` 単独のドキュメントタイトルは無視)
2. 各ブロックから `**Timestamp**:` / `**User Input**:` / `**AI Response**:` / `**Context**:` の各フィールドを抽出する
   - フィールド値は次のフィールド見出しまたはブロック末尾(`---` 区切り)までの複数行を許容する
3. **スキップ判定**: `Timestamp` が欠落、または ISO 8601 として解釈できないブロックは `SkippedEntry { heading, reason }` に回し、処理を続行する(FR-1: エラーで停止しない)
4. `User Input` の値が「(なし」で始まる場合(例: "(なし - AI 主導ステップ)")は userInput = null とみなす

## 2. イベント分類ロジック(AuditEntry → TraceEvent)

**方式**: キーワードヒューリスティクス(日英対応)。1 エントリ = 1 イベント。
**検査対象テキスト**: 見出し + Context の連結文字列(以下「対象文」)。
**優先順位順**に最初にマッチした種別を採用する(上ほど優先):

| 優先 | 種別 | キーワード(いずれかを含む) |
|---|---|---|
| 1 | gate-rework | 「差し戻し」「修正依頼」「変更依頼」/ "rework" "changes requested" |
| 2 | gate-prompt | 「承認ゲート待ち」「承認プロンプト」「回答待ち」「承認待ち」/ "awaiting approval" "approval prompt" |
| 3 | gate-approved | 「承認」「ゲート通過」/ "approved" "approval" ※優先 2 に該当しない場合のみ |
| 4 | stage-complete | 「完了」/ "complete" "completed" |
| 5 | stage-start | 「開始」「起動」/ "start" "started" |
| 6 | user-input | 上記に該当せず userInput ≠ null |
| 7 | unknown | 上記すべてに該当しない(タイムラインには含める。Q2 = A) |

**設計上の注意**:
- 優先順位は「差し戻し > プロンプト提示 > 承認」。「承認ゲート待ち」が「承認」に誤マッチしないための順序である
- キーワード表は parser 内の単一の定義(テーブル)として実装し、追加・修正を 1 箇所で行えるようにする(audit.md の表記揺れへの追従点)

## 3. ステージ名抽出

- Context 文字列から `INCEPTION|CONSTRUCTION|OPERATIONS` で始まる部分を抽出し、`フェーズ名 - ステージ名` 形式に正規化する(例: "INCEPTION - Requirements Analysis 承認ゲート通過 → ..." → "INCEPTION - Requirements Analysis")
- 抽出できなければ stage = null(サマリーでは "(不明)" に集計)

## 4. イベント ID 生成(冪等性)

- audit-md ソースの場合: `id = sha256(timestamp + "\n" + heading) の先頭 16 hex`
- 決定的: 同じ audit.md を何度パースしても同じ ID になる
- 既知の限界(許容): 過去エントリの見出しやタイムスタンプが**そのまま**で本文(User Input / AI Response / Context)だけが後から編集された場合、ID が不変のため EventStore はそれを検知せず、`.spica/events.jsonl` は古い内容のまま蓄積され続ける。audit.md は追記専用ルールのため実運用上の発生は稀とみなし、v1 では contentHash 等による変更検知は実装しない(過剰設計と判断)
- 将来課題(今は設計しない): `source` が増えた場合、ID 生成式はソースごとに定義してよいが、ストア全体で ID が衝突しないことをどう保証するかは hooks 等の実ソース追加時に検討する

## 5. 永続化ロジック(EventStore)

1. `.spica/events.jsonl` を読み込み、既存イベントの ID 集合を作る(ファイル不在なら空。`.spica/` は必要時に作成)
2. 新規イベントのうち ID が未登録のもののみ末尾に追記する(1 行 1 JSON)
3. 戻り値として `{ added, duplicates }` を返し、CLI が報告する
4. JSONL の壊れた行は読み飛ばして件数を報告する(audit.md のスキップと同じ思想)

## 6. 時間計算ロジック(TraceAnalyzer)

### 6.1 タイムライン構築
1. イベントを timestamp 昇順(同値は order 昇順)にソートする
2. 各イベントの `durationFromPrev` = 自身と直前イベントのタイムスタンプ差(先頭は null)

### 6.2 承認待ち時間(FR-3 / Q2 = A 方針)
1. `gate-prompt` イベントを timestamp 昇順に処理する。すでに他の `gate-prompt` の応答として使用済みのイベントは候補から除外する(**1 対 1 対応を保証**。同一の応答イベントが複数の `gate-prompt` の待ち時間計算に二重に使われることを防ぐ)
2. 除外後の候補の中から、それより後で**最初に** `hasUserInput = true` となるイベントを応答候補として探す
3. 見つかれば `measurable = true, waitMs = 応答.timestamp − prompt.timestamp`、そのイベントを使用済みとして記録する
4. 見つからない場合は `measurable = false, unmeasurableReason = "no-response-found"` → 表示は「計測不能」(ApprovalWait 自体が gate-prompt にのみ設定されるため、理由はこの 1 種類のみで判定は一意)
5. 推定はしない: 応答が特定できない場合に隣接エントリで代用しない(NFR-2)

### 6.3 ステージ集計(Q3 = C: セッション概念なし)
1. stage ごとにイベントをグループ化(null は "(不明)")し、初出順に並べる
2. `durationMs` = ステージ内の最初と最後のイベントの時間差(1 件のみなら null)
3. 承認待ちは measurable / unmeasurable の件数と measurable の合計待ち時間を集計する
4. 全体では総経過時間(先頭〜末尾)も算出する

## 7. CLI フロー(TraceService)

```
spica timeline [path] / spica summary [path]
  1. path 解決(デフォルト ./aidlc-docs)。audit.md 不在 → エラーメッセージ+終了コード 1
  2. audit.md 読込 → parseAuditLog()
  3. appendEvents()(冪等追記)→ { added, duplicates }
  4. ストア全イベント読込 → buildTimeline() / buildSummary()
  5. スキップ件数・追記件数のダイジェストを**先頭**に表示(タイムライン/サマリー本体を読む前に必ず目に入る位置)
  6. タイムライン or サマリー本体を表示(サブコマンドに応じて片方のみ)。正常終了コード 0
```

サブコマンドは `timeline` / `summary` のいずれか一方ずつを表示する設計(Application Design Q2 = B)のため、両者の表示順序という論点自体は生じない。
