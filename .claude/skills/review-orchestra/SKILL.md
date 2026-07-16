---
name: review-orchestra
description: 開発者がレビューゲート(仕様確定時・マージ判定時)で、成果物(仕様ドラフト・実装差分など)に対する多角レビューを明示的に依頼したときに使う。/review-orchestra で直接起動できる。通常のコーディングタスクでは自動起動しない。
---

# 🎼 Review Orchestra

## 役割

開発者がレビューゲートで召喚したときにのみ動く、多角レビューの召喚エントリポイント。
review-orchestrator による視点選定 → 選定された視点エージェント群の独立並列レビュー →
review-synthesizer による統合、という一連のオーケストレーションを行う。

**このSkill自身はレビュー内容を評価しない。所見の要約・改変・新規追加も行わない。**
各サブエージェントの出力を右から左へ受け渡し、最後に開発者へ提示するだけの指揮進行役である。

## 手順

1. 開発者から成果物(仕様ドラフト・実装差分など)を受け取る。

2. `review-orchestrator` サブエージェントを呼び出し、成果物をそのまま渡す。
   戻り値として以下を得る:
   - 選定エージェント(3〜5体)
   - 非選定エージェントと非選定理由
   - 各選定エージェントへの委任内容(渡す抜粋)

3. review-orchestrator が選定した各視点エージェントを、それぞれ独立に呼び出す。
   選定対象は以下の8体のうち、review-orchestrator が選んだ3〜5体のみ:
   - product-strategy-reviewer
   - value-critic
   - experience-reviewer
   - architecture-reviewer
   - engineering-reviewer
   - trust-reviewer
   - verification-measurement-reviewer
   - viability-reviewer

   各エージェントには review-orchestrator が決めた委任内容(渡す抜粋)のみを渡し、
   他の視点エージェントの所見は一切見せない。並列に呼び出せる場合は並列に呼び出す。

4. 全視点エージェントの所見(Assumptions / Findings / Risks / Recommendation)を、
   一切要約・改変せず、そのまま `review-synthesizer` にまとめて渡す。

5. review-synthesizer が返す1画面レポート(サマリ / 重大度別所見 / ⚔️対立点 /
   開発者への問い)を、review-orchestrator の非選定理由と合わせて開発者に提示する。

## 厳守事項

- **Pull型を維持する**: このSkill自体も、開発者が明示的に(`/review-orchestra` で、
  または「レビューして」と依頼して)起動したときのみ動く。自動起動しない。
- **8体全員を毎回招集することを禁止する**: 必ず review-orchestrator の選定結果
  (3〜5体)に従う。
- **各視点エージェントの独立コンテキストを壊さない**: このSkillが所見を要約・改変
  しない。review-synthesizer には所見をまるごと渡す。
- **非選定理由を最終出力に必ず含める**: review-orchestrator が出した非選定理由を
  省略せず開発者に提示し、レビューされなかった観点を開発者が把握できるようにする。
