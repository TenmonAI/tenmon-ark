# TENMON_SELF_BUILD_REAL_CLOSED_LOOP_PROOF_CURSOR_AUTO_V1

## 目的

fixture ではなく **実ジ**（`POST /api/admin/cursor/submit` 由来の `job_id`）で、

observe → submit → command center → `GET /api/admin/cursor/next`（配送観測）→ executor 成果物生成 → `POST /api/admin/cursor/result`（公式 ingest）→ `remote_build` manifest + `mac_remote_bridge_v1.py --dry-run`（delivery log 追跡）→ `tenmon_latest_state_rejudge_and_seal_refresh_v1.sh`

を **同一 `run_id` / `job_id`** で記録する。

## 入口

```bash
export FOUNDER_KEY=...   # または TENMON_REMOTE_CURSOR_FOUNDER_KEY
export TENMON_GATE_BASE=http://127.0.0.1:3000   # 任意
bash api/scripts/tenmon_self_build_real_closed_loop_proof_v1.sh
```

開発時のみ（build + triplet + execution chain のみ）:

```bash
python3 api/automation/tenmon_self_build_real_closed_loop_proof_v1.py --legacy-build-runtime-chain-only
```

## 成果物

| ファイル | 内容 |
|---------|------|
| `api/automation/tenmon_self_build_real_closed_loop_proof_summary.json` | PASS フラグ・段階ログ |
| `api/automation/tenmon_self_build_real_closed_loop_proof_report.md` | 人間可読 |
| `api/automation/tenmon_self_build_real_closed_loop_proof_verdict.json` | 互換用短縮 verdict |
| `api/automation/out/real_closed_loop/<run_id>/` | executor 出力（json/md） |

## 関連オプション

| フラグ / 環境 | 意味 |
|--------------|------|
| `--skip-rejudge` | rejudge 省略（最終 PASS 不可） |
| `--skip-bridge-dry-run-trace` | `mac_remote_bridge` 追跡省略（delivery log 検証も省略され **PASS 不可**） |
| `TENMON_REMOTE_CURSOR_FORCE_APPROVE=1` | `remote_cursor_submit_v1.sh` から投入時に `force_approve` |

## ingest 契約

- **本番経路**: `POST /api/admin/cursor/result` のみ（bundle は API が更新）。
- **CLI**: `remote_cursor_result_ingest_v1.py` はオフライン用。`--soft-exit-ok` を監視スクリプト互換で受理する。

## キュー

同一 `ready` キューに他ジョブがあると `next` が先頭を返すため、**実証はキューが空に近い状態**で実行するか、先に他ジョブを処理してから本 proof を走らせる。

## PASS 後の次カード

`TENMON_CURSOR_ONLY_REPO_HYGIENE_FINAL_SEAL_CURSOR_AUTO_V1`

## FAIL 時

`TENMON_SELF_BUILD_REAL_CLOSED_LOOP_PROOF_RETRY_CURSOR_AUTO_V1`
