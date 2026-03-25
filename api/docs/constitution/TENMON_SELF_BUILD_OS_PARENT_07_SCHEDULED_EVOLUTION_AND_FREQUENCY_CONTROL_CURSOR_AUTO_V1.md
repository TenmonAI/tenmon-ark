# TENMON_SELF_BUILD_OS_PARENT_07_SCHEDULED_EVOLUTION_AND_FREQUENCY_CONTROL_CURSOR_AUTO_V1

## 目的

自己改善・自己修復・自己解析・自己構築ループの**周波数を成熟度で段階的に上げる**（1 日 1 回 → … → 概ね 1 時間 1 回）。未成熟の高頻度化による失敗の再生産を防ぐ **frequency governor** を置く。

## 非対象（DO NOT TOUCH）

- `dist/**`
- `chat.ts` 本体
- DB schema
- `kokuzo_pages` 正文
- **systemd / 環境ファイル**（本カードでは変更しない）
- `/api/chat` 契約

## 成熟度ステージ（5 段階）

| stage | 目標回数/日 | 目安 |
|-------|------------|------|
| 1 | 1 | 1/day |
| 2 | 2 | 2/day |
| 3 | 3 | 3/day |
| 4 | 4 | 4/day |
| 5 | 24 | ~1/hour |

## 上昇条件（ウィンドウ集計 + 滞留回数）

`frequency_stage_controller_v1.py` が、直近履歴（最大 10 件）から以下を集計し、**全て満たし**かつ **ステージごとの最小実行回数**を満たしたとき 1 段階昇格。

- **acceptance pass rate** ≥ 0.85  
- **regression rate** = 0（ウィンドウ内で regression 検知なし）  
- **rollback シグナル率** ≤ 0.2（`fail_classification` 由来のヒューリスティック）  
- **runtime stability** ≥ 0.9  
- **blocker closure proxy**（`self_build_priority_queue` の ready 比率）≥ 閾値  

## 危険時の自動降格

- 現サイクルで **regression_detected**
- **acceptance fail** かつ **critical fail**（分類・全体 pass の合成）
- **連続失敗** ≥ 2  
- ソフト条件: ウィンドウの pass 低下・回帰率悪化で 1 段階降格の可能性

## 実装

| ファイル | 役割 |
|---------|------|
| `scheduled_evolution_governor_v1.py` | メトリクス収集・`scheduled_evolution_state.json` 更新・各種 JSON 出力 |
| `frequency_stage_controller_v1.py` | 昇格/降格の決定論ロジック（単体 dry-run 可） |
| `scheduled_evolution_governor_v1.sh` | CLI ラッパー |

**governor はスケジュール提案まで**。実際の cron / systemd 変更は **別カード**。

## 成果物（VPS / automation）

| ファイル | 説明 |
|---------|------|
| `TENMON_SELF_BUILD_OS_PARENT_07_SCHEDULED_EVOLUTION_AND_FREQUENCY_CONTROL_VPS_V1` | マーカー |
| `scheduled_evolution_state.json` | 現在 stage・履歴・滞留回数 |
| `maturity_stage_result.json` | 直近の昇降格判定 |
| `recommended_frequency.json` | 推奨回数/日・**UTC cron 例**（提案のみ） |
| `cycle_outcome_score.json` | サイクルごとの outcome スコア |

## 実行

```bash
chmod +x api/scripts/scheduled_evolution_governor_v1.sh
api/scripts/scheduled_evolution_governor_v1.sh
# または
python3 api/automation/frequency_stage_controller_v1.py --stdout-json
```

## FAIL NEXT

`TENMON_SELF_BUILD_OS_PARENT_07_SCHEDULED_EVOLUTION_AND_FREQUENCY_CONTROL_RETRY_CURSOR_AUTO_V1`
