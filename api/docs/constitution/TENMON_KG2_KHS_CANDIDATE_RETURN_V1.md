# TENMON_KG2_KHS_CANDIDATE_RETURN_V1

## 目的

HYBRID の `detailPlan` に **`khsCandidates[]`** と、会話還元用の **`evidence`**（`doc` / `pdfPage` / `quote` 等）を載せ、KHS 根拠を**捏造せず**返す。Seed があっても会話に出ない問題への最短経路。

## スコープ

- **HYBRID のみ**（`decisionFrame.mode === "HYBRID"`）。NATURAL の既存フォールバック（空 `khsCandidates` 時の instr 検索）は維持。
- 実装: `api/src/khs/khsHybridCandidatesV1.ts`、ゲート付近 `api/src/routes/chat.ts`。
- **LLM 不使用**。参照は `khs_units` / `khs_laws` /（任意）`khs_seeds_det_v1` のみ。

## `khsCandidates[]` 要素（最低限）

| フィールド | 内容 |
|------------|------|
| `lawKey` | `khs_laws.lawKey` |
| `termKey` | `khs_laws.termKey` |
| `doc` | `khs_units.doc` |
| `pdfPage` | `khs_units.pdfPage`（NULL は null） |
| `quote` | `khs_units.quote`（**BAD は候補に含めない**） |
| `quoteHash` | `khs_units.quoteHash` |
| `seedId` | `khs_seeds_det_v1.seedKey` があればそれ、なければ `sha256("kg2|"+unitId+"|"+quoteHash)` 先頭 32 hex |
| `unitId` | 追跡用 |

## `detailPlan.evidence`

`khsCandidates` と同一根拠のスロット配列（`doc`, `pdfPage`, `quote`, `lawKey`, `termKey`, `quoteHash`, `seedId`）。**本文の捏造なし**。

## detailPlan 契約

- `DetailPlanContractP20V1` の `khsCandidates` / `evidence`（optional）に収まる。**オブジェクトのまま**（配列化しない）。

## VPS

- `npm run build` 後 `node automation/kg2_hybrid_detailplan_probe_v1.mjs`
- または `api/scripts/kg2_khs_candidate_return_v1.sh`

## FAIL_NEXT

`TENMON_KG2_KHS_CANDIDATE_RETURN_RETRY_CURSOR_AUTO_V1`
