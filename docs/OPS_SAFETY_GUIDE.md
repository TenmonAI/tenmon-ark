# TENMON-ARK 運用安全性ガイド

## 禁止コマンド

### ❌ 絶対に実行してはいけないコマンド

```bash
# プロセスを強制終了（状態を壊す）
sudo fuser -k 3000/tcp
sudo kill -9 $(pgrep -f "node dist/index.js")
sudo pkill -9 node

# ファイルシステムを直接操作（デプロイスクリプトをバイパス）
sudo rm -rf /opt/tenmon-ark-live/dist
sudo cp -r /opt/tenmon-ark-repo/api/dist /opt/tenmon-ark-live/
```

**理由**:
- `fuser -k` や `kill -9` はプロセスを強制終了し、データベース接続やファイルハンドルを適切に閉じない
- デプロイスクリプトをバイパスすると、原子入替（atomic swap）が行われず、サービスが壊れる可能性がある

## 推奨コマンド

### ✅ API サービスの再起動

```bash
# 安全な再起動スクリプトを使用
bash /opt/tenmon-ark-repo/api/scripts/ops/restart_api.sh
```

**または、直接 systemctl を使用**:

```bash
sudo systemctl restart tenmon-ark-api.service
```

### ✅ デプロイ

```bash
# デプロイスクリプトを使用（再起動1回、疎通チェック付き）
bash /opt/tenmon-ark-repo/api/scripts/deploy_live.sh
```

### ✅ サービス状態確認

```bash
# サービス状態を確認
sudo systemctl status tenmon-ark-api.service

# ログを確認
sudo journalctl -u tenmon-ark-api.service -f --lines=50

# メモリ使用量を確認（[HEALTH] ログ）
sudo journalctl -u tenmon-ark-api.service | grep "\[HEALTH\]"
```

## 運用フロー

### 通常のデプロイ

1. **コード変更をコミット**
2. **デプロイスクリプトを実行**:
   ```bash
   cd /opt/tenmon-ark-repo/api
   bash scripts/deploy_live.sh
   ```
3. **デプロイスクリプトが自動的に**:
   - `pnpm build` を実行
   - `rsync` で dist を同期
   - `systemctl restart` を1回実行
   - `/api/audit` と `/api/chat` の疎通をチェック

### 緊急時の再起動

```bash
# 再起動スクリプトを使用（安全）
bash /opt/tenmon-ark-repo/api/scripts/ops/restart_api.sh
```

### メモリ監視

メモリ使用量は30秒ごとに `[HEALTH]` ログに記録されます:

```
[HEALTH] rss=150MB heapUsed=80MB heapTotal=120MB external=10MB
```

**監視項目**:
- `rss`: プロセスの物理メモリ使用量
- `heapUsed`: ヒープの使用量
- `heapTotal`: ヒープの総量
- `external`: 外部メモリ（C++オブジェクトなど）

**異常値の目安**:
- `rss > 500MB`: メモリリークの可能性
- `heapUsed` が継続的に増加: GCが効いていない可能性
- `external` が異常に大きい: 外部リソースのリーク

## トラブルシューティング

### サービスが起動しない

```bash
# ログを確認
sudo journalctl -u tenmon-ark-api.service -n 100

# ビルドエラーを確認
cd /opt/tenmon-ark-repo/api
pnpm -s build
```

### メモリ使用量が高い

```bash
# [HEALTH] ログを確認
sudo journalctl -u tenmon-ark-api.service | grep "\[HEALTH\]" | tail -20

# プロセス情報を確認
ps aux | grep "node dist/index.js"
```

### 疎通が取れない

```bash
# サービス状態を確認
sudo systemctl status tenmon-ark-api.service

# ポートが開いているか確認
sudo ss -lptn 'sport = :3000'

# 手動で疎通チェック
curl -v http://127.0.0.1:3000/api/audit
curl -v -X POST http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId":"test","message":"test"}'
```

## 関連ドキュメント

- `api/scripts/deploy_live.sh`: デプロイスクリプト
- `api/scripts/ops/restart_api.sh`: 再起動スクリプト
- `api/src/index.ts`: エントリポイント（メモリ監視ログ）
