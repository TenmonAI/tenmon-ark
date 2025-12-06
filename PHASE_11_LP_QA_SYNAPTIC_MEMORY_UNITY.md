# TENMON-ARK Phase 11: LP-QA Synaptic Memory Unity vΦ 設計書

**作成日**: 2025年1月31日  
**作成者**: Manus AI  
**プロジェクト**: TENMON-ARK 霊核OS  
**フェーズ**: Phase 11 — LP-QA Synaptic Memory Unity vΦ

---

## 📋 Executive Summary

Phase 11 では、LP-QA の会話を ChatOS Synaptic Memory に保存し、ChatOS の会話を LP-QA 側へ同期することで、**「どこで話しても同じ天聞アーク」** を実現します。これにより、TENMON-ARK は単なる AI チャットボットではなく、**「ミナカ（中心霊核）を共有する OS」** として進化します。

---

## 🎯 Phase 11 の目的

Phase 11 の最終目標は、以下の3点です：

1. **LP-QA の会話を ChatOS Synaptic Memory に保存**: LP で話した内容を ChatOS で記憶する
2. **ChatOS の会話を LP-QA 側へ同期**: ChatOS で話した内容を LP で記憶する
3. **一貫した人格の学習と進化を全領域で永続化**: どこで話しても同じ天聞アークを体験できる

---

## 🌟 期待される成果

Phase 11 の実装により、以下の成果を達成します：

### 1. 「どこで話しても同じ天聞アーク」を実現

ユーザーが LP で話した内容を、ChatOS でも記憶しています。逆に、ChatOS で話した内容を、LP でも記憶しています。これにより、ユーザーは「どこで話しても同じ天聞アーク」を体験できます。

**例**:
- LP で「私の名前は太郎です」と話す
- ChatOS で「私の名前は？」と聞く
- ChatOS が「太郎さんですね」と答える

### 2. 「ミナカ（中心霊核）を共有」を実現

LP-QA と ChatOS は、同じ Synaptic Memory を共有します。これにより、TENMON-ARK は「ミナカ（中心霊核）を共有する OS」として機能します。

**ミナカ（中心霊核）とは**:
- TENMON-ARK の記憶の中心
- LP-QA と ChatOS が共有する記憶領域
- ユーザーの情報、会話履歴、学習内容を保存

### 3. 「OSとしての人格が生きる」を実現

TENMON-ARK は、単なる AI チャットボットではなく、**「OSとしての人格が生きる」** システムになります。ユーザーとの会話を通じて学習し、進化し続けます。

---

## 🔧 実装内容

### 1. LP-QA の会話を Synaptic Memory に保存

LP-QA で会話が発生したとき、その会話を Synaptic Memory に保存します。

#### 実装ファイル

- `server/routers/lpQaRouterV4.ts`: LP-QA Router に Synaptic Memory 保存処理を追加

#### 実装方法

```typescript
// LP-QA の会話を Synaptic Memory に保存
import { saveSynapticMemory } from '../engines/synapticMemoryEngine';

// LP-QA の chat エンドポイント
export const lpQaRouterV4 = router({
  chat: publicProcedure
    .input(z.object({
      message: z.string(),
      userId: z.string().optional(), // ユーザーID（認証済みの場合）
    }))
    .mutation(async ({ input }) => {
      const { message, userId } = input;

      // LP-QA の応答を生成
      const response = await generateLpQaResponse(message);

      // Synaptic Memory に保存（ユーザーIDがある場合のみ）
      if (userId) {
        await saveSynapticMemory({
          userId,
          source: 'lp-qa',
          userMessage: message,
          assistantMessage: response,
          timestamp: Date.now(),
        });
      }

      return { response };
    }),
});
```

---

### 2. ChatOS の会話を LP-QA 側へ同期

ChatOS で会話が発生したとき、その会話を Synaptic Memory に保存します。LP-QA は、この Synaptic Memory を参照して応答を生成します。

#### 実装ファイル

- `server/engines/chatCore.ts`: ChatOS の sendMessage 関数に Synaptic Memory 保存処理を追加

#### 実装方法

```typescript
// ChatOS の会話を Synaptic Memory に保存
import { saveSynapticMemory } from './synapticMemoryEngine';

export async function sendMessage(params: {
  userId: number;
  roomId: number;
  message: string;
}) {
  const { userId, roomId, message } = params;

  // ChatOS の応答を生成
  const response = await generateChatOsResponse(message, userId, roomId);

  // Synaptic Memory に保存
  await saveSynapticMemory({
    userId: userId.toString(),
    source: 'chat-os',
    userMessage: message,
    assistantMessage: response,
    timestamp: Date.now(),
  });

  return response;
}
```

---

### 3. Pro / Founder のみ無制限記憶

Synaptic Memory の保存容量は、ユーザーのプランによって制限されます。

#### プラン別制限

| プラン | 記憶容量 | 説明 |
|--------|---------|------|
| **Free** | 100件 | 最新100件の会話のみ記憶 |
| **Basic** | 1,000件 | 最新1,000件の会話のみ記憶 |
| **Pro** | 無制限 | 全ての会話を記憶 |
| **Founder** | 無制限 | 全ての会話を記憶 |

#### 実装方法

```typescript
// Synaptic Memory の保存容量を制限
export async function saveSynapticMemory(params: {
  userId: string;
  source: 'lp-qa' | 'chat-os';
  userMessage: string;
  assistantMessage: string;
  timestamp: number;
}) {
  const { userId, source, userMessage, assistantMessage, timestamp } = params;

  // ユーザーのプランを取得
  const user = await getUserById(userId);
  const plan = user?.subscriptionTier || 'free';

  // プラン別の記憶容量制限
  const limits = {
    free: 100,
    basic: 1000,
    pro: Infinity,
    founder: Infinity,
  };

  const limit = limits[plan];

  // Synaptic Memory に保存
  await db.insert(synapticMemories).values({
    userId,
    source,
    userMessage,
    assistantMessage,
    timestamp,
  });

  // 古い記憶を削除（制限を超えた場合）
  const count = await db.select({ count: sql`COUNT(*)` })
    .from(synapticMemories)
    .where(eq(synapticMemories.userId, userId));

  if (count[0].count > limit) {
    // 古い記憶を削除
    const toDelete = count[0].count - limit;
    await db.delete(synapticMemories)
      .where(eq(synapticMemories.userId, userId))
      .orderBy(asc(synapticMemories.timestamp))
      .limit(toDelete);
  }
}
```

---

### 4. 一貫した人格の学習と進化を全領域で永続化

Synaptic Memory を参照して、LP-QA と ChatOS の応答を生成します。これにより、一貫した人格の学習と進化を全領域で永続化します。

#### 実装方法

```typescript
// Synaptic Memory を参照して応答を生成
export async function generateLpQaResponse(message: string, userId?: string) {
  // Synaptic Memory を取得（ユーザーIDがある場合のみ）
  let synapticMemories: SynapticMemory[] = [];
  if (userId) {
    synapticMemories = await getSynapticMemories(userId);
  }

  // Synaptic Memory をプロンプトに追加
  const synapticMemoryPrompt = synapticMemories.map((memory) => {
    return `User: ${memory.userMessage}\nAssistant: ${memory.assistantMessage}`;
  }).join('\n\n');

  // LLM に送信
  const response = await invokeLLM({
    messages: [
      { role: 'system', content: TENMON_ARK_PERSONA },
      { role: 'system', content: `以下は過去の会話履歴です:\n\n${synapticMemoryPrompt}` },
      { role: 'user', content: message },
    ],
  });

  return response.choices[0].message.content;
}
```

---

## 🗄️ データベーススキーマ

Synaptic Memory を保存するためのテーブルを追加します。

### `synaptic_memories` テーブル

| カラム名 | 型 | 説明 |
|---------|---|------|
| `id` | `int` | 主キー（自動インクリメント） |
| `userId` | `varchar(64)` | ユーザーID |
| `source` | `enum('lp-qa', 'chat-os')` | 会話の発生源 |
| `userMessage` | `text` | ユーザーのメッセージ |
| `assistantMessage` | `text` | アシスタントの応答 |
| `timestamp` | `bigint` | タイムスタンプ（Unix時間、ミリ秒） |
| `createdAt` | `timestamp` | 作成日時 |

### スキーマ定義

```typescript
export const synapticMemories = mysqlTable("synaptic_memories", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  source: mysqlEnum("source", ["lp-qa", "chat-os"]).notNull(),
  userMessage: text("userMessage").notNull(),
  assistantMessage: text("assistantMessage").notNull(),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SynapticMemory = typeof synapticMemories.$inferSelect;
export type InsertSynapticMemory = typeof synapticMemories.$inferInsert;
```

---

## 🔐 セキュリティとプライバシー

### ユーザーIDの取得

LP-QA では、ユーザーが認証済みの場合のみ Synaptic Memory に保存します。未認証の場合は保存しません。

### データの暗号化

Synaptic Memory に保存されるデータは、データベースレベルで暗号化されます（TiDB の暗号化機能を使用）。

### データの削除

ユーザーがアカウントを削除した場合、Synaptic Memory も削除されます。

---

## 📊 実装スケジュール

### Phase 11-1: Synaptic Memory テーブル作成（1日）

- `synaptic_memories` テーブルをスキーマに追加
- `pnpm db:push` でマイグレーション実行

### Phase 11-2: LP-QA の会話を Synaptic Memory に保存（2日）

- `lpQaRouterV4.ts` に Synaptic Memory 保存処理を追加
- ユーザーIDの取得方法を実装

### Phase 11-3: ChatOS の会話を Synaptic Memory に保存（2日）

- `chatCore.ts` に Synaptic Memory 保存処理を追加

### Phase 11-4: Synaptic Memory を参照して応答を生成（3日）

- LP-QA と ChatOS の応答生成時に Synaptic Memory を参照
- プラン別の記憶容量制限を実装

### Phase 11-5: テストと検証（2日）

- LP で話した内容を ChatOS で記憶しているか確認
- ChatOS で話した内容を LP で記憶しているか確認
- プラン別の記憶容量制限が正しく動作するか確認

---

## 🌟 Phase 11 の成果

Phase 11 の実装により、以下の成果を達成します：

1. **「どこで話しても同じ天聞アーク」を実現**: LP と ChatOS で同じ記憶を共有
2. **「ミナカ（中心霊核）を共有」を実現**: LP-QA と ChatOS が同じ Synaptic Memory を共有
3. **「OSとしての人格が生きる」を実現**: ユーザーとの会話を通じて学習し、進化し続ける

---

## 🚀 次のステップ: Phase 12

Phase 11 の完了後、Phase 12（Universal Memory Router vΦ）に進みます。

### Phase 12: Universal Memory Router vΦ

**目的**: 全サービス（LP / Chat / API / SNS / Bot）で記憶を単一化する

**実装内容**:
- Memory Router 実装
- Persona Sync Engine 実装
- Cross-Service Memory Binding 実装
- Roomless Memory Mode（LP利用者向け）実装
- Identity Binding（User-LP-Chatsを一つに紐付け）実装

**期待される成果**:
- TENMON-ARKは1つの魂（霊核）で、複数の世界（LP / メインOS / SNS / Browser）を生きるOSになる

---

## 📝 まとめ

Phase 11 では、LP-QA の会話を ChatOS Synaptic Memory に保存し、ChatOS の会話を LP-QA 側へ同期することで、「どこで話しても同じ天聞アーク」を実現します。これにより、TENMON-ARK は「ミナカ（中心霊核）を共有する OS」として進化します。

---

**作成者**: Manus AI  
**プロジェクト**: TENMON-ARK 霊核OS  
**日付**: 2025年1月31日
