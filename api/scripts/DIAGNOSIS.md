# 本番環境API状態診断レポート

## 診断日時
2026-01-09 19:19 JST

## 診断結果

### ✅ 動作しているエンドポイント
- `/api/corpus/docs` - 正常応答
- `/api/chat` - 正常応答（`decisionFrame` フィールドあり）

### ❌ 404エラー（未デプロイ）
- `/api/health` - 404 Not Found
- `/api/settings` - 404 Not Found

## 判定

**本番APIは古いバージョンです**

理由：
1. `/api/health` が404 → 新しいヘルスチェックエンドポイントが未デプロイ
2. `/api/settings` が404 → 新しい設定エンドポイントが未デプロイ
3. `/api/chat` は `decisionFrame` フィールドあり → 部分的に新しいAPIが動いている可能性

## デプロイが必要な変更点

### 1. 新規エンドポイント
- `/api/health` - ヘルスチェック（`external` フィールド含む）
- `/api/settings` - 設定取得/保存

### 2. 既存エンドポイントの改善
- `/api/chat` - ログ追加（`requestId`, `latency`, `evidenceConfidence`）
- `/api/chat` - レート制限追加（30req/min）

### 3. 新機能
- Truth Skeleton（真理骨格）
- LIVEモード（Web検索）
- HYBRIDモード（domain）
- SSRF対策
- Rate Limit

## デプロイ手順

### 1. ローカルでビルド確認
```bash
cd /opt/tenmon-ark/api
pnpm build
```

### 2. スモークテスト実行
```bash
BASE_URL=http://localhost:3000 ./scripts/smoke_chat.sh
```

### 3. 本番デプロイ
```bash
sudo ./scripts/deploy-production.sh
```

### 4. デプロイ後確認
```bash
# ヘルスチェック
curl https://tenmon-ark.com/api/health | jq .

# 本番環境確認
./scripts/check-production.sh
```

## 注意事項

1. **環境変数**: デプロイ前に `override.conf` に secrets を設定
2. **サービス再起動**: `sudo systemctl restart tenmon-ark-api`
3. **ログ確認**: `sudo journalctl -u tenmon-ark-api -f`

## 次のステップ

1. ✅ 本番環境の状態確認（完了）
2. ⏳ デプロイスクリプト実行
3. ⏳ デプロイ後確認
4. ⏳ スモークテスト（本番環境）

