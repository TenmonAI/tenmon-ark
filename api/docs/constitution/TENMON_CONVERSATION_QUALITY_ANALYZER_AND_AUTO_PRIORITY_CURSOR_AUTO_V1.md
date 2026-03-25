# TENMON_CONVERSATION_QUALITY_ANALYZER_AND_AUTO_PRIORITY_CURSOR_AUTO_V1

## 目的

会話ログと実プローブ証跡を使って会話品質残差を抽出し、優先順位を deterministic に決めて safe な next cards を出力する。

## 対象

- `api/automation/conversation_quality_analyzer_v1.py`
- `api/automation/conversation_quality_auto_card_generator_v1.py`
- `api/automation/tenmon_conversation_quality_priority_summary.json`
- `api/automation/state_convergence_next_cards.json`

## 解析方針

- 入力は `conversation_log`（直近 24h / 最大 800 pair）と `api/automation/*probe*.json`, `pwa_real_chat_trace.json`。
- ビルトイン自己テストは混ぜない（hallucination 的水増し禁止）。
- stale 判定は最新会話/プローブ時刻が 48h 超の場合。

## 軸（優先順）

1. `k1_trace_empty_short_response`
2. `general_knowledge_insufficient_substance`
3. `self_view_generic_tone_residual`
4. `factual_weather_correction_residual`
5. `continuity_short_input_hold_residual`
6. `greeting_style_polish`
7. `template_leak_recurrence`

## 出力

- `tenmon_conversation_quality_priority_summary.json`
  - `quality_findings`, `counts`, `evidence_probes`, `recommended_next_cards`, `next_best_card`, `stale_sources_present`
- `state_convergence_next_cards.json`
  - `next_cards` に safe cards を優先順で反映

## NON-NEGOTIABLES

- high-risk 本体（`chat.ts`）は自動修正しない
- fixture / stale の成功を品質改善完了判定に使わない
- `dist/` 直編集禁止

*Version: 1*
