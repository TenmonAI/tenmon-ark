# TENMON_WORLDCLASS_DIALOGUE_ACCEPTANCE_AND_PRIORITY_LOOP_CURSOR_AUTO_V1

## 目的

会話品質分析・next card 生成・acceptance scorecard を **同一 current-run** で束ね、TENMON-ARKの完成度を queue-driven で上げ続ける運転系の入口を固定する。

## 実行

```bash
cd api
export TENMON_REPO_ROOT=/path/to/tenmon-ark-repo
# 任意: 稼働 API への health を current-run 証跡に載せる
export TENMON_LOOP_PROBE_BASE=http://127.0.0.1:3000
./scripts/tenmon_worldclass_dialogue_acceptance_priority_loop_v1.sh
```

または:

```bash
python3 api/automation/tenmon_worldclass_dialogue_acceptance_priority_loop_v1.py
```

## 出力（`api/automation/`）

| ファイル | 内容 |
|---------|------|
| `tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json` | overall band・worldclass score・blockers・next_best・safe_next_cards・steps |
| `tenmon_worldclass_dialogue_acceptance_priority_loop_v1.md` | 人間可読サマリ |

既存パイプライン更新:

- `tenmon_conversation_quality_priority_summary.json`（analyzer）
- `conversation_quality_generated_cards.json` / `state_convergence_next_cards.json`（generator）
- `tenmon_worldclass_acceptance_scorecard.json` / `.md`（scorecard）

## 束ねる処理順（固定）

1. current-run health（`TENMON_LOOP_PROBE_BASE` 設定時のみ `GET /api/health`）
2. `conversation_quality_analyzer_v1.py`
3. `conversation_quality_auto_card_generator_v1.py`
4. `improvement_quality_bridge_v1.py`（存在すれば実行・失敗してもループ全体は継続）
5. `tenmon_worldclass_acceptance_scorecard_v1.py`

## 判定（捏造禁止）

- **worldclass_score** は `tenmon_worldclass_acceptance_scorecard.json` の **score_percent** のコピーのみ。
- **acceptance_seal_allowed** は `sealed_operable_ready && worldclass_ready && !stale_sources_present`（会話証跡が stale のときは seal 不可）。
- fixture 成功の偽装・固定 seed の合格偽装は行わない。

## NON-NEGOTIABLES

- stale truth を seal 根拠にしない（analyzer の `stale_sources_present` を尊重）
- `dist/` 直編集禁止
- スコアの手入力捏造禁止

*Version: 1*
