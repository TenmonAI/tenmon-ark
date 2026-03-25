# TENMON_CURSOR_AGENT_REVIEW_AUTO_ACCEPT_RUNTIME_CURSOR_AUTO_V1

## 目的

Cursor Agent の `Review` / `Keep All` / `Accept All` / `Apply All` 停止を自動処理し、  
完全 bypass 可能時は自動承認、不可なら single accept runtime（manual review 明示）へ圧縮する。

## 実装

### 1) `api/automation/cursor_review_acceptor_v1.py`

- 探索順は次の固定順:
  1. `Continue without reverting`
  2. `Review`
  3. `Keep All`
  4. `Accept All`
  5. `Apply All`
- `Continue and revert` は探索対象に含めない（自動押下禁止）。
- high-risk manifest（`chat.ts` / `finalize.ts` / `web/src/` / `auth` / `queue` / `token`）は `manual_review_required=true` で停止。
- 非 darwin では `manual_review_required=true`（偽装通過しない）。
- CLI:
  - `--manifest`（推奨）
  - `--item-json`（後方互換）
  - `--timeout-sec`
  - `--poll-sec`

### 2) `api/scripts/tenmon_cursor_watch_loop.sh`

- review acceptor 呼び出しを `--manifest "$item_json"` へ統一。
- result payload に以下を保持:
  - `review_acceptor_status`
  - `review_acceptor_output_path`
  - `manual_review_required`

## 検証（Mac）

```bash
cd ~/tenmon-mac
python3 ~/tenmon-mac/cursor_review_acceptor_v1.py \
  --manifest ~/tenmon-mac/next_watch_job.json \
  --timeout-sec 60 \
  --poll-sec 1.5
```

## NON-NEGOTIABLES

- 最小diff
- 非 darwin 環境で偽装通過しない
- high-risk を自動 accept しない
- success 捏造禁止
- product core 直接改変禁止

*Version: 1*

