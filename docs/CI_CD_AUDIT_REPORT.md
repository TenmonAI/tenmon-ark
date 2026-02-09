# TENMON-ARK CI/CD 監査レポート

**作成日**: 2024-12-19  
**目的**: Cursor→GitHub→VPS の連動不整合を事実ベースで確定し、最小工数で一本化する

---

## A. 現状の正規（canonical）候補の列挙

### デプロイ入口の候補一覧

| 入口 | 対象パス | 操作コマンド | 実行場所 | 状態 |
|------|---------|-------------|---------|------|
| `api/scripts/deploy_live.sh` | `/opt/tenmon-ark-repo/api` | `pnpm -s build` → `pnpm -s deploy:live` | VPS 手動実行 | ✅ 正規候補 |
| `.github/workflows/deploy.yml` | `/opt/tenmon-ark-repo` | `pnpm -s install` → `pnpm -s deploy:live` | GitHub Actions (main push) | ✅ 正規候補 |
| `.github/workflows/tenmon-ark-build.yml` | N/A | `echo "Disabled..."` | GitHub Actions (workflow_dispatch) | ❌ 無効化済み |
| `server/systemd/tenmon-ark-api.service` | `/opt/tenmon-ark/tenmon-ark` | `node dist/index.js` | systemd (VPS) | ⚠️ 古いパス |
| `infra/systemd/tenmon-ark-api.service` | `/opt/tenmon-ark/api` | `node dist/index.js` | systemd (VPS) | ⚠️ 古いパス |
| 実稼働パス（推測） | `/opt/tenmon-ark-live/dist/index.js` | `node dist/index.js` | systemd (VPS) | ✅ 実稼働 |

### 詳細

#### 1. `api/scripts/deploy_live.sh`
- **対象**: `/opt/tenmon-ark-repo/api`
- **操作**: 
  - `pnpm -s build` (REPO でビルド)
  - `rsync -a --delete "$REPO/dist/" "$LIVE/dist.new/"` (atomic swap)
  - `sudo systemctl restart tenmon-ark-api`
- **検証**: build mark の grep 検証 + `/api/audit` の jq 検証
- **状態**: ✅ 正規候補（`api/package.json` の `deploy:live` スクリプト）

#### 2. `.github/workflows/deploy.yml`
- **対象**: `/opt/tenmon-ark-repo`
- **トリガー**: `push: branches: [main]` + `workflow_dispatch`
- **操作**:
  - `cd /opt/tenmon-ark-repo` → `git fetch --all` → `git reset --hard origin/main`
  - `cd /opt/tenmon-ark-repo/api` → `pnpm -s install` → `pnpm -s deploy:live`
- **Secrets**: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`
- **状態**: ✅ 正規候補（canonical と明記）

#### 3. systemd unit ファイル（2つ存在）
- **`server/systemd/tenmon-ark-api.service`**:
  - `WorkingDirectory=/opt/tenmon-ark/tenmon-ark` ⚠️ 古いパス
  - `ExecStart=/usr/bin/node dist/index.js`
- **`infra/systemd/tenmon-ark-api.service`**:
  - `WorkingDirectory=/opt/tenmon-ark/api` ⚠️ 古いパス
  - `ExecStart=/usr/bin/node dist/index.js`
- **実稼働推測**: `/opt/tenmon-ark-live/dist/index.js` を実行している可能性が高い（`deploy_live.sh` が `$LIVE/dist` に配置するため）

---

## B. GitHub Actions の実態調査

### ワークフローファイル一覧

| ファイル | Trigger | SSH先パス | install/build | restart | secrets | 状態 |
|---------|---------|----------|---------------|---------|---------|------|
| `.github/workflows/deploy.yml` | `push: [main]` + `workflow_dispatch` | `/opt/tenmon-ark-repo` | `pnpm -s install` → `pnpm -s deploy:live` | `deploy_live.sh` 内で `systemctl restart` | `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` | ✅ 有効 |
| `.github/workflows/tenmon-ark-build.yml` | `workflow_dispatch` | N/A | N/A | N/A | N/A | ❌ 無効化済み |

### 詳細

#### `.github/workflows/deploy.yml` (canonical)
```yaml
on:
  push:
    branches: [ main ]
  workflow_dispatch:

script: |
  cd /opt/tenmon-ark-repo
  git fetch --all
  git reset --hard origin/main
  cd /opt/tenmon-ark-repo/api
  pnpm -s install
  pnpm -s deploy:live
```

**確認事項**:
- ✅ パス: `/opt/tenmon-ark-repo` (正規)
- ✅ パッケージマネージャー: `pnpm` (正規)
- ✅ デプロイスクリプト: `pnpm -s deploy:live` (正規)
- ⚠️ トリガー: `push: branches: [main]` → **main ブランチへの push で自動実行される**

#### `.github/workflows/tenmon-ark-build.yml` (無効化済み)
```yaml
name: (OFF) Legacy TENMON-ARK Web Deploy
on:
  workflow_dispatch:
jobs:
  noop:
    steps:
      - run: echo "Disabled to avoid double-deploy. Use canonical API deploy workflow."
```

**確認事項**:
- ❌ 無効化済み（二重デプロイ防止のため）

### 二重デプロイ/別パスデプロイの危険性

**現状の整合性**:
- ✅ GitHub Actions と `deploy_live.sh` は同じパス (`/opt/tenmon-ark-repo/api`) を使用
- ✅ 両方とも `pnpm` を使用
- ⚠️ **ただし**: systemd unit ファイルが古いパス (`/opt/tenmon-ark/tenmon-ark` または `/opt/tenmon-ark/api`) を参照している可能性

**潜在的な不整合**:
1. systemd unit が `/opt/tenmon-ark/tenmon-ark` を参照している場合、`deploy_live.sh` が `/opt/tenmon-ark-live/dist` に配置しても、systemd が別のパスを実行する可能性
2. VPS 上で実際に使用されている systemd unit ファイルが不明（`server/systemd/` と `infra/systemd/` のどちらが使用されているか）

---

## C. VPS 側の "実際に動いている実体" の調査

### 現状のローカルリポジトリ情報

**確認コマンド実行結果**:
```bash
$ git branch --show-current
main

$ git log -1 --oneline
4458789 feat: add Phase00 sha gate, robust ingest confirm, and TENMON_CORE_PACK_v1 core seed (Phase46)

$ git rev-parse HEAD
4458789f1b4af3b192ef93b09003f01f1322c3b3
```

**確認事項**:
- ✅ 現在のブランチ: `main`
- ✅ 最新コミット: `4458789` (Phase46)
- ⚠️ **注意**: ユーザーが提示したログでは「branch=wip、HEAD!=origin/main」とあるが、ローカルリポジトリでは `main` ブランチになっている

### `/api/audit` の `gitSha` 取得ロジック

**実装**: `api/src/version.ts`
```typescript
export function getGitSha(): string {
  const repoPath = "/opt/tenmon-ark-repo/api";
  if (!existsSync(repoPath)) {
    throw new Error("Repository path not found: " + repoPath);
  }
  try {
    const sha = execSync("git rev-parse --short HEAD", {
      cwd: repoPath,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return sha;
  } catch (error) {
    throw new Error(`Failed to get gitSha: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

**確認事項**:
- ✅ `gitSha` は `/opt/tenmon-ark-repo/api` から取得
- ⚠️ **問題**: VPS 上で `/opt/tenmon-ark-repo/api` が存在しない、または `git rev-parse` が失敗する場合、`/api/audit` が 500 エラーを返す可能性

### systemd unit の実態（推測）

**リポジトリ内の systemd unit ファイル**:
1. `server/systemd/tenmon-ark-api.service`: `WorkingDirectory=/opt/tenmon-ark/tenmon-ark`
2. `infra/systemd/tenmon-ark-api.service`: `WorkingDirectory=/opt/tenmon-ark/api`

**実稼働推測**:
- `deploy_live.sh` は `/opt/tenmon-ark-live/dist/index.js` に配置
- systemd unit が `/opt/tenmon-ark-live/dist` を参照している可能性が高い
- **ただし**: リポジトリ内の unit ファイルは古いパスを参照しているため、VPS 上で実際に使用されている unit ファイルが不明

### 不整合の可能性

**ユーザーが提示したログから推測される不整合**:
1. **ブランチの不整合**: VPS 上で `wip` ブランチが使用されているが、GitHub Actions は `main` ブランチを対象としている
2. **HEAD と origin/main の差**: VPS 上の `HEAD` が `origin/main` と一致していない
3. **Actions が走っても反映されない**: `main` ブランチへの push で Actions が実行されるが、VPS 上で `wip` ブランチが使用されているため反映されない

---

## D. 不整合の原因を「原因→影響」で列挙

### 1. ブランチの不整合（main vs wip）

**原因**:
- GitHub Actions は `main` ブランチへの push でトリガーされる
- VPS 上で実際に稼働しているコードが `wip` ブランチを参照している可能性

**影響**:
- `main` ブランチへの push で Actions が実行されても、VPS 上の `wip` ブランチには反映されない
- `/api/audit` の `gitSha` が `wip` ブランチの SHA を返し、`origin/main` と一致しない
- デプロイが成功しても、実際に稼働しているコードが古いまま

**根拠**:
- `.github/workflows/deploy.yml`: `push: branches: [main]`
- ユーザー提示ログ: "branch=wip、HEAD!=origin/main"

### 2. systemd unit ファイルのパス不整合

**原因**:
- リポジトリ内の systemd unit ファイルが古いパス (`/opt/tenmon-ark/tenmon-ark` または `/opt/tenmon-ark/api`) を参照
- `deploy_live.sh` は `/opt/tenmon-ark-live/dist` に配置

**影響**:
- systemd unit が古いパスを参照している場合、`deploy_live.sh` が `/opt/tenmon-ark-live/dist` に配置しても、systemd が別のパスを実行する可能性
- デプロイが成功しても、実際に稼働しているコードが古いまま

**根拠**:
- `server/systemd/tenmon-ark-api.service`: `WorkingDirectory=/opt/tenmon-ark/tenmon-ark`
- `infra/systemd/tenmon-ark-api.service`: `WorkingDirectory=/opt/tenmon-ark/api`
- `api/scripts/deploy_live.sh`: `LIVE="/opt/tenmon-ark-live"`

### 3. GitHub Actions の push トリガーによる自動デプロイ

**原因**:
- `.github/workflows/deploy.yml` が `push: branches: [main]` でトリガーされる
- `main` ブランチへの push で自動的にデプロイが実行される

**影響**:
- 意図しないデプロイが実行される可能性
- VPS 上で `wip` ブランチが使用されている場合、`main` ブランチへの push でデプロイが実行されても反映されない
- デプロイのタイミングを制御できない

**根拠**:
- `.github/workflows/deploy.yml`: `on: push: branches: [main]`

---

## E. 一本化の最小工数プラン（最小diff）

### 方針

#### 案1: main を正規にして wip を main に統合（推奨）

**理由**:
- GitHub Actions は既に `main` ブランチを対象としている
- `main` ブランチが標準的な Git フローに沿っている
- ローカルリポジトリでも `main` ブランチが使用されている

**やることチェックリスト**:
1. ✅ VPS 上で `wip` ブランチの変更を `main` ブランチにマージ（または rebase）
2. ✅ VPS 上で `git checkout main && git pull origin main` を実行
3. ✅ `/opt/tenmon-ark-repo/api` が `main` ブランチを参照していることを確認
4. ✅ `/api/audit` の `gitSha` が `origin/main` と一致することを確認
5. ✅ systemd unit ファイルを `/opt/tenmon-ark-live/dist` を参照するように更新（VPS 上で直接編集）
6. ✅ `deploy_live.sh` の動作を確認（`/opt/tenmon-ark-live/dist` に配置されることを確認）
7. ⚠️ **事故防止**: GitHub Actions の `push: branches: [main]` トリガーを一時的に無効化（`workflow_dispatch` のみに変更）
8. ✅ 手動で `workflow_dispatch` を実行してデプロイを確認
9. ✅ デプロイ成功後、`push: branches: [main]` トリガーを再有効化（必要に応じて）
10. ✅ `smoke.sh` を `deploy_live.sh` の最後に追加して検証

#### 案2: wip を正規にして workflow の対象ブランチを wip に変更（暫定）

**理由**:
- VPS 上で `wip` ブランチが既に使用されている場合、最小工数で対応可能

**やることチェックリスト**:
1. ✅ `.github/workflows/deploy.yml` の `push: branches: [main]` を `push: branches: [wip]` に変更
2. ✅ VPS 上で `/opt/tenmon-ark-repo/api` が `wip` ブランチを参照していることを確認
3. ✅ `/api/audit` の `gitSha` が `wip` ブランチの SHA を返すことを確認
4. ✅ systemd unit ファイルを `/opt/tenmon-ark-live/dist` を参照するように更新（VPS 上で直接編集）
5. ✅ `deploy_live.sh` の動作を確認（`/opt/tenmon-ark-live/dist` に配置されることを確認）
6. ⚠️ **事故防止**: GitHub Actions の `push: branches: [wip]` トリガーを一時的に無効化（`workflow_dispatch` のみに変更）
7. ✅ 手動で `workflow_dispatch` を実行してデプロイを確認
8. ✅ デプロイ成功後、`push: branches: [wip]` トリガーを再有効化（必要に応じて）
9. ✅ `smoke.sh` を `deploy_live.sh` の最後に追加して検証
10. ⚠️ **注意**: `wip` ブランチを `main` に統合する計画を立てる（長期的には案1に移行）

### 事故防止の推奨事項

**まず "事故防止" として Actions の push トリガーを止める**:
- `.github/workflows/deploy.yml` の `push: branches: [main]` を一時的にコメントアウト
- `workflow_dispatch` のみで手動実行可能にする
- デプロイの動作確認後、必要に応じて `push` トリガーを再有効化

---

## F. ゲート設計（連動の検証）

### 1. `/api/audit` の `build.mark` をゲートにする

**現状**:
- ✅ `api/src/routes/audit.ts` が `build.mark` を返す実装済み
- ✅ `deploy_live.sh` が `/api/audit` の `build.mark` を検証する実装済み（59-68行目）

**確認**:
```bash
# deploy_live.sh の実装
echo "[deploy] audit gate: build mark"
if command -v jq >/dev/null 2>&1; then
  curl -fsS "${BASE_URL}/api/audit" \
    | jq -e '.build.mark | contains("BUILD_MARK:DET_RECALL_V1")' >/dev/null \
    || { echo "[deploy] ERROR: build mark missing in /api/audit"; exit 1; }
else
  curl -fsS "${BASE_URL}/api/audit" | grep -q 'BUILD_MARK:DET_RECALL_V1' \
    || { echo "[deploy] ERROR: build mark missing in /api/audit"; exit 1; }
fi
```

**改善案**:
- ✅ 現状の実装で十分（JSON で検証、jq が無い場合は grep で検証）

### 2. `deploy_live.sh` の最後に `smoke.sh` を実行

**現状**:
- ✅ `api/scripts/smoke.sh` が存在
- ❌ `deploy_live.sh` の最後に `smoke.sh` が実行されていない

**改善案**:
- `deploy_live.sh` の最後（89行目の `echo "[deploy] SUCCESS"` の前）に以下を追加:
```bash
echo "[deploy] smoke tests"
bash "$REPO/scripts/smoke.sh" || { echo "[deploy] ERROR: smoke tests failed"; exit 1; }
```

### 3. GitHub Actions 側でも `smoke.sh` を実行

**現状**:
- ❌ GitHub Actions の `deploy.yml` で `smoke.sh` が実行されていない

**改善案**:
- `deploy.yml` の `pnpm -s deploy:live` の後に以下を追加:
```yaml
script: |
  set -euo pipefail

  cd /opt/tenmon-ark-repo
  git fetch --all
  git reset --hard origin/main

  cd /opt/tenmon-ark-repo/api
  pnpm -s install
  pnpm -s deploy:live

  # smoke tests
  bash /opt/tenmon-ark-repo/api/scripts/smoke.sh || exit 1
```

**注意**:
- `deploy_live.sh` 内で `smoke.sh` を実行する場合、GitHub Actions 側で再度実行する必要はない（二重実行を避ける）

---

## G. 変更対象ファイル一覧（パス付き）

### 必須変更ファイル

1. **`.github/workflows/deploy.yml`**
   - 変更内容: `push: branches: [main]` を一時的にコメントアウト（事故防止）
   - 変更内容: `smoke.sh` の実行を追加（`deploy_live.sh` 内で実行する場合は不要）

2. **`api/scripts/deploy_live.sh`**
   - 変更内容: 最後に `smoke.sh` を実行する処理を追加

3. **`api/scripts/smoke.sh`**
   - 状態: ✅ 既に存在（変更不要）

4. **`api/src/routes/audit.ts`**
   - 状態: ✅ `build.mark` を返す実装済み（変更不要）

5. **`api/src/build/buildInfo.ts`**
   - 状態: ✅ `BUILD_MARK` と `BUILD_FEATURES` が定義済み（変更不要）

### VPS 上で直接編集が必要なファイル

6. **`/etc/systemd/system/tenmon-ark-api.service`** (VPS 上)
   - 変更内容: `WorkingDirectory` を `/opt/tenmon-ark-live/dist` に変更
   - 変更内容: `ExecStart` を `/usr/bin/node /opt/tenmon-ark-live/dist/index.js` に変更（または `WorkingDirectory` を `/opt/tenmon-ark-live/dist` に設定）

### 参考ファイル（変更不要）

7. **`server/systemd/tenmon-ark-api.service`** (リポジトリ内)
   - 状態: ⚠️ 古いパスを参照（参考用、VPS 上で直接編集する必要がある）

8. **`infra/systemd/tenmon-ark-api.service`** (リポジトリ内)
   - 状態: ⚠️ 古いパスを参照（参考用、VPS 上で直接編集する必要がある）

9. **`docs/CI_CD_AUDIT_REPORT.md`** (このレポート)
   - 状態: ✅ 新規作成済み

---

## 次のアクション

**このレポートが揃えば、次に何をするか**:

1. **VPS 上で現状確認**: `systemctl show tenmon-ark-api` で `ExecStart` と `WorkingDirectory` を確認し、`/opt/tenmon-ark-repo/api` のブランチと `gitSha` を確認
2. **案1（推奨）を実行**: `wip` ブランチを `main` に統合し、systemd unit を `/opt/tenmon-ark-live/dist` を参照するように更新
3. **事故防止**: GitHub Actions の `push` トリガーを一時的に無効化
4. **デプロイ検証**: `workflow_dispatch` で手動実行し、`smoke.sh` で検証
5. **一本化完了**: デプロイ成功後、必要に応じて `push` トリガーを再有効化
