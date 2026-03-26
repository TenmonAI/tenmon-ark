# TENMON_CONTINUITY_HOLD_DENSITY_AND_SINGLE_SOURCE_REJUDGE_BUNDLE_PARENT_CURSOR_AUTO_V1

## 目的

親オーケストレーター投入前に、以下 6 カードを **固定順 / 1枚ずつ / fail-closed** で束ねて足場を閉じる。

1. `TENMON_CONTINUITY_HOLD_DENSITY_AND_SINGLE_SOURCE_REJUDGE_CURSOR_AUTO_V1`
2. `TENMON_REAL_EXECUTION_RESULT_EVIDENCE_BIND_CURSOR_AUTO_V1`
3. `TENMON_PWA_THREADID_CONTINUITY_LIVED_PROOF_REPAIR_CURSOR_AUTO_V1`
4. `TENMON_SCORECARD_EXIT_CODE_FIX_CURSOR_AUTO_V1`
5. `TENMON_DAYBREAK_REARM_AND_DIALOGUE_PRIORITY_REFRESH_CURSOR_AUTO_V1`
6. `TENMON_CLOSED_LOOP_REAL_EXECUTION_SEAL_CURSOR_AUTO_V1`

## 実装

- `api/automation/tenmon_continuity_hold_density_and_single_source_rejudge_bundle_parent_v1.py`
- `api/scripts/tenmon_continuity_hold_density_and_single_source_rejudge_bundle_parent_v1.sh`

## 実行契約

- 1カード実行ごとに verify chain を固定実行:
  - `npm run build`
  - `sudo systemctl restart tenmon-ark-api.service`
  - `curl /api/health`
  - `curl /api/audit.build`
  - `tenmon_pwa_lived_completion_seal_v1.py`
  - `tenmon_latest_state_rejudge_and_seal_refresh_v1.py`
  - `tenmon_worldclass_acceptance_scorecard_v1.py`
- 失敗時は即停止（fail-closed）
- 成功捏造禁止
- 親は orchestration のみ（queue/bundle の直接捏造なし）
- halt 時は retry stub 1枚のみ生成

## 受け入れ基準

- 6枚の実行記録が summary に揃う
- `continuity response_len >= 80`
- latest current-run entry が `dry_run_started` から脱出
- scorecard 実行契約が exit 0
- `daybreak next_run_ready = true`

## 出力

- `api/automation/tenmon_continuity_hold_density_and_single_source_rejudge_bundle_parent_summary.json`
- `api/automation/tenmon_continuity_hold_density_and_single_source_rejudge_bundle_parent_report.md`
- 失敗時:
  - `api/automation/generated_cursor_apply/TENMON_CONTINUITY_HOLD_DENSITY_AND_SINGLE_SOURCE_REJUDGE_BUNDLE_PARENT_RETRY_CURSOR_AUTO_V1.md`

## nextOnPass

`TENMON_SLEEP_UNTIL_4AM_CONTINUITY_AND_OPERABLE_ASCENT_PARENT_CURSOR_AUTO_V1`

## nextOnFail

停止。retry 1枚のみ。

