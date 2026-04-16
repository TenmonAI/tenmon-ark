# 🔱 TENMON-ARK 完全ステータスレポート

**生成日時**: 2025-01-XX  
**レポート対象**: TENMON-ARK（TENMON-ARK）プロジェクト全体  
**目的**: 新・統括AI（Google AI Ultra）への完全な状況引き継ぎ

---

## ■ 1. プロジェクト基本構成

### 1.1 プロジェクトルート構造

```
os-tenmon-ai-v2-reset/
├── api/                    # API サーバー（Express + TypeScript）
│   ├── src/
│   │   ├── core/          # Express アプリケーション設定
│   │   ├── routes/        # API エンドポイント
│   │   ├── persona/       # 人格エンジン（CORE-5〜9）
│   │   ├── memory/        # 記憶システム（KOKŪZŌ）
│   │   ├── kokuzo/        # KOKŪZŌ Fractal Engine
│   │   ├── tenmon/        # 外部連携・応答生成コア
│   │   ├── tools/         # ツール実行システム（Phase 7-8）
│   │   ├── safety/        # 安全機構（Phase 8）
│   │   ├── ops/           # 運用API（health/readiness/shutdown）
│   │   └── db/            # SQLite スキーマ
│   ├── package.json
│   └── tsconfig.json
├── web/                    # フロントエンド（React + Vite + Tailwind）
│   ├── src/
│   │   ├── App.tsx        # メインUI（PHASE B チャット画面実装済み）
│   │   ├── i18n.ts        # 国際化（最小構成）
│   │   └── index.css      # Tailwind CSS
│   └── package.json
├── server/                 # 旧サーバーコード（参考用？）
├── infra/                  # デプロイ設定
│   ├── nginx/            # nginx 設定ファイル
│   └── DEPLOY.md         # デプロイ手順書
└── server/systemd/        # systemd サービス設定
```

### 1.2 package.json 主要設定

#### `api/package.json`
```json
{
  "name": "tenmon-ark-api",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc && node scripts/copy-assets.mjs",
    "start": "NODE_ENV=production node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "check": "tsc --noEmit"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^17.2.2",
    "express": "^4.21.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.19",
    "@types/express": "^4.17.21",
    "@types/node": "^24.7.0",
    "tsx": "^4.19.1",
    "typescript": "^5.9.3"
  }
}
```

#### `web/package.json`
```json
{
  "name": "tenmon-ark-web",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### 1.3 TypeScript設定

#### `api/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## ■ 2. 核心コードの実装状況

### 2.1 `api/src/index.ts` (Entry Point)

```typescript
import "dotenv/config";
import type { NextFunction, Request, Response } from "express";
import type { Server } from "node:http";
import { app } from "./core/server.js";
import chatRouter from "./routes/chat.js";
import tenmonRouter from "./routes/tenmon.js";
import healthRouter from "./routes/health.js";
import memoryRouter from "./routes/memory.js";
import personaRouter from "./routes/persona.js";
import toolRouter from "./routes/tool.js";
import approvalRouter from "./routes/approval.js";
import { incError } from "./ops/metrics.js";
import { observeErrorForSafeMode } from "./ops/safeMode.js";
import { registerGracefulShutdown } from "./ops/shutdown.js";
import { initializeAmbientPersona } from "./tenmon/ambient.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const HOST = process.env.HOST ?? "127.0.0.1";

// v∞-3: API起動時に一度だけ人格初期化処理を実行
initializeAmbientPersona();

// Routes（API は /api 配下のみ）
app.use("/api", healthRouter);
app.use("/api", chatRouter);
app.use("/api", tenmonRouter); // v∞-2: 外部連携用エンドポイント
app.use("/api", memoryRouter);
app.use("/api", personaRouter);
app.use("/api", toolRouter);
app.use("/api", approvalRouter);

// 404 / Error handler
// グレースフルシャットダウン
registerGracefulShutdown(server);
```

**要点**:
- Express サーバー
- ポート: `3000` (デフォルト) / `127.0.0.1` (デフォルト)
- 起動時に `initializeAmbientPersona()` を実行（v∞-3: Ambient常駐）
- グレースフルシャットダウン実装済み

### 2.2 `api/src/core/server.ts` (Express App creation)

```typescript
import express, { type Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { rateLimit } from "../ops/rateLimit.js";
import { incRequest } from "../ops/metrics.js";

export const app: Express = express();

app.use(cors());
app.use(express.json());

// basic rate limit (sessionId unit via getSessionId)
app.use(
  rateLimit({
    windowMs: 60_000,
    maxRequests: 120,
  })
);

// request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  incRequest();
  console.log(`${req.method} ${req.url}`);
  next();
});
```

**要点**:
- CORS有効
- レート制限: 60秒間で120リクエスト
- リクエストログ出力

### 2.3 `api/src/routes/chat.ts` (Main Chat Logic)

```typescript
import { Router, type IRouter, type Request, type Response } from "express";
import { getSessionId } from "../memory/sessionId.js";
import { respond } from "../tenmon/respond.js";
import { sanitizeInput } from "../tenmon/inputSanitizer.js";
import type { ChatResponseBody } from "../types/chat.js";

const router: IRouter = Router();

router.post("/chat", (req: Request, res: Response<ChatResponseBody>) => {
  const messageRaw = (req.body as any)?.message;

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

export default router;
```

**要点**:
- `/api/chat` エンドポイント
- 入力サニタイズ実装済み
- 内部で `respond()` を呼び出し（v∞-2: External Integration）
- レスポンス形式: `{ response: string, timestamp: string }`

### 2.4 `api/src/persona/*` (Persona Logic / State Management)

#### `api/src/persona/personaState.ts`
```typescript
export type PersonaState = {
  personaId: string;
  mode: "calm" | "thinking" | "engaged" | "silent";
  phase: "awake" | "listening" | "responding";
  inertia: number; // 0〜10 (legacy)
  _inertia?: PersonaInertia;      // CORE-6: 内部用
  _thinkingAxis?: ThinkingAxis;   // CORE-7: 内部用
  _kanagiPhase?: KanagiPhase;     // CORE-8: 内部用
};

let personaState: PersonaState = {
  personaId: "tenmon",
  mode: "calm",
  phase: "awake",
  inertia: 0,
  _inertia: undefined,
  _thinkingAxis: undefined,
  _kanagiPhase: undefined,
};

export function getCurrentPersonaState(): Omit<PersonaState, "_inertia" | "_thinkingAxis" | "_kanagiPhase"> {
  const { _inertia, _thinkingAxis, _kanagiPhase, ...state } = personaState;
  return state; // UI/外部には内部プロパティを返さない
}

export function getCurrentPersonaStateInternal(): PersonaState {
  return personaState; // 内部処理用
}

export function setPersonaState(newState: Partial<PersonaState>): void {
  personaState = { ...personaState, ...newState };
}
```

**要点**:
- 人格状態の一元管理
- 内部プロパティ（`_inertia`, `_thinkingAxis`, `_kanagiPhase`）は外部に返さない
- CORE-4〜9 の実装完了

#### 主要Personaモジュール
- `api/src/persona/responseEngine.ts`: CORE-5（応答生成・スタイル適用）
- `api/src/persona/inertia.ts`: CORE-6（慣性・余韻）
- `api/src/persona/thinkingAxis.ts`: CORE-7（思考軸）
- `api/src/persona/kanagi.ts`: CORE-8（天津金木4相構造）
- `api/src/persona/lexicalBias.ts`: CORE-9（語彙選択バイアス）

### 2.5 `api/src/routes/health.ts` (Status Check)

```typescript
import { Router, type IRouter, type Request, type Response } from "express";
import { getHealthReport } from "../ops/health.js";
import { getReadinessReport } from "../ops/readiness.js";
import { TENMON_ARK_VERSION } from "../version.js";

const router: IRouter = Router();

router.get("/health", (_req: Request, res: Response) => res.json(getHealthReport()));
router.get("/readiness", (_req: Request, res: Response) => res.json(getReadinessReport()));
router.get("/version", (_req: Request, res: Response) => res.json({ version: TENMON_ARK_VERSION }));

export default router;
```

**要点**:
- `/api/health`: ヘルスチェック（Node/DB/Memory/Persona/Tool状態）
- `/api/readiness`: 外部公開可能かどうか
- `/api/version`: バージョン情報（`0.9.0`）

### 2.6 `api/src/tenmon/respond.ts` (応答生成コア)

**実装状況**:
- `generateConversationalResponse()`: 会話用応答生成（CORE-5〜9 / KOKŪZŌ / Fractal統合）
- `generateMinimalResponse()`: 最小応答（互換維持用）
- `respond()`: メイン関数（PHASE A: 会話解放フラグで分岐）

**処理フロー**:
1. Ambient初期化チェック（v∞-3）
2. Safe Modeチェック
3. `CONVERSATION_ENABLED`フラグで分岐
   - `true`: `generateConversationalResponse()` → 全人格ロジック実行
   - `false`: `generateMinimalResponse()` → "受け取りました。"

---

## ■ 3. デプロイ・環境状況

### 3.1 VPSへのデプロイ方法

**手動デプロイ**（`infra/DEPLOY.md`参照）:
```bash
# API サーバー
cd /opt/tenmon-ark/api
git pull origin main  # または rsync
npm install
npm run build
systemctl restart tenmon-ark-api

# フロントエンド
cd /path/to/web
npm run build
rm -rf /var/www/tenmon-ark.com/current/dist
mkdir -p /var/www/tenmon-ark.com/current/dist
cp -r dist/* /var/www/tenmon-ark.com/current/dist/
chown -R www-data:www-data /var/www/tenmon-ark.com
chmod -R 755 /var/www/tenmon-ark.com
nginx -t && systemctl reload nginx
```

**GitHub Actions**（`.github/workflows/tenmon-ark-build.yml`）:
- `main`ブランチへのpushで自動デプロイ
- SSH経由でVPSに接続
- `git pull` → `pnpm install` → `pnpm run build` → nginx reload

### 3.2 Process Manager

**systemd** (`server/systemd/tenmon-ark-api.service`):
```ini
[Unit]
Description=TENMON-ARK API Server
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/tenmon-ark/tenmon-ark
Environment=NODE_ENV=production
EnvironmentFile=/opt/tenmon-ark/tenmon-ark/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**要点**:
- `www-data`ユーザーで実行
- 自動再起動有効
- ログはjournalに出力

### 3.3 環境変数（.env）

**必須環境変数**（値は伏せる）:
- `NODE_ENV`: `production` / `development`
- `PORT`: APIサーバーのポート（デフォルト: `3000`）
- `HOST`: バインドアドレス（デフォルト: `127.0.0.1`）
- `CORS_ORIGIN`: CORS許可オリジン（例: `https://tenmon-ark.com`）

**オプション環境変数**:
- `KOKUZO_DEBUG`: KOKŪZŌデバッグログ有効化（`true` / `false`）

---

## ■ 4. 現在発生している不具合・課題（最重要）

### 4.1 「会話ができない」の具体的挙動

**現状の実装状況**:
- ✅ API側: `respond()` 関数は実装済み
- ✅ フロントエンド: PHASE B チャット画面実装済み
- ✅ 会話解放フラグ: `CONVERSATION_ENABLED = true`（デフォルトON）

**想定される問題**:
1. **VPS環境でのAPI起動確認が必要**
   - `systemctl status tenmon-ark-api` で状態確認
   - `curl http://127.0.0.1:3000/api/health` で疎通確認
   - nginx設定で `/api/*` が正しくプロキシされているか確認

2. **フロントエンドのビルド・配置確認**
   - `web/dist/` が正しく生成されているか
   - `/var/www/tenmon-ark.com/current/dist/` に配置されているか
   - nginx設定で `root` が正しく設定されているか

3. **CORS設定**
   - API側の `CORS_ORIGIN` がフロントエンドのドメインと一致しているか

### 4.2 直近でハマっていたエラー・ループ

**Git Status**（未コミットの変更）:
```
M api/README.md
M api/package.json
M api/src/core/server.ts
M api/src/index.ts
M api/src/routes/chat.ts
M api/src/routes/health.ts
M api/tsconfig.json
M infra/deploy.sh
M infra/nginx/tenmon-ark.com.conf
M infra/nginx/tenmon-ark.com.http-only.conf
M infra/nginx/tenmon-ark.com.http.conf
?? NOT_A_NOTEBOOK.ipynb
?? PRODUCTION_BACKEND_DEPLOYMENT_REPORT.md
?? PRODUCTION_STARTUP_ANALYSIS.md
?? api/scripts/
?? api/src/db/
?? api/src/kokuzo/
?? api/src/memory/
?? api/src/ops/
?? api/src/persona/
```

**新規追加ファイル**（未コミット）:
- `api/src/db/`: SQLiteスキーマ
- `api/src/kokuzo/`: KOKŪZŌ Fractal Engine
- `api/src/memory/`: 記憶システム
- `api/src/ops/`: 運用API
- `api/src/persona/`: 人格エンジン

**要点**:
- 大量の新規実装が未コミット
- GitHubとの同期が必要

### 4.3 解決できなかった実装上のループ

**現時点での不明点**:
1. VPS環境での実際のエラーログが未確認
2. フロントエンドとAPIの接続確認が未実施
3. データベース（SQLite）の初期化状況が不明

---

## ■ 5. 直前の作業コンテキスト

### 5.1 直前まで実装していた内容

**完了済みフェーズ**:
- ✅ **PHASE 9**: 正式リリース構成（health/readiness/shutdown/metrics）
- ✅ **PHASE UI-2〜7**: UI復旧（Tailwind / i18n / API接続 / Persona表示 / Memory表示 / チャット送受信）
- ✅ **CORE-3〜9**: 人格エンジン完全実装
  - CORE-3: PersonaState完全同期
  - CORE-4: MemoryによるPersonaState変化
  - CORE-5: PersonaStateが応答ロジックに影響
  - CORE-6: 人格の慣性・余韻
  - CORE-7: 思考軸（Thinking Axis）
  - CORE-8: 天津金木4相構造（Amatsu-Kanagi）
  - CORE-9: 語彙選択バイアス（Lexical Bias）
- ✅ **KOKŪZŌ SERVER**: 構文記憶システム
  - KokuzoMemorySeed（最小記憶構造）
  - KokuzoTendency（傾向集計）
  - FractalSeed（構文核圧縮）
  - Fractal Expansion（構文核展開）
- ✅ **v∞-2**: External Integration（外部連携用エンドポイント）
- ✅ **v∞-3**: Ambient / Device 常駐（起動時人格初期化）
- ✅ **PHASE A**: 会話解放（CONVERSATION_ENABLEDフラグ）
- ✅ **PHASE B**: チャット画面実装（会話履歴表示）

### 5.2 次にやるべきだと判断していたタスク

**優先度: 高**
1. **VPS環境での動作確認**
   - APIサーバーの起動確認
   - フロントエンドのビルド・配置確認
   - nginx設定の確認
   - 実際のエラーログ確認

2. **GitHubへのコミット・プッシュ**
   - 未コミットの変更をコミット
   - リモートリポジトリにプッシュ

3. **会話機能の動作確認**
   - `/api/chat` エンドポイントの動作確認
   - フロントエンドからのAPI呼び出し確認
   - 会話履歴の表示確認

**優先度: 中**
4. **データベース初期化確認**
   - SQLiteファイルの存在確認
   - スキーマの適用確認

5. **ログ監視の設定**
   - systemd journalの確認方法
   - エラーログの確認方法

---

## 📋 まとめ

### 現在の完成度

**API側**: ✅ ほぼ完成
- 人格エンジン（CORE-5〜9）: ✅ 実装完了
- KOKŪZŌ Fractal Engine: ✅ 実装完了
- 外部連携（v∞-2）: ✅ 実装完了
- Ambient常駐（v∞-3）: ✅ 実装完了
- 会話解放（PHASE A）: ✅ 実装完了
- 運用API（health/readiness/shutdown）: ✅ 実装完了

**フロントエンド側**: ✅ ほぼ完成
- UI-Ω-1（世界観デザイン）: ✅ 実装完了
- PHASE B（チャット画面）: ✅ 実装完了

**未確認・未解決事項**:
- ❓ VPS環境での実際の動作状況
- ❓ エラーログの詳細
- ❓ データベースの初期化状況
- ❓ GitHubとの同期状況

### 次のステップ（新・統括AIへの推奨事項）

1. **即座に確認すべき項目**:
   - VPS環境でのAPIサーバー起動状況
   - nginx設定の確認
   - フロントエンドのビルド・配置状況
   - 実際のエラーログ確認

2. **修正が必要な可能性が高い項目**:
   - nginx設定（APIプロキシ設定）
   - CORS設定
   - データベース初期化

3. **長期的な改善項目**:
   - GitHubへのコミット・プッシュ
   - デプロイ自動化の改善
   - ログ監視の強化

---

**レポート終了**

このレポートは、新・統括AI（Google AI Ultra）が TENMON-ARK の現状を完全に把握し、VPS環境での不具合を即時解決するために作成されました。

