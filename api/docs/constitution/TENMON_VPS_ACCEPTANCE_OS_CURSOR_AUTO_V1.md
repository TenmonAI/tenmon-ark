# TENMON_VPS_ACCEPTANCE_OS_CURSOR_AUTO_V1

## 目的

VPS 上で **build → restart → health → audit → runtime probe（10 本）→ seal（既存スクリプト再利用）** を固定順で実行し、**static / runtime / seal_contract / regression** の 4 軸で `integrated_acceptance_seal.json` を出す acceptance OS。

## 実行

```bash
export ROOT=/opt/tenmon-ark-repo
bash api/scripts/vps_acceptance_os_v1.sh
```

### 環境変数

| 変数 | 説明 |
|------|------|
| `CHAT_TS_PROBE_BASE_URL` | API ベース URL（既定 `http://127.0.0.1:3000`） |
| `VPS_ACCEPTANCE_SKIP_RESTART` | `1` で build のみ（restart 省略） |
| `VPS_ACCEPTANCE_SKIP_SEAL_SCRIPT` | `1` を付与すると seal スクリプト省略（`--skip-seal-script`） |
| `TENMON_VPS_ACCEPTANCE_OUT_DIR` | スナップショット出力先 |
| `TENMON_VPS_ACCEPTANCE_UNIT` | forensics 用 systemd ユニット（既定 `tenmon-ark-api.service`） |

## 成果物（`api/automation/` 安定パス + `out/tenmon_vps_acceptance_os_v1/<TS>/`）

| ファイル | 内容 |
|----------|------|
| `vps_acceptance_report.json` | 実行サマリ |
| `runtime_probe_matrix.json` | 10 本 `/api/chat` |
| `failure_forensics_bundle.json` | 失敗時のみ詳細採取（pass 時は skipped） |
| `regression_report.json` | baseline との比較 |
| `integrated_acceptance_seal.json` | 4 軸統合 |
| `TENMON_VPS_ACCEPTANCE_OS_VPS_V1` | VPS マーカー |
| `vps_acceptance_baseline_v1.json` | **全体 PASS 時のみ**更新 |

## 方針

- **rollback_planner** は観測提案のみ（自動適用しない）
- **failure_forensics** は journal / systemctl / git / ss を含む
- seal は `chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh` を **`TENMON_SEAL_DIR_OVERRIDE`** + **`CHAT_TS_RUNTIME_SKIP_SYSTEMD_RESTART=1`** で呼び出し（二重 restart 防止）

## 失敗時

`TENMON_VPS_ACCEPTANCE_OS_CURSOR_AUTO_RETRY_V1`
