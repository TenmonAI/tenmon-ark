# TENMON_STALE_EVIDENCE_INVALIDATION_CURSOR_AUTO_V1

## 目的

`pwa_lived_completion_*` / forensic / runtime gate を **latest lived truth** として優先し、  
矛盾する `pwa_final_*` / autoloop snapshot / 旧 verdict を **論理無効（invalid / superseded）** として固定する。

目的は次の4点のみ。

1. lived・最新 forensic を primary とし、stale な `pwa_final_*` / `pwa_final_autoloop_state.json` / 旧 blocker snapshot を失効判定する  
2. `continuity_drop` 等、latest と矛盾する stale summary を検出する  
3. `continue_with_latest_truth` のとき **optional** で downstream を実行し、`tenmon_system_verdict.json` / `tenmon_worldclass_acceptance_scorecard.json` / `tenmon_total_completion_master_report.json` を lived 優先で再評価する（各スクリプトが入力に lived を読む）  
4. 以後の seal / claim が **stale false の亡霊** に引っ張られないようにする  

## NON-NEGOTIABLES

- product fail と env fail を混同しない（`env_failure` が lived で true のとき、`pwa_final_*` の矛盾検出はスキップ）  
- latest lived truth を old summary より優先  
- 無効化は **削除ではなく invalid / superseded マーク**（ledger + 既存ファイルは残す）  
- cause 未断定の product patch 禁止  
- `web/src/**` / `api/src/routes/chat.ts` / `api/src/core/**` 等は触らない  
- 既定では **build しない**  
- 既存 artifact を破壊しない  

## Phase A — stale source scan

候補（`api/automation/`）:

- `pwa_lived_completion_readiness.json`（primary）  
- `pwa_lived_completion_blockers.json`（primary）  
- `pwa_final_completion_readiness.json`  
- `pwa_final_completion_blockers.json`  
- `pwa_final_autoloop_state.json`  
- `tenmon_system_verdict.json`  
- `tenmon_worldclass_acceptance_scorecard.json`  
- `tenmon_total_completion_master_report.json`  
- `tenmon_current_state_detailed_report.json`  
- `tenmon_chat_continuity_deep_forensic.json`  

**stale（superseded）条件**:

- primary lived の `generated_at`（無ければファイル mtime）より **古い** こと  
- **かつ** lived truth（`continuity_readiness` 等）と **内容が矛盾** すること  

## Phase B — invalidation ledger

出力: `api/automation/tenmon_stale_evidence_invalidation_verdict.json`

必須構造:

- `latest_primary_truth_sources`  
- `latest_truth`  
- `stale_sources`（各要素: `path`, `name`, `status: superseded_by_latest_lived_truth`, `invalid`, `superseded`）  
- `superseded_sources`（ファイル名のリスト）  
- `contradiction_pairs`  
- `continue_with_latest_truth`  

互換フィールド（既存 governor / seal / claim 用）:

- `stale_detected`, `stale_entries`, `invalidated_for_operable_seal`, `invalidated_for_worldclass_claim`, `pass`  

レポート: `api/automation/tenmon_stale_evidence_invalidation_report.md`  

## Phase C1 — stale eight（rejudge の時間ベース stale から除外）

次の 8 ファイル名は **current-lived-truth を上書きせず**、無効化レジストリと隔離コピーで扱う（元ファイルは残す）。

- `pwa_lived_completion_readiness.json`
- `tenmon_remote_admin_cursor_runtime_proof_verdict.json`
- `tenmon_repo_hygiene_watchdog_verdict.json`
- `tenmon_self_build_execution_chain_verdict.json`
- `tenmon_self_repair_acceptance_seal_verdict.json`
- `tenmon_self_repair_safe_loop_verdict.json`
- `tenmon_system_verdict.json`
- `tenmon_worldclass_acceptance_scorecard.json`

出力・副作用:

- `api/automation/tenmon_truth_excluded_sources_registry_v1.json` — `excluded` に登録（`tenmon_latest_state_rejudge_and_seal_refresh_v1.py` が読込）
- `api/automation/quarantine/stale_evidence_v1/` — タイムスタンプ付き **コピー**（削除なし）
- `tenmon_stale_evidence_invalidation_verdict.json` の `truth_excluded_sources` / `stale_eight_invalidation`
- `tenmon_stale_evidence_invalidation_summary_v2.json` / `tenmon_stale_evidence_invalidation_report_v2.md`

無効化後は `tenmon_latest_state_rejudge_and_seal_refresh_v1.py` を再実行し、`stale_sources_present` / `stale_sources` を current-lived のみで再計算する。

オプション:

- `--no-stale-eight-registry` — レジストリ更新・隔離をスキップ
- `--no-quarantine-copy` — コピーのみスキップ（レジストリは更新）

## Phase C — downstream refresh

`continue_with_latest_truth` かつ **stale_sources が 1件以上** かつ `--no-refresh-downstream` を付けないとき、存在するスクリプトのみ順に実行:

- `tenmon_system_verdict_integrator_v1.py`（`--soft-exit-ok`）  
- `tenmon_worldclass_acceptance_scorecard_v1.py`  
- `tenmon_total_completion_master_report_v1.py`（`--no-live-probe --soft-exit-ok`）  

結果は verdict の `downstream_refresh` に記録。

## 実行

```bash
cd /opt/tenmon-ark-repo/api
bash scripts/tenmon_stale_evidence_invalidation_v1.sh
```

シェルは既定で **invalidation の後** `tenmon_latest_state_rejudge_and_seal_refresh_v1.py` を実行する。rejudge をスキップする場合は `TENMON_STALE_INV_SKIP_REJUDGE=1`。

オプション（Python に直接渡す）:

- `--no-refresh-downstream` — Phase C をスキップ（高速・build 不要）  
- `--fail-on-stale` — `stale_sources` があるとき exit 1（既定は exit 0）  
- `--stdout-json` — invalidation の verdict を標準出力  

---

*Version: 5*
