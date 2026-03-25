# TENMON_A1_KOKUZO_BAD_GUARD_V1

## 目的

`kokuzo_pages` の本文は**削除・改変しない**。BAD シグナル（`kokuzo_bad_observer_v1` の **hard_bad** 相当）を載せたページは、**会話候補**および **Seed 入力（evidenceIds）** から**参照除外**する。

## 共通ガード

- 実装: `api/src/core/kokuzoBadGuardV1.ts` の `evaluateKokuzoBadHeuristicV1`
- 候補: `api/src/kokuzo/search.ts` の `filterHybridCandidatesBadGuardV1`（`searchKotodamaFts` 含む）
- Seed: `api/src/kokuzo/kokuzoBadGuardEvidenceV1.ts` の `filterEvidenceIdsForKokuzoBadGuardV1`
  - `api/src/core/threadSeed.ts`（`tryAppendThreadSeedFromPayload`）
  - `api/src/routes/chat_parts/seed_impl.ts`（`saveArkThreadSeedV1`）

## 将来

`reasons` / `qualityFlags` をそのまま DB **quality flag** 列や観測パイプラインへ載せ替え可能な形にしてある。

## VPS

`api/automation/tenmon_a1_kokuzo_bad_guard_v1.sh` が `bad_guard_audit.json` 等を出力する。
