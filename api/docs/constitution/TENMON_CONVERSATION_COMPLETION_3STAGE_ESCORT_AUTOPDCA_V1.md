# TENMON_CONVERSATION_COMPLETION_3STAGE_ESCORT_AUTOPDCA_V1

## 目的

3 枚の completion カードを **順番固定** で追従し、未達の段では次段に進まない親オーケストレーター。

## 対象カード（順序固定）

1. `TENMON_CONVERSATION_COMPLETION_STAGE1_SURFACE_AND_BLEED_PDCA_V1`
2. `TENMON_CONVERSATION_COMPLETION_STAGE2_CONTINUITY_AND_UNKNOWN_PDCA_V1`
3. `TENMON_CONVERSATION_COMPLETION_STAGE3_AUTONOMOUS_SEAL_PDCA_V1`

## 契約

- **1 cycle 1 テーマ**（混在禁止）。`patch_plan.json` は次の **1 テーマのみ**。
- **1 patch = 1 検証**。`dist/**` 直編集禁止。
- **acceptance PASS 以外 seal 禁止**（`final_seal_autopilot_v3` の機械判定を参照）。
- 各 cycle 後: **build → restart → health/audit → full_completion → final_seal** を必須実行。
- Stage2 以降は **Stage1 ガード**、Stage3 は **Stage2 ガード**を再実行し、落ちたら該当段へ戻る。
- **source dirty** と **generated dirty** は `workspace_observer` の分類で区別（詳細は Stage3 憲章）。

## ランナー

```bash
python3 api/automation/conversation_completion_3stage_escort_autopdca_v1.py \
  --assume-restart-ok \
  --max-cycles 20
```

- `--restart-cmd '...'` で API 再起動を各 cycle に挿入。
- `--strict-unknown-bridge-100` で `unknown_bridge_completion=100` も停止条件に含める（既定では full PDCA 側プレースホルダと整合）。

## 成果物

`api/automation/reports/TENMON_CONVERSATION_COMPLETION_3STAGE_ESCORT_AUTOPDCA_V1/<session>/`

- `full_stage_state.json` / `stage_progress_matrix.json`
- `rollback_reason.json` / `deterioration_guard.json`
- `full_completion_summary.json` / `final_worldclass_verdict.md` / `seal_recommendation.md`
- 成功時: `stage1_final/` … `stage3_final/`（各段最終 PASS スナップショットの主要ファイルコピー）

## 停止条件

- 3 段すべて acceptance PASS かつ `final_stop` が満たすこと（`stop_verdict.json` 参照）。
- `readyForApply` **厳密 true**、作業ツリー **クリーン**、`replay` **acceptance true**。
