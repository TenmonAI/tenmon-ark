# PHASE 0: 現状固定 - 安定稼働セットの記録

**作成日**: 2024年12月  
**目的**: バックエンドロジック改修前に、現在の安定稼働セットを特定し、破壊を防ぐ

---

## 1. API エントリーポイント

### ファイルパス
**`api/src/index.ts`**

### 役割
- Expressサーバーの起動
- ルーターのマウント
- CORS設定
- ポート設定（デフォルト: 3000）
- 外部アクセス対応（`0.0.0.0` でバインド）

### 現在の設定

```typescript
const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(cors());
app.use(express.json());

// ★ 重要：kanagi を /api にマウント
app.use("/api", kanagiRoutes);

// Chat router (POST /api/chat)
app.use("/api", chatRouter);

// 既存 tenmon
app.use("/api/tenmon", tenmonRoutes);

// health check
app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API listening on http://0.0.0.0:${PORT}`);
});
```

### マウントされているルーター
1. `kanagiRoutes` → `/api/kanagi/*`
2. `chatRouter` → `/api/chat` (POST)
3. `tenmonRoutes` → `/api/tenmon/*`

---

## 2. チャットロジック（Express API）

### ファイルパス
**`api/src/routes/chat.ts`**

### 役割
- POST `/api/chat` エンドポイントの実装
- 入力の検証・正規化
- `respond()` 関数への委譲
- レスポンス形式の統一

### 現在の実装

```typescript
router.post("/chat", (req: Request, res: Response<ChatResponseBody>) => {
  // input または message のどちらでも受け付ける（後方互換性のため）
  const messageRaw = (req.body as any)?.input || (req.body as any)?.message;

  // 入力の検証・正規化
  const sanitized = sanitizeInput(messageRaw, "web");
  
  if (!sanitized.isValid) {
    return res.status(400).json({
      response: sanitized.error || "message is required",
      timestamp: new Date().toISOString(),
    });
  }

  const sessionId = getSessionId(req);
  
  // v∞-2: コアロジックを respond() に委譲
  const finalReply = respond(sanitized.text, sessionId, "web");

  // 既存のレスポンス形式を維持（互換性）
  return res.json({
    response: finalReply,
    timestamp: new Date().toISOString(),
  });
});
```

### レスポンス形式（固定）

```typescript
{
  response: string,        // 応答テキスト（respond() の戻り値）
  timestamp: string        // ISO8601形式のタイムスタンプ
}
```

### リクエスト形式（受け付ける形式）

```typescript
// 形式1: input キー
{
  input: string,
  session_id?: string
}

// 形式2: message キー（後方互換性）
{
  message: string,
  session_id?: string
}
```

### 依存関係
- `getSessionId()` - セッションID取得
- `sanitizeInput()` - 入力検証・正規化
- `respond()` - コア応答生成ロジック（`api/src/tenmon/respond.ts`）

---

## 3. フロントエンドUI（ChatRoom）

### ファイルパス
**`client/src/pages/ChatRoom.tsx`**

### 役割
- GPT風の白ベースチャットUI（完成度95%）
- サイドバー付きチャットルーム一覧
- ストリーミング対応
- IME Guard（日本語入力対応）
- ファイルアップロード
- プロジェクト連携

### 現在の実装

**UI特徴:**
- 白背景 (#FFFFFF)、黒文字 (#111111)
- チャットバブル丸み 18px、入力欄丸み 100px
- 行間 1.6、フォントサイズ 15-16px
- `chatgpt-ui.css` を使用

**API接続方法:**
- **tRPC** を使用（`trpc.chat.*`）
- **エンドポイント**: `/api/trpc` (tRPCバッチエンドポイント)
- **使用しているtRPCプロシージャ**:
  - `trpc.chat.listRooms` - チャットルーム一覧取得
  - `trpc.chat.getMessages` - メッセージ取得
  - `trpc.chat.sendMessage` - メッセージ送信
  - `trpc.chat.createRoom` - チャットルーム作成
  - `trpc.chat.deleteRoom` - チャットルーム削除
  - `trpc.fileUpload.*` - ファイルアップロード関連

**重要:** `ChatRoom.tsx` は **Express の `/api/chat` エンドポイントを使用していない**
- 代わりに **tRPC** (`/api/trpc`) を使用している
- tRPCルーターは `server/chat/chatRouter.ts` に定義されている

---

## 4. ルーティング（App.tsx）

### ファイルパス
**`client/src/App.tsx`**

### 役割
- フロントエンドのルーティング設定
- ページコンポーネントのマッピング
- エラー境界、テーマ管理、通知などのグローバル設定

### 現在の設定

```typescript
function Router() {
  return (
    <Switch>
      {/* GPT仕様のClean UIをメイン画面に昇格 */}
      <Route path={"/"} component={ChatRoom} />
      <Route path={"/chat"} component={ChatRoom} />
      {/* レガシーパスの整理 */}
      <Route path={"/home"} component={Home} />
      <Route path={"/map"} component={Home} />
      <Route path={"/chat/divine"} component={ChatDivine} />
      <Route path={"/dashboard"} component={Dashboard} />
      // ... その他のルート
    </Switch>
  );
}
```

### 主要ルート
- `/` → `ChatRoom` (GPT風UI)
- `/chat` → `ChatRoom` (GPT風UI)
- `/home` → `Home` (五十音マップ)
- `/map` → `Home` (五十音マップ)
- `/chat/divine` → `ChatDivine` (黒×金UI)
- `/dashboard` → `Dashboard` (DashboardV3)

---

## 5. API接続の現状

### フロントエンド → バックエンドの接続

**`client/src/main.tsx` の設定:**

```typescript
// API Base URL (環境変数から取得、デフォルトはVPS)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://162.43.90.247:3000";

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${API_BASE_URL}/api/trpc`,
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});
```

### 重要な発見

**2つの異なるAPIシステムが存在:**

1. **Express API** (`api/src/routes/chat.ts`)
   - エンドポイント: `POST /api/chat`
   - レスポンス形式: `{ response: string, timestamp: string }`
   - 使用箇所: **現在、フロントエンドから直接使用されていない可能性**

2. **tRPC API** (`server/chat/chatRouter.ts`)
   - エンドポイント: `POST /api/trpc` (バッチエンドポイント)
   - プロシージャ: `chat.listRooms`, `chat.getMessages`, `chat.sendMessage` など
   - 使用箇所: **`ChatRoom.tsx` が使用中**

### 接続状況

| システム | エンドポイント | 使用状況 | 状態 |
|---------|--------------|---------|------|
| **Express API** | `/api/chat` | ❓ 未確認 | ✅ 実装済み |
| **tRPC API** | `/api/trpc` | ✅ `ChatRoom.tsx` で使用中 | ✅ 実装済み |

---

## 6. 現在の `/api/chat` レスポンス内容

### コード上の実装

**`api/src/routes/chat.ts` のレスポンス:**

```typescript
return res.json({
  response: finalReply,  // respond() の戻り値（文字列）
  timestamp: new Date().toISOString(),  // ISO8601形式
});
```

**`respond()` 関数の実装:**

**ファイル**: `api/src/tenmon/respond.ts`

```typescript
export function respond(input: string, sessionId: string, source: "web" | "api"): string {
  // コア応答生成ロジック
  // 戻り値: string（応答テキスト）
}
```

### 実際のレスポンス例

```json
{
  "response": "応答テキスト（respond() の戻り値）",
  "timestamp": "2024-12-XXTXX:XX:XX.XXXZ"
}
```

---

## 7. 変更禁止事項（ロジック追加のベース）

### ✅ 変更禁止（現状維持必須）

1. **`api/src/index.ts`**
   - Expressサーバーの起動方法
   - ルーターのマウント順序
   - CORS設定
   - ポート設定（3000）
   - `0.0.0.0` バインド設定

2. **`api/src/routes/chat.ts`**
   - POST `/api/chat` エンドポイントの存在
   - レスポンス形式: `{ response: string, timestamp: string }`
   - リクエスト形式: `input` または `message` キーを受け付ける
   - `respond()` 関数への委譲構造

3. **`client/src/pages/ChatRoom.tsx`**
   - GPT風UIのデザイン（白背景、黒文字）
   - tRPC接続方法（`trpc.chat.*`）
   - 使用しているtRPCプロシージャ（`listRooms`, `getMessages`, `sendMessage` など）

4. **`client/src/App.tsx`**
   - ルーティング設定（`/` と `/chat` が `ChatRoom` を表示）
   - レガシーパスの整理（`/home`, `/map`, `/chat/divine`）

### ⚠️ 注意事項

- **`ChatRoom.tsx` は tRPC を使用しているため、Express の `/api/chat` エンドポイントとは直接接続していない**
- バックエンドロジックの改修時は、**tRPC の `chatRouter`** (`server/chat/chatRouter.ts`) を修正する必要がある
- Express の `/api/chat` は別の用途（例: 外部API連携、webhook等）で使用されている可能性がある

---

## 8. 次のステップ（改修時の注意点）

### ロジック追加時のベース

1. **tRPC ルーターの拡張**
   - `server/chat/chatRouter.ts` を修正
   - 既存のプロシージャ（`sendMessage`, `getMessages` など）のシグネチャを維持
   - レスポンス形式を変更しない

2. **Express API の拡張**
   - `api/src/routes/chat.ts` を修正する場合
   - 既存のレスポンス形式（`{ response, timestamp }`）を維持
   - `respond()` 関数への委譲構造を維持

3. **フロントエンドの拡張**
   - `ChatRoom.tsx` のUI構造を維持
   - tRPC接続方法を変更しない
   - 既存のtRPCプロシージャの使用方法を維持

---

**記録完了**: 現状の安定稼働セットを記録しました。  
**次のフェーズ**: このベースラインを維持しながら、ロジックを追加・拡張します。

