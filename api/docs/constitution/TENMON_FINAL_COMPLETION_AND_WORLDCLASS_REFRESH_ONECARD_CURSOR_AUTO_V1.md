# TENMON_FINAL_COMPLETION_AND_WORLDCLASS_REFRESH_ONECARD_CURSOR_AUTO_V1

## 目的

最新状態を evidence ベースで再判定し、次を **一直線**で閉じる。

1. latest forensic / rejudge（既存 `tenmon_latest_state_rejudge_and_seal_refresh_*`）  
2. stale invalidation（lived 優先・**superseded は論理のみ**）  
3. hygiene final seal（**generated/runtime artifact のみ**）＋ watchdog  
4. **system verdict / scorecard / master report** の refresh（integrator 群）  
5. **single source** → **operable seal** → **worldclass claim gate** の再生成  
6. **統合 summary** 1 枚  

**既存の `api/src/**` / `web/src/**` / chat 経路は変更しない。** 本カードはオーケストレーションのみ追加する。

## NON-NEGOTIABLES

- cause 未断定の product patch 禁止  
- chat / finalize / frontend mainline の自動再修復禁止  
- stale は **削除せず superseded / ledger**  
- cleanup は **generated/runtime artifact リストのみ**（hygiene final seal の契約）  
- tracked code の自動 revert 禁止  
- claim は evidence のみ、**PASS 以外は封印しない**（各ゲートの `pass` を参照）  

## 実行順（固定）

| Phase | 内容 |
|-------|------|
| A | Latest state rejudge & seal refresh（既定: **build + restart + Python** を含むシェル） |
| B | Stale evidence invalidation（既定: `--no-refresh-downstream`、integrator は D で実行） |
| C | Repo hygiene final seal + hygiene watchdog |
| D | `tenmon_system_verdict_integrator_v1` → `tenmon_worldclass_acceptance_scorecard_v1` → `tenmon_total_completion_master_report_v1`（存在時） |
| D' | `tenmon_final_single_source_seal` → `tenmon_final_operable_seal` → `tenmon_final_worldclass_claim_gate` |

## 出力

- `api/automation/tenmon_final_completion_worldclass_refresh_summary.json`  
  - `operable_ready`, `seal_ready`, `worldclass_claim_ready`, `remaining_blockers`, `recommended_next_card`, `superseded_sources`, `stages` …  
- `--log-dir` 指定時は同パスにも複製  

## 実行

```bash
cd /opt/tenmon-ark-repo/api
bash scripts/tenmon_final_completion_and_worldclass_refresh_onecard_v1.sh
```

### Python 直接

```bash
python3 automation/tenmon_final_completion_and_worldclass_refresh_onecard_v1.py \
  --repo-root /opt/tenmon-ark-repo \
  --base http://127.0.0.1:3000 \
  --stdout-json
```

### 主なオプション

- `--skip-phase-a` — Phase A スキップ（rejudge 済みのみ後段を回す）  
- `--phase-a-python-only` — build/restart なしで rejudge Python のみ  
- `--stale-with-downstream` — stale 内でも integrator を実行（Phase D と二重になり得る）  
- `--log-dir /path` — summary のコピー先  

**終了コード**: `seal_ready` または `worldclass_claim_ready`（summary 上）なら **0**、それ以外 **1**。

環境変数: `TENMON_GATE_BASE`, `TENMON_REFRESH_ONECARD_SYMLINK=1` で `card_${CARD}_latest` へリンク。

---

*Version: 1*
