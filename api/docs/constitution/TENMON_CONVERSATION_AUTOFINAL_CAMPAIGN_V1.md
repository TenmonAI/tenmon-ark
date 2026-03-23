# TENMON_CONVERSATION_AUTOFINAL_CAMPAIGN_V1

## 目的

`TENMON_CONVERSATION_COMPLETION_CAMPAIGN_V1` 後段として、実 HTTP プローブで会話品質を確定し、必要最小限の routing 修正で **DEF_LLM_TOP / NATURAL_GENERAL_LLM_TOP / K1 誤吸い込み** を減らす。

## 観測（必須）

- `git rev-parse --short HEAD` / `git status --short`
- `python3 api/automation/chatts_audit_suite_v1.py --repo-root . --stdout-json`
- `python3 api/automation/chatts_trunk_domain_map_v1.py --repo-root . --stdout-json`
- `python3 api/automation/chatts_exit_contract_lock_v1.py --repo-root . --stdout-json`
- `cd api && npm run build`
- 実 HTTP: 各プローブは **threadId を分離**（同一スレッド連投でルートが汚染する）

## 実装メモ（2026-03）

- **「人間とは」固定応答**: `reply()` は同一関数内で後段処理が続き `ABSTRACT_FRAME_VARIATION_V1` が上書きされ得るため、`t0` 確定直後は **`res.json(__tenmonGeneralGateResultMaybe(...))` で即返却**（合言葉早期 return と同型）。
- **人間マッチ**: 先頭完全一致のみだと揺れで外れるため、`^人間` + `(とは|って)(何|なに)(ですか)?$` を **正規化後文字列** に対して使用。

## プローブ行列（参照）

1. 第三次世界大戦（`WORLDVIEW_ROUTE_V1`・冒頭で不確実性＋直接回答）
2. 人間とは（`ABSTRACT_FRAME_VARIATION_V1`）
3. ウタヒ（`TENMON_SUBCONCEPT_CANON_V1`）
4. 言霊秘書 / カタカムナ（経典・概念 canon、先頭「立脚の中心」固定の抑制は humanReadableLawLayer / responsePlanCore 側と併用）
5. 整理系 / 疲労（`R22_JUDGEMENT_PREEMPT_V1` / `KANAGI_CONVERSATION_V1`）

## 次カード

`TENMON_CONVERSATION_FINAL_SEAL_V1`（本番プロセス再起動・封印文書・契約ロックの最終確定）
