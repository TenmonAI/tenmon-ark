# TENMON_FEATURE_AUTOBUILD_OS_CURSOR_AUTO_V1

## 目的

会話完成後にTENMON-ARKへ **新機能を自己構築** させるため、**要求 → 仕様 → カード分解 → 依存順キュー → 検証 → デプロイ可否** までを automation でつなぐ Feature Autobuild OS。

## 非対象（DO NOT TOUCH）

- `dist/**`
- `api/src/routes/chat.ts` 本体
- DB schema
- `kokuzo_pages` 正文
- `/api/chat` 契約
- systemd env

## パイプライン

1. `feature_intent_parser_v1.py` — 管理者向け自然言語 → `feature_intent.json`
2. `spec_generator_v1.py` — MVP / risk / acceptance / do-not-touch → `feature_spec.json`
3. `card_splitter_v1.py` — 1〜N Cursor カード → `feature_cards_manifest.json`
4. `execution_ordering_engine_v1.py` — DAG・トポロジ順・レイヤー → `feature_execution_order.json`
5. `dependency_aware_campaign_orchestrator_v1.py` — 統合キュー → `feature_execution_queue.json`
6. `deployment_gate_v1.py` — 危険パターンを自動 reject → `deployment_gate.json`（**評価対象は `intent.raw` のみ**。spec 自動生成文はスキャンしない）
7. `post_build_evaluator_v1.py` — acceptance / regression 参照 → `post_build_evaluation.json`
8. `feature_completion_seal_v1.py` — 集約・**完成シール** → `feature_completion_seal.json` + `TENMON_FEATURE_AUTOBUILD_OS_VPS_V1`

## 入力

- 既定: `api/automation/feature_request.txt` または環境変数 `TENMON_FEATURE_REQUEST`
- または `--request-file` / `--request`（`feature_completion_seal_v1.py`）

## 主要出力（VPS 検証）

| ファイル | 内容 |
|---------|------|
| `feature_intent.json` | 自然言語要求の構造化 intent |
| `feature_spec.json` | **minimum**: objective / scope / do_not_touch / risk / acceptance / fail_next |
| `feature_cards_manifest.json` | Cursor カード形式のみ（`TENMON_*_CURSOR_AUTO_V1`） |
| `feature_execution_queue.json` | 依存順・レイヤー付きキュー |
| `post_build_evaluation.json` | `evaluation_contract` 付き評価束 |
| `feature_completion_seal.json` | `feature_completion_seal: true` は gate + post-build + DAG がすべて緑のときのみ |

正規バンドル（複製）: `api/automation/out/tenmon_feature_autobuild_os_v1/`（`feature_completion_seal_v1.py --out-dir` 既定）

| マーカー | 説明 |
|----------|------|
| `TENMON_FEATURE_AUTOBUILD_OS_VPS_V1` | automation 直下 + bundle 内 |

## 完成シールの条件

- `deployment_gate.json` の `allowed: true`
- `post_build_evaluation.json` の `overall_ok: true`（`integrated_acceptance_seal.json` がある場合はその結果を反映）
- `feature_execution_queue.json` の `dag_ok: true`

## 一括実行

```bash
cd api/automation
echo '管理画面に API 一覧の JSON を返すエンドポイントを追加したい' > feature_request.txt
python3 feature_completion_seal_v1.py --stdout-json
# または
bash ../scripts/feature_autobuild_os_run_v1.sh
```

### high risk を deployment gate で拒否（任意）

```bash
export TENMON_FEATURE_AUTOBUILD_STRICT_HIGH_RISK=1
python3 feature_completion_seal_v1.py
```

## FAIL NEXT

`TENMON_FEATURE_AUTOBUILD_OS_CURSOR_AUTO_RETRY_V1` — `generated_cursor_apply/TENMON_FEATURE_AUTOBUILD_OS_CURSOR_AUTO_RETRY_V1.md`

## 方針

- intent parser は **ヒューリスティック**（将来 LLM に差し替え可能）
- 危険語（決済・DB schema・chat 契約破壊等）は **deployment_gate** で拒否
- 実装は **生成された Cursor cards** に従い、人手で MD を実行する想定
