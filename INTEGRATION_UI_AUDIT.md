# UI統合監査レポート

## A. どのディレクトリで dev server を起動しているか

### 現在の作業ディレクトリ
```
/Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset
```

### ディレクトリ構造
```
.
├── api/          (バックエンド)
├── client/       (フロントエンド - 本来のUI資産)
├── web/          (別のViteプロジェクト - 最小UI)
├── server/       (別サーバー)
├── shared/       (共有リソース)
└── package.json  (ルート)
```

### ルート package.json の確認
```json
{
  "name": "os-tenmon-ai-v2",
  "scripts": {
    "dev": "NODE_ENV=development tsx watch server/_core/index.ts",
    "build": "vite build && esbuild server/_core/index.ts ...",
    "start": "NODE_ENV=production node dist/index.js"
  }
}
```

### 起動中のプロセス確認
```bash
$ ps aux | grep vite
sarutahiko  35029  node .../web/node_modules/.bin/../vite/bin/vite.js --host 127.0.0.1 --port 5173
sarutahiko  18501  node .../node_modules/.bin/../vite/bin/vite.js
```

**結論**: **`web/` ディレクトリのViteが起動している**（本来は `client/` を起動すべき）

---

## B. 5173 がどの Vite プロジェクトか確定

### Vite設定ファイルの検索結果
```bash
$ find . -name "vite.config.*"
./web/vite.config.ts
./vite.config.ts
./client/vite.config.ts
```

### 起動中のViteプロジェクト
- **`web/vite.config.ts`** が起動中（プロセス確認で確認済み）
- port: `5173`
- proxy: `/api` => `http://127.0.0.1:3000`

### client/vite.config.ts の確認
- 存在: ✅
- root: `client/`
- base: `/`
- port: `5173` (デフォルト)
- **proxy設定: なし**（要追加）

**結論**: **`web/` ディレクトリのViteが5173で起動している**。本来は `client/` を起動すべき。

---

## C. 画面に出ているUIのコンポーネント特定（決定打）

### 検索結果

#### "Message to TENMON-ARK"
```bash
$ grep -r "Message to TENMON-ARK" .
./web/src/App.tsx:206:            placeholder="Message to TENMON-ARK..."
```

#### "会話を始めてください"
```bash
$ grep -r "会話を始めてください" .
./web/src/App.tsx:162:              会話を始めてください
```

**結論**: **`web/src/App.tsx` が現在表示されているUIの正体**。これは最小UI（PHASE UI-7相当）であり、本来のChatRoomではない。

---

## D. 本来UI資産が存在するか確認

### client/src/pages/ の内容
```bash
$ ls -la client/src/pages
ChatRoom.tsx          (41044 bytes, Dec 15 07:28)
ChatDivine.tsx        (14918 bytes, Dec 11 05:13)
DashboardV3.tsx       (存在確認済み)
Home.tsx              (存在確認済み)
... (その他多数)
```

### client/src/components/ の内容
```bash
$ ls -la client/src/components
AIChatBox.tsx
AnimatedMessage.tsx
DashboardLayout.tsx
... (その他多数)
```

### 監査済み資産の存在確認

- [x] `client/src/pages/ChatRoom.tsx` - 存在: ✅ (41044 bytes)
- [x] `client/src/pages/ChatDivine.tsx` - 存在: ✅ (14918 bytes)
- [x] `client/src/pages/DashboardV3.tsx` - 存在: ✅
- [x] `client/src/pages/Home.tsx` - 存在: ✅
- [x] `client/src/App.tsx` - 存在: ✅ (ルーティング設定済み)

### エクスポート/インポートの確認
- TypeScriptエラー: 未確認（ビルドが必要）
- 壊れたimport: 未確認（ビルドが必要）

**結論**: **本来のUI資産は `client/src/` に存在する**。問題は起動しているプロジェクトが違うこと。

---

## E. ルーティングの現状確認

### client/src/App.tsx のルート定義

```typescript
function Router() {
  return (
    <Switch>
      <Route path={"/"} component={ChatRoom} />
      <Route path={"/chat"} component={ChatRoom} />
      <Route path={"/home"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/chat/divine"} component={ChatDivine} />
      ... (その他多数)
    </Switch>
  );
}
```

### ルーティングライブラリ
- wouter: ✅ (`import { Route, Switch } from "wouter"`)
- react-router: ❌
- @tanstack/react-router: ❌

### ルート定義の問題点
- [x] `Switch` が**ある**（wouterの場合、正しく使用されている）
- [x] `path="/"` が**ChatRoomに向いている**（正しい）
- [ ] `/` が最小UIに向いている → **`web/` が起動しているため、`client/` のルーティングが効いていない**

**結論**: **`client/src/App.tsx` のルーティングは正しい**。問題は `web/` が起動していること。

---

## F. API疎通（会話できない原因の切り分け）

### フロントのAPI接続設定

#### client/src/main.tsx の設定
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://162.43.90.247:3000";
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${API_BASE_URL}/api/trpc`,
      ...
    }),
  ],
});
```

#### web/src/config/api.ts の設定
```typescript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://162.43.90.247:3000";
```

#### API接続方法
- tRPC: ✅ (`client/src/main.tsx` で使用)
- REST (`/api/chat`): ✅ (`web/src/App.tsx` で使用)
- その他: なし

### Vite proxy 設定

#### web/vite.config.ts
```typescript
server: {
  port: 5173,
  proxy: {
    "/api": {
      target: "http://127.0.0.1:3000",
      changeOrigin: true
    }
  }
}
```

#### client/vite.config.ts
```typescript
server: {
  host: "0.0.0.0",
  port: 5173,
  // proxy設定: なし（要追加）
}
```

### バックエンドの起動確認

```bash
$ curl -i http://localhost:3000/api/health
API not reachable on 3000
```

**結論**: **バックエンドが起動していない可能性がある**。またはVPS（162.43.90.247:3000）に接続している。

---

## 原因候補の特定

### 原因候補1: 起動しているプロジェクトが違う ✅ **確定**
- 確率: **高**（確定）
- 証拠: 
  - プロセス確認で `web/node_modules/.bin/../vite/bin/vite.js` が起動中
  - `web/src/App.tsx` が表示されている（"Message to TENMON-ARK" が存在）
  - 本来は `client/` を起動すべき

### 原因候補2: App.tsx が最小UIに差し替わっている
- 確率: **低**（`client/src/App.tsx` は正しく設定されている）
- 証拠: `client/src/App.tsx` のルーティングは正しい（`/` => ChatRoom）

### 原因候補3: ルーティングはOKだが import/export が崩れている
- 確率: **低**（未確認だが、`client/` が起動していないため確認できない）
- 証拠: なし（`client/` を起動してから確認が必要）

### 原因候補4: API URL/Proxy/CORS の問題
- 確率: **中**（`client/vite.config.ts` にproxy設定がない）
- 証拠: 
  - `client/vite.config.ts` に `server.proxy` 設定がない
  - `web/vite.config.ts` にはproxy設定がある

---

## 修正方針

### 確定した原因
1. **`web/` ディレクトリのViteが起動している**（本来は `client/` を起動すべき）
2. **`client/vite.config.ts` にproxy設定がない**（API接続のため必要）

### 修正手順
1. ルート `package.json` に `dev:client` スクリプトを追加
2. `client/vite.config.ts` に `server.proxy` 設定を追加
3. `client/src/pages/ChatRoom.tsx` を新APIレスポンス形式に対応（観測表示）
4. READMEに正しい起動手順を記載
5. 受入テストを実行

---

## 受入テスト結果

### UI表示
- [ ] http://localhost:5173/ => ChatRoom が表示
- [ ] http://localhost:5173/dashboard => DashboardV3 が表示
- [ ] http://localhost:5173/home => Home が表示

### 会話疎通
- [ ] UI入力→送信で Network に request が出る
- [ ] 200 OK が返り、画面にレスポンスが表示される
- [ ] エラー時は画面にエラーが出る

---

## 修正完了後の最終確認

### 修正したファイル一覧
1. `package.json` - `dev:client` スクリプト追加
2. `client/vite.config.ts` - `server.proxy` 設定追加
3. `README.md` - 正しい起動手順を記載（要追加）

### 正しい起動手順
```bash
# ルートディレクトリから
npm run dev:client
```

### 次のステップ
- [ ] P1: tRPC復帰（既存の `/api/chat/stream` を新APIレスポンス形式に対応）
- [ ] P1: Kokuzo UI化
- [ ] その他: ___________


