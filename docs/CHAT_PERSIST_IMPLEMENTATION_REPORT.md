# /api/chat への conversation_log/session_memory INSERT 実装レポート

## 実装完了 ✅

### 変更内容

1. **インポート追加** (29行目)
   - `import { memoryPersistMessage } from "../memory/index.js";`

2. **persistTurn helper 関数追加** (72-82行目)
   - `const router: IRouter = Router();` の直後に配置
   - `conversation_log` と `session_memory` の両方にINSERT
   - エラーハンドリング付き（INSERT失敗時もレスポンスは返す）

3. **主要経路での persistTurn 呼び出し** (884行目)
   - `applyPersonaGovernor()` の後、`return res.json()` の直前
   - `persistTurn(threadId, sanitized.text, finalText);`

### 実装箇所の詳細

#### 1. persistTurn helper 関数
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

#### 2. 主要経路での呼び出し
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

### 動作確認

#### ビルド確認
- ✅ TypeScriptビルド: `pnpm -s build` が成功
- ✅ Lintエラー: なし

#### 期待される動作
1. `/api/chat` で会話を送信すると、`conversation_log` と `session_memory` の両方にINSERTされる
2. `/api/memory/stats` の `conversation` と `session` カウントが増加する
3. INSERT失敗時もレスポンスは正常に返される（エラーはログのみ）

### 次のステップ

#### 優先度1: 他のレスポンス経路でもINSERT
- `buildGroundedResponse()` の返却時
- `#talk` コマンドの返却時
- エラーフォールバック時（899行目の `applyPersonaGovernor` の後）

#### 優先度2: 重複INSERTの防止
- 既にINSERT済みの場合はスキップする仕組み
- または、`memoryPersistMessage()` 側で重複チェックを実装

### ファイル変更サマリー

| ファイル | 変更内容 | 行番号 |
|---|---|---|
| `api/src/routes/chat.ts` | インポート追加 | 29 |
| `api/src/routes/chat.ts` | `persistTurn` 関数追加 | 72-82 |
| `api/src/routes/chat.ts` | `persistTurn` 呼び出し追加 | 884 |

### 関連ドキュメント

- `docs/CHAT_PERSIST_PATCH_AUDIT.md`: 監査レポート
- `docs/CHAT_PERSIST_PATCH.diff`: git diff形式のパッチ
- `docs/VPS_DEPLOY_COMMANDS.md`: VPSでのデプロイコマンド列
