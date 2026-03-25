# TENMON_FINAL_PWA_SURFACE_LAST_MILE_EXECUTION_CURSOR_AUTO_V1

## 目的

`TENMON_FINAL_PWA_SURFACE_LAST_MILE_CURSOR_AUTO_V1` を **Cursor が実行段階で迷わず回す**ための固定手順のみを記す（設計説明は親カード参照）。

---

## 前提

- リポジトリルートで実行する（例: `/opt/tenmon-ark-repo`）。
- `sudo` が使えること（`systemctl restart tenmon-ark-api.service`）。
- API のベース URL は環境変数で上書き可: `CHAT_TS_PROBE_BASE_URL`（既定: `http://127.0.0.1:3000`）。

---

## 実行コマンド（固定）

リポジトリルートから:

```bash
bash api/scripts/tenmon_final_pwa_surface_last_mile_v1.sh --stdout-json
```

`--stdout-json` を付けると Python 側に `--stdout-json` が渡り、終了時サマリを JSON で出す（`python_stdout.json` にも tee される）。

---

## 1 回の流れ（スクリプトが行うこと）

1. ログディレクトリ作成（`/var/log/tenmon/card_TENMON_FINAL_PWA_SURFACE_LAST_MILE_V1/<TS>/`）
2. `npm run build`（`api/`）
3. `sudo systemctl restart tenmon-ark-api.service`
4. `/health`・`/api/audit`・`/api/audit.build` 待機・取得 → `gate_status.json`
5. `tenmon_final_pwa_surface_last_mile_v1.py` 実行 → `api/automation/final_pwa_surface_*.json` ほか
6. 終了コード: **acceptance PASS なら 0、FAIL なら 1**

---

## 成果物（参照パス）

| 種別 | パス |
|------|------|
| 正本 JSON | `api/automation/final_pwa_surface_*.json` |
| 実行ログ束 | `/var/log/tenmon/card_TENMON_FINAL_PWA_SURFACE_LAST_MILE_V1/<TS>/` |
| Next PDCA | `api/automation/generated_cursor_apply/TENMON_FINAL_PWA_SURFACE_LAST_MILE_NEXT_PDCA_AUTO_V1.md` |

---

## Cursor 向けメモ

- **dist 直編集禁止** — 変更は `api/src/**` 経由でビルド。
- FAIL 時は上記 `generated_cursor_apply` と `final_pwa_surface_acceptance_verdict.json` の `blockers` を単一真実源として次 PDCA を切る。
