# AUTO_BUILD_SUPERVISOR_V1

## 目的

Runner 上位で **失敗分類**、**回帰ガード**、**human gate**、**次カード決定**を統括する。

## fail classifier（`fail_classifier_v1.py`）

| 区分 | 説明 |
|------|------|
| build_failure | ビルド失敗 |
| type_error | TypeScript 型エラー |
| route_regression | ルート挙動後退 |
| health_failure | `/health` 失敗 |
| acceptance_failure | 受理検査失敗 |
| forbidden_diff | forbiddenPaths 違反 |
| mixed_commit | クライアント/API/docs 混在コミット |
| human_judgement_required | 人間判断必須 |
| unknown | 分類不能 |

## regression guard（`regression_guard_v1.py`）

v1 は **最小**（偽陽性回避）:

- `build_pass_health_fail` の組み合わせ検知
- `routeReason` / `responsePlan` / `decisionFrame.ku` の **厳密検査は smoke 接続予定**（プレースホルダ）

## human_judgement_required 条件

- 正典（scripture canon）**本文の意味**に触れる
- thought guide **本文**
- persona constitution **本文**
- verified / supported / refutes **判定ロジック変更**
- KHS law の**意味内容**書き換え  

→ カードで `requiresHumanJudgement: true` または `human_gate`。**自動確定禁止**。

## Supervisor 制御

- `nextOnPass` / `nextOnFail` / `quarantine` / `STOP` を JSON で返す（v1 は Runner 結果に `nextOnPass` を透過）。

## ログ（証拠束）

`TENMON_CARD_LOG_ROOT` または `/var/log/tenmon/card_<CARD>/<TS>/`（不可なら `api/automation/_card_logs/`）に:

- `run.log`
- `result.json`
- `diff_summary.json`
- `acceptance_summary.json`

## 検証・シミュレーション

```bash
cd /opt/tenmon-ark-repo/api/automation
python3 supervisor_v1.py --repo-root ../.. --validate-only
python3 supervisor_v1.py --repo-root ../.. --dry-run --simulate AUTO_BUILD_CONDUCTOR_V1,ROUTE_DUPLICATION_SCAN_V1,CHAT_TS_COMPLEXITY_AUDIT_V1
```

### Simulation 記録（サンプル 3 カード）

| 日付 | コマンド | 結果概要 |
|------|----------|----------|
| （実行時） | `--validate-only` | DAG + catalog 必須キー検証 |
| （実行時） | `--dry-run --simulate …` | 3 カード OBSERVE/PRECHECK/PATCH/ACCEPTANCE プラン記録、ログ出力 |

## キュー JSON

`queueStatus`: `completed` / `failed` / `blocked_human_gate` / `pending`

## 次カード候補（1 つ）

`AUTO_BUILD_HUMAN_GATE_UI_V1` — human gate 承認を記録する最小フロー（docs + オプションで署名ファイル）
