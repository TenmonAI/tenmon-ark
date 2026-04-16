# TENMON_ULTRA_FORENSIC_REVEAL_V3_CURSOR_AUTO_V1

## 目的

VPS に長い bash / heredoc を貼る方式を廃止し、**リポジトリ内スクリプトだけ**でTENMON-ARK全体のレントゲン監査を安定生成する。

## 非改変

- `dist/**`、`chat.ts` 本体、route 本体、DB schema、`kokuzo_pages` 正文、systemd env、`/api/chat` 契約、学習本体ロジック — **変更しない**（本カードは監査のみ）。

## 正本

| 種別 | パス |
|------|------|
| Shell（VPS はこれだけ） | `api/scripts/tenmon_ultra_forensic_reveal_v3.sh` |
| Python インテグレータ | `api/automation/tenmon_ultra_forensic_integrator_v1.py` |

## VPS 一行実行

リポジトリが `/opt/tenmon-ark-repo` にある前提:

```bash
bash /opt/tenmon-ark-repo/api/scripts/tenmon_ultra_forensic_reveal_v3.sh
```

出力先（既定）:

- `/var/log/tenmon/card_TENMON_ULTRA_FORENSIC_REVEAL_V3/<UTC_TS>/`
- 参照用シンボリックリンク: `/var/log/tenmon/card_TENMON_ULTRA_FORENSIC_REVEAL_V3/latest`

任意で出力ディレクトリ固定:

```bash
TENMON_ULTRA_FORENSIC_OUT_DIR=/tmp/ultra_xray bash api/scripts/tenmon_ultra_forensic_reveal_v3.sh
```

## 環境変数

| 変数 | 意味 |
|------|------|
| `CHAT_TS_PROBE_BASE_URL` | 既定 `http://127.0.0.1:3000` |
| `ULTRA_SKIP_SYSTEMD_RESTART=1` | `systemctl restart` をスキップ（API 既起動時） |
| `TENMON_ORCHESTRATOR_SEAL_DIR` | `final_verdict.json` を明示コピー元に |
| `TENMON_ULTRA_FORENSIC_OUT_DIR` | 出力ディレクトリ上書き |

## 生成物（必須）

`$DIR` に少なくとも以下:

- `runtime_matrix.json`
- `worldclass_report.json`
- `seal_verdict.json`（無ければ stub）
- `chat_static_forensic.json`
- `output_contracts.json`（worldclass / seal / runtime / cognition / orchestrator 束ね）
- `storage_backup_nas.json`（短いブロック）
- `total_xray_reveal.json`
- `subsystem_readiness_matrix.json`
- `crouching_functions.json`
- `missing_runners.json`
- `output_contract_mismatches.json`
- `integrated_master_verdict.json`
- `next_priority_cards.json`
- `run.log`
- `TENMON_ULTRA_FORENSIC_REVEAL_V3_VPS_V1`（マーカー）

## 内訳

1. `npm run build`（失敗しても続行）
2. `systemctl restart`（スキップ可）
3. `/health` / `/api/audit`
4. runtime matrix（`/api/chat` 自動検出）
5. worldclass 静的レポート
6. seal verdict（読み取りコピー or stub）
7. full orchestrator スナップ（read-only）
8. NAS/backup 短ブロック
9. `tenmon_ultra_forensic_integrator_v1.py` で束ね

## VPS / FAIL

- **VPS マーカー**: `TENMON_ULTRA_FORENSIC_REVEAL_V3_VPS_V1`
- **FAIL_NEXT**: `TENMON_ULTRA_FORENSIC_REVEAL_V3_RETRY_CURSOR_AUTO_V1`
