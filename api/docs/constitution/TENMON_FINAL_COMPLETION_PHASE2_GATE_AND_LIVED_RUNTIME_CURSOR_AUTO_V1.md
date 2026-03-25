# TENMON_FINAL_COMPLETION_PHASE2_GATE_AND_LIVED_RUNTIME_CURSOR_AUTO_V1

## 目的

**gate 契約の整合**（`/api/health` / audit）と **Playwright lived 実行環境の真復旧** を通し、gate 濁りと env false を除去する Phase2。  
子カード相当: `TENMON_GATE_CONTRACT_HEALTH_ALIGNMENT_*` + `TENMON_PWA_RUNTIME_ENV_AND_PLAYWRIGHT_RESTORE_*`。

## D

- **gate / env 専用**・product 機能は最小 diff
- health は **`/api/health` 実装**（既存 `routes/health.ts` を `index.ts` でマウント）か **`TENMON_GATE_HEALTH_OPTIONAL=1`** のどちらかに固定
- env false と product false を分離（preflight の `preflight_notes` 参照）
- **Chromium 共有ライブラリ**: `tenmon_pwa_runtime_env_and_playwright_restore_v1.sh` 内で  
  `python3 -m playwright install-deps chromium` + apt フォールバック（`libatk1.0-0` 等）

## 成果物

- `api/automation/tenmon_phase2_gate_and_runtime_verdict.json`（`tenmon_phase2_gate_and_runtime_verdict_v1.py`）

## 実行

```bash
cd /opt/tenmon-ark-repo/api
npm run build
sudo systemctl restart tenmon-ark-api.service

curl -i http://127.0.0.1:3000/api/health || true
curl -fsS http://127.0.0.1:3000/api/audit
curl -fsS http://127.0.0.1:3000/api/audit.build

python3 api/automation/tenmon_gate_contract_health_alignment_v1.py
bash api/scripts/tenmon_pwa_runtime_env_and_playwright_restore_v1.sh --stdout-json || true
cat api/automation/pwa_playwright_preflight.json

python3 api/automation/tenmon_phase2_gate_and_runtime_verdict_v1.py --refresh-gates --stdout-json
cat api/automation/tenmon_phase2_gate_and_runtime_verdict.json
```

`phase2_pass` が false のとき **exit 1**。

## FAIL_NEXT

`TENMON_FINAL_COMPLETION_PHASE2_GATE_AND_LIVED_RUNTIME_RETRY_CURSOR_AUTO_V1`
