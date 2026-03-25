# CHAT_TS_EXIT_CONTRACT_LOCK_CURSOR_AUTO_V1

## 目的

5 probe（`general_1` / `compare_1` / `longform_1` / `scripture_1` / `selfaware_1`）に対応する **会話出口の表面品質**を、`routeReason` を増やさず **最終本文だけ**で締める。

## 実装アンカー

| モジュール | 役割 |
|------------|------|
| `api/src/core/tenmonConversationSurfaceV2.ts` | `applyExitContractLockV1` / 補助関数（TOC 除去・重複段落・メタ逃避・抽象詩一行） |
| `api/src/routes/chat_refactor/finalize.ts` | `applyFinalAnswerConstitutionAndWisdomReducerV1` 内で **preCompose / postCompose** として適用 |

## 禁止

- 新 route 追加、`routeReason` の増殖
- dist / DB / kokuzo_pages / systemd env / `/api/chat` 契約の変更

## VPS 成果物（目安）

- `CHAT_TS_EXIT_CONTRACT_LOCK_V1`
- `probe_matrix_5x5.json` / `acceptance_exit_contract.json` — **`api/scripts/chat_ts_exit_contract_lock_probe_v1.sh`**
- `chat.diff` / `build.log` / `systemctl_status.txt`（手動または CI）
- 失敗時: `generated_cursor_apply/CHAT_TS_EXIT_CONTRACT_LOCK_NEXT_PDCA_AUTO_V1.md`（probe スクリプトが自動生成）

## FAIL_NEXT

`CHAT_TS_EXIT_CONTRACT_LOCK_RETRY_CURSOR_AUTO_V1`
