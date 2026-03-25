# CHAT_TS_RESIDUAL_IMPROVEMENT_V1

## 目的

**完成後（または seal PASS 後）**に残る **surface / route / longform / density / baseline** の**残差**を数値化し、**1〜3 軸**に絞った **focused improvement loop** を回す。

## 非目的

- `chat.ts` の**無計画な一括改修**（残差カードは **解析とマニフェスト**が主）  
- build / `/api/chat` **契約の破壊**

## 採点軸（0〜100）

| キー | 主な入力 |
|------|-----------|
| `surface_clean` | `surface_audit.json` / `final_verdict.surface_clean` |
| `route_authority_clean` | `route_authority_audit.json` / runtime **5 系統**（general / compare / selfaware / scripture / longform） |
| `longform_quality_clean` | `longform_audit.json`（長さ・三弧・診断短答） |
| `density_lock` | `density_lock_verdict.json` / static synapse・seed |
| `baseline_reflection` | static（res_json / helper_tail / static_100） |

## 成果物

- `tenmon_chat_ts_residual_quality_score_v1.py` → `residual_quality_score.json`  
- `focused_next_cards_manifest.json`（**cursor_card + vps_card** の対）  
- 任意: `CHAT_TS_RESIDUAL_FOCUSED_*_AUTO_V1.md` スタブ

## seal 連携

`chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh` が、POSTLOCK に続き **`_residual_improvement/`** に採点結果を出力（`CHAT_TS_RESIDUAL_SCORE_SKIP=1` で無効）。

## 関連カード

- `CHAT_TS_RESIDUAL_IMPROVEMENT_CURSOR_AUTO_V1`  
- `CHAT_TS_RESIDUAL_IMPROVEMENT_VPS_V1`  
- `CHAT_TS_POSTLOCK_MAINTENANCE_CURSOR_AUTO_V1`（baseline 退行）  

---

*Version: V1*
