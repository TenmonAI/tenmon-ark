# TENMON_FINAL_PWA_CONVERSATION_COMPLETION_PDCA_LOOP_CURSOR_AUTO_V1

## 目的

実 PWA 会話を単一真実源として、final PDCA loop で surface / carry / contract / reflection を整流し、最終収束へ進める。  
**観測優先**・lived proof 重視・**成功の捏造禁止**。

## D

- 観測優先（新機能追加より整流）
- 1 変更 = 1 検証に寄せる
- success 捏造禁止
- lived proof を重視（`pwa_lived_completion_readiness.json` を観測結合）

## 対象

- `api/automation/final_pwa_conversation_completion_pdca_loop_v1.py`
- `api/scripts/final_pwa_conversation_completion_pdca_loop_v1.sh`
- 本憲章

## 主要フェーズ

1. real PWA forensic fixation（`pwa_real_chat_single_source_trace.json`）
2. PWA chat path repair（`pwa_probe_gap_report.json` / `thread_center_bleed_report.json`）
3. acceptance single-source normalization（`pwa_acceptance_final_verdict.json`）
4. output contract normalization（`output_contract_normalization_report.json`）
5. self-improvement reflection lock（`self_improvement_reflection_report.json`）
6. storage / backup / NAS recovery（`storage_backup_nas_recovery_report.json`）
7. final PWA experience seal（`final_pwa_completion_readiness.json`）

## 必須出力

| ファイル | 内容 |
|---------|------|
| `api/automation/pwa_real_chat_single_source_trace.json` | 実 `/api/chat` トレース |
| `api/automation/pwa_probe_gap_report.json` | gap + lived blocker 観測 |
| `api/automation/thread_center_bleed_report.json` | center bleed |
| `api/automation/pwa_acceptance_final_verdict.json` | 判定 + lived blocker |
| `api/automation/output_contract_normalization_report.json` | 契約正規化 |
| `api/automation/self_improvement_reflection_report.json` | 自己改善観測 |
| `api/automation/storage_backup_nas_recovery_report.json` | NAS/backup 観測 |
| `api/automation/final_pwa_completion_readiness.json` | **最終 readiness**（更新される） |
| `api/automation/generated_cursor_apply/TENMON_FINAL_PWA_NEXT_PDCA_AUTO_V1.md` | 次 PDCA 候補 |
| `api/automation/tenmon_final_pwa_pdca_loop_stamp_v1.json` | 実行スタンプ（任意・監査用） |

## 実行

```bash
bash api/scripts/final_pwa_conversation_completion_pdca_loop_v1.sh --stdout-json
```

## nextOnPass

`TENMON_CONVERSATION_COMPLETION_3STAGE_ESCORT_AUTOPDCA_CURSOR_AUTO_V1`

## nextOnFail

停止。`TENMON_FINAL_PWA_CONVERSATION_COMPLETION_PDCA_LOOP_RETRY_CURSOR_AUTO_V1` を **1 枚のみ**生成してから手戻り。

## 終了コード

- readiness 満たす: **0**
- 未達: **1**（成果物はすべて生成される）
