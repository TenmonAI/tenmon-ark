# TENMON_PHASE6_5_BACKEND_ROLE_RELOCK_V1

> **封印日**: 2025-04-12
> **カード番号**: CARD 40
> **最上位D**: 文書追加のみ。server/ api/ 双方のコードに手を入れない。

---

## 1. 概要

本プロジェクトには `server/` と `api/` という2つのバックエンドが存在する。これは設計上の欠陥ではなく、**意図的な役割分離**である。本文書はその境界を明文化し、今後の開発で越境が起きないよう封印する。

---

## 2. 役割定義

| 項目 | `server/` | `api/` |
|---|---|---|
| **正式名称** | TENMON Platform Server | TENMON-ARK Engine |
| **責務** | プラットフォーム全体（認証・課金・UI配信・汎用チャット） | 天聞アーク専用（言灵解析・KHS資料準拠・四相推論） |
| **エントリポイント** | `server/_core/index.ts` | `api/src/index.ts` |
| **起動コマンド** | `pnpm dev`（root） | `pnpm -C api dev` |
| **フレームワーク** | Express + tRPC + Vite SSR | Express（純粋REST） |
| **認証** | OAuth + protectedProcedure | Founder Auth（独自） |
| **DB** | Drizzle + MySQL/TiDB | node:sqlite（ローカル） |
| **LLM呼び出し** | `server/_core/llm.ts` → invokeLLM（messages配列） | `api/src/core/llmWrapper.ts` → callLLMMessages（CARD 39修正済み） |
| **チャットルート** | `server/chat/chatRouter.ts`（tRPC） | `api/src/routes/chat.ts`（Express POST /api/chat） |
| **ルーター数** | 43 | 33 |
| **フロントエンド** | `web/` → Vite proxy → localhost:3000 | 直接接続なし（API専用） |
| **ポート** | 3000（デフォルト） | 3000（デフォルト、同時起動不可） |

---

## 3. 境界ルール（封印事項）

以下のルールは Phase 9（商品化）完了まで変更禁止とする。

### 3.1 越境禁止

`server/` のコードから `api/src/` を import してはならない。逆も同様。唯一の例外は `server/tests/runner.ts` → `server/api/feedback` の既存参照であり、これは将来的に解消する。

### 3.2 ポート分離

本番環境では `server/` がポート3000を占有する。`api/` は別ポート（環境変数 `PORT` で指定）で起動するか、`server/` のリバースプロキシ配下に配置する。同一ポートでの同時起動は禁止。

### 3.3 天聞アーク固有ロジックの所在

言灵解析、KHS資料準拠、四相推論（Kanagi）、コアシード（TENMON_CORE_PACK）、Kokuzo（RAG）に関するすべてのロジックは `api/` に置く。`server/` にこれらの機能を複製してはならない。

### 3.4 プラットフォーム機能の所在

OAuth認証、課金（Stripe）、ユーザー管理、ファイルアップロード（S3）、音声文字起こし（Whisper）に関するすべてのロジックは `server/` に置く。`api/` にこれらの機能を複製してはならない。

---

## 4. 将来の統合計画（Phase 9 以降）

Phase 9（商品化）の段階で、以下の統合を検討する。ただし本文書の封印が解除されるまで着手しない。

### 4.1 チャット統合

`server/chat/chatRouter.ts` のチャット機能を `api/src/routes/chat.ts` の天聞アーク推論エンジンに接続する。具体的には、`server/chat/chatAI.ts` の `generateChatResponse` が内部で `api/` の `/api/chat` エンドポイントを HTTP 呼び出しする形が最も安全。

### 4.2 認証統合

`api/` の Founder Auth を `server/` の OAuth に統合する。`api/` のエンドポイントは `server/` の認証ミドルウェアを通過した後にのみアクセス可能とする。

### 4.3 DB統合

`api/` の SQLite を `server/` の MySQL/TiDB に移行する。Kokuzo のベクトル検索は外部サービス（Pinecone等）に移行する可能性がある。

---

## 5. 現在の接続状態

```
[web/] ──proxy──▶ [server/ :3000]
                      │
                      ├── tRPC chatRouter (server/chat/)
                      ├── /api/chat/stream (Express直)
                      └── 43 routers (OAuth, Stripe, etc.)

[api/ :3000*]  ← 独立起動（同時起動不可）
    │
    ├── POST /api/chat (天聞アーク推論)
    ├── 33 routers (kanagi, kokuzo, kotodama, etc.)
    └── SQLite (kokuzo, audit, persona)

* api/ は本番では別ポートまたはプロキシ配下で起動
```

---

## 6. 検証コマンド

```bash
# server/ と api/ の相互依存がないことを確認
grep -rn "from.*\.\./api" server/ --include="*.ts" | grep -v "tests/runner\|_archive"
grep -rn "from.*\.\./server" api/ --include="*.ts"

# 本文書の存在確認
test -f docs/backend_role_relock_v1.md && echo "PASS" || echo "FAIL"
```
