# MAINLINE_COMPLETED_READ_ONLY_SEAL_V1

## 目的

主線 **4 FINAL** 完了後、**read-only** で OS / 運用が参照する完了状態を固定する。  
**`chat.ts` / `chat_refactor/**` / `api/automation/*.py` / generated manifests は変更しない。**

## 封印の触ってよい範囲

- `api/automation/reports/**`（完了証拠束・seal JSON/MD）
- `api/docs/constitution/**`（本書）
- 必要に応じ `api/automation/_campaign/campaign_state_v1.json`（運用ポリシーに従う）

## 証拠束（固定）

| 種別 | パス |
|------|------|
| Seal JSON | `api/automation/reports/mainline_completed_read_only_seal_v1.json` |
| Seal MD | `api/automation/reports/mainline_completed_read_only_seal_v1.md` |
| Sentinel | `api/automation/reports/mainline_runtime_acceptance_complete_v1.json` |
| Replay | `api/automation/reports/replay_audit_v1.json`（`replayAuditRuntimeLock`） |
| Exit contract | `api/automation/reports/chatts_exit_contract_v1.json` |

## 必須記録項目（seal JSON に同梱）

- `gitHeadShort`
- `mainlineFinalTrunkComplete`
- `fullAutopilot.runNextNextCard` / `queueSchedulerNextCard`（注: 後者は辞書順キュー由来）
- `executionGateRuntimeFinal.decision`
- `replayAuditRuntimeLock` の有無と要約
- `supervisor` nodes / edges
- manifest 件数（参照のみでよい）
- `build.pass`
- 本カードで **chat.ts / trunk / automation 本体を触っていない** 宣言
- trunk 6 ファイルの存在
- **remainingOpenIssues**: queueScheduler 注記、exit contract drift 件数、git dirty

## 次カード（catalog）

`MAINLINE_COMPLETED_READ_ONLY_SEAL_V1` の **nextOnPass** は **`CHAT_TRUNK_EXIT_CONTRACT_LOCK_V1`**（人間ゲート承認後に進行）。

## automation manifest との対応（Pack G）

`MAINLINE_COMPLETED_READ_ONLY_SEAL_V1` は `generated_patch_recipes/patch_recipes_manifest_v1.json` の **`bundle_mainline_read_only_seal_v1`** と、`generated_cursor_tasks` / `generated_cursor_apply` の対応タスク・apply と **件数整合（8 本柱の最終バンドル）** を取る。封印作業者が generated を編集するのではなく、**整備済み manifest を参照証拠として seal JSON に記録する**。

## 停止条件（封印更新前）

- human gate pending > 0  
- execution gate blocked  
- single_flight 違反  
- build FAIL  

いずれかで **封印レポートを更新せず**、観測ログのみ返す。
