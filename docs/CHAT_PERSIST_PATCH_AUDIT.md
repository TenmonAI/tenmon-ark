# /api/chat への conversation_log/session_memory INSERT パッチ監査

## 1. export default router; の存在確認

✅ **確認済み**: `api/src/routes/chat.ts` の910行目に存在
```typescript
export default router;
```

## 2. applyPersonaGovernor(detailPlan の実物行検索結果

以下の4箇所で `applyPersonaGovernor` が呼ばれています：

| 行番号 | 全文 |
|---|---|
| 434 | `applyPersonaGovernor(detailPlan, { message: q });` |
| 662 | `applyPersonaGovernor(detailPlan, { message: sanitized.text });` |
| 881 | `applyPersonaGovernor(detailPlan as any, { message: sanitized.text, trace: {} as any } as any);` |
| 899 | `applyPersonaGovernor(detailPlan as any, { message: sanitized?.text || message || "" });` |

**主要経路**: 881行目がメインのHYBRID処理の最終段階

## 3. 最終応答の return res.json({ response: finalText, ... }) 検索結果

✅ **確認済み**: `api/src/routes/chat.ts` の882-891行目
```typescript
return res.json({
  response: finalText,
  trace,
  provisional: true,
  detailPlan,
  candidates,
  evidence,
  timestamp: new Date().toISOString(),
  decisionFrame: { mode: "HYBRID", intent: "chat", llm: null, ku: {} },
});
```

## 4. persistTurn helper の完全な形

`const router: IRouter = Router();` の直後（70行目の後）に挿入：

```typescript
// PERSIST_TURN_V1: conversation_log / session_memory へのINSERT helper
function persistTurn(threadId: string, userText: string, assistantText: string): void {
  try {
    memoryPersistMessage(threadId, "user", userText);
    memoryPersistMessage(threadId, "assistant", assistantText);
  } catch (e: any) {
    // INSERT失敗はログのみ（レスポンスは返す）
    console.warn(`[PERSIST] failed to persist turn threadId=${threadId}:`, e?.message ?? String(e));
  }
}
```

## 5. 主要経路での persistTurn 呼び出し

881行目の `applyPersonaGovernor` の後、882行目の `return res.json` の直前に挿入：

```typescript
// レスポンス形式（厳守）
applyPersonaGovernor(detailPlan as any, { message: sanitized.text, trace: {} as any } as any);

// PERSIST_CALL_MAIN_V1: conversation_log / session_memory にINSERT
persistTurn(threadId, sanitized.text, finalText);

return res.json({
  response: finalText,
  ...
});
```

## 6. インポート追加

28行目の `import { callLLM } from "../core/llm.js";` の後に追加：

```typescript
import { memoryPersistMessage } from "../memory/index.js";
```
