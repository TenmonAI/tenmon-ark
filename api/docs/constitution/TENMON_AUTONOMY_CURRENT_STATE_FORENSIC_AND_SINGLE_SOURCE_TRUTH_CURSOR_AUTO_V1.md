# TENMON_AUTONOMY_CURRENT_STATE_FORENSIC_AND_SINGLE_SOURCE_TRUTH_CURSOR_AUTO_V1

## 目的

TENMON-ARK の自動構築・Mac/Cursor 連携・会話品質・acceptance の**現況**を、VPS 上の `api/automation` 実ファイルとローカル HTTP ゲート（`/api/health` 等）だけから集約し、**単一の真実源**（JSON + MD）に固定する。

## 非交渉条件

- **観測専用**（product core・`chat.ts` / `finalize.ts` / `web/src/**` は変更しない）
- stale truth を混ぜない（入力の鮮度・analyzer の `stale_sources` を `stale_sources` に列挙）
- `dist/` 直編集禁止（本カードは読み取りのみ）

## 実行（VPS）

```bash
cd /opt/tenmon-ark-repo/api
export TENMON_FORENSIC_API_BASE=http://127.0.0.1:3000
python3 automation/tenmon_autonomy_current_state_forensic_v1.py
```

または:

```bash
./scripts/tenmon_autonomy_current_state_forensic_v1.sh
```

## 出力

| ファイル | 内容 |
|---------|------|
| `api/automation/tenmon_autonomy_current_state_forensic.json` | 構造化現況（single-source） |
| `api/automation/tenmon_autonomy_current_state_forensic.md` | 人間可読サマリ |

## JSON フィールド（最低限）

| キー | 意味 |
|------|------|
| `system_ready` | `/api/health`・`/api/audit`・`/api/audit.build` がいずれも成功 |
| `queue_summary` | `remote_cursor_queue.json` の件数・状態集計 |
| `latest_nonfixture_roundtrip_ok` | 最新 non-fixture executed と bundle 突合の成否（証跡が無い場合は `null`） |
| `refresh_auth_ok` | src/dist に executor-token 系パスが揃い、refresh POST が 404 ではない（空 body で 400 系） |
| `watch_loop_stable` | `tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json` が新鮮で主要ステップ完了 |
| `result_return_ok` | queue `id` と bundle `queue_id` の交差あり |
| `rejudge_bound` | rejudge summary / verdict に `generated_at` がある |
| `worldclass_score` | `tenmon_worldclass_acceptance_scorecard.json` の `score_percent`（無ければ loop 出力） |
| `conversation_quality_band` | analyzer 鮮度 + カウントから粗い帯 |
| `current_blockers` | loop + rejudge 由来のブロッカー統合 |
| `next_best_card` | loop（非 stale）→ rejudge → scorecard の順で **1 本** |
| `safe_next_cards` | loop または generated_cards の safe 候補 |

## 入力に読むファイル（VPS 実データ）

- `remote_cursor_queue.json` / `remote_cursor_result_bundle.json`
- `tenmon_worldclass_dialogue_acceptance_priority_loop_v1.json`
- `tenmon_conversation_quality_priority_summary.json` / `conversation_quality_generated_cards.json`
- `tenmon_latest_state_rejudge_summary.json` / `tenmon_latest_state_rejudge_and_seal_refresh_verdict.json`
- `tenmon_worldclass_acceptance_scorecard.json`
- `src/routes/adminFounderExecutorToken.ts` と `dist/routes/adminFounderExecutorToken.js`（パス文字列の parity のみ）

*Version: 1*
