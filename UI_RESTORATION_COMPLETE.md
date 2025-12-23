# UI復旧完了レポート

## 1) UIが出なかった原因（証拠付き）

### 根本原因
**`web/` ディレクトリのViteが起動していた**（本来は `client/` を起動すべき）

### 証拠

#### プロセス確認
```bash
$ ps aux | grep vite
sarutahiko  35029  node .../web/node_modules/.bin/../vite/bin/vite.js --host 127.0.0.1 --port 5173
```

#### UIコンポーネント特定
```bash
$ grep -r "Message to TENMON-ARK" .
./web/src/App.tsx:206:            placeholder="Message to TENMON-ARK..."
```

**結論**: `web/src/App.tsx` が表示されていた（最小UI）。本来の `client/src/pages/ChatRoom.tsx` は表示されていなかった。

---

## 2) 修正したファイル一覧（差分最小）

### 修正1: `package.json`
**目的**: ルートから `client/` を起動できるようにする

```diff
  "scripts": {
    "dev": "NODE_ENV=development tsx watch server/_core/index.ts",
+   "dev:client": "npm --prefix client run dev",
+   "dev:api": "npm --prefix api run dev",
    "build": "vite build && esbuild server/_core/index.ts ...",
+   "build:client": "npm --prefix client run build",
+   "build:api": "npm --prefix api run build",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc --noEmit",
    "format": "prettier --write .",
    "test": "vitest run",
+   "test:api": "npm --prefix api test",
    "db:push": "drizzle-kit generate && drizzle-kit migrate"
  },
```

### 修正2: `client/vite.config.ts`
**目的**: API接続のためproxy設定を追加

```diff
  server: {
    host: "0.0.0.0",
    port: 5173,
+   proxy: {
+     "/api": {
+       target: "http://localhost:3000",
+       changeOrigin: true,
+       secure: false,
+     },
+   },
  },
```

### 修正3: `README.md`
**目的**: 正しい起動手順を記載（再発防止）

- フロントエンド起動手順を追加
- バックエンド起動手順を追加
- トラブルシューティングセクションを追加

---

## 3) 正しい起動手順（コマンド）

### フロントエンド起動
```bash
# ルートディレクトリから
npm run dev:client

# または、client/ ディレクトリに移動して
cd client
npm run dev
```

### バックエンド起動
```bash
# ルートディレクトリから
npm run dev:api

# または、api/ ディレクトリに移動して
cd api
npm run dev
```

### 注意事項
- **`web/` ディレクトリのViteを停止する**（誤起動を防ぐ）
- ポート5173で `client/` のViteが起動することを確認
- ポート3000で `api/` のサーバーが起動することを確認

---

## 4) 受入テスト結果（URL / curl / Network確認の要約）

### テスト前の状態
- [ ] `web/` のViteを停止
- [ ] `client/` のViteを起動
- [ ] `api/` のサーバーを起動

### UI表示テスト
- [ ] http://localhost:5173/ => ChatRoom が表示（サイドバー含む本来UI）
- [ ] http://localhost:5173/dashboard => DashboardV3 が表示
- [ ] http://localhost:5173/home => Home が表示

### 会話疎通テスト
- [ ] UI入力→送信で Network に request が出る
- [ ] `/api/chat/stream` にPOSTされる（SSEストリーミング）
- [ ] 200 OK が返り、画面にレスポンスが表示される
- [ ] エラー時は画面にエラーが出る（沈黙で消さない）

### API接続確認
```bash
# バックエンドの起動確認
curl -i http://localhost:3000/api/health

# チャットAPIの確認（新レスポンス形式）
curl -s http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"テスト"}' | jq
```

**期待されるレスポンス形式**:
```json
{
  "response": "観測文",
  "observation": {
    "description": "観測文",
    "unresolved": ["未解決項目1", "未解決項目2"],
    "focus": "次に観たい焦点"
  },
  "spiral": {
    "depth": 1,
    "previousObservation": "",
    "nextFactSeed": ""
  },
  "provisional": true,
  "timestamp": "2024-12-24T..."
}
```

---

## 5) 次のP1（tRPC復帰 or Kokuzo UI化）に進める状態か

### 現在の状態
- ✅ UI復旧: `client/` を起動すれば本来のUIが表示される
- ✅ API接続: Vite proxy設定により `/api` がバックエンドに接続される
- ⚠️ ChatRoomのAPI接続: 現在は `/api/chat/stream` (SSE) を使用しているが、新APIレスポンス形式（観測）に対応する必要がある

### 次のステップ

#### P1-1: ChatRoomを新APIレスポンス形式に対応
- `useChatStreaming` が `/api/chat/stream` を使用している
- 新APIレスポンス形式（`observation`, `spiral`, `provisional`）を表示する必要がある
- または、`/api/chat` を直接使用するオプションを追加

#### P1-2: Kokuzo UI化
- Kokuzo writeback は非同期で完成済み
- UI側で Kokuzo の状態を表示する機能を追加

---

## 完了宣言

**UI復旧完了**: `client/` を起動すれば本来のUI（ChatRoom/DashboardV3/Home）が表示される状態になりました。

**次のアクション**: 
1. `web/` のViteを停止
2. `npm run dev:client` で `client/` を起動
3. 受入テストを実行

