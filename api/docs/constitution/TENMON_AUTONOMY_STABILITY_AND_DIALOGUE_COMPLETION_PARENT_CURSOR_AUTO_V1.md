# TENMON_AUTONOMY_STABILITY_AND_DIALOGUE_COMPLETION_PARENT_CURSOR_AUTO_V1

## 目的

TENMON-ARK の自動構築ループを、**膨張させず**・**誤判定を増やさず**・**会話品質主線へ確実に接続**し、最終的に **autonomy constitution seal** まで進めるための **親カード**（順序固定・観測と束ねのみ。子の実装詳細は各憲章に従う）。

## D（非交渉）

- 最小 diff
- 1 変更 = 1 検証の姿勢
- 観測 → 実装 → build → restart → audit → acceptance の順固定（子カードの憲章に従う）
- success 捏造禁止
- dist 直編集禁止
- **high-risk は無差別実行しない**（承認・escrow・guard 経由のみ）
- **FAIL 時は証拠束を残して停止**（親 summary / retry stub）

## 実行順（子・固定）

1. `TENMON_CURSOR_SINGLE_FLIGHT_QUEUE_AND_REVIEW_GATE_CURSOR_AUTO_V1`
2. `TENMON_OS_OUTPUT_CONTRACT_NORMALIZE_CURSOR_AUTO_V1`
3. `TENMON_LATEST_STATE_REJUDGE_AND_SEAL_REFRESH_CURSOR_AUTO_V1`
4. `TENMON_MAC_CURSOR_EXECUTOR_RUNTIME_BIND_CURSOR_AUTO_V1`
5. `TENMON_APPROVED_HIGH_RISK_REAL_RUN_GUARD_AND_AUDIT_CURSOR_AUTO_V1`
6. `TENMON_IMPROVEMENT_LEDGER_CURSOR_AUTO_V1`
7. `TENMON_R1_20A_DETAILPLAN_STABILIZE_CURSOR_AUTO_V1`
8. `TENMON_K1_SUBCONCEPT_GENERAL_EXECUTION_CAMPAIGN_CURSOR_AUTO_V1`
9. `TENMON_FINAL_PWA_CONVERSATION_COMPLETION_PDCA_LOOP_CURSOR_AUTO_V1`
10. `TENMON_CONVERSATION_COMPLETION_3STAGE_ESCORT_AUTOPDCA_CURSOR_AUTO_V1`
11. `TENMON_CURSOR_ONLY_REPO_HYGIENE_FINAL_SEAL_CURSOR_AUTO_V1`
12. `TENMON_AUTONOMY_CONSTITUTION_SEAL_V1`

実体のスクリプト対応は `api/automation/tenmon_autonomy_stability_and_dialogue_completion_parent_v1.py` の `STEP_SCRIPTS` を参照（リポジトリの実ファイルに合わせて更新される）。

## 完了条件（親）

- queue が single-flight で安定している（子の観測・成果物で確認）
- output contract の誤判定が減る（normalizer / scorecard 系の差分で確認）
- latest state の単一真実源が更新される
- Mac executor bind が runtime 証拠つきで確認できる
- approved high-risk の real run guard が動く（無差別実行していない）
- improvement ledger が残る
- detailPlan が常に object（R1 20A 系の観測）
- K1 / SUBCONCEPT / GENERAL の改善主線が動く
- final PWA conversation completion PDCA が回る
- 3-stage escort で段階収束できる
- repo hygiene seal 候補まで寄る
- autonomy constitution seal の真偽が evidence で出る（`release_freeze_autonomy_seal_summary.json` 等）

## 起動

```bash
export TENMON_REPO_ROOT=/path/to/tenmon-ark-repo
python3 api/automation/tenmon_autonomy_stability_and_dialogue_completion_parent_v1.py
```

## 出力

- `api/automation/tenmon_autonomy_stability_and_dialogue_completion_parent_summary.json`
- `api/automation/tenmon_autonomy_stability_and_dialogue_completion_parent_report.md`
- 失敗時: `api/automation/generated_cursor_apply/TENMON_AUTONOMY_STABILITY_AND_DIALOGUE_COMPLETION_PARENT_RETRY_CURSOR_AUTO_V1.md`

## next

- **nextOnPass**: `TENMON_CURSOR_SINGLE_FLIGHT_QUEUE_AND_REVIEW_GATE_CURSOR_AUTO_V1`（次周回の先頭から再実行）
- **nextOnFail**: 停止。safe retry 1 枚のみ生成。
