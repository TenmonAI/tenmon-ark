# TENMON_OVERNIGHT_LOOP_RESUME_STABLE_CURSOR_AUTO_V1

## 目的

overnight loop の停止・揺れを減らし、current-run 結果と stale truth を踏まえて安定稼働させる。

## 変更点（最小diff）

- stale 判定は **rejudge verdict を優先**（既存ロジックを維持しつつ blockers に反映）。
- `remote_cursor_queue.json` の delivered で `leased_until` が過去の場合、`delivered_lease_expired` を blocker に追加（観測のみ）。
- resume モードで `first_live_bootstrap_validation_failed` のとき、**無限停止（常に exit 1）**にならないよう、`next_best_card` を `TENMON_AUTONOMY_FIRST_LIVE_BOOTSTRAP_RETRY_CURSOR_AUTO_V1` に寄せて **exit 0**（成功捏造ではなく「次の一手提示」）。

## reset helper

`api/automation/tenmon_overnight_loop_reset_helper_v1.py` を追加。

できること（evidence 付き backup を `api/automation/out/overnight_reset/<run_id>/` に残す）:
- state reset
- queue reset（items を pending へ）
- lock file 削除
- stale truth refresh（`tenmon_latest_truth_rebase_and_stale_evidence_close_v1.sh` 実行）

### 実行例

```bash
cd /opt/tenmon-ark-repo/api
python3 automation/tenmon_overnight_loop_reset_helper_v1.py --clear-lock --reset-state --reset-queue --refresh-stale-truth
cat automation/tenmon_overnight_loop_reset_helper_summary.json | python3 -m json.tool
```

## 検証

```bash
cd /opt/tenmon-ark-repo/api
python3 -m py_compile automation/tenmon_overnight_full_autonomy_completion_loop_v1.py
python3 -m py_compile automation/tenmon_overnight_loop_reset_helper_v1.py
```

*Version: 1*

