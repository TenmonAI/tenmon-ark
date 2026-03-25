# TENMON_SELF_IMPROVEMENT_OS_V1

## 目的

会話品質の単発カードに加え、**観測 → 改善提案 → VPS 検証 → seal → 学習蓄積** を回す恒常 OS 層を `api/automation` + `api/scripts` に置く。  
**Seal Governor 統合 runner** により **PASS 以外は採用しない**（`adoption_sealed`）構造で暴走を抑える。

## 4 系統（責務分離）

| 系統 | モジュール | 役割 |
|------|------------|------|
| **Improvement Ledger** | `improvement_ledger_v1.py`（フル） / `tenmon_self_improvement_ledger_v1.py`（ミニ） | 改善イベントの JSONL 追記 |
| **Residual Quality Scorer** | `residual_quality_scorer_v1.py` + 既存 `tenmon_chat_ts_residual_quality_score_v1.py` | 5 軸残差と優先度 |
| **Card Auto-Generator** | `card_auto_generator_v1.py` | blocker → Cursor/VPS 自動生成 |
| **Seal Governor（最終門）** | **`seal_governor_v1.py`** | static〜density を束ね **`adoption_sealed`** を決定 |

**旧・軽量 Governor:** `tenmon_self_improvement_seal_governor_v1.py`（ファイル整合のみ）

**合成層:** `tenmon_self_improvement_integrated_compose_v1.py`（親カード用 `integrated_final_verdict.json`）

## 統合 runner（推奨）

**1 周の順序:**

1. **report 取り込み** — 既存 seal があれば `worldclass_report.json` を読む（メタ記録）
2. **acceptance** — `chat_ts_runtime_acceptance_and_worldclass_seal_v1.sh`
3. **ledger** — `improvement_ledger_v1.py append-from-seal`
4. **scoring** — `residual_quality_scorer_v1.py score`
5. **card generation** — `card_auto_generator_v1.py generate`（`residual_priority_result.json` を参照）
6. **seal judgement** — `seal_governor_v1.py --enforce-exit`

| コンポーネント | パス |
|----------------|------|
| Runner（Python） | `api/automation/self_improvement_os_runner_v1.py` |
| Runner（VPS シェル） | `api/scripts/self_improvement_os_run_v1.sh` |
| カード名 | `TENMON_SEAL_GOVERNOR_AND_OS_INTEGRATION_VPS_V1` |

**成果物（`$SEAL_DIR/_self_improvement_os_integrated/`）**

- `self_improvement_os_manifest.json` — ステップ一覧・パス
- `seal_governor_verdict.json`
- `next_card_dispatch.json` — completion supplement + card gen + governor RETRY を統合
- `final_verdict.json` — `adoption_sealed` / `runner_pass`
- FAIL 時: `evidence_bundle.json` + `generated_cursor_apply/TENMON_SEAL_GOVERNOR_AND_OS_INTEGRATION_RETRY_CURSOR_AUTO_V1.md`

VPS ログ用に `self_improvement_os_run_v1.sh` が上記 JSON を `/var/log/tenmon/card_$CARD/$TS/` に **コピー**する。

## 親パイプライン（後方互換）

- `chat_ts_self_improvement_os_integrated_v1.sh` — `TENMON_SELF_IMPROVEMENT_OS_PARENT_VPS_V1`（4 系統 + compose + 旧 autogen）

## 既存との関係

- **Worldclass seal / Stage5 merge:** `final_verdict.json` がゲートの真値。
- **Completion supplement:** `next_card_dispatch.json` を runner がマージ。
- **憲章（Governor 詳細）:** `TENMON_SEAL_GOVERNOR_V1.md`

## Improvement Ledger（フル記録）

`improvement_ledger_entries_v1.jsonl`（`TENMON_IMPROVEMENT_LEDGER_V1`）

## 編集境界

- `api/automation/**`, `api/scripts/**`, `api/docs/constitution/**`, `api/src/core/**` の最小限。
- `/api/chat` 契約・`chat.ts` 本体の一括変更は行わない。

## カード・レジストリ

- `api/automation/self_improvement_os_dispatch_v1.json`
- 統合 RETRY: `TENMON_SEAL_GOVERNOR_AND_OS_INTEGRATION_RETRY_CURSOR_AUTO_V1`
