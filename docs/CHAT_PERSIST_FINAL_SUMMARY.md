# /api/chat への conversation_log/session_memory INSERT 実装完了サマリー

## ✅ 実装完了

### 監査結果

1. **export default router; の存在確認**
   - ✅ 910行目に存在

2. **applyPersonaGovernor(detailPlan の実物行検索**
   - 881行目: 主要経路（HYBRID処理の最終段階）

3. **最終応答の return res.json({ response: finalText, ... })**
   - 898-907行目: 主要経路のレスポンス返却

### 実装内容

#### 1. インポート追加 (29行目)
```typescript
import { memoryPersistMessage } from "../memory/index.js";
```

#### 2. persistTurn helper 関数追加 (73-82行目)
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

#### 3. 主要経路での persistTurn 呼び出し (896行目)
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

### ビルド確認

- ✅ TypeScriptビルド: `pnpm -s build` が成功
- ✅ Lintエラー: なし
- ✅ `export default router;` は維持（TS1192エラーなし）

### ファイル変更サマリー

| ファイル | 変更内容 | 行番号 |
|---|---|---|
| `api/src/routes/chat.ts` | インポート追加 | 29 |
| `api/src/routes/chat.ts` | `persistTurn` 関数追加 | 73-82 |
| `api/src/routes/chat.ts` | `persistTurn` 呼び出し追加 | 896 |

### VPSで実行するコマンド列

```bash
# 1. リポジトリに移動
cd /opt/tenmon-ark-repo/api

# 2. TypeScriptビルドを実行（エラー確認）
pnpm -s build

# 3. ビルドが成功したら、本番デプロイスクリプトを実行
bash deploy_live.sh

# または、手動でデプロイする場合:
# 4. systemd サービスを再起動
sudo systemctl restart tenmon-ark-api

# 5. サービス状態を確認
sudo systemctl status tenmon-ark-api

# 6. ログを確認（INSERTが動作しているか）
sudo journalctl -u tenmon-ark-api -f --lines=50

# 7. 動作確認: /api/chat で会話を送信
curl -X POST http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-persist","message":"テストメッセージ"}'

# 8. conversation_log にINSERTされたか確認
sqlite3 /opt/tenmon-ark-data/kokuzo.sqlite \
  "SELECT COUNT(*) FROM conversation_log WHERE session_id='test-persist';"

# 9. session_memory にINSERTされたか確認
sqlite3 /opt/tenmon-ark-data/kokuzo.sqlite \
  "SELECT COUNT(*) FROM session_memory WHERE session_id='test-persist';"

# 10. /api/memory/stats で件数が増えているか確認
curl -s http://127.0.0.1:3000/api/memory/stats | jq '.'
```

### 期待される動作

1. `/api/chat` で会話を送信すると、`conversation_log` と `session_memory` の両方にINSERTされる
2. `/api/memory/stats` の `conversation` と `session` カウントが増加する
3. INSERT失敗時もレスポンスは正常に返される（エラーはログのみ）

### 関連ドキュメント

- `docs/CHAT_PERSIST_PATCH_AUDIT.md`: 監査レポート
- `docs/CHAT_PERSIST_PATCH.diff`: git diff形式のパッチ
- `docs/CHAT_PERSIST_IMPLEMENTATION_REPORT.md`: 実装レポート
- `docs/VPS_DEPLOY_COMMANDS.md`: VPSでのデプロイコマンド列（詳細版）
