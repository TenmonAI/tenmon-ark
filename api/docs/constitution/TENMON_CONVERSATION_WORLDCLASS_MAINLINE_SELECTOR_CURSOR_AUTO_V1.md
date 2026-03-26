# TENMON_CONVERSATION_WORLDCLASS_MAINLINE_SELECTOR_CURSOR_AUTO_V1

## 目的

会話品質の観測結果から、safe/medium と manual-gate を分離し、
`next_best_card` を 1 本に確定する。

## 実装

- `api/automation/tenmon_conversation_worldclass_mainline_selector_v1.py`
- 出力:
  - `tenmon_conversation_worldclass_mainline_selector.json`
  - `tenmon_conversation_worldclass_mainline_selector.md`

## 非交渉

- 観測/優先順位決定のみ（product core 不変更）
- stale source 明示
- current-run evidence 優先

*Version: 1*

