# TENMON_ULTIMATE_COMPLETION_ASCENT_ONECARD_CURSOR_AUTO_V1

## 目的

**latest evidence → stale invalidation → lived seal 周辺 → hygiene → single source final seal →（条件付き）operable / worldclass claim**  
までを **1 本の直列オーケストレーション**で閉じる。

## 実行順（固定）

| Stage | 内容 | 主スクリプト |
|-------|------|----------------|
| 1 | Phase3 lived seal / proof 系 | `scripts/tenmon_phase3_completion_run_v1.sh` |
| 2 | Stale evidence invalidation | `scripts/tenmon_stale_evidence_invalidation_v1.sh` |
| 3 | Hygiene final seal（安全 remove + gitignore） | `scripts/tenmon_repo_hygiene_final_seal_v1.sh` |
| 3b | Watchdog 再観測 | `automation/tenmon_repo_hygiene_watchdog_v1.py` |
| 4 | Single source operable seal 判定 | `scripts/tenmon_final_single_source_seal_v1.sh` |
| 5 | **optional** | `seal_ready=true` のときのみ |
| 5a | Operable seal | `automation/tenmon_final_operable_seal_v1.py` |
| 5b | Worldclass claim gate | `automation/tenmon_final_worldclass_claim_gate_v1.py` |

## NON-NEGOTIABLES

- evidence first  
- stale を primary source にしない（ゲートとしてのみ参照）  
- frontend mainline の自動再修復はしない  
- runtime core の unsafe 自動 patch はしない  
- hygiene の自動削除は **generated / runtime artifact リストのみ**（final seal スクリプトの contract）  
- **claim 系は `seal_ready` 通過後のみ**（Stage 5）  

## 出力

- `api/automation/ultimate_completion_summary.json` — 集約結果・各 stage の returncode・single source 主要フィールド  
- 実行時 `--log-dir` を渡した場合、同ファイルをログディレクトリにも複製  

## 実行

```bash
cd /opt/tenmon-ark-repo/api
bash scripts/tenmon_ultimate_completion_ascent_onecard_v1.sh
```

直接 Python:

```bash
python3 automation/tenmon_ultimate_completion_ascent_onecard_v1.py --repo-root /opt/tenmon-ark-repo --stdout-json
```

オプション:

- `--skip-optional-claim-gates` — Stage 5 を実行しない  
- `--log-dir /path` — summary のコピー先  

終了コード:

- **0**: `tenmon_final_single_source_seal.json` で `seal_ready` または `worldclass_claim_ready`  
- **1**: 上記を満たさない  

環境変数:

- `TENMON_ULTIMATE_ASCENT_SYMLINK_CARD_LOG=1` — `/var/log/tenmon/card_${CARD}_latest` にシンボリックリンク  

---

*Version: 1*
