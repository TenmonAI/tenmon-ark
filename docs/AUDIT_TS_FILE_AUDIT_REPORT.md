# TENMON-ARK: audit.ts ファイル実在確認レポート

**作成日**: 2024-12-19  
**目的**: `api/src/routes/audit.ts` が見つからない問題を事実ベースで確定する

---

## 1. 事実

### 1.1 Cursorのワークスペース情報

**開いているプロジェクトの絶対パス**:
```
/Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset
```

**git remote -v**:
```
origin	https://TenmonAI@github.com/TenmonAI/tenmon-ark.git (fetch)
origin	https://TenmonAI@github.com/TenmonAI/tenmon-ark.git (push)
```

**git branch / HEAD / origin/main**:
- 現在のブランチ: `main`
- HEAD: `4458789f1b4af3b192ef93b09003f01f1322c3b3`
- origin/main: `c295c7cdec801f28c9eb0c112a8dccc99ccb41cf`

**注意**: HEAD と origin/main が異なる（ローカルが origin/main より進んでいる可能性）

**ルート直下の一覧**:
```
.ds_store
.cursor/
.env
.git/
.github/
.gitignore
.gitkeep
.manus/
.prettierignore
.prettierrc
api/
docs/
（その他多数のMarkdownファイル）
```

### 1.2 ファイル実在確認

#### `api/src/routes/audit.ts`

**存在**: ✅ **存在する**

**パス**: `/Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset/api/src/routes/audit.ts`

**内容先頭30行**:
```typescript
import { Router, type Request, type Response } from "express";
import { getGitSha } from "../version.js";
import { getReadiness } from "../health/readiness.js";
import { BUILD_MARK, BUILD_FEATURES } from "../build/buildInfo.js";

const router = Router();
router.get("/audit", (_req: Request, res: Response) => {
  const handlerTime = Date.now();
  const pid = process.pid;
  const uptime = process.uptime();
  const r = getReadiness();
  console.log(`[AUDIT-HANDLER] PID=${pid} uptime=${uptime}s handlerTime=${new Date().toISOString()} stage=${r.stage}`);
  
  try {
    const gitSha = getGitSha();
    if (!r.ready) {
      // Not ready: 503 Service Unavailable
      return res.status(503).json({
        ok: false,
        timestamp: new Date().toISOString(),
        gitSha,
        pid,
        uptime: Math.floor(uptime),
        readiness: r,
        build: {
          mark: BUILD_MARK,
          features: BUILD_FEATURES,
        },
      });
    }
    // Ready: 200 OK
    return res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      gitSha,
      pid,
      uptime: Math.floor(uptime),
      readiness: r,
      build: {
        mark: BUILD_MARK,
        features: BUILD_FEATURES,
      },
    });
```

**確認事項**:
- ✅ `BUILD_MARK` と `BUILD_FEATURES` を import（4行目）
- ✅ `router.get("/audit")` が定義されている（7行目）
- ✅ すべてのレスポンス（200/503/500）で `build: { mark, features }` を返す

#### `api/src/build/buildInfo.ts`

**存在**: ✅ **存在する**

**パス**: `/Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset/api/src/build/buildInfo.ts`

**内容全行**:
```typescript
export const BUILD_MARK = "BUILD_MARK:DET_RECALL_V1+MEMLOG_V1+LOW_SIGNAL_V1" as const;

export const BUILD_FEATURES = {
  detRecallPassphrase: false, // まずは false でOK（実装済みなら trueへ）
  memPersistLog: false,
  lowSignalFallback: true,
} as const;
```

**確認事項**:
- ✅ `BUILD_MARK` が定義されている
- ✅ `BUILD_FEATURES` が定義されている
- ✅ `as const` が使用されている

#### `api/scripts/deploy_live.sh`

**存在**: ✅ **存在する**

**パス**: `/Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset/api/scripts/deploy_live.sh`

**内容全行**:
```bash
#!/usr/bin/env bash
set -euo pipefail

REPO="/opt/tenmon-ark-repo/api"
LIVE="/opt/tenmon-ark-live"

SERVICE="tenmon-ark-api"
PORT="3000"
BASE_URL="http://127.0.0.1:${PORT}"

MAX_RETRIES=60        # 60 * 0.2s = 12s
RETRY_INTERVAL=0.2

echo "[deploy] build in repo"
cd "$REPO"
pnpm -s build

echo "[deploy] sync dist to live (atomic swap)"
sudo mkdir -p "$LIVE"
sudo rm -rf "$LIVE/dist.new"
sudo rsync -a --delete "$REPO/dist/" "$LIVE/dist.new/"

if [ -d "$LIVE/dist" ]; then
  sudo rm -rf "$LIVE/dist.bak"
  sudo mv "$LIVE/dist" "$LIVE/dist.bak"
fi
sudo mv "$LIVE/dist.new" "$LIVE/dist"

# build mark が live/dist に入っているか（これが無いなら deploy 失敗扱い）
echo "[deploy] verify build mark in live/dist"
grep -R "BUILD_MARK:DET_RECALL_V1+MEMLOG_V1" "$LIVE/dist" >/dev/null \
  || { echo "[deploy] ERROR: build mark missing in live/dist"; exit 1; }

echo "[deploy] restart service (exactly once)"
sudo systemctl restart "$SERVICE"

echo "[deploy] wait for ${BASE_URL}/api/audit"
ok=0
for i in $(seq 1 "$MAX_RETRIES"); do
  if curl -fsS "${BASE_URL}/api/audit" >/dev/null 2>&1; then
    ok=1
    echo "[deploy] /api/audit ready (attempt $i/$MAX_RETRIES)"
    break
  fi
  sleep "$RETRY_INTERVAL"
done

if [ "$ok" -ne 1 ]; then
  echo "[deploy] ERROR: api did not come up"
  echo "[deploy] ss -lntp | grep :${PORT}"
  ss -lntp | grep ":${PORT}" || true
  echo "[deploy] systemctl status:"
  sudo systemctl status "$SERVICE" --no-pager -l || true
  echo "[deploy] journalctl (last 200 lines):"
  sudo journalctl -u "$SERVICE" -n 200 --no-pager || true
  exit 1
fi

echo "[deploy] audit gate: build mark"
if command -v jq >/dev/null 2>&1; then
  curl -fsS "${BASE_URL}/api/audit" \
    | jq -e '.build.mark | contains("BUILD_MARK:DET_RECALL_V1")' >/dev/null \
    || { echo "[deploy] ERROR: build mark missing in /api/audit"; exit 1; }
else
  curl -fsS "${BASE_URL}/api/audit" | grep -q 'BUILD_MARK:DET_RECALL_V1' \
    || { echo "[deploy] ERROR: build mark missing in /api/audit"; exit 1; }
fi
echo "OK: audit gate"

echo "[deploy] smoke tests"
bash "$REPO/scripts/smoke.sh" || { echo "[deploy] ERROR: smoke tests failed"; exit 1; }

echo "[deploy] SUCCESS"
```

**確認事項**:
- ✅ `/opt/tenmon-ark-repo/api` を使用
- ✅ `pnpm -s build` を使用
- ✅ `/opt/tenmon-ark-live` に atomic swap
- ✅ `/api/audit` の build.mark ゲート（59-68行目）
- ✅ `smoke.sh` の実行（70-71行目）

#### `api/scripts/smoke.sh`

**存在**: ✅ **存在する**

**パス**: `/Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset/api/scripts/smoke.sh`

**内容全行**:
```bash
#!/usr/bin/env bash
set -euo pipefail

BASE="http://127.0.0.1:3000"

echo "[smoke] audit ok + build mark"
if command -v jq >/dev/null 2>&1; then
  curl -fsS "$BASE/api/audit" | jq -e '.ok==true' >/dev/null
  curl -fsS "$BASE/api/audit" | jq -e '.build.mark | contains("BUILD_MARK:DET_RECALL_V1")' >/dev/null
else
  curl -fsS "$BASE/api/audit" | grep -q '"ok":true'
  curl -fsS "$BASE/api/audit" | grep -q 'BUILD_MARK:DET_RECALL_V1'
fi

echo "[smoke] ping should be low-signal fallback (NOT kanagi meta)"
R1="$(curl -fsS -X POST "$BASE/api/chat" -H 'Content-Type: application/json' \
  -d '{"threadId":"smoke","message":"ping"}')"
echo "$R1" | grep -q "お手伝い" || { echo "[smoke] FAIL: ping fallback missing"; echo "$R1"; exit 1; }
# 井戸/正中系が出ないことを確認
echo "$R1" | grep -qE "(内集|外発|正中|圧縮|凝縮|発酵)" && { echo "[smoke] FAIL: kanagi meta detected in ping response"; echo "$R1"; exit 1; } || true

echo "[smoke] passphrase recall deterministic"
curl -fsS -X POST "$BASE/api/chat" -H 'Content-Type: application/json' \
  -d '{"threadId":"smoke-pass","message":"合言葉は青い鳥です"}' >/dev/null

R2="$(curl -fsS -X POST "$BASE/api/chat" -H 'Content-Type: application/json' \
  -d '{"threadId":"smoke-pass","message":"合言葉、覚えてる？"}')"
echo "$R2" | grep -q "青い鳥" || { echo "[smoke] FAIL: passphrase recall missing"; echo "$R2"; exit 1; }

echo "[smoke] OK"
```

**確認事項**:
- ✅ `/api/audit` の `build.mark` 検証（6-13行目）
- ✅ ping テスト: "お手伝い" を含むことを確認（18行目）
- ✅ Kanagi meta が含まれないことを確認（20行目）
- ✅ 合言葉リコールテスト（22-28行目）

#### `api/src/routes/chat.ts` 内の ping low-signal fallback 判定

**関数名**: `isLowSignal`（351行目）

**実装箇所**: `api/src/routes/chat.ts` 351-361行目

```typescript
function isLowSignal(raw: string): boolean {
  const m = raw.trim();
  if (!m) return false;
  // 短すぎる（3文字以下）
  if (m.length <= 3) return true;
  // テスト系の単語
  if (/^(ping|test|ok|yes|no|はい|いいえ|うん|ううん)$/i.test(m)) return true;
  // 意味の薄い単語のみ
  if (/^[a-z]{1,4}$/i.test(m) && !/^(hi|hey|yo)$/i.test(m)) return true;
  return false;
}
```

**使用箇所**: `api/src/routes/chat.ts` 398行目

```typescript
if (isLowSignal(trimmed) && !isGreetingLike(trimmed)) {
  return res.json({
    response: "了解しました。何かお手伝いできることはありますか？\n\n例：\n- 質問や相談\n- 資料の検索（doc/pdfPage で指定）\n- 会話の続き",
    // ...
  });
}
```

**確認事項**:
- ✅ `isLowSignal` が "ping" を検出（357行目）
- ✅ レスポンスに "お手伝い" が含まれる（400行目）
- ✅ `smoke.sh` の期待キーワード（"お手伝い"）と一致

#### `api/src/routes/ingest.ts` の import

**存在**: ✅ **存在する**

**execFileSync の import**: ✅ **含まれている**

**8行目**:
```typescript
import { execSync, execFileSync } from "node:child_process";
```

**使用箇所**: 229行目
```typescript
const result = execFileSync(
  "python3",
  [tmpPythonScript, filePath, tmpJsonl],
  // ...
);
```

**確認事項**:
- ✅ `execFileSync` が import されている（8行目）
- ✅ `execSync` と同一行で import

### 1.3 ripgrep結果

#### `BUILD_MARK|BUILD_FEATURES|router.get\("/audit"` の検索結果

**検索パターン**: `BUILD_MARK|BUILD_FEATURES|router.get.*audit`

**ヒットしたファイルと行番号**:

1. **`api/src/routes/audit.ts`**:
   - 4行目: `import { BUILD_MARK, BUILD_FEATURES } from "../build/buildInfo.js";`
   - 7行目: `router.get("/audit", (_req: Request, res: Response) => {`
   - 26行目: `mark: BUILD_MARK,`
   - 27行目: `features: BUILD_FEATURES,`
   - 40行目: `mark: BUILD_MARK,`
   - 41行目: `features: BUILD_FEATURES,`
   - 67行目: `mark: BUILD_MARK,`
   - 68行目: `features: BUILD_FEATURES,`

2. **`api/src/build/buildInfo.ts`**:
   - 1行目: `export const BUILD_MARK = "BUILD_MARK:DET_RECALL_V1+MEMLOG_V1+LOW_SIGNAL_V1" as const;`
   - 3行目: `export const BUILD_FEATURES = {`

3. **`api/scripts/smoke.sh`**:
   - 9行目: `curl -fsS "$BASE/api/audit" | jq -e '.build.mark | contains("BUILD_MARK:DET_RECALL_V1")' >/dev/null`
   - 12行目: `curl -fsS "$BASE/api/audit" | grep -q 'BUILD_MARK:DET_RECALL_V1'`

4. **`api/scripts/deploy_live.sh`**:
   - 31行目: `grep -R "BUILD_MARK:DET_RECALL_V1+MEMLOG_V1" "$LIVE/dist" >/dev/null`
   - 62行目: `| jq -e '.build.mark | contains("BUILD_MARK:DET_RECALL_V1")' >/dev/null`
   - 65行目: `curl -fsS "${BASE_URL}/api/audit" | grep -q 'BUILD_MARK:DET_RECALL_V1'`

5. **`api/src/routes/chat.ts`**:
   - 32行目: `export const __BUILD_MARK__ = "BUILD_MARK:DET_RECALL_V1+MEMLOG_V1";`

6. **`docs/CI_CD_AUDIT_REPORT.md`**:
   - 複数箇所で `BUILD_MARK` に言及

7. **`docs/CI_CD_IMPROVEMENT_REPORT.md`**:
   - 複数箇所で `BUILD_MARK` に言及

#### ping 応答の仕様突き合わせ

**smoke.sh の期待キーワード**:
- "お手伝い"（18行目）

**chat.ts の実際の ping 応答**:
- `api/src/routes/chat.ts` 400行目: `"了解しました。何かお手伝いできることはありますか？\n\n例：\n- 質問や相談\n- 資料の検索（doc/pdfPage で指定）\n- 会話の続き"`

**確認事項**:
- ✅ `smoke.sh` の期待キーワード（"お手伝い"）が `chat.ts` のレスポンスに含まれる
- ✅ `isLowSignal` が "ping" を検出（357行目）
- ✅ `isLowSignal` の判定が `isGreetingLike` より前に実行される（398行目）

### 1.4 GitHub Actions の現状

#### `.github/workflows/deploy.yml`

**全文**:
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
- ✅ Trigger: `push: [main]` + `workflow_dispatch`
- ✅ Deploy先パス: `/opt/tenmon-ark-repo`
- ✅ Package Manager: `pnpm`
- ✅ systemctl対象: `tenmon-ark-api`（deploy_live.sh 内で実行）
- ✅ Secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`
- ✅ `smoke.sh` を実行（28行目）

#### `.github/workflows/tenmon-ark-build.yml`

**全文**:
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
- ✅ Trigger: `workflow_dispatch` のみ（`push` トリガーなし）
- ✅ Deploy先パス: N/A（noop ジョブ）
- ✅ Package Manager: N/A
- ✅ systemctl対象: N/A
- ✅ 二重デプロイ防止済み

#### ワークフロー比較表

| ファイル | Trigger | Deploy先パス | Package Manager | systemctl対象 | 二重デプロイの危険 |
|---------|---------|-------------|----------------|---------------|------------------|
| `deploy.yml` | `push: [main]` + `workflow_dispatch` | `/opt/tenmon-ark-repo` | `pnpm` | `tenmon-ark-api` | ❌ なし（canonical） |
| `tenmon-ark-build.yml` | `workflow_dispatch` のみ | N/A | N/A | N/A | ❌ なし（無効化済み） |

**結論**: **二重デプロイの危険はない**

---

## 2. 不整合点

### 2.1 ワークスペースパスの不整合

**事実**:
- Cursorのワークスペース: `/Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset`
- VPS上の期待パス: `/opt/tenmon-ark-repo`

**不整合**: ローカルとVPSでパスが異なる（これは正常）

### 2.2 Git の状態

**事実**:
- HEAD: `4458789f1b4af3b192ef93b09003f01f1322c3b3`
- origin/main: `c295c7cdec801f28c9eb0c112a8dccc99ccb41cf`

**不整合**: HEAD と origin/main が異なる（ローカルが origin/main より進んでいる）

### 2.3 ファイル実在確認結果

**すべてのファイルが存在する**:
- ✅ `api/src/routes/audit.ts` - 存在
- ✅ `api/src/build/buildInfo.ts` - 存在
- ✅ `api/scripts/deploy_live.sh` - 存在
- ✅ `api/scripts/smoke.sh` - 存在

**結論**: **ファイルが見つからない問題は存在しない**

---

## 3. 原因仮説

### 仮説1: Cursorのインデックスが古い

**可能性**: Cursorがファイルをインデックスしていない、または古いインデックスを使用している

**根拠**: ファイルは実際に存在するが、Cursorが認識していない可能性

**検証方法**: Cursorのインデックスを再構築

### 仮説2: ワークスペースのルートが異なる

**可能性**: Cursorが異なるディレクトリをワークスペースとして開いている

**根拠**: ワークスペースパスが `/Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset` で、VPS上の `/opt/tenmon-ark-repo` と異なる

**検証方法**: Cursorで正しいワークスペースを開き直す

### 仮説3: TypeScript のビルドキャッシュ

**可能性**: TypeScript のビルドキャッシュが古く、`audit.ts` が認識されていない

**根拠**: ファイルは存在するが、TypeScript コンパイラが認識していない可能性

**検証方法**: `pnpm -s build` を実行してビルドエラーを確認

---

## 4. 最小修正案（ファイル別）

### 4.1 Cursorのルートがズレていた場合

**修正手順**:
1. Cursorで `/Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset` をワークスペースとして開き直す
2. Cursorのインデックスを再構築（`Cmd+Shift+P` → "Reload Window"）
3. `api/src/routes/audit.ts` を直接開いて確認

**確認コマンド**:
```bash
cd /Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset
ls -la api/src/routes/audit.ts
```

### 4.2 ping fallback が Kanagi に入っている場合

**現状確認**: `isLowSignal` の判定は正しく実装されている（351-361行目、398行目）

**修正は不要**: 既に正しく実装されている

**確認方法**:
```bash
cd /Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset/api
pnpm -s build
# サーバー起動後
curl -X POST http://127.0.0.1:3000/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"threadId":"test","message":"ping"}' | jq '.response'
```

### 4.3 smoke.sh の期待キーワードが違う場合

**現状確認**: `smoke.sh` の期待キーワード（"お手伝い"）は `chat.ts` のレスポンス（400行目）に含まれる

**修正は不要**: 既に一致している

### 4.4 workflow が古い場合

**現状確認**: `.github/workflows/deploy.yml` は既に canonical 版になっている

**修正は不要**: 既に正しく実装されている

---

## 5. 検証コマンド（VPS上で実行）

### 5.1 ファイル実在確認

```bash
# ワークスペースの確認
cd /opt/tenmon-ark-repo
pwd
# 期待: /opt/tenmon-ark-repo

# ファイル実在確認
ls -la api/src/routes/audit.ts
ls -la api/src/build/buildInfo.ts
ls -la api/scripts/deploy_live.sh
ls -la api/scripts/smoke.sh

# すべて存在することを確認
```

### 5.2 ripgrep による検索

```bash
cd /opt/tenmon-ark-repo

# BUILD_MARK の検索
rg "BUILD_MARK" api/src api/scripts

# BUILD_FEATURES の検索
rg "BUILD_FEATURES" api/src

# router.get("/audit") の検索
rg 'router\.get\("/audit"' api/src
```

### 5.3 ビルド確認

```bash
cd /opt/tenmon-ark-repo/api
pnpm -s build

# ビルド成功を確認（exit code: 0）
echo $?
```

### 5.4 deploy_live.sh の確認

```bash
cd /opt/tenmon-ark-repo/api

# deploy_live.sh の内容確認
cat scripts/deploy_live.sh | grep -E "audit|smoke|BUILD_MARK"

# 実際のデプロイ（注意: 本番環境で実行する場合は慎重に）
# bash scripts/deploy_live.sh
```

### 5.5 /api/audit の確認

```bash
# サーバーが起動している場合
curl -fsS http://127.0.0.1:3000/api/audit | jq '{ok,gitSha,build,readiness.stage}'

# 期待される出力:
# {
#   "ok": true,
#   "gitSha": "...",
#   "build": {
#     "mark": "BUILD_MARK:DET_RECALL_V1+MEMLOG_V1+LOW_SIGNAL_V1",
#     "features": {
#       "detRecallPassphrase": false,
#       "memPersistLog": false,
#       "lowSignalFallback": true
#     }
#   },
#   "readiness": {
#     "stage": "..."
#   }
# }
```

### 5.6 smoke.sh の確認

```bash
cd /opt/tenmon-ark-repo/api

# smoke.sh の実行（サーバーが起動している場合）
bash scripts/smoke.sh

# 期待される出力:
# [smoke] audit ok + build mark
# [smoke] ping should be low-signal fallback (NOT kanagi meta)
# [smoke] passphrase recall deterministic
# [smoke] OK
```

### 5.7 systemd unit の確認

```bash
# systemd unit の状態確認
systemctl show tenmon-ark-api | grep -E "ExecStart|WorkingDirectory|MainPID"

# 期待される出力例:
# ExecStart={ path=/usr/bin/node ; argv[]=/usr/bin/node dist/index.js ; ... }
# WorkingDirectory=/opt/tenmon-ark-live/dist
# MainPID=12345
```

### 5.8 Git の状態確認

```bash
cd /opt/tenmon-ark-repo

# ブランチとコミットの確認
git branch --show-current
git log -1 --oneline
git rev-parse HEAD
git rev-parse origin/main

# HEAD と origin/main の差分確認
git log HEAD..origin/main --oneline
git log origin/main..HEAD --oneline
```

---

## 6. 結論

### 6.1 ファイル実在確認結果

**すべてのファイルが存在する**:
- ✅ `api/src/routes/audit.ts` - 存在（74行）
- ✅ `api/src/build/buildInfo.ts` - 存在（8行）
- ✅ `api/scripts/deploy_live.sh` - 存在（74行）
- ✅ `api/scripts/smoke.sh` - 存在（31行）

### 6.2 実装状況

**すべて正しく実装されている**:
- ✅ `/api/audit` が `build.mark` と `build.features` を返す（200/503/500 すべて）
- ✅ `deploy_live.sh` が `/api/audit` の build.mark ゲートを含む
- ✅ `smoke.sh` が ping fallback と合言葉リコールを検証
- ✅ GitHub Actions が canonical 版に統一済み
- ✅ `isLowSignal` が "ping" を検出し、"お手伝い" を含むレスポンスを返す

### 6.3 問題の原因

**「api/src/routes/audit.ts が見つからない」問題は存在しない**

**可能性のある原因**:
1. Cursorのインデックスが古い
2. Cursorが異なるワークスペースを開いている
3. TypeScript のビルドキャッシュが古い

**推奨される対応**:
1. Cursorで "Reload Window" を実行
2. `api/src/routes/audit.ts` を直接開いて確認
3. `pnpm -s build` を実行してビルドエラーを確認

### 6.4 次のステップ

**VPS上で以下を実行して確認**:
```bash
cd /opt/tenmon-ark-repo
ls -la api/src/routes/audit.ts
rg "BUILD_MARK" api/src
pnpm -s build
curl -fsS http://127.0.0.1:3000/api/audit | jq '{ok,build}'
bash api/scripts/smoke.sh
```

すべてのファイルは存在し、実装も正しく行われています。
