# SEALED_RUNTIME_SET_CURRENT_V1

- **current documented commit (chat refactor line):** bf978c3
- **branch:** 2026-03-04-e5hp
- **generated_at_utc:** 20260319T224048Z

## 0. P68 / P69（P71 final seal 予定）

以下は **検証 PASS 済みの runtime 到達点**だが、**本ドキュメント時点では `api/src/routes/chat.ts` の作業ツリー差分**として存在し、**P71 `CHAT_SAFE_REFACTOR_PATCH71_CHAT_REFACTOR_FINAL_SEAL_V1` で単一 commit にまとめて封印**する想定。

| カード | 内容（要約） |
|--------|----------------|
| **P68** `CHAT_SAFE_REFACTOR_PATCH68_EXPLICIT_CONTENT_CENTER_LOCK_V1` | `EXPLICIT_CHAR_PREEMPT_V1` で「天聞アーク＋思考回路」明示時、`__buildArkThinkingCircuitExplicitLongformV1` により内容中心の長文へ。早期／本流 explicit 双方＋長文パッドの思考回路用プール。 |
| **P69** `CHAT_SAFE_REFACTOR_PATCH69_WORLDVIEW_INTERNAL_MAPPING_V1` | `WORLDVIEW_ROUTE_PREEMPT_V3` 内 `__isWorldviewInternalMapV1`（意識／心／魂核構造＋設計モデル等）。魂核・意識・心・思考・文章を ku 内部項目へ写像。`if (/魂/)` より前で `魂核構造` を誤吸収しない。 |

## 1. 封印列

直近の chat refactor 封印列を基準に運用する（**bdb99e9 以降の主線コミットを追記**）。

- dc74b17 — strict compare extract + PATCH29 acceptance pass
- be3f7ff — finalize.ts runtime dependency
- 4615619 — be3f7ff seal policy docs
- 09824dc — chat refactor sealed baseline v1
- 7be4039 — stub/debris policy bundle
- 259b979 — entry batch P41/P42/P44 (parseAnswerProfile, injectAnswerProfileToKu, normalizeChatEntry)
- 6a29b55 — chat refactor runner runtime dependency
- b4fe15a — general batch P49 (systemdiag/future try* extract)
- d9bf4d9 — general batch P50 (judgement/essence try* extract)
- d7e0a52 — general batch P51 (residual preempt + shrink/classify to majorRoutes)
- 9eebfb1 — general 実装 P53 (selectGroundingModeV1 → general.ts)
- dde73bc — general 実装 P54 (getGeneralKind → general.ts)
- 5ace077 — general 実装 P55 (grounding unresolved/grounded_required exit → majorRoutes)
- cb47aac — define 実装 P58 (define fastpath candidate parse → define.ts)
- 89cbdb1 — define 実装 P59 (verified payload builders → define.ts)
- 299da6c — define 実装 P60 (proposed payload builders → define.ts)
- 622dafb — define 実装 P62 (define/scripture boundary gate predicates → define.ts)
- bdb99e9 — **P65** residual final sweep (R22 system diagnosis route exit helper extract → majorRoutes)
- a3165cf — docs: handoff after residual sweep
- 2be7fc6 — seal: finalize chat refactor mainline
- f354e18 — docs: next phase scope (longform / beauty / canon)
- 6938adb — semantic projector: slot differences → response head
- 3d943f0 — semantic projector: iroha / danshari axes
- bf978c3 — **P67** system diagnosis preempt balance（概念・世界観・内部設計モデル系の誤吸収を `shouldBypassArkConversationDiagnosticsPreemptV1` 等で整理）

→ **P68 / P69:** 上表のとおり **未コミット差分（P71 で seal）**

## 2. 最上位 gate

- PATCH29 acceptance が PASS していること
- no-touch: `api/src/db/kokuzo_schema.sql`
- 未追跡観測物・補助資料・stub は封印列に含めない

## 3. runtime 対象ファイル

| パス |
|------|
| `api/src/routes/chat.ts` |
| `api/src/routes/chat_refactor/majorRoutes.ts` |
| `api/src/routes/chat_refactor/finalize.ts` |
| `api/src/routes/chat_refactor/entry.ts` |
| `api/src/routes/chat_refactor/general.ts` |
| `api/src/routes/chat_refactor/define.ts` |
| `api/scripts/patch29_final_acceptance_sweep_v1.sh` |
| `api/scripts/chat_refactor_runner_v1.sh` |

## 4. runtime 対象外

| 種別 | 例 |
|------|----|
| no-touch | `api/src/db/kokuzo_schema.sql` |
| 観測物 | `api/probe.*.json`, `ABSTRACT_CENTER_*.txt` |
| 補助資料 | `api/CHAT_SAFE_REFACTOR_*_REPORT.md`, `CARD_*.md` |
| 大型分析資料 | `FINAL_REPORT_V1/`, `RECONCILE_AUDIT_V1/`, `WORLD_CLASS_ANALYSIS_V1/`, `WORLD_CLASS_ANALYSIS_V2/` |
| stub | なし（define.ts / general.ts は runtime 対象化済み） |

## 5. 再現手順

**共通 runner（推奨）**

- `api/scripts/chat_refactor_runner_v1.sh <CARD名>` で build → restart → health → patch29 を一括実行。最後に PASS/FAIL を表示。

**手動**

1. `cd /opt/tenmon-ark-repo/api`
2. `npm run build`
3. `sudo systemctl restart tenmon-ark-api.service`
4. `for i in 1 2 3 4 5 6 7 8 9 10; do curl -fsS http://127.0.0.1:3000/health && break || sleep 1; done`
5. `/opt/tenmon-ark-repo/api/scripts/patch29_final_acceptance_sweep_v1.sh`
6. **[PASS] all 8 routes match expectations** を確認

## 6. 運用裁定

- runtime の再現に必要な最小集合だけを sealed runtime set とする
- docs-only 文書は必要に応じて個別 commit 可（**P70 は docs のみ stage**）
- no-touch / 観測物 / stub はこの封印列に混ぜない
- **phase1 残カード:** P71 final seal → 以降 `SELF_BUILD_GOVERNOR_V1` など次フェーズ
