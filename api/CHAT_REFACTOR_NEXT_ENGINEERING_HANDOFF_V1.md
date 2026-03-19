# CHAT_REFACTOR_NEXT_ENGINEERING_HANDOFF_V1

**bf978c3** を **git 上の chat refactor 主線 handoff コミット**としつつ、**P68/P69 は P71 で単一 seal する**前提で次工程へ引き継ぐ。

## 1. current documented commit

**bf978c3**（P67 含む）

## 2. 封印列（bdb99e9 以降）

… → 622dafb → **bdb99e9** (P65) → a3165cf → 2be7fc6 → f354e18 → 6938adb → 3d943f0 → **bf978c3** (P67)

## 3. P68 / P69（次 seal で列に乗せる）

| カード | 要約 | 主たる変更箇所 |
|--------|------|----------------|
| P68 | 明示字数でも思考回路本文へ（generic メタ指南を避ける） | `chat.ts`：`__buildArkThinkingCircuitExplicitLongformV1`、explicit 早期／本流 |
| P69 | 世界観語を ARK 内部項目へ写像（WORLDVIEW 維持） | `chat.ts`：`WORLDVIEW_ROUTE_PREEMPT_V3` 内 `__isWorldviewInternalMapV1` |

→ **P71** `CHAT_SAFE_REFACTOR_PATCH71_CHAT_REFACTOR_FINAL_SEAL_V1` で `chat.ts`（必要なら同バッチのみ）を commit し、封印列末尾を更新する。

## 4. runtime 対象

- `api/src/routes/chat.ts`
- `api/src/routes/chat_refactor/majorRoutes.ts`
- `api/src/routes/chat_refactor/finalize.ts`
- `api/src/routes/chat_refactor/entry.ts`
- `api/src/routes/chat_refactor/general.ts`
- `api/src/routes/chat_refactor/define.ts`
- `api/scripts/patch29_final_acceptance_sweep_v1.sh`
- `api/scripts/chat_refactor_runner_v1.sh`

## 5. no-touch

- `api/src/db/kokuzo_schema.sql`

## 6. 未追跡で封印列に含めないもの

- `probe*.json`
- `ABSTRACT_CENTER_*.txt`
- `CARD_*.md`
- `WORLD_CLASS_ANALYSIS_*`
- `FINAL_REPORT_V1`
- `RECONCILE_AUDIT_V1`

## 7. 次工程の優先候補

1. **P70（本カード）** — `SEALED_RUNTIME_SET_CURRENT_V1.md` / `CHAT_REFACTOR_SEALED_BASELINE_V1.md` / 本ファイルを **docs-only** で commit
2. **P71** — final seal: `seal: chat refactor final runtime set`（P68/P69 を含む `chat.ts` 等・**kokuzo_schema 混入禁止**）
3. **phase2 入口** — `SELF_BUILD_GOVERNOR_V1`（憲法／手続き文書、runtime はまだ触らない方針可）

## 8. 運用裁定

- P70 は **docs のみ staged** とし、`api/src/db/kokuzo_schema.sql` を stage しない
- P71 前チェック: `git status --short` / `git diff --cached` / build / health / PATCH29 acceptance
- **remaining_to_phase1_complete:** P70 docs commit → P71 reseal の **2 カード**
