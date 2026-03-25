# TENMON_SHORT_INPUT_CONTINUITY_HOLD_CURSOR_AUTO_V1

## 目的

「教えて」「続けて」「もっと」など短い入力を、直前の中心を保った continuity（`CONTINUITY_ROUTE_HOLD_V1`）へ優先接続する。

## 前提

- `TENMON_CONTEXT_CARRY_FACTUAL_SKIP_ROUTING_CURSOR_AUTO_V1` PASS。

## 非交渉

- 最小 diff、`chat.ts` の NATURAL general follow-up / hold 先評価ブロックのみ。
- `threadCenter` / `threadCore.centerClaim` のいずれかがある場合のみ。
- cmd 系（`isCmd0`）は除外。
- 短入力の continuity 優先ロジックのみに限定（他経路の振る舞いは変えない）。
- `ku.routeReason` に `CONTINUITY_ROUTE_HOLD_V1` が観測できること。
- `npm run build` PASS。

## 実装

### Phase A — short input gate

次を **short input continuity hold 候補**とみなす:

- `trim` 後 **8 文字以下**、かつ空でない
- かつ `threadCenter`（`__threadCenterForGeneral`）**または** `threadCore.centerClaim` が非空
- かつ `isCmd0` ではない

### Phase B — continuity 優先

上記が成立すると `__isFollowupGeneral` に含め、`tryContinuityRouteHoldPreemptGatePayloadV1` の `isThreadFollowupGeneral` 経由で `CONTINUITY_ROUTE_HOLD_V1` に接続する。

## 受け入れ（運用プローブ）

同一スレッドで:

1. `言霊とは何か`
2. `教えて`
3. `続けて`
4. `もっと`

2〜4 で **fallback せず**、中心喪失が起きないこと。レスポンスの `decisionFrame.ku.routeReason`（または同等）に **`CONTINUITY_ROUTE_HOLD_V1`** が観測されること。

## NEXT

- PASS → `TENMON_FACTUAL_CORRECTION_ROUTE_CURSOR_AUTO_V1`
- FAIL → `TENMON_SHORT_INPUT_CONTINUITY_HOLD_RETRY_CURSOR_AUTO_V1`
