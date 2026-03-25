# TENMON_GATE_CONTRACT_HEALTH_ALIGNMENT_CURSOR_AUTO_V1

## 目的

`/api/audit`・`/api/audit.build` が通る一方 `/api/health` が欠落していると gate 判定が濁る。  
**health / audit / audit.build の契約を一本化**し、lived / readiness で false fail を混ぜない。

## D

- backend **最小 diff**
- **gate / readiness 層のみ**（product 大改修禁止）
- `/api/audit`・`/api/audit.build` の既存契約を壊さない
- **A 案**: `/api/health` を実装（`routes/health.ts` を `/api` にマウント）
- **B 案**: health を契約外にする場合は `TENMON_GATE_HEALTH_OPTIONAL=1` で明示し、404 を product failure と混同しない

## 実装メモ（本リポジトリ）

- `api/src/index.ts`: `app.use("/api", healthRouter)` により **GET /api/health**（`getHealthReport()`）を提供
- ルート **GET /health** は後方互換のまま残す
- `api/scripts/_tenmon_pwa_gate_common.sh`: `GATE_HEALTH_URL=${BASE}/api/health`
- `api/automation/tenmon_pwa_runtime_preflight_v1.py`: gate レポートの health URL を `/api/health` に統一
- `api/automation/tenmon_pwa_lived_completion_seal_v1.py`: **`/api/health` 優先**、無い場合のみ `/health`

## 成果物

- `api/automation/tenmon_gate_contract_health_alignment_v1.py`
- `api/automation/tenmon_gate_contract_verdict.json`

## 実行

```bash
cd /opt/tenmon-ark-repo/api
npm run build
sudo systemctl restart tenmon-ark-api.service   # デプロイ環境
curl -i http://127.0.0.1:3000/api/health || true
curl -fsS http://127.0.0.1:3000/api/audit
curl -fsS http://127.0.0.1:3000/api/audit.build
python3 api/automation/tenmon_gate_contract_health_alignment_v1.py
cat api/automation/tenmon_gate_contract_verdict.json
```

オプション（B 案の検証）:

```bash
TENMON_GATE_HEALTH_OPTIONAL=1 python3 api/automation/tenmon_gate_contract_health_alignment_v1.py
```

FAIL 時は **exit 1**（`gate_contract_aligned=false`）。
