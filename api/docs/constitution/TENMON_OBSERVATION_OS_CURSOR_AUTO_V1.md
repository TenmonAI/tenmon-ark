# TENMON_OBSERVATION_OS_CURSOR_AUTO_V1

## 目的

TENMON-ARK 全体の **観測 OS**（read-only）— repo manifest・責務マップ・依存グラフ・リスクマップ・blocker taxonomy・priority queue（ready / pending / blocked）を一括生成し、オーケストレータが直接読める JSON を `api/automation/` 直下に置く。

## 実行

```bash
export ROOT=/opt/tenmon-ark-repo
python3 api/automation/observation_os_v1.py --stdout-json
# または
bash api/scripts/observation_os_v1.sh
```

### 環境変数（priority_queue 入力の上書き）

| 変数 | 説明 |
|------|------|
| `TENMON_OBSERVATION_ORCH_DIR` | `full_orchestrator_queue.json` 等があるディレクトリ |
| `TENMON_OBSERVATION_FORENSIC_DIR` | `integrated_forensic_verdict.json` 等（既定: `.../tenmon_total_forensic_reveal_v1/latest`） |
| `TENMON_ORCHESTRATOR_SEAL_DIR` | seal `final_verdict.json` |
| `TENMON_OBSERVATION_SNAPSHOT_DIR` | スナップショット出力先の明示 |

## 安定パス（オーケストレータ向け）

| ファイル | 内容 |
|----------|------|
| `full_repo_manifest.json` | リポジトリ構造スナップ |
| `full_responsibility_map.json` | 論理責務（会話 / learning / 観測 等） |
| `full_dependency_graph.json` | `automation/*.py` の import 依存 |
| `full_risk_map.json` | systemd / sudo / curl 等タグ |
| `blocker_taxonomy.json` | 正規 taxonomy（会話 + learning 同一 namespace） |
| `priority_queue.json` | ready / pending / blocked |
| `observation_os_report.json` | 本実行のメタ |

スナップショット: `api/automation/out/tenmon_observation_os_v1/<UTC>/` と `latest` シンボリックリンク。

## Blocker taxonomy ID

`surface`, `route`, `longform`, `density`, `runtime`, `learning_input_quality`, `learning_seed_quality`, `evidence_grounding`, `seal_contract`, `remote_execution`

## 失敗時

`TENMON_OBSERVATION_OS_CURSOR_AUTO_RETRY_V1` を参照し、入力パス（orchestrator / forensic / seal）を確認して再実行。

## 方針

- **read-only**（`chat.ts` 等は読まずパス参照のみのモジュールあり）
- 既存レポート（orchestrator / forensic / seal）を **再利用優先**
