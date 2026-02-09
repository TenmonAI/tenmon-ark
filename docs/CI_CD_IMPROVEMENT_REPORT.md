# TENMON-ARK CI/CD 連動改善レポート

**作成日**: 2024-12-19  
**目的**: Cursor→GitHub→VPS の連動を「事実→原因→影響→最小修正」で一本化する

---

## 1. GitHub Actions ワークフロー調査

### ワークフローファイル一覧

| ファイル | Trigger | Deploy先パス | Package Manager | systemctl対象 | Secrets | 状態 |
|---------|---------|-------------|----------------|---------------|---------|------|
| `.github/workflows/deploy.yml` | `push: [main]` + `workflow_dispatch` | `/opt/tenmon-ark-repo` | `pnpm` | `tenmon-ark-api` (deploy_live.sh内) | `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` | ✅ canonical |
| `.github/workflows/tenmon-ark-build.yml` | `workflow_dispatch` のみ | N/A | N/A | N/A | N/A | ❌ 無効化済み |

### 詳細

#### `.github/workflows/deploy.yml` (canonical)
```yaml
name: Deploy TENMON-ARK API to VPS (canonical)

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to VPS via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            set -euo pipefail

            cd /opt/tenmon-ark-repo
            git fetch --all
            git reset --hard origin/main

            cd /opt/tenmon-ark-repo/api
            pnpm -s install
            pnpm -s deploy:live
            bash scripts/smoke.sh
```

**確認事項**:
- ✅ `appleboy/ssh-action@v1.0.3` 固定
- ✅ Secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` に統一
- ✅ パス: `/opt/tenmon-ark-repo` を使用
- ✅ パッケージマネージャー: `pnpm` を使用
- ✅ デプロイスクリプト: `pnpm -s deploy:live` を使用
- ✅ 検証: `bash scripts/smoke.sh` を実行

#### `.github/workflows/tenmon-ark-build.yml` (無効化済み)
```yaml
name: (OFF) Legacy TENMON-ARK Web Deploy

on:
  workflow_dispatch:

jobs:
  noop:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Disabled to avoid double-deploy. Use canonical API deploy workflow."
```

**確認事項**:
- ✅ `push` トリガーを削除済み
- ✅ `workflow_dispatch` のみ（手動実行時も noop）
- ✅ 二重デプロイ防止済み

---

## 2. VPS側の実稼働調査（推測ベース）

### systemd unit の実態（推測）

**リポジトリ内の systemd unit ファイル**:
1. `server/systemd/tenmon-ark-api.service`: `WorkingDirectory=/opt/tenmon-ark/tenmon-ark` ⚠️ 古いパス
2. `infra/systemd/tenmon-ark-api.service`: `WorkingDirectory=/opt/tenmon-ark/api` ⚠️ 古いパス

**実稼働推測**:
- `deploy_live.sh` は `/opt/tenmon-ark-live/dist/index.js` に配置
- systemd unit が `/opt/tenmon-ark-live/dist` を参照している可能性が高い
- **確認が必要**: VPS上で `systemctl show tenmon-ark-api` を実行して `ExecStart` と `WorkingDirectory` を確認

### `/api/audit` の実装

**実装済み**:
- `gitSha`: `/opt/tenmon-ark-repo/api` から取得（`api/src/version.ts`）
- `build.mark`: `BUILD_MARK:DET_RECALL_V1+MEMLOG_V1+LOW_SIGNAL_V1`
- `build.features`: `{ detRecallPassphrase: false, memPersistLog: false, lowSignalFallback: true }`
- すべてのレスポンス（200/503/500）で `build` を返す

**確認が必要**: VPS上で以下を実行
```bash
curl -fsS http://127.0.0.1:3000/api/audit | jq '{ok,gitSha,build,readiness.stage}'
```

### パスの役割整理

| パス | 役割 | 用途 |
|------|------|------|
| `/opt/tenmon-ark-repo` | Git リポジトリ | ソースコード管理、ビルド実行 |
| `/opt/tenmon-ark-repo/api` | API ソース | `pnpm -s build` でビルド |
| `/opt/tenmon-ark-live` | 実稼働環境 | `deploy_live.sh` が `dist/` を atomic swap |
| `/opt/tenmon-ark-live/dist/index.js` | 実行ファイル | systemd が実行 |

**フロー**:
```
/opt/tenmon-ark-repo/api (build)
  ↓ pnpm -s build
/opt/tenmon-ark-repo/api/dist
  ↓ rsync (atomic swap)
/opt/tenmon-ark-live/dist
  ↓ systemctl restart
実行中
```

---

## 3. 正規デプロイ経路の提案

### 正規デプロイ経路（1本に統一）

```
main push → GitHub Actions
  ↓
/opt/tenmon-ark-repo (git reset --hard origin/main)
  ↓
/opt/tenmon-ark-repo/api (pnpm -s install)
  ↓
api/scripts/deploy_live.sh
  ↓
1. pnpm -s build (REPO でビルド)
2. rsync → /opt/tenmon-ark-live/dist (atomic swap)
3. systemctl restart tenmon-ark-api
4. /api/audit の health check
5. /api/audit の build.mark ゲート
6. bash scripts/smoke.sh
  ↓
SUCCESS
```

### ゲート設計

| ゲート | 検証内容 | 失敗時の動作 |
|--------|---------|-------------|
| **ビルドゲート** | `pnpm -s build` が成功 | `exit 1` |
| **build mark ゲート（dist）** | `grep -R "BUILD_MARK" /opt/tenmon-ark-live/dist` | `exit 1` |
| **health ゲート** | `/api/audit` が 200 を返す | `exit 1`（最大12秒待機） |
| **audit ゲート** | `/api/audit` の `build.mark` が存在 | `exit 1` |
| **smoke ゲート** | `smoke.sh` が成功 | `exit 1` |

---

## 4. 事実→原因→影響→最小修正

### 事実

1. **GitHub Actions は既に canonical 版に統一済み**
   - `.github/workflows/deploy.yml`: `/opt/tenmon-ark-repo` → `pnpm` → `deploy:live` → `smoke.sh`
   - `.github/workflows/tenmon-ark-build.yml`: `push` 無効化済み

2. **deploy_live.sh は既にゲート付き**
   - build mark 検証（dist）
   - `/api/audit` の health check
   - `/api/audit` の build.mark ゲート
   - `smoke.sh` 実行

3. **`/api/audit` は既に `build.mark` を返す**
   - 200/503/500 すべてのレスポンスで `build: { mark, features }` を含む

4. **DET_RECALL_V1 は既に衝突しない配置**
   - `trimmed` の直後、`isLowSignal` より前（373-395行目）
   - 関数定義は router 外（80-112行目）

### 原因

**現状は既に正しく実装されている**。ただし、VPS側の実稼働状態が不明なため、以下を確認する必要がある：

1. systemd unit が `/opt/tenmon-ark-live/dist` を参照しているか
2. `/api/audit` が実際に `build.mark` を返しているか
3. GitHub Actions が実際に動作しているか

### 影響

**現状の実装は正しいが、VPS側の確認が不足している**。以下が確認できれば問題なし：

- ✅ リポジトリ内のコードは正しい
- ⚠️ VPS側の実稼働状態が未確認

### 最小修正（パッチ形式）

**現状は既に正しく実装されているため、修正は不要**。ただし、VPS側の確認が必要。

#### VPS側で確認すべきコマンド

```bash
# 1. systemd unit の確認
systemctl show tenmon-ark-api | grep -E "ExecStart|WorkingDirectory|MainPID"

# 2. /api/audit の確認
curl -fsS http://127.0.0.1:3000/api/audit | jq '{ok,gitSha,build,readiness.stage}'

# 3. パスの確認
ls -la /opt/tenmon-ark-repo/api/dist/index.js
ls -la /opt/tenmon-ark-live/dist/index.js

# 4. deploy_live.sh の確認
cd /opt/tenmon-ark-repo/api
bash scripts/deploy_live.sh

# 5. smoke.sh の確認
bash scripts/smoke.sh
```

#### もし systemd unit が古いパスを参照している場合

**修正が必要な場合のパッチ**:

```diff
--- a/server/systemd/tenmon-ark-api.service
+++ b/server/systemd/tenmon-ark-api.service
@@ -8,7 +8,7 @@ After=network.target
 [Service]
 Type=simple
 User=www-data
-WorkingDirectory=/opt/tenmon-ark/tenmon-ark
+WorkingDirectory=/opt/tenmon-ark-live/dist
 Environment=NODE_ENV=production
-EnvironmentFile=/opt/tenmon-ark/tenmon-ark/.env
+EnvironmentFile=/opt/tenmon-ark-live/.env
 ExecStart=/usr/bin/node dist/index.js
```

**ただし**: リポジトリ内の systemd unit ファイルは参考用で、VPS上で直接編集する必要がある可能性が高い。

---

## 5. DET_RECALL_V1 の配置確認

### 現在の配置（確認済み）

**位置**: `api/src/routes/chat.ts` 373-395行目

```typescript
const trimmed = message.trim();

// ✅ DET_RECALL_V1: 合言葉の決定論リコール（早期return・衝突回避）
// - low-signal に吸われない
// - lane/pending に吸われない
// - Kanagi/LLM に入らない（決定論で完結）
if (wantsPassphraseRecall(trimmed)) {
  const p = recallPassphraseFromSession(threadId, 80);
  const answer = p
    ? `覚えています。合言葉は「${p}」です。`
    : "まだ合言葉が登録されていません。先に「合言葉は◯◯です」と教えてください。";

  persistTurn(threadId, trimmed, answer);

  return res.json({
    response: answer,
    evidence: null,
    timestamp,
    threadId,
    decisionFrame: { mode: "NATURAL", intent: "chat", llm: null, ku: {} },
  });
}

// 低情報入力のフォールバック（短い/意味薄いメッセージは通常会話テンプレへ）
if (isLowSignal(trimmed) && !isGreetingLike(trimmed)) {
  // ...
}
```

**確認結果**:
- ✅ `trimmed` の直後（373行目の直後）
- ✅ `isLowSignal` より前（397行目より前）
- ✅ 他の分岐（pending / lane / number pick / #talk / #menu）より前
- ✅ 関数定義は router 外（80-112行目）

**結論**: 既に最安全な配置になっている。

---

## 6. 次のアクション

### 必須確認（VPS上で実行）

1. **systemd unit の確認**
   ```bash
   systemctl show tenmon-ark-api | grep -E "ExecStart|WorkingDirectory"
   ```

2. **/api/audit の確認**
   ```bash
   curl -fsS http://127.0.0.1:3000/api/audit | jq '{ok,gitSha,build,readiness.stage}'
   ```

3. **デプロイフローの確認**
   ```bash
   cd /opt/tenmon-ark-repo/api
   bash scripts/deploy_live.sh
   ```

4. **smoke テストの確認**
   ```bash
   bash scripts/smoke.sh
   ```

### 修正が必要な場合

**systemd unit が古いパスを参照している場合のみ**、VPS上で以下を実行：

```bash
sudo systemctl edit tenmon-ark-api
# 以下を追加:
# [Service]
# WorkingDirectory=/opt/tenmon-ark-live/dist
# EnvironmentFile=/opt/tenmon-ark-live/.env

sudo systemctl daemon-reload
sudo systemctl restart tenmon-ark-api
```

---

## 7. まとめ

### 実装状況

- ✅ GitHub Actions: canonical 版に統一済み
- ✅ deploy_live.sh: ゲート付き（build mark / audit / smoke）
- ✅ /api/audit: build.mark を返す実装済み
- ✅ DET_RECALL_V1: 衝突しない配置済み

### 確認が必要

- ⚠️ VPS側の systemd unit のパス
- ⚠️ VPS側の /api/audit の動作
- ⚠️ GitHub Actions の実際の動作

### 結論

**リポジトリ内のコードは既に正しく実装されている**。VPS側の確認を行い、必要に応じて systemd unit を修正すれば完了。
