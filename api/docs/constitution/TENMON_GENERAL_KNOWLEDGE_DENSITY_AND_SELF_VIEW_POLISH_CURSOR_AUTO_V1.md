# TENMON_GENERAL_KNOWLEDGE_DENSITY_AND_SELF_VIEW_POLISH_CURSOR_AUTO_V1

## 目的
一般会話・一般知識・自己言及の文章構成と密度を引き上げる。
現状の
- 一般会話の中身不足
- 天聞らしい一人称 / 判断軸の弱さ
を改善する。

## 実装（`api/src/routes/chat.ts` のみ最小 diff）
### GENERAL route 強化
- `GENERAL_KNOWLEDGE_EXPLAIN_ROUTE_V1` の返答を
  1) 主張
  2) 構造（根拠の骨格）
  3) 含意
  の順に短く返す。

### self_view 強化
- `君の思考を聞きたい` / `あなたはどう思う` / `天聞はどう考える` 系では、
  一人称で天聞の判断軸を短く返す（説教口調禁止）。

## 汎用締め禁止
- `どの分野に興味がありますか` で終わらない
- `どう思いますか` だけで終わらない

## 非交渉条件
- `chat.ts` の general / self_view 出口のみ修正
- GPT 風の自然さを目指すが、generic 化（どこにでも当てはまる文）を禁止
- 質問は最大 1 つ
- dist 直編集禁止、success 捏造禁止
- meta leak 禁止（routeReason / trace / placeholder 等）

## 検証プローブ
- `現代人のよくない点を教えて`
- `君の思考を聞きたい`
- `水火の法則とは何ですか`

## ACCEPTANCE
- 3 プローブとも空返答なし
- 140 字以上
- 中身が一段深い
- 一般論の羅列で終わらない
- meta leak なし

*Version: 1*

