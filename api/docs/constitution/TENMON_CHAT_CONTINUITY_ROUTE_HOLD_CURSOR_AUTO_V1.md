# TENMON_CHAT_CONTINUITY_ROUTE_HOLD_CURSOR_AUTO_V1

## 目的

2ターン目以降で `NATURAL_GENERAL_LLM_TOP` へ直落ちしやすい follow-up を抑え、`CONTINUITY_ROUTE_HOLD_V1` などで **prior route / threadCore / threadCenter** を継続判断に束ねる。

## D

- **backend 最小 diff**、`chat.ts` は大改修禁止（局所 await / center 付与のみ可）
- 既存 `decisionFrame.ku` 契約を壊さない

## 実装要点

| 箇所 | 内容 |
|------|------|
| `continuity_trunk_v1.ts` | `tryContinuityRouteHoldPreemptGatePayloadV1` — follow-up 正規表現拡張、`__hasHoldContext` で explicit/define/R22 系 prior を許容 |
| `chat.ts`（EXPLICIT） | EXPLICIT 応答前に **`await saveThreadCore`**（非同期レースで lastResponse が空になるのを防止） |
| `chat.ts`（EXPLICIT） | `/言霊/` を含む明示時は `centerKey=kotodama` を付与して threadCenter へ繋ぐ |
| `threadCoreCarryProjectionV1.ts` | `EXPLICIT_CHAR_PREEMPT_V1` → `turnKind: continuity` / `continuityType: explicit_carry` |

## 検証

```bash
curl -fsS -H 'content-type: application/json' \
  -d '{"threadId":"probe_continuity_hold","message":"言霊とは何かを100字前後で答えて"}' \
  http://127.0.0.1:3000/api/chat
curl -fsS -H 'content-type: application/json' \
  -d '{"threadId":"probe_continuity_hold","message":"前の返答を受けて、要点を一つだけ継続して"}' \
  http://127.0.0.1:3000/api/chat
```

2本目の `decisionFrame.ku.routeReason` が `CONTINUITY_ROUTE_HOLD_V1` になることを期待（同一 threadId）。
