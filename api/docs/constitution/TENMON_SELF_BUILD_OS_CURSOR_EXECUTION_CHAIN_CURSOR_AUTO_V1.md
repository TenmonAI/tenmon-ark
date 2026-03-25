# TENMON_SELF_BUILD_OS_CURSOR_EXECUTION_CHAIN_CURSOR_AUTO_V1

## 目的

カード生成 → 投入 → 実行 → 回収 → ingest → verdict の **execution chain** を閉じ、自己構築を「カード生成の存在」ではなく **chain 完了**として観測する。  
remote admin / local bridge / result ingest を **同一 chain** の runtime proof として扱う。

## D

- **単一真実源**: `api/automation/tenmon_self_build_execution_chain_verdict.json`
- サブシステム（各 `code_present` / `runtime_proven` / `accepted_complete`）:
  - `cursor_card_generation` — bridge + card MD 検証
  - `cursor_dispatch` — campaign / tasks manifest / remote queue
  - `cursor_execution` — `cursor_kernel_result.json`（bundle_pass / overall_pass / build / acceptance）
  - `result_collection` — `cursor_result_bundle.json`
  - `result_ingest` — bridge artifacts が result bundle と整合
  - `admin_remote_build_ui` — `remote_cursor_command_center_seal.json`（契約・guard）
- **最上位**: `chain_closed`（local 5 + remote 1 がすべて `accepted_complete`）、`primary_gap`、`recommended_fix_card`、`band`（`full` / `partial_local` / `partial_remote` / `open`）
- **カードを出すだけでは completion 扱いしない**（各サブの `accepted_complete` が要）
- **self-audit**: `tenmon_system_verdict.json` を入力に取り `system_verdict_pass` を記録
- **`pass` / `chain_closed`**: 実行 chain のみ（フラグで変わらない）
- **exit**: `chain_closed` が false なら **1**；`--require-system-pass` 時は **`system_verdict_pass` が false でも 1**
- FAIL 時は **`exit 1`**（`--soft-exit-ok` で緩和）

## 入力パス（`inputs`）

| キー | 役割 |
|------|------|
| `system_verdict` | 先行 self-audit |
| `cursor_campaign_manifest` | generator / キュー文脈 |
| `cursor_tasks_manifest` | dispatch |
| `cursor_autobuild_bridge_report_v2` | ingest 接続 |
| `cursor_result_bundle` | collection |
| `cursor_kernel_result` | execution |
| `remote_cursor_command_center_seal` | remote runtime proof |
| `remote_cursor_queue` / `remote_cursor_result_bundle` | remote 補助 |

## 成果物

- `api/automation/tenmon_self_build_execution_chain_v1.py`
- `api/automation/tenmon_self_build_execution_chain_verdict.json`

## 実行

```bash
python3 api/automation/tenmon_self_build_execution_chain_v1.py
cat api/automation/tenmon_self_build_execution_chain_verdict.json
```

厳格（システム監査 PASS まで要求）:

```bash
python3 api/automation/tenmon_self_build_execution_chain_v1.py --require-system-pass
```
