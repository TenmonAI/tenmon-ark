# TENMON_FINAL_SINGLE_SOURCE_SEAL_CURSOR_AUTO_V1

> **実装は lived 優先へ移行しました。** 契約の正は `TENMON_FINAL_SINGLE_SOURCE_OPERABLE_SEAL_CURSOR_AUTO_V1.md` を参照してください。

## 目的

completion の最終結果を **単一真実源 1 ファイル**（`tenmon_final_single_source_seal.json`）へ統合する。

## D

- **final source は 1 つ**（本ファイル）
- **stale source** は `tenmon_stale_evidence_invalidation_verdict.json` で検知し、`stale_evidence_present` に反映（`--strict-stale` で実効 seal/worldclass を偽に落とせる）
- **seal / worldclass / env / retry** を一枚に集約
- **以後の人間判断は本 JSON を正とする**

## 入力

| ファイル | フィールド例 |
|----------|----------------|
| `tenmon_final_operable_seal.json` | `seal_ready` |
| `tenmon_final_worldclass_claim_gate.json` | `worldclass_ready`, `claim_allowed` |
| `tenmon_fail_fast_campaign_governor_verdict.json` | `halt_retry`, `recommended_next_card` |
| `tenmon_env_fail_product_fail_splitter_verdict.json` | `env_failure`, `recommended_next_card` |
| `tenmon_stale_evidence_invalidation_verdict.json` | `all_valid`, `recommended_retry_card` |

## `recommended_next_card`（優先順）

`claim_allowed` **または** `seal_ready`（**入力ファイルの生値**）が真なら `null`。

それ以外は次のいずれか（先に出たもの）:

1. `governor.recommended_next_card`
2. `splitter.recommended_next_card`
3. `stale.recommended_retry_card`
4. 既定: `TENMON_COMPLETION_ASCENT_MASTER_CAMPAIGN_CURSOR_AUTO_V1`

## exit コード

- **0**: `seal_ready` **または** `worldclass_ready`（出力上の実効値。`--strict-stale` 時は stale なら偽になりやすい）
- **1**: 上記を満たさない

## 実行

```bash
cd /opt/tenmon-ark-repo/api
python3 automation/tenmon_final_single_source_seal_v1.py --stdout-json
# stale 時は実効フラグを落とす
# python3 automation/tenmon_final_single_source_seal_v1.py --strict-stale --stdout-json
```

## 出力

`api/automation/tenmon_final_single_source_seal.json`

---

*Version: 1*
