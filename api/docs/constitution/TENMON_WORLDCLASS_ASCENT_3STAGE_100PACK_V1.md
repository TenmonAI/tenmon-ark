# TENMON_WORLDCLASS_ASCENT_3STAGE_100PACK_V1

## 位置づけ

本ドキュメントは **設計・運用憲法** であり、100 枚を無制限に自動適用する許可ではない。  
**single_flight**・**1 card = 1 verification**・**群ごと acceptance**・**FAIL で停止し最小次カードを生成** を前提とする。

## マスタープラン（機械可読）

- `api/automation/worldclass_100pack_plan.json` — 3 stage / 10 群 × 10 枚 / 実行方針 / スコア次元 / 停止条件 / 期待成果物一覧

## 進捗・判定テンプレ

- `api/automation/reports/worldclass_group_progress_summary_v1.json`
- `api/automation/reports/worldclass_batch_summary_template_v1.json`
- `api/automation/reports/worldclass_final_status_summary_template_v1.json` (+ `.md`)
- `api/automation/reports/next_card_if_partial_or_fail_template_v1.md`

ランタイム実行時は `/var/log/tenmon/card_TENMON_WORLDCLASS_ASCENT_3STAGE_100PACK_V1/<TS>/run.log` に集約し、上記相当物を同ディレクトリにコピー・改名してもよい。

## NON-NEGOTIABLES（要約）

- 憶測禁止・原因未断定 PATCH 禁止・最小 diff・1 変更 = 1 検証
- `dist` 直編集禁止
- `repo → build → restart → probe → audit → acceptance`
- acceptance PASS 以外 seal 禁止
- `decisionFrame.ku` は常に object
- GROUNDED 捏造禁止
- smoke-hybrid `threadId` を LLM_CHAT に入れない
- `kokuzo_pages` 正文の自動改変禁止
- FAIL 時は証拠束を保存し **exit ≠ 0** で停止

## ステージ目標

1. **STAGE 1** — 会話 OS 完成域（表面・ルート・responsePlan・longform・連続生存）
2. **STAGE 2** — memory / canon / KHS / growth / automation の閉ループ証明
3. **STAGE 3** — 改善ループの高精度化・世界最高峰候補帯

## 夜間実行の安全上限

- 連続最大 **8** カードごとに summary（カード本文推奨 **12** / batch 上限）
- **100 枚一気 apply 禁止**。推奨: **10 バッチ**（群単位）＋各バッチ後 reveal

## 表記

- Group 05 のカード 48 は計画名として `SUBCONCEPT_TO_SITHESIS_V1`（原文表記）。実装カード名で `SYNTHESIS` へ正規化する場合は plan と catalog を同期すること。

## seal

**overall_worldclass_score ≥ 95** かつ **seal_allowed** かつ dirty / replay / manifest / growth 証拠が揃ったときのみ、世界最高峰候補領域に入ったと判定する。
