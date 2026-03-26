# TENMON_OVERNIGHT_FAILCLOSED_AUTONOMY_OBSERVE_V3

## 目的

overnight 主線が halt した際に、product core を一切変えず、  
どこで詰まっているかを 1 束の証拠として固定し、retry 主線を 1 枚に絞る。

## 仕様

- 観測専用（コード修正・schema 変更なし）
- 読み込み対象:
  - `tenmon_overnight_continuity_operable_pdca_orchestrator_summary.json`
  - `remote_cursor_queue.json`
  - `remote_cursor_result_bundle.json`
  - `tenmon_latest_state_rejudge_summary.json`
  - `tenmon_worldclass_acceptance_scorecard.json`
  - `/api/health` `/api/audit` `/api/audit.build`
- 出力:
  - `halt_axis`
  - `halt_reason`
  - `latest_selected_card`
  - `recommended_retry_card`（常に 1 本）
  - `retry_priority_order`
  - `proof_bundle`（パスと health/audit の snapshot）

