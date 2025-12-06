# MANUS IMPLEMENTATION COMMAND v3.0

## 📋 概要

Sleep-Overdrive v1.0の実装完了を確認した次に、以下の3つのフェーズを同時進行で実装すること。

---

## 🔥 **MANUS IMPLEMENTATION COMMAND v3.0**

### （Ark Overdrive – UI / API / ULCE v3 テスト一括合）**

Manus〜、

Sleep-Overdrive v1.0の実装完了を確認した
次に、以下の3大フェーズを同時進行で実装せよ。

---

## 👉 **【A. フロントエンド UI 実装（最優先）】**

### Ark Browser UI（/ark/browser）

- 世界検索バー
- Deep Parse UI
- 翻訳表示エリア
- 結果カード
- Chat連動ボタン

### Ark Writer（/ark/writer）

- 記事自動生成UI
- SEOプレビュー
- 投稿ボタン（WordPress/Medium）

### Ark SNS（/ark/sns）

- 投稿プレビュー
- メディア生成プレビュー
- 投稿先選択（X/IG/YT）

### Ark Cinema（/ark/cinema）

- script表示
- storyboardビュー
- 動画生成ボタン

UI：
/settings/api に追加。

---

## 👉 **【B. 外部API一統合】**

次のキー入力機を作成し、
APIリクエストに統合：

- WordPress
- Medium
- Dev.to
- X
- Instagram
- YouTube
- Blender/Unity（映像）

UI：
/settings/api に追加。

---

## 👉 **【C. ULCE v3 翻訳テストフェーズ】**

10言語の翻訳品質テストを自動化：

- ja ↔ en
- ja ↔ zh
- ja ↔ es
- ja ↔ fr
- ja ↔ de
- ja ↔ it
- ja ↔ hi
- ja ↔ ar
- ja ↔ pt
- ja ↔ ko

翻訳テストを
ulce3.test.ts にて PASS になるまで Self-Heal。

---

## 📊 **【完了報告形式】**

**[Manus Status – Phase 3]**

現在タスク：
進捗：
次タスク：
API統合状況：
ULCE v3 翻訳品質：

---

## 🔥 **MANUS IMPLEMENTATION COMMAND v3.1**

### （Facebook API 統合 + Notion API 完全統合指令）**

Manus〜、

次のタスクを最優先で実装すること。
TENMON-ARK はすでにOS全体構文があり、
あなたはこの構文を実際のコードとして GitHub に反映せよ。

---

## 👉 **【第1章：Facebook API 統合（Graph API）】**

Facebook（Meta）への投稿を
Ark SNS / Ark Writer / Ark Cinema / Chat-OS の出力から連動して自動投稿できるようにする。

以下を実装せよ。

---

### 🔹 1. Facebook Graph APIの接続基盤を作成

**ディレクトリ：**
/lib/facebook/

**必要ファイル：**
- facebookClient.ts
- facebookPublisher.ts

**facebookClient.ts 仕様：**

```typescript
import axios from "axios";

const FACEBOOK_API = "https://graph.facebook.com/v19.0";

export const facebookClient = {
  post: (pageId: string, token: string, message: string) => {
    return axios.post(`${FACEBOOK_API}/${pageId}/feed`, {
      message,
      access_token: token
    });
  },
  postImage: (pageId: string, token: string, url: string, caption?: string) => {
    return axios.post(`${FACEBOOK_API}/${pageId}/photos`, {
      url,
      caption,
      access_token: token
    });
  },
};
```

---

### 🔹 2. 投稿API（/api/social/facebook/post）を実装

**ファイル /app/api/social/facebook/post/route.ts**

```typescript
import { facebookClient } from "@/lib/facebook/facebookClient";

export async function POST(req: Request) {
  const { pageId, token, message } = await req.json();
  
  const result = await facebookClient.post(pageId, token, message);
  
  return Response.json(result.data);
}
```

---

### 🔹 3. Notion API 統合（完全版）

Notion への自動記録を
Ark SNS / Ark Writer / Ark Cinema / Chat-OS の出力から連動して自動保存できるようにする。

**ディレクトリ：**
/lib/notion/

**必要ファイル：**
- notionClient.ts
- notionDatabase.ts

**notionClient.ts 仕様：**

```typescript
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

export const notionClient = {
  createPage: async (databaseId: string, properties: any) => {
    return notion.pages.create({
      parent: { database_id: databaseId },
      properties,
    });
  },
  queryDatabase: async (databaseId: string, filter?: any) => {
    return notion.databases.query({
      database_id: databaseId,
      filter,
    });
  },
};
```

---

### 🔹 4. Notion 保存API（/api/notion/save）を実装

**ファイル /app/api/notion/save/route.ts**

```typescript
import { notionClient } from "@/lib/notion/notionClient";

export async function POST(req: Request) {
  const { databaseId, properties } = await req.json();
  
  const result = await notionClient.createPage(databaseId, properties);
  
  return Response.json(result);
}
```

---

### 🔹 5. 環境変数の追加

**.env.local に追加：**

```
FACEBOOK_PAGE_ID=your_page_id
FACEBOOK_ACCESS_TOKEN=your_access_token
NOTION_API_KEY=your_notion_api_key
NOTION_DATABASE_ID=your_database_id
```

---

### 🔹 6. UI 統合（/settings/api）

**既存の /settings/api ページに以下を追加：**

- Facebook ページID入力欄
- Facebook アクセストークン入力欄
- Notion API キー入力欄
- Notion データベースID入力欄

---

## 📊 **【完了報告形式（更新版）】**

**[Manus Status – Phase 3.1]**

現在タスク：Facebook API 統合 / Notion API 完全統合
進捗：％
次タスク：
API統合状況：
  - Facebook: ○/×
  - Notion: ○/×
ULCE v3 翻訳品質：

---

## 🎯 実装完了条件

1. Facebook への投稿が Chat / Ark SNS / Ark Writer / Ark Cinema から可能
2. Notion への自動保存が Chat / Ark SNS / Ark Writer / Ark Cinema から可能
3. /settings/api に Facebook / Notion の設定UIが追加されている
4. 環境変数が正しく設定されている
5. テストが通過している

---

**以上、MANUS IMPLEMENTATION COMMAND v3.1 完了せよ。**
