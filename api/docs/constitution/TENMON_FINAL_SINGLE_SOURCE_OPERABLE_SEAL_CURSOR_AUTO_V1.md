# TENMON_FINAL_SINGLE_SOURCE_OPERABLE_SEAL_CURSOR_AUTO_V1

## 目的

**latest single source truth**（主として **lived readiness**）に基づき、operable / sealable / worldclass claim 前提を **1 枚**で再判定する。

統合する観点は次の 5 点。

1. latest lived truth（`pwa_lived_completion_*`）  
2. stale invalidation verdict（**primary にはしない**が、未正規化なら seal を止めるゲート）  
3. hygiene refresh（`must_block_seal`）  
4. system verdict（補助・`overall_band`）  
5. worldclass scorecard（claim 高水準）  

## NON-NEGOTIABLES

- stale JSON を **primary source** にしない（参照順の先頭は lived）  
- env failure と product failure を分離（lived blockers のうち env 系は product カウントから除外）  
- claim は **evidence-based** のみ  
- **repo hygiene が `must_block_seal` の間は `seal_ready` を true にしない**  
- worldclass は **高水準**（`worldclass_ready` かつ `score_percent >= 90`）  

## 入力（read-only）

| ファイル |
|-----------|
| `pwa_lived_completion_readiness.json` |
| `pwa_lived_completion_blockers.json` |
| `tenmon_stale_evidence_invalidation_verdict.json` |
| `tenmon_repo_hygiene_watchdog_verdict.json` |
| `tenmon_system_verdict.json` |
| `tenmon_worldclass_acceptance_scorecard.json` |

## 判定概要

- **operable_ready**: lived の gate / readiness 軸が揃い、`env_failure` でない  
- **seal_ready**: operable かつ **product lived blockers なし**、hygiene 非ブロック、**stale 正規化済み**（`stale_detected` / `stale_sources` 等なし）  
- **worldclass_claim_ready**: `seal_ready` かつ scorecard `worldclass_ready` かつ `score_percent >= 90`  

## 出力

`api/automation/tenmon_final_single_source_seal.json`

必須フィールド:

- `operable_ready`
- `seal_ready`
- `worldclass_claim_ready`
- `primary_truth_sources`
- `remaining_blockers`
- `recommended_next_card`

## 実行

```bash
cd /opt/tenmon-ark-repo/api
bash scripts/tenmon_final_single_source_seal_v1.sh --stdout-json
```

- **exit 0**: `seal_ready` または `worldclass_claim_ready`  
- **exit 1**: いずれも未達  

検証用: `--ignore-stale-gate`（stale を seal 条件から外す。本番非推奨）

---

*Version: 1*
