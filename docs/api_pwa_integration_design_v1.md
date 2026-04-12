# TENMON-ARK API/PWA 統合設計書 v1

**作成日**: 2026-04-12
**作成者**: Manus（実装主担当）
**カード**: TENMON_PHASE7_API_PWA_BRIDGE_V1

---

## 1. 問題の定義

TENMON-ARK には2つの独立したバックエンドが存在し、コード共有がゼロである。

| 項目 | api/ (Express, port 3000) | server/ (Express+tRPC+Vite, port 5001) |
|---|---|---|
| チャットエンジン | `api/src/routes/chat.ts` (3871行) | `server/chat/chatAI.ts` (297行) |
| 人格プロンプト | TENMON_CONSTITUTION_TEXT (天聞憲法全文) | 1行 ("You are TENMON-ARK, an advanced AI assistant...") |
| ルーティング | 決定論的分岐 (N1/N2/DEF/DOMAIN/LLM_CHAT) | Universal Memory Router + Centerline Protocol |
| 知識エンジン | kanagi/ (48ファイル, 天津金木・水火・言灵) | なし |
| メモリ | koshiki/memoryStore + spiralState | chatDb + Universal Memory Router |
| 配信方式 | JSON応答 (非ストリーミング) | SSE streaming (chatStreamingV3Engine) |

この構造的差異により、同一入力に対して全く異なる応答が返される。Notion 03_API_PWA_Equivalence の全項目が FAIL である。

---

## 2. 設計方針: ブリッジパターン

server/ の既存アーキテクチャ（認証・課金・PWA・ストリーミング）を壊さず、api/ の天聞エンジンを server/ に接続する「ブリッジ」を構築する。

### 2-1. 最小侵襲の原則

server/ の既存コードへの変更は最小限に留める。具体的には、`server/chat/chatAI.ts` の `generateChatResponse` 関数の内部で、api/ の天聞エンジンを呼び出すブリッジを挿入する。

### 2-2. ブリッジの構造

```
server/chat/chatAI.ts
  └── generateChatResponse()
        ├── [既存] Universal Memory Router
        ├── [新規] tenmonBridge.ts ← api/src/routes/chat.ts のコアロジックを呼び出す
        │     ├── 天聞ルーティング (N1/N2/DEF/DOMAIN/LLM_CHAT)
        │     ├── kanagi エンジン (音韻解析→水火分類→位相推定→螺旋フィードバック)
        │     └── TENMON_CONSTITUTION_TEXT (天聞憲法)
        ├── [既存] Soul Sync
        ├── [既存] Activation-Centering Hybrid Engine
        └── [既存] personaOutputFilter
```

### 2-3. 実装ファイル

新規作成するファイルは1つだけ:

```
server/chat/tenmonBridge.ts
```

このファイルが api/ の天聞エンジンのコアロジック（ルーティング・kanagi・憲法テキスト）を server/ の文脈で呼び出せるようにする。

---

## 3. tenmonBridge.ts の設計

### 3-1. インターフェース

```typescript
export interface TenmonBridgeInput {
  userMessage: string;
  conversationHistory: Array<{ role: string; content: string }>;
  userId: number;
  language: string;
}

export interface TenmonBridgeOutput {
  response: string;
  decisionFrame: {
    mode: string;
    ku_routeReason: string;
  };
  kanagiTrace?: object;
}

export async function invokeTenmonEngine(input: TenmonBridgeInput): Promise<TenmonBridgeOutput>;
```

### 3-2. 実装戦略

2つの選択肢がある:

**選択肢A: HTTP内部呼び出し（推奨）**

server/ から api/ の `/api/chat` エンドポイントを HTTP で呼び出す。api/ が別プロセスで動作している場合に最適。コード共有不要。

```typescript
// server/chat/tenmonBridge.ts
const API_URL = process.env.TENMON_API_URL || "http://localhost:3000";

export async function invokeTenmonEngine(input: TenmonBridgeInput): Promise<TenmonBridgeOutput> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: input.userMessage }),
  });
  return res.json();
}
```

**選択肢B: 直接インポート**

api/ のコアモジュールを server/ から直接インポートする。モノレポ構成が前提。パス解決が複雑になるリスクあり。

### 3-3. chatAI.ts への統合

```typescript
// server/chat/chatAI.ts の generateChatResponse 内
import { invokeTenmonEngine } from "./tenmonBridge";

// 既存の systemPrompt 構築の前に:
const tenmonResult = await invokeTenmonEngine({
  userMessage: messages[messages.length - 1]?.content || "",
  conversationHistory: conversationMessages,
  userId,
  language,
});

// tenmonResult.response を systemPrompt に注入
const enrichedSystemPrompt = `${systemPrompt}\n\n【天聞エンジン解析結果】\n${tenmonResult.response}`;
```

---

## 4. 段階的統合計画

| ステップ | 内容 | リスク |
|---|---|---|
| Step 1 | `tenmonBridge.ts` を作成し、HTTP内部呼び出しで api/ に接続 | 低（server/ の既存コードを変更しない） |
| Step 2 | `chatAI.ts` の `generateChatResponse` にブリッジを挿入 | 中（既存フローに影響） |
| Step 3 | `chatStreamingV3Engine.ts` にもブリッジを挿入（ストリーミング対応） | 中（ストリーミングの遅延に注意） |
| Step 4 | Golden Baseline の25件で API/PWA 同等性を検証 | 低（テストのみ） |

---

## 5. acceptance 条件

```bash
# Step 1 完了後
curl -s http://localhost:5001/api/chat/stream -d '{"message":"言霊とは何ですか"}' | grep -q "天津金木"

# Step 4 完了後
node api/scripts/regression_test_v1.mjs --api-url=http://localhost:5001
# → PASS率がapi/と同等であること
```

---

## 6. 禁止事項

- server/ の認証・課金・PWA機能を壊さない
- api/ のコードを server/ にコピペしない（ブリッジパターンで接続する）
- ストリーミング機能を削除しない
- Universal Memory Router を無効化しない
