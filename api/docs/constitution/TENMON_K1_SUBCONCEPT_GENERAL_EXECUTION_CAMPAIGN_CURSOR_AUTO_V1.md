# TENMON_K1_SUBCONCEPT_GENERAL_EXECUTION_CAMPAIGN_CURSOR_AUTO_V1

## 目的

主線 **13+4** の土台のうえで、会話品質の本丸である **K1 → SUBCONCEPT → GENERAL/self_view** を**順番固定**で実改修し、会話品質突破の最短主線を進める。

## 実装

- `api/automation/tenmon_k1_subconcept_general_execution_campaign_v1.py` — キャンペーン single-source JSON 出力（観測のみ）
- 任意状態ファイル: `api/automation/tenmon_k1_subconcept_general_campaign_state.json`（手動・検証後に更新）

## 実行順（固定）

1. `TENMON_K1_TRACE_EMPTY_RESPONSE_DENSITY_REPAIR_CURSOR_AUTO_V1`
2. `TENMON_SUBCONCEPT_CANON_SURFACE_CLEAN_AND_CONTEXT_CARRY_SKIP_CURSOR_AUTO_V1`
3. `TENMON_GENERAL_KNOWLEDGE_DENSITY_AND_SELF_VIEW_POLISH_CURSOR_AUTO_V1`

## ディシプリン（D）

- **最小 diff** / **1 変更 = 1 検証**
- **高リスクは 1 枚ずつ**（並列に複数の high-risk 本体改修を走らせない）
- 検証ゲート固定: **build → API 再起動 → `/api/health` → `/api/audit.build` → 会話 probes**
- **成功の捏造禁止**（scorecard / forensic は観測のみ）
- **`routeReason` の不要変更禁止**
- **`dist` 直編集禁止**

## 状態ファイル（任意）

`tenmon_k1_subconcept_general_campaign_state.json` 例:

```json
{ "completed_up_to_index": -1 }
```

- `-1`: 未着手（フォーカスは列の先頭カード）
- `0`: 1 枚目まで検証完了 → フォーカスは 2 枚目
- `2`: 3 枚目まで完了 → `linear_sequence_complete`

パスは `TENMON_K1SG_CAMPAIGN_STATE` で上書き可。

## 出力

- `api/automation/tenmon_k1_subconcept_general_execution_campaign.json` — `ordered_cards`, `current_focus_card`, `verification_chain_fixed`, scorecard から抽出した `scorecard_dialogue_blockers_observed` 等
- 標準出力 1 行: `ok`, `current_focus_card`, `linear_status`, `scorecard_dialogue_blocker_count`

## 完了条件（人間・scorecard で確認）

- K1 が自然で密度ある原典応答になる
- SUBCONCEPT の空返答 / 漏れが消える
- GENERAL / self_view が GPT 級に近い中身へ上がる
- scorecard の **dialogue 系 blocker** が縮む（スクリプトは件数・列挙の観測のみ）

## nextOnPass

`TENMON_FINAL_PWA_CONVERSATION_COMPLETION_PDCA_LOOP_CURSOR_AUTO_V1`

## nextOnFail

停止。`TENMON_K1_SUBCONCEPT_GENERAL_EXECUTION_CAMPAIGN_RETRY_CURSOR_AUTO_V1` を 1 枚のみ生成してから手戻り（成功の捏造なし）。
