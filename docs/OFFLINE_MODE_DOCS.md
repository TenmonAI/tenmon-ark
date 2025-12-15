# TENMON-ARK オフラインモード ドキュメント

## 概要

TENMON-ARK / Kokūzō のオフライン稼働OSは、インターネット接続がない環境でも基本的な機能を提供します。

## 機能

### 1. Persona Core オフライン化

- **Persona State Manager**: オフライン時の Persona 状態を管理
- **ローカルストレージ**: IndexedDB（ブラウザ）またはファイルシステム（Node.js）を使用
- **オフライン制限**: 新しい Persona の作成や Law の変更は禁止
- **内部反省ログ**: オフライン時の変更を記録

### 2. オフライン推論エンジン

- **ローカル LLM サポート**: 利用可能な場合はローカル LLM を使用
- **テンプレートベースフォールバック**: ローカル LLM が利用できない場合はテンプレートベースの応答
- **TwinCore 統合**: オフライン時も TwinCore 推論を使用可能

### 3. ローカル Kokūzō Kernel

- **ローカルストレージ**: IndexedDB または SQLite を使用
- **SemanticUnit と Seed の管理**: ローカルで SemanticUnit と Seed を保存・取得
- **グローバルシード同期**: オンライン時にトップ N のグローバルシードをローカルに同期
- **会話と Seed のキャッシュ**: 最近の会話と重要な Reishō Seeds をローカルにキャッシュ

### 4. ローカル量子キャッシュ

- **コンテキスト保存**: 最近の Seed と会話をローカルに保存
- **取得 API**: オフライン チャット用に現在のコンテキストを取得
- **エビクションポリシー**: キャッシュサイズと有効期限を管理
- **電源サイクルテスト**: 電源サイクル後のコンテキスト生存をテスト

### 5. 同期差分コントローラー

- **オフラインイベントログ**: オフライン時の変更を記録
- **差分ペイロード生成**: オンライン復帰時に送信する差分を生成
- **自動同期**: オンライン復帰時に自動的に差分を送信
- **サーバー側マージ**: サーバー側で差分をレビュー・マージ

### 6. Kokūzō Server デュアル構造

- **パーソナル vs グローバル**: パーソナルノードとグローバルノードを区別
- **オフライン制限**: オフライン時はグローバルシードのマージと再クラスタリングを禁止
- **ポリシーレイヤー**: オフライン時のルールを適用
- **API レイヤー**: ローカルとグローバルの API を自動切り替え

### 7. オフライン UX & 診断

- **オフラインバナー**: チャットとダッシュボードにオフライン状態を表示
- **Persona ロック表示**: オフライン時の Persona ロック状態を表示
- **ローカル Kokūzō 統計**: ローカルの Seed と Unit 数を表示
- **オフラインデバッグパネル**: Founder ダッシュボード用の診断パネル

## 使用方法

### オフラインモードの有効化

```typescript
import { PersonaStateManager } from "./server/persona/offline/personaStateManager";
import { OfflineReasoningEngine } from "./server/reasoning/offline/offlineReasoningEngine";
import { LocalKokuzoKernel } from "./server/kokuzo/offline/localKokuzoKernel";

// Persona State Manager
const personaManager = new PersonaStateManager();
personaManager.setOfflineMode(true);

// Offline Reasoning Engine
const reasoningEngine = new OfflineReasoningEngine();
reasoningEngine.setOfflineMode(true);
reasoningEngine.setLocalLLMAvailable(false); // ローカル LLM が利用できない場合

// Local Kokūzō Kernel
const kokuzoKernel = new LocalKokuzoKernel();
kokuzoKernel.setOfflineMode(true);
```

### オフライン時のチャット

```typescript
// オフライン推論を実行
const result = await reasoningEngine.executeOfflineReasoning({
  message: "こんにちは",
  context: {
    recentSeeds: await kokuzoKernel.getAllSeeds(10),
    localMemory: await kokuzoKernel.getAllSemanticUnits(10),
  },
});
```

### オンライン復帰時の同期

```typescript
import { SyncDiffController } from "./server/sync/offline/syncDiffController";

const syncController = new SyncDiffController(userId);
await syncController.onReconnect(); // 自動的に差分を送信
```

## 制限事項

- オフライン時は新しい Persona の作成や Law の変更はできません
- グローバルシードのマージと再クラスタリングはオフライン時は禁止されています
- ローカル LLM が利用できない場合は、テンプレートベースの応答になります

## トラブルシューティング

### オフラインデバッグパネル

Founder ダッシュボードの「Offline Debug Panel」で以下を確認できます:

- 接続ステータス
- ローカルストレージの状態
- 同期キュー
- 内部反省ログ

## 関連ファイル

- `server/persona/offline/personaStateManager.ts`
- `server/reasoning/offline/offlineReasoningEngine.ts`
- `server/kokuzo/offline/localKokuzoKernel.ts`
- `server/memory/offline/localQuantumCache.ts`
- `server/sync/offline/syncDiffController.ts`
- `server/kokuzo/offline/dualStructure.ts`
- `server/routers/offlineSyncRouter.ts`
- `client/src/components/offline/OfflineBanner.tsx`
- `client/src/dashboard/offline/OfflineDebugPanel.tsx`

