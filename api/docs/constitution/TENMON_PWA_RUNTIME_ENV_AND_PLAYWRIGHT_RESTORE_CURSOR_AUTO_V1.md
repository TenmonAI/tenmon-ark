# TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_CURSOR_AUTO_V1

## 目的

PWA lived gate を止めている **実行環境断裂**（pip / Python Playwright / Node Playwright / browser / gate URL）を閉じ、**product failure と env failure を切り分け**できる状態に戻す。

## D

- **frontend / backend 本体は触らない**
- **実行環境と監査ランナーのみ**
- dist 直編集禁止
- FAIL 時は証拠束（JSON + ログ）を採取し `exit != 0`
- **driver 優先順（明示）**
  1. `python_playwright`（import + chromium smoke）
  2. `node_playwright`（`npm exec --package=playwright@1.58.2` で解決可能）
  3. いずれも不可 → `env_failure` と `reasons[]` を残して失敗
- health / audit / audit.build の URL は `_tenmon_pwa_gate_common.sh` で **一意に正規化**
- このカードでは **lived 修復はしない**（環境復旧のみ）

## 対象

- `api/scripts/_tenmon_pwa_gate_common.sh`
- `api/scripts/tenmon_pwa_runtime_env_and_playwright_restore_v1.sh`
- `api/scripts/tenmon_pwa_playwright_node_probe_v1.mjs`（Node driver 用 lived プローブ）
- `api/automation/tenmon_pwa_runtime_preflight_v1.py`
- `api/automation/tenmon_pwa_real_browser_lastmile_audit_v1.py`
- `api/automation/tenmon_pwa_real_browser_lastmile_autofix_v1.py`
- `api/scripts/tenmon_pwa_real_browser_lastmile_audit_v1.sh`
- `api/scripts/tenmon_pwa_real_browser_lastmile_autofix_v1.sh`

## 生成物

- `api/automation/pwa_runtime_env_restore_report.json`
- `api/automation/pwa_playwright_preflight.json`（`selected_driver` / `selected_launch_cmd` / `env_failure` / `reasons[]` / `browser_launch_ok` は**採用ドライバー**に対応する launch の成否。`browser_launch_ok_python` / `browser_launch_ok_node_probe` は観測用）
- **環境変数（`_tenmon_pwa_gate_common.sh` の `tenmon_pwa_export_preflight_env_v1`）**: `TENMON_PWA_PREFLIGHT_JSON`, `TENMON_PWA_PREFERRED_DRIVER`, `TENMON_PWA_DRIVER_SELECTED`, `TENMON_PWA_ENV_FAILURE`, `TENMON_PWA_PLAYWRIGHT_USABLE`, `TENMON_PWA_BROWSER_LAUNCH_OK`
- `api/automation/pwa_gate_url_normalization_report.json`
- `api/automation/pwa_probe_gap_report.json`（env vs product の切り分けメモ）
- `api/automation/pwa_runtime_env_restore_final_verdict.json`（ログの写し）
- `/var/log/tenmon/card_TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_CURSOR_AUTO_V1/<TS>/final_verdict.json`
- `api/automation/generated_cursor_apply/TENMON_PWA_LIVED_GATE_RECHECK_AND_FIX_CURSOR_AUTO_V1.md`

## 実行

```bash
bash api/scripts/tenmon_pwa_runtime_env_and_playwright_restore_v1.sh --stdout-json
```

復旧後、real browser audit（driver は preflight に従う）:

```bash
bash api/scripts/tenmon_pwa_real_browser_lastmile_audit_v1.sh --stdout-json
```
