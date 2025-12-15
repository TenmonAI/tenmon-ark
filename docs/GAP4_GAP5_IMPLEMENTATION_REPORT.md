# GAP4 & GAP5 実装レポート

**作成日時**: 2025-01-31  
**対象**: Local Kokūzō Kernel の IndexedDB 実装 & Sync Fabric のサーバー送信処理

---

## ✅ 実装完了項目

### GAP4: Local Kokūzō Kernel の IndexedDB 実装

**ファイル**: `server/kokuzo/offline/localKokuzoKernel.ts`

#### 実装内容

1. **IndexedDBKokuzoStorage クラスの完全実装**
   - `openDB()`: IndexedDB データベースのオープンとスキーマ定義
   - `saveSemanticUnit()`: SemanticUnit の保存
   - `getSemanticUnit()`: SemanticUnit の取得
   - `getAllSemanticUnits()`: すべての SemanticUnit の取得（更新日時順）
   - `saveSeed()`: Seed の保存
   - `getSeed()`: Seed の取得
   - `getAllSeeds()`: すべての Seed の取得（seedWeight 順）
   - `saveSeedBundle()`: Seed Bundle の保存
   - `getSeedBundle()`: Seed Bundle の取得
   - `queryByKotodamaSignature()`: Kotodama シグネチャによる検索
   - `queryByKeyword()`: キーワードによる検索
   - `getRecentlyUsedSeeds()`: 最近使用された Seed の取得

2. **データベーススキーマ**
   - `semantic_units` ストア: `id` (keyPath), `createdAt`, `updatedAt` インデックス
   - `seeds` ストア: `id` (keyPath), `createdAt`, `updatedAt`, `seedWeight` インデックス
   - `seed_bundles` ストア: `id` (keyPath), `createdAt` インデックス

3. **エラーハンドリング**
   - IndexedDB が利用できない場合のフォールバック
   - エラーログの記録

---

### GAP5: Sync Fabric のサーバー送信処理

**ファイル**: `server/sync/offline/syncDiffController.ts`

#### 実装内容

1. **IndexedDBSyncDiffStorage クラスの完全実装**
   - `openDB()`: IndexedDB データベースのオープンとスキーマ定義
   - `logOfflineEvent()`: オフラインイベントの記録
   - `getOfflineEvents()`: オフラインイベントの取得（タイムスタンプ順）
   - `clearOfflineEvents()`: オフラインイベントのクリア
   - `saveDiffPayload()`: 差分ペイロードの保存
   - `getDiffPayload()`: 差分ペイロードの取得（最新のものを返す）

2. **データベーススキーマ**
   - `offline_events` ストア: `timestamp` (keyPath), `type`, `timestamp` インデックス
   - `diff_payloads` ストア: `syncTimestamp` (keyPath), `userId` インデックス

3. **sendDiffToServer() メソッドの実装**
   - クライアント側（ブラウザ環境）: `/api/trpc/offlineSync.syncDiff` エンドポイントに HTTP リクエストを送信
   - サーバー側（Node.js環境）: エラーをスロー（直接関数呼び出しを使用する必要がある）
   - エラーハンドリングとログ記録

---

## 📁 更新されたファイル

1. `server/kokuzo/offline/localKokuzoKernel.ts`
   - `IndexedDBKokuzoStorage` クラスの完全実装

2. `server/sync/offline/syncDiffController.ts`
   - `IndexedDBSyncDiffStorage` クラスの完全実装
   - `sendDiffToServer()` メソッドの実装

---

## 🔧 技術的実装詳細

### IndexedDB 実装パターン

既存の `eventLogStore.ts` と `snapshotStore.ts` の実装パターンを参考に、以下のパターンで実装しました：

1. **データベースオープン**
   ```typescript
   private async openDB(): Promise<IDBDatabase> {
     return new Promise((resolve, reject) => {
       const request = indexedDB.open(this.dbName, this.dbVersion);
       request.onerror = () => reject(request.error);
       request.onsuccess = () => resolve(request.result);
       request.onupgradeneeded = () => {
         // スキーマ定義
       };
     });
   }
   ```

2. **データ保存**
   ```typescript
   const db = await this.openDB();
   const transaction = db.transaction([storeName], "readwrite");
   const store = transaction.objectStore(storeName);
   await new Promise<void>((resolve, reject) => {
     const request = store.put(data);
     request.onsuccess = () => resolve();
     request.onerror = () => reject(request.error);
   });
   ```

3. **データ取得**
   ```typescript
   const db = await this.openDB();
   const transaction = db.transaction([storeName], "readonly");
   const store = transaction.objectStore(storeName);
   return await new Promise<T>((resolve, reject) => {
     const request = store.get(id);
     request.onsuccess = () => resolve(request.result);
     request.onerror = () => reject(request.error);
   });
   ```

### サーバー送信処理

クライアント側では、tRPC エンドポイントに HTTP リクエストを送信します：

```typescript
const response = await fetch("/api/trpc/offlineSync.syncDiff", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ json: payload }),
});
```

---

## ✅ テスト項目

### GAP4 テスト項目

- [ ] SemanticUnit の保存と取得
- [ ] Seed の保存と取得
- [ ] Seed Bundle の保存と取得
- [ ] Kotodama シグネチャによる検索
- [ ] キーワードによる検索
- [ ] 最近使用された Seed の取得
- [ ] 大量データの処理（パフォーマンステスト）

### GAP5 テスト項目

- [ ] オフラインイベントの記録と取得
- [ ] 差分ペイロードの保存と取得
- [ ] サーバーへの差分送信（クライアント側）
- [ ] オフラインイベントのクリア
- [ ] エラーハンドリング（ネットワークエラー、サーバーエラー）

---

## 📝 注意事項

1. **IndexedDB のブラウザ互換性**
   - IndexedDB はモダンブラウザでサポートされていますが、古いブラウザでは利用できない可能性があります
   - フォールバック処理を実装する必要がある場合があります

2. **サーバー側での使用**
   - `syncDiffController.ts` の `sendDiffToServer()` メソッドは、サーバー側では使用できません
   - サーバー側で使用する場合は、直接 `offlineSyncRouter` の関数を呼び出すか、別の方法を使用してください

3. **データベースバージョン管理**
   - スキーマ変更時は `dbVersion` を更新する必要があります
   - `onupgradeneeded` イベントでスキーマの移行処理を実装する必要があります

---

## 🎯 次のステップ

1. **AUDIT3（実行監査）の実装**
   - システムの実行時の動作を監査する機能の実装
   - `ArchitectModeCoreEngine` や `SelfVerifyEngine` を活用

2. **GAP6（UI 表示の統合）の実装**
   - オフラインモードの UI 表示の統合
   - オフライン状態の表示
   - 同期状態の表示

3. **テストの実装**
   - 上記のテスト項目を実装
   - E2E テストの追加

---

## 📊 完了状況

- ✅ GAP4: Local Kokūzō Kernel の IndexedDB 実装 - **完了**
- ✅ GAP5: Sync Fabric のサーバー送信処理 - **完了**
- ⏳ AUDIT3: PHASE 3: 実行監査 - **保留中**（要件確認が必要）
- ⏳ GAP6: UI 表示の統合 - **保留中**（低優先度）

