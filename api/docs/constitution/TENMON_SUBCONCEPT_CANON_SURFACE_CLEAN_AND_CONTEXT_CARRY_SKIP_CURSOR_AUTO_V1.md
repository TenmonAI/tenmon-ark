# TENMON_SUBCONCEPT_CANON_SURFACE_CLEAN_AND_CONTEXT_CARRY_SKIP_CURSOR_AUTO_V1

## 目的
`TENMON_SUBCONCEPT_CANON_V1` の問題
- 空返答
- context carry 誤爆
- 「さっき見ていた中心…」系のテンプレ残差
を止血する。

## 実装（`chat.ts` / `chat_refactor/finalize.ts` 最小 diff）
- `TENMON_SUBCONCEPT_CANON_V1` で本文が空になった場合、
  prior center / threadCore を参照して最低 1 段の自然文補完を入れる
- 最終出口（finalize）で template leak を確実に落とす
  - `さっき見ていた中心`
  - `語義・作用・読解`
  - `現代では、概念を押さえたうえで`
  - その類型の説明テンプレ

## skip 条件（SUBCONCEPT に入れない）
以下は SUBCONCEPT へ入れず、general / factual へ逃がす（誤流入抑止）:
- 訂正
- 天気
- 今日の日付
- 今の総理 / 大統領
- 明確な factual current

## 非交渉条件
- continuity hold を壊さない
- factual / technical への誤流入を避ける
- meta leak 禁止（routeReason / trace / placeholder を表面に出さない）
- dist 直編集禁止、success 捏造禁止

## 検証プローブ
- `もう少し深めてください`
- `前の返答を受けて要点を一つだけ継続して`
- `今日は少し不安だ`

## ACCEPTANCE
- probe_soft_res が空でない
- continuity hold を壊さない
- テンプレ漏れなし
- meta leak なし

*Version: 1*

