# TENMON-ARK API デプロイガイド

## ⚠️ 重要：手打ちワンライナー禁止

**デプロイは必ず以下のいずれかの方法を使用してください。手打ちワンライナーは禁止です。**

## デプロイ方法

### 方法1: Makefile を使用（推奨）

```bash
cd /opt/tenmon-ark-repo/api
make deploy
```

### 方法2: pnpm スクリプトを使用

```bash
cd /opt/tenmon-ark-repo/api
pnpm deploy:live
```

### 方法3: 直接スクリプトを実行（緊急時のみ）

```bash
cd /opt/tenmon-ark-repo/api
bash scripts/deploy_live.sh
```

## 禁止コマンド

以下のような手打ちワンライナーは**絶対に実行しないでください**：

```bash
# ❌ 禁止：手打ちデプロイ
sudo systemctl stop tenmon-ark-api
sudo rsync -a /opt/tenmon-ark-repo/api/dist/ /opt/tenmon-ark-live/dist/
sudo systemctl start tenmon-ark-api

# ❌ 禁止：手打ち再起動
sudo systemctl restart tenmon-ark-api.service

# ❌ 禁止：強制終了
sudo fuser -k 3000/tcp
sudo kill -9 $(pgrep -f "node dist/index.js")
```

## デプロイスクリプトの動作

`scripts/deploy_live.sh` は以下の処理を自動実行します：

1. **ビルド**: `pnpm -s build` を実行
2. **同期**: `rsync` で dist を `/opt/tenmon-ark-live/dist/` に同期（原子入替）
3. **再起動**: `systemctl restart tenmon-ark-api` を1回実行
4. **待機**: `/api/audit` が返るまで最大12秒待機（60回 × 0.2秒）
5. **疎通確認**: `/api/audit` と `/api/chat` をチェック
6. **診断**: 失敗時は `ss -lntp`、`systemctl status`、`journalctl -n 200` を自動出力

## ヘルスチェック

### Makefile を使用

```bash
cd /opt/tenmon-ark-repo/api
make health
```

### 手動で確認

```bash
curl -fsS http://127.0.0.1:3000/api/audit | jq '.'
```

## トラブルシューティング

### デプロイが失敗する場合

1. **ビルドエラー**: `pnpm -s build` のエラーを確認
2. **サービスが起動しない**: `systemctl status tenmon-ark-api` で状態を確認
3. **疎通が取れない**: `ss -lntp | grep :3000` でポートが開いているか確認
4. **ログを確認**: `journalctl -u tenmon-ark-api -n 200` で直近のログを確認

### 再起動が必要な場合

```bash
# 安全な再起動スクリプトを使用
bash /opt/tenmon-ark-repo/api/scripts/ops/restart_api.sh
```

## 関連ドキュメント

- `api/scripts/deploy_live.sh`: デプロイスクリプト
- `api/scripts/ops/restart_api.sh`: 再起動スクリプト
- `docs/OPS_SAFETY_GUIDE.md`: 運用安全性ガイド（禁止コマンド、推奨コマンド）
