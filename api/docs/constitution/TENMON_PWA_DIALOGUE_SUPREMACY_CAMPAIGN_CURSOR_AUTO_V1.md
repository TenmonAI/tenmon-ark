# TENMON_PWA_DIALOGUE_SUPREMACY_CAMPAIGN_CURSOR_AUTO_V1

## 目的

PWA 会話品質を夜間 PDCA の主戦場に固定し、  
analysis/priority/next-card generation/loop weighting を会話中心へ寄せる。

## 実装対象

- `api/automation/conversation_quality_analyzer_v1.py`
- `api/automation/conversation_quality_auto_card_generator_v1.py`
- `api/automation/tenmon_worldclass_dialogue_acceptance_priority_loop_v1.py`

## 反映内容

- dialogue priority axes を固定:
  - `k1_depth`
  - `general_substance`
  - `self_view_authenticity`
  - `subconcept_leak_and_context_carry`
  - `pwa_continuity_lived_experience`
- analyzer に以下を追加:
  - `dialogue_priority_axes`
  - `dialogue_quality_findings`
  - `safe_next_cards`
  - `manual_gate_cards`
  - `conversation_quality_band`
- generator で `safe_next_cards` と `manual_gate_cards` を分離維持
- worldclass loop で `next_best_card` を dialogue priority order で決定
- campaign single-source:
  - `api/automation/tenmon_pwa_dialogue_supremacy_campaign_summary.json`

## 運用

- safe/analysis 層の更新のみ（product core 変更なし）
- デーモン再起動なしで次 cycle から反映可能
- high-risk 本体改変カードは朝承認（manual gate）へ回す

*Version: 1*

