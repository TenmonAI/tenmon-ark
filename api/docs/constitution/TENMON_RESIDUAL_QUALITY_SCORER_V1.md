# TENMON_RESIDUAL_QUALITY_SCORER_V1

## 目的

surface / route / longform / density / baseline の **残差を 0〜100 で数値化**し、**改善優先順位（最低軸・blocker 1〜3）** を next card generator 向け JSON で出す。

## 実装方針

- **採点式の単一ソース:** `tenmon_chat_ts_residual_quality_score_v1.py` の `score_*` / `pick_lowest_axes` を **インポート再利用**（数値の一貫性）。
- **公開スキーマ名:** 5 軸は `*_score` サフィックス（`residual_quality_schema_v1.json`）。
- **入力の束ね方:**
  - seal ディレクトリ（`final_verdict.json`, audits, `runtime_matrix.json`, `density_lock_verdict.json`, `worldclass_report.json`）
  - 任意: `--worldclass-report` で report パス上書き
  - 任意: `improvement_ledger_entries_v1.jsonl` テールから **blocker 再発**を読み、軸重みと blocker 優先度に反映

## 出力

| ファイル | 内容 |
|----------|------|
| `residual_quality_score.json` | 5 軸スコア・詳細・`overall_residual_score`・正規化 `axis_weights` |
| `residual_priority_result.json` | `blocker_priority_top3`・`next_actions`（cursor/vps/stub）・ledger 再発上位 |
| `final_verdict.json` | VPS 用サマリ（`residual_scorer_pass` 等） |

## CLI

```bash
cd /opt/tenmon-ark-repo/api
python3 automation/residual_quality_scorer_v1.py score \
  --seal-dir "$(readlink -f /var/log/tenmon/card)" \
  --out-dir /tmp/rq_out

# サンプル（デモ用一時 seal）
python3 automation/residual_quality_scorer_v1.py demo --stdout-json
```

## VPS

- カード: `TENMON_RESIDUAL_QUALITY_SCORER_VPS_V1`
- スクリプト: `api/scripts/residual_quality_score_v1.sh`

## 編集境界

- `chat.ts` / route 本体 / DB / `dist` / systemd env は変更しない。

## カード

- `TENMON_RESIDUAL_QUALITY_SCORER_CURSOR_AUTO_V1`
- `TENMON_RESIDUAL_QUALITY_SCORER_VPS_V1`
- `TENMON_RESIDUAL_QUALITY_SCORER_RETRY_CURSOR_AUTO_V1`
