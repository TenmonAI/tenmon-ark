# TENMON_AUTONOMY_SCOPE_ESCALATION_GOVERNOR_CURSOR_AUTO_V1

## 目的

TENMON-ARK の自動改善対象を `safe / medium / high_risk` の 3 層で統治し、運用ループと product core 侵入を分離する。  
本カードは「回ること」より先に「壊さないこと」を固定する昇格ガバナである。

## NON-NEGOTIABLES

- high-risk はデフォルト禁止
- current-run evidence なしの昇格禁止
- repo hygiene clean 前の昇格禁止
- stale truth が残る間の昇格禁止
- acceptance 未統合（rejudge/worldclass 未収束）で high-risk 解放禁止
- founder override のない強制昇格禁止

## スコープ定義

| scope | paths |
|---|---|
| safe | `api/automation/**`, `api/scripts/**`, `api/docs/constitution/**` |
| medium | `api/src/core/**`, `api/src/kokuzo/**`, `api/src/routes/chat_refactor/**` |
| high_risk | `api/src/routes/chat.ts`, `api/src/routes/chat_refactor/finalize.ts`, `web/src/**` |

## 昇格ゲート

medium 以上に必要:

- execution gate green
- repo hygiene clean
- latest truth rebased
- truth source singleton

high-risk に追加で必要:

- latest rejudge の主軸 blocker（`stale_sources` / `repo_hygiene` / `product_failure`）が解消
- worldclass acceptance 準備が true

## 実行

```bash
api/scripts/autonomy_scope_governor_v1.sh --stdout-json
```

## 成果物

- `api/automation/autonomy_scope_policy_v1.json`
- `api/automation/autonomy_scope_escalation_state_v1.json`
- `api/automation/tenmon_autonomy_scope_governor_summary.json`
- `api/automation/tenmon_autonomy_scope_governor_report.md`

## PASS 条件

- scope policy が生成済み
- current repo 上で safe/medium/high_risk 判定が動作
- hardstop false 時に safe 以外 block
- hygiene dirty 時に high-risk block
- rejudge/worldclass/stale-truth を昇格条件へ統合
- `scope_governor_pass=true`

## NEXT

- PASS: `TENMON_PRODUCT_PATCH_PLANNER_MIN_DIFF_CURSOR_AUTO_V1`
- FAIL: `TENMON_AUTONOMY_SCOPE_ESCALATION_GOVERNOR_RETRY_CURSOR_AUTO_V1`

