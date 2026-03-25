# TENMON_REMOTE_BUILD_SEAL_AND_ROLLBACK_CURSOR_AUTO_V1

## 目的

遠隔 Cursor 実行の **result bundle**（`remote_build_result_collector_v1` 出力）を読み、

- **sealed**（acceptance PASS）
- **rollback_needed**
- **retry_possible**
- **blocked**（危険パッチ）

を **一意に裁定**する。rollback / retry は **計画・dispatch 生成まで**（自動 git / deploy はしない）。

## 実装

| 種別 | パス |
|------|------|
| Governor | `api/automation/remote_build_seal_governor_v1.py` |
| Rollback plan | `api/automation/rollback_plan_generator_v1.py` |
| Retry dispatch | `api/automation/retry_dispatch_generator_v1.py` |
| 裁定 JSON | `api/automation/out/remote_build_final_verdict.json` |
| rollback | `api/automation/out/rollback_plan.json` |
| retry | `api/automation/out/retry_dispatch.json` |
| blocked | `api/automation/out/blocked_reason_report.json` |

## API（founder 必須）

| メソッド | パス |
|----------|------|
| GET | `/api/admin/remote-build/final-verdict` |
| POST | `/api/admin/remote-build/seal-run` |

## CLI

```bash
cd /opt/tenmon-ark-repo/api
python3 automation/remote_build_seal_governor_v1.py --bundle automation/out/remote_build_result_bundle.json
```

## VPS 検証

```bash
bash api/src/scripts/tenmon_remote_build_seal_and_rollback_vps_v1.sh
```

## 次工程（全体監査）

`TENMON_ADMIN_REMOTE_BUILD_FULL_AUDIT_CURSOR_AUTO_V1` で 7層 end-to-end を complete / partial / blocked で最終判定。

## FAIL 次カード

- `TENMON_REMOTE_BUILD_SEAL_AND_ROLLBACK_RETRY_CURSOR_AUTO_V1`
