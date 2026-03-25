# TENMON_SELF_IMPROVEMENT_OS_CANONICAL_CLOSE_CURSOR_AUTO_V1

## 目的

`self_improvement_os` の **canonical 出力契約**を閉じる。`deep / micro / state_convergence` が参照する単一路径に、必須4ファイルを揃え、**プロセス終了コード `rc` を `integrated_final_verdict.json` の runner 最終判定と一致**させる。

## 一意化される意味

| 記号 | 意味 |
|------|------|
| **out_dir** | `TENMON_SELF_IMPROVEMENT_OS_OUT_DIR` または既定 `api/automation/out/tenmon_self_improvement_os_v1`。OS 成果物の **正規ディレクトリ**（deep reveal の `output_contracts.json` がここを読む）。 |
| **rc** | `self_improvement_os_contract_close_v1.py` の終了コード。`integrated_final_verdict.json` の `runner.exit_code`（無ければ `runner_pass` / `overall`）と一致。 |

## 必須成果物（canonical out 直下）

- `self_improvement_os_manifest.json`
- `seal_governor_verdict.json`
- `next_card_dispatch.json`
- `integrated_final_verdict.json`

## 補助成果物

- `canonical_contract_close_summary.json` — `readiness` / `rc` / コピー元パス
- `TENMON_SELF_IMPROVEMENT_OS_CANONICAL_CLOSE_VPS_V1` — VPS マーカーファイル（JSON）

## readiness

| 値 | 意味 |
|----|------|
| `ready` | runner 由来の4ファイルが欠損なくコピーされた |
| `partial` | 一部のみ runner 由来で、欠損分を contract_close が補完した |
| `blocked` | `_self_improvement_os_integrated` が解決できない、またはスタブ主体（再実行・seal 修復が必要） |

## 実装

| ファイル | 役割 |
|----------|------|
| `api/automation/self_improvement_os_contract_close_v1.py` | メインロジック |
| `api/scripts/self_improvement_os_contract_close_v1.sh` | VPS 実行ラッパ |

## コピー元の解決順

1. `--integrated-dir`
2. `TENMON_SELF_IMPROVEMENT_OS_INTEGRATED_DIR`
3. `readlink -f /var/log/tenmon/card/_self_improvement_os_integrated`
4. `/var/log/tenmon/card_*` 配下の `_self_improvement_os_integrated`（新しい方を優先）

## 実行例

```bash
# 既定 canonical へ（探索でコピー）
bash api/scripts/self_improvement_os_contract_close_v1.sh

# 先に runner を実行してから閉じる
bash api/scripts/self_improvement_os_contract_close_v1.sh --run-runner

# 明示パス
python3 api/automation/self_improvement_os_contract_close_v1.py \
  --integrated-dir /var/log/tenmon/card_SOME/_self_improvement_os_integrated
```

## 関連 env

- `TENMON_SELF_IMPROVEMENT_OS_OUT_DIR` — canonical 出力先
- `TENMON_SELF_IMPROVEMENT_OS_INTEGRATED_DIR` — コピー元
- `OS_RUNNER_SEAL_DIR` / `OS_RUNNER_SKIP_SEAL` / … — `--run-runner` 時に runner へ継承

## VPS マーカー

`TENMON_SELF_IMPROVEMENT_OS_CANONICAL_CLOSE_VPS_V1`

## FAIL_NEXT

`TENMON_SELF_IMPROVEMENT_OS_CANONICAL_CLOSE_RETRY_CURSOR_AUTO_V1`
