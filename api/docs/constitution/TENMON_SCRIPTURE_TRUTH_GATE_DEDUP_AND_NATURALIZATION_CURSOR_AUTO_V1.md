# TENMON_SCRIPTURE_TRUTH_GATE_DEDUP_AND_NATURALIZATION_CURSOR_AUTO_V1

## 目的
`TRUTH_GATE_RETURN_V2` / `TENMON_SCRIPTURE_CANON_V1` 系の返答で見える
- 「水穂伝では、水穂伝では」型の同語反復
- 「資料要旨」口調の残存
を止血し、自然文の説明へ戻す。

## 実装（`api/src/routes/chat_refactor/finalize.ts` 中心）
- `stripScripturePlaceholderAndTraceV1` / `shapeScriptureEssenceSurfaceV1` / `synthesizeEvidenceNaturalProseV1` 周辺を最小 diff で調整
- scripture / truth_gate の表面合成で、同一フレーズの二重出力を圧縮
- 「Xでは、Xでは」類型を 1 回の自然文へ折り畳む
- raw law key / placeholder / trace を表面に出さない（meta leak 禁止）

## 非交渉条件
- `routeReason` は維持
- code route / factual route を壊さない
- dist 直編集禁止
- success 捏造禁止

## 検証プローブ
- `言霊秘書とはどういう書物ですか`
- `ア の言霊の意味を教えてください`
- `水穂伝とは何ですか`

## 実用 ACCEPTANCE
- 同語反復が消える（少なくとも 2 連続出力がない）
- 「資料要旨」口調が薄れる（定型の要旨ラベルが出ない）
- 空返答が発生しない
- meta leak なし

*Version: 1*

