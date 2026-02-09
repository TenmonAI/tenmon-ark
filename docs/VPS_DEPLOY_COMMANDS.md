# VPSで実行するコマンド列（コピペ用）

## 前提条件
- `/opt/tenmon-ark-repo` が存在する
- `cd /opt/tenmon-ark-repo/api` で移動できる
- `pnpm` がインストールされている

## 実行コマンド列

```bash
# 1. リポジトリに移動
cd /opt/tenmon-ark-repo/api

# 2. 現在のブランチと状態を確認
git status

# 3. パッチを適用（chat.ts に直接編集）
# 注意: 以下のコマンドは手動で chat.ts を編集するか、パッチファイルを適用してください

# 4. TypeScriptビルドを実行（エラー確認）
pnpm -s build

# 5. ビルドが成功したら、本番デプロイスクリプトを実行
# （deploy_live.sh が存在する場合）
bash deploy_live.sh

# または、手動でデプロイする場合:
# 6. systemd サービスを再起動
sudo systemctl restart tenmon-ark-api

# 7. サービス状態を確認
sudo systemctl status tenmon-ark-api

# 8. ログを確認（INSERTが動作しているか）
sudo journalctl -u tenmon-ark-api -f --lines=50

# 9. 動作確認: /api/chat で会話を送信
curl -X POST http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test-persist","message":"テストメッセージ"}'

# 10. conversation_log にINSERTされたか確認
sqlite3 /opt/tenmon-ark-data/kokuzo.sqlite \
  "SELECT COUNT(*) FROM conversation_log WHERE session_id='test-persist';"

# 11. session_memory にINSERTされたか確認
sqlite3 /opt/tenmon-ark-data/kokuzo.sqlite \
  "SELECT COUNT(*) FROM session_memory WHERE session_id='test-persist';"

# 12. /api/memory/stats で件数が増えているか確認
curl -s http://127.0.0.1:3000/api/memory/stats | jq '.'
```

## パッチ適用方法（手動）

### 方法1: パッチファイルを適用
```bash
cd /opt/tenmon-ark-repo
git apply docs/CHAT_PERSIST_PATCH.diff
```

### 方法2: 手動で編集
1. `api/src/routes/chat.ts` を開く
2. 28行目の後に `import { memoryPersistMessage } from "../memory/index.js";` を追加
3. 70行目の後に `persistTurn` 関数を追加（完全な形で）
4. 881行目の後に `persistTurn(threadId, sanitized.text, finalText);` を追加

## トラブルシューティング

### ビルドエラーが出る場合
```bash
# TypeScriptエラーを確認
pnpm -s build 2>&1 | grep -A 5 "error"

# インポートパスが正しいか確認
grep -n "memoryPersistMessage" api/src/routes/chat.ts
grep -n "from.*memory/index" api/src/routes/chat.ts
```

### INSERTが動作しない場合
```bash
# ログで [PERSIST] を検索
sudo journalctl -u tenmon-ark-api | grep -i "persist"

# DB接続エラーを確認
sudo journalctl -u tenmon-ark-api | grep -i "db\|sqlite\|error"
```

### サービスが起動しない場合
```bash
# systemd のエラーログを確認
sudo journalctl -u tenmon-ark-api -n 100

# 手動で起動してエラーを確認
cd /opt/tenmon-ark-repo/api
node dist/index.js
```
