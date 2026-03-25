# TENMON_LEARNING_INTEGRATION_OS_CURSOR_AUTO_V1

## 目的

会話改善（conversation completion）と虚空蔵学習（kokuzo learning）の **相互還元** を automation 層で固定する Learning OS。  
`learning quality` / `seed quality` / `evidence grounding` / `conversation↔learning bridge` / `learning→route bridge` を **一つのシール** に束ね、学習成果が route / surface / longform に戻る経路を可視化する。

## 非対象（DO NOT TOUCH）

- `dist/**`
- DB schema
- `kokuzo_pages` 正文
- `/api/chat` 契約
- systemd env

## 構成（api/automation）

| モジュール | 役割 |
|-----------|------|
| `learning_integration_common_v1.py` | 定数・パス |
| `learning_quality_scorer_v1.py` | `learning_input_quality`（read-only 集計） |
| `seed_quality_scorer_v1.py` | `seed_quality` |
| `evidence_grounding_scorer_v1.py` | `evidence_grounding_quality` |
| `conversation_learning_bridge_v1.py` | 会話 blocker と学習 blocker の **verdict** + `learning_blocker_dispatch_for_improvement_queue` |
| `learning_to_route_bridge_v1.py` | `route_learning_relevance` / `conversation_return_quality` |
| `learning_acceptance_audit_v1.py` | `integrated_acceptance_seal` + 閾値による acceptance |
| `learning_integration_seal_v1.py` | 全出力の集約・**スコア差分**・`TENMON_LEARNING_INTEGRATION_OS_VPS_V1` |

## 品質指標（5 軸）

1. **learning_input_quality** — `learning_quality_report.json`
2. **seed_quality** — `seed_quality_report.json`
3. **evidence_grounding_quality** — `evidence_grounding_report.json`
4. **route_learning_relevance** — `learning_route_bridge.json`
5. **conversation_return_quality** — `learning_route_bridge.json`（上記 3 レポートの合成）

## 入力（read-only）

- `priority_queue.json`（`priority_queue_generator_v1` 出力推奨）
- `out/tenmon_full_orchestrator_v1/full_orchestrator_queue.json`
- `integrated_acceptance_seal.json`（存在時は acceptance に利用）

## 出力 JSON

- `learning_quality_report.json`
- `seed_quality_report.json`
- `evidence_grounding_report.json`
- `conversation_learning_bridge.json`
- `learning_route_bridge.json`
- `learning_acceptance_audit.json`
- `learning_integration_seal.json`

任意: `learning_integration_baseline_v1.json`（前回 `metrics` を置くと seal に **score_deltas** が付く）

## 実行

```bash
cd api/automation
python3 learning_integration_seal_v1.py
```

## VPS マーカー

- ファイル: `api/automation/TENMON_LEARNING_INTEGRATION_OS_VPS_V1`
- 内容: `TENMON_LEARNING_INTEGRATION_OS_VPS_V1` + タイムスタンプ + `overall_pass`

## FAIL NEXT

`TENMON_LEARNING_INTEGRATION_OS_CURSOR_AUTO_RETRY_V1` — `generated_cursor_apply/TENMON_LEARNING_INTEGRATION_OS_CURSOR_AUTO_RETRY_V1.md` を参照。

## 方針

- **chat.ts は改変しない**。bridge は verdict / dispatch のみ。
- scorer は **read-only 集計** から開始（将来 LLM 監査等に差し替え可能）。
- 会話改善 queue へは `learning_blocker_dispatch_for_improvement_queue` 経由で learning blocker を流す設計。
