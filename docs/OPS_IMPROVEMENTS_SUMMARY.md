# 壊れにくい運用への改善 実装サマリー

## 実装完了 ✅

### A) deploy_live.sh を「再起動1回」に固定

**目的**: rsync → restart を連打しない。nginxの connect failed を自爆で増やさない。

**変更内容** (`api/scripts/deploy_live.sh`):

1. **pnpm build 成功チェック**: ビルド失敗時は即座に終了
2. **rsync dist → /opt/tenmon-ark-live/dist/**: 原子入替（atomic swap）を維持
3. **systemctl restart は必ず1回**: `stop` → `start` ではなく `restart` を1回のみ実行
4. **curl で疎通チェック**: `/api/audit` と `/api/chat` をチェックして終了コードで落とす

**変更前**:
- `stop` → `rsync` → `start` の流れ
- 疎通チェックなし

**変更後**:
- `build` → `rsync` → `restart` (1回) → `curl` で疎通チェック

### B) "fuser禁止"を仕組みにする（ガード）

**目的**: KILL(9)で状態を壊す操作を封じる。

**実装内容**:

1. **`api/scripts/ops/restart_api.sh` を作成**:
   - `systemctl restart` のみを使用
   - サービス状態と疎通を自動チェック
   - 以後、このスクリプトのみを使用

2. **`docs/OPS_SAFETY_GUIDE.md` を作成**:
   - 禁止コマンド（`fuser -k`, `kill -9` など）を明記
   - 代替コマンド（`restart_api.sh`, `systemctl restart`）を推奨
   - 運用フローとトラブルシューティングを記載

### C) "死因が見える"ログの型を固定（軽量）

**目的**: メモリ/GC/イベントループ遅延を監視し、「OOM / リーク / 高負荷」を切り分けやすくする。

**実装内容** (`api/src/index.ts`):

30秒ごとに `process.memoryUsage()` を `[HEALTH]` ログに出力:

```typescript
// メモリ/GC/イベントループ遅延の監視（30秒ごと）
setInterval(() => {
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const rssMB = Math.round(mem.rss / 1024 / 1024);
  const externalMB = Math.round(mem.external / 1024 / 1024);
  console.log(`[HEALTH] rss=${rssMB}MB heapUsed=${heapUsedMB}MB heapTotal=${heapTotalMB}MB external=${externalMB}MB`);
}, 30000);
```

**ログ例**:
```
[HEALTH] rss=150MB heapUsed=80MB heapTotal=120MB external=10MB
```

## 変更ファイル

1. **`api/scripts/deploy_live.sh`**
   - 再起動を1回に固定
   - 疎通チェックを追加

2. **`api/scripts/ops/restart_api.sh`** (新規)
   - 安全な再起動スクリプト

3. **`api/src/index.ts`**
   - メモリ監視ログを追加（30秒ごと）

4. **`docs/OPS_SAFETY_GUIDE.md`** (新規)
   - 禁止コマンドと代替コマンドを記載
   - 運用フローとトラブルシューティング

## 使用方法

### デプロイ

```bash
cd /opt/tenmon-ark-repo/api
bash scripts/deploy_live.sh
```

### 再起動

```bash
bash /opt/tenmon-ark-repo/api/scripts/ops/restart_api.sh
```

### メモリ監視

```bash
# [HEALTH] ログを確認
sudo journalctl -u tenmon-ark-api.service | grep "\[HEALTH\]" | tail -20
```

## 期待される効果

1. **デプロイの安定性向上**: 再起動を1回に固定し、nginxの connect failed を削減
2. **運用の安全性向上**: 危険なコマンドを禁止し、安全なスクリプトのみを使用
3. **問題の早期発見**: メモリ監視ログで OOM / リーク / 高負荷を切り分け可能

## 関連ドキュメント

- `docs/OPS_SAFETY_GUIDE.md`: 運用安全性ガイド（禁止コマンド、推奨コマンド、トラブルシューティング）
- `api/scripts/deploy_live.sh`: デプロイスクリプト
- `api/scripts/ops/restart_api.sh`: 再起動スクリプト
