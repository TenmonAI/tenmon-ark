# TENMON-ARK UI PWA化統合監査レポート

## 0. Executive Summary

- **現状のUI方式**: Expo Router（`app/` ディレクトリ、`expo-router` 使用）
- **Web/PWA対応状況**: NG（未設定。`react-native-web` / `@expo/metro-runtime` 未導入、`npx expo start --web` 実行不可）
- **ローカル保存**: SQLite（`expo-sqlite` 使用、`lib/db/` に実装済み）
- **API接続方式**: `fetch`（`lib/api/client.ts`）、接続先は `constants/env.ts` の `EXPO_PUBLIC_API_BASE_URL` から取得
- **衝突リスク**: **MEDIUM**（既存SQLite実装とIndexedDB導入の併存、`app/index.tsx` 新規作成によるルーティング変更リスク）

---

## 1. Project Skeleton

### 主要ディレクトリ一覧

```
app/
  (auth)/
    sign-in.tsx
    gate-denied.tsx
  (app)/
    _layout.tsx              # Drawer
    chats/
      _layout.tsx            # Stack
      index.tsx              # thread list
      chat/
        [id].tsx            # chat screen
    dashboard.tsx
    settings.tsx

components/
  ArtifactCard.tsx
  ChatBubble.tsx
  ComposerBar.tsx
  JumpToBottomButton.tsx
  KotodamaBadgeRow.tsx
  LoadingGlyph.tsx
  NewMessagesBanner.tsx
  ThinkingRipple.tsx
  Toast.tsx

lib/
  api/
    client.ts               # postChat({threadId, message})
    normalize.ts            # normalizeChatResponse()
    schema.ts               # Zod schema
  db/
    db.ts                   # getDb() - SQLite
    migrations.ts           # runMigrations()
    repo.ts                 # CRUD operations
  ui/
    microcopy.ts
    motion.ts
    promptTemplates.ts
    theme.ts
    toastBus.ts

constants/
  env.ts                    # API_BASE_URL = EXPO_PUBLIC_API_BASE_URL

types/
  api.ts                    # NormalizedChatResponse, Candidate, Evidence
```

### ルーティング構成

- **エントリポイント**: `app/(app)/_layout.tsx`（Drawer）
- **既存画面**:
  - `/(app)/chats` → `app/(app)/chats/index.tsx`（スレッド一覧）
  - `/(app)/chats/chat/[id]` → `app/(app)/chats/chat/[id].tsx`（チャット画面）
  - `/(app)/dashboard` → `app/(app)/dashboard.tsx`
  - `/(app)/settings` → `app/(app)/settings.tsx`
  - `/(auth)/sign-in` → `app/(auth)/sign-in.tsx`
  - `/(auth)/gate-denied` → `app/(auth)/gate-denied.tsx`

### エントリポイント

- **モバイル**: `app/(app)/_layout.tsx`（Drawer）が最上位レイアウト
- **Web**: 現状未実装（`expo-router` のWeb対応が必要）

---

## 2. Existing Chat UI Inventory

### チャット画面のファイルパス

- **メイン画面**: `app/(app)/chats/chat/[id].tsx`（493行）
- **スレッド一覧**: `app/(app)/chats/index.tsx`（198行）

### Message/Thread のデータ構造

**型定義**（`lib/db/repo.ts`）:

```typescript
export type DbThread = {
  id: string;
  title: string | null;
  createdAt: number;
  updatedAt: number;
};

export type DbMessage = {
  id: string;
  threadId: string;
  role: string;
  text: string;
  createdAt: number;
  rawJson: string | null;  // JSON文字列として保存
};

export type DbArtifact = {
  id: string;
  messageId: string;
  kind: string;            // "evidence" | "candidates"
  payload: string;        // JSON文字列
  createdAt: number;
};
```

**UI側の拡張型**（`app/(app)/chats/chat/[id].tsx`）:

```typescript
type UiMessage = DbMessage & {
  localId: string;
  failed?: boolean;
};

type UiArtifacts = {
  evidence: DbArtifact[];
  candidates: DbArtifact[];
};
```

### State管理

- **方式**: `useState` のみ（Zustand/Redux/Jotai等は未使用）
- **保存先**: 
  - 永続化: SQLite（`lib/db/repo.ts`）
  - 一時状態: React state（`messages`, `artifactsByMessage`, `draft`, `isSending` 等）

### Evidence/候補表示

- **実装箇所**: `app/(app)/chats/chat/[id].tsx` 内で `ArtifactCard` コンポーネントを使用
- **表示タイミング**: assistant message の下に `kind='evidence'` / `kind='candidates'` のカードを表示
- **データソース**: `artifactsByMessage[messageId]` から取得

---

## 3. Storage & Offline

### 永続化の方式

- **実装ファイル**: `lib/db/db.ts`, `lib/db/migrations.ts`, `lib/db/repo.ts`
- **技術**: `expo-sqlite`（SQLite）
- **テーブル構成**:
  - `threads` (id, title, createdAt, updatedAt)
  - `messages` (id, threadId, role, text, createdAt, rawJson)
  - `artifacts` (id, messageId, kind, payload, createdAt)
  - `user_prefs` (key, value)
- **PRAGMA設定**: `foreign_keys=ON`, `journal_mode=WAL`, `synchronous=NORMAL`

### スレッド一覧機能

- **実装**: `app/(app)/chats/index.tsx`
- **データ取得**: `listThreads()`（`lib/db/repo.ts`）
- **表示順**: `updatedAt DESC`

### 履歴復元フロー

- **起動時**: `app/(app)/chats/chat/[id].tsx` の `useEffect` で `listMessagesByThread(threadId)` を呼び出し
- **Artifacts復元**: 各 assistant message に対して `listArtifactsByMessage(message.id)` を呼び出し、`artifactsByMessage` state に格納

---

## 4. API Contract & Env

### API base URL の参照方法

- **実装ファイル**: `constants/env.ts`
- **コード**:
  ```typescript
  export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://127.0.0.1:3000";
  ```
- **使用箇所**: `lib/api/client.ts` で `import { API_BASE_URL } from "../../constants/env"`

### 叩いているエンドポイント

- **`/api/chat`**（POST）:
  - 実装: `lib/api/client.ts` の `postChat({ threadId, message })`
  - リクエスト: `{ threadId: string, message: string }`
  - レスポンス: Zod `ChatResponseSchema` でパース後、`normalizeChatResponse()` で正規化

### タイムアウト/リトライ/エラーハンドリング

- **タイムアウト**: `30_000ms`（`AbortController` 使用）
- **エラー分類**: `ApiError` 型（`kind: "network" | "server" | "parse"`）
- **リトライ**: 未実装（UI側で手動Retry導線あり）

---

## 5. Expo Web/PWA Readiness

### 依存関係の確認

- **`react-dom`**: ✅ 存在（`package.json` に `"react-dom": "^19.1.1"`）
- **`react-native-web`**: ❌ 未導入
- **`@expo/metro-runtime`**: ❌ 未導入
- **`expo-router`**: ❓ 未確認（`package.json` に記載なし、ただし `app/` ディレクトリ構造から使用推測）

### expo-router のWeb設定状況

- **確認結果**: `app.json` / `app.config.*` が見つからない
- **Web対応**: 未設定の可能性が高い

### `npx expo start --web` 実行に必要な追加作業

1. `expo` / `expo-router` のインストール確認
2. `react-native-web` の導入
3. `app.json` または `app.config.js` の作成（Web対応設定）
4. Metro bundler のWeb設定（または Vite 等への移行検討）

---

## 6. Collision Check with Proposed Plan

### 追加予定要素との衝突点

#### 6.1 `src/core/types.ts` の追加

**衝突判定**: **LOW**

- **理由**: 
  - 既存の型定義は `types/api.ts` と `lib/db/repo.ts`（型定義含む）に存在
  - `src/` ディレクトリは現状存在しない（`app/`, `lib/`, `components/`, `types/` のみ）
  - 同名ファイル衝突なし

**回避策**:
- `src/core/types.ts` を新規作成しても既存と衝突しない
- ただし、既存の `types/api.ts` との重複を避けるため、`src/core/types.ts` は「PWA固有の型」に限定するか、既存 `types/` を `src/core/` に統合する方針を検討

---

#### 6.2 `src/core/ApiClient.ts` の追加（`EXPO_PUBLIC_API_BASE_URL` 使用）

**衝突判定**: **MEDIUM**

- **理由**:
  - 既存の `lib/api/client.ts` が `postChat()` を実装済み
  - 既存の `constants/env.ts` が `EXPO_PUBLIC_API_BASE_URL` を参照済み
  - 同責務ファイル（API呼び出し層）が重複

**回避策**:
- **Option A（推奨）**: `lib/api/client.ts` を拡張し、Web/PWA環境では `src/core/ApiClient.ts` をラッパーとして使用
- **Option B**: `src/core/ApiClient.ts` を新規作成し、既存 `lib/api/client.ts` を `src/core/ApiClient.ts` の内部実装として統合
- **Option C**: `lib/api/client.ts` を `src/core/ApiClient.ts` にリネーム・移動（Breaking Change）

---

#### 6.3 `src/core/LocalMemory.ts` の追加（IndexedDB/idb）

**衝突判定**: **HIGH**

- **理由**:
  - 既存の `lib/db/` が SQLite（`expo-sqlite`）で実装済み
  - 既存の `client/src/lib/kokuzo/indexedDbStorage.ts` が別用途でIndexedDBを使用（Kokūzō記憶用）
  - ローカル保存の責務が重複（SQLite vs IndexedDB）

**回避策**:
- **Option A（推奨）**: `lib/db/repo.ts` に「ストレージ抽象化層」を追加し、環境に応じて SQLite / IndexedDB を切り替え
  - Web環境: IndexedDB（`src/core/LocalMemory.ts` を使用）
  - モバイル環境: SQLite（既存 `lib/db/` を使用）
- **Option B**: `src/core/LocalMemory.ts` を新規作成し、既存の `lib/db/repo.ts` と併存（環境判定で使い分け）
- **Option C**: 既存SQLite実装をIndexedDBに完全移行（Breaking Change、モバイル側の動作保証が必要）

---

#### 6.4 `app/index.tsx` の追加（チャット画面をここに集約）

**衝突判定**: **MEDIUM**

- **理由**:
  - 既存のチャット画面は `app/(app)/chats/chat/[id].tsx` に実装済み
  - `app/index.tsx` が存在しない場合、expo-router のルーティング優先順位が変わる可能性
  - 既存の `/(app)/chats/chat/[id]` ルートとの競合リスク

**回避策**:
- **Option A（推奨）**: `app/index.tsx` を新規作成せず、既存の `app/(app)/chats/chat/[id].tsx` をPWA対応で拡張
- **Option B**: `app/index.tsx` を新規作成し、内部で `/(app)/chats/chat/[id]` にリダイレクト（ルーティングラッパー）
- **Option C**: `app/index.tsx` を新規作成し、既存の `app/(app)/chats/chat/[id].tsx` の内容をコピー（重複コードリスク）

---

## 7. Minimal Integration Plan (No Breaking)

### 既存を壊さずに導入する最小手順（最大10ステップ）

#### PR1: Web/PWA基盤の準備

1. **依存追加**:
   ```bash
   npx expo install expo-router react-native-web @expo/metro-runtime
   ```

2. **`app.json` 作成**（Web対応設定）:
   ```json
   {
     "expo": {
       "web": {
         "bundler": "metro"
       }
     }
   }
   ```

3. **`src/core/types.ts` 新規作成**（PWA固有の型定義のみ）

**上書き禁止ファイル**: 既存の `types/api.ts`, `lib/db/repo.ts`（型定義部分）

---

#### PR2: API層の統合（既存を拡張）

4. **`lib/api/client.ts` を拡張**（Web環境判定を追加）:
   - `Platform.OS === 'web'` の場合は `src/core/ApiClient.ts` を内部で使用
   - 既存の `postChat()` インターフェースは維持

5. **`src/core/ApiClient.ts` 新規作成**（`lib/api/client.ts` のWeb版ラッパー）:
   - `EXPO_PUBLIC_API_BASE_URL` を参照（既存 `constants/env.ts` と同じキー）

**上書き禁止ファイル**: `lib/api/client.ts`（既存実装を壊さない）

**上書きして良いファイル**: なし（新規作成のみ）

---

#### PR3: ストレージ層の抽象化（環境判定で切り替え）

6. **`src/core/LocalMemory.ts` 新規作成**（IndexedDB実装）:
   - `idb` ライブラリを使用
   - 既存の `lib/db/repo.ts` と同じインターフェース（`createThread`, `listThreads`, `insertMessage` 等）を実装

7. **`lib/db/repo.ts` にストレージ抽象化層を追加**:
   - `getStorage()` 関数を追加（環境判定で SQLite / IndexedDB を返す）
   - 既存の関数実装は `getStorage()` 経由で呼び出すように変更（最小diff）

**上書き禁止ファイル**: `lib/db/db.ts`, `lib/db/migrations.ts`（既存SQLite実装）

**上書きして良いファイル**: `lib/db/repo.ts`（内部実装のみ変更、インターフェース維持）

---

#### PR4: ルーティング調整（既存を維持）

8. **`app/index.tsx` は作成しない**（既存ルーティングを維持）:
   - 既存の `app/(app)/chats/chat/[id].tsx` をPWA対応で拡張
   - Web環境でも `/(app)/chats/chat/[id]` ルートを使用

9. **`app/(app)/_layout.tsx` にWeb判定を追加**（任意）:
   - Web環境では Drawer を非表示にする等の調整

**上書き禁止ファイル**: `app/(app)/chats/chat/[id].tsx`（既存実装を壊さない）

**上書きして良いファイル**: `app/(app)/_layout.tsx`（Web対応の微調整のみ）

---

#### PR5: 動作確認・ドキュメント

10. **`docs/PWA_INTEGRATION_GUIDE.md` 作成**（統合手順の記録）

---

### 最小差分のPR単位案

- **PR1**: Web/PWA基盤（依存追加 + `app.json` + `src/core/types.ts`）
- **PR2**: API層統合（`lib/api/client.ts` 拡張 + `src/core/ApiClient.ts` 新規）
- **PR3**: ストレージ抽象化（`src/core/LocalMemory.ts` 新規 + `lib/db/repo.ts` 拡張）

---

## 8. 追加の注意事項

### 既存のIndexedDB実装との関係

- **`client/src/lib/kokuzo/indexedDbStorage.ts`**: 別用途（Kokūzō記憶用）で使用されているため、PWA統合とは独立して扱う
- **DB名の衝突回避**: `src/core/LocalMemory.ts` のIndexedDB名は `TENMON_ARK_CHAT` 等、既存と異なる名前にする

### 既存のWeb実装との関係

- **`web/` ディレクトリ**: 別プロジェクト（Vite + React）の可能性が高い。PWA統合とは独立
- **`client/` ディレクトリ**: 別プロジェクト（Vite + React）の可能性が高い。PWA統合とは独立

---

## 9. 結論

**統合リスク**: **MEDIUM**

- **主な衝突点**: ストレージ層（SQLite vs IndexedDB）の併存
- **推奨アプローチ**: ストレージ抽象化層を追加し、環境判定で切り替え（既存SQLite実装を壊さない）
- **最小diff方針**: 既存ファイルの上書きを最小限にし、新規ファイル追加で対応
