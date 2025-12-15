# TENMON-ARK オフラインポリシー ドキュメント

## 概要

TENMON-ARK のオフラインモードでは、厳格なポリシーが適用されます。これにより、オフライン時の一貫性と整合性が保証されます。

## オフラインポリシー

### 1. 新しい Persona の作成

**オフライン時**: ❌ 禁止

オフライン時は新しい Persona の作成はできません。これは、Persona の整合性を保つためです。

### 2. グローバル Law の変更

**オフライン時**: ❌ 禁止

オフライン時はグローバル Law の変更はできません。これは、Law の一貫性を保つためです。

### 3. ミューテーション

**オフライン時**: ✅ 制限付きで許可

オフライン時は以下のミューテーションのみ許可されます:

- **innerReflectionLog**: 内部反省ログへの記録

その他のミューテーション（新しい SemanticUnit の作成、Seed の生成など）は、オフライン時は記録のみ行い、オンライン復帰時に同期されます。

## ポリシーステート

```typescript
interface OfflinePolicyState {
  isOffline: boolean;
  allowNewPersonaCreation: boolean;
  allowGlobalLawChanges: boolean;
  allowMutations: boolean;
  allowedMutationTypes: string[];
}
```

### オンライン時

```typescript
{
  isOffline: false,
  allowNewPersonaCreation: true,
  allowGlobalLawChanges: true,
  allowMutations: true,
  allowedMutationTypes: ["all"]
}
```

### オフライン時

```typescript
{
  isOffline: true,
  allowNewPersonaCreation: false,
  allowGlobalLawChanges: false,
  allowMutations: true,
  allowedMutationTypes: ["innerReflectionLog"]
}
```

## 使用方法

### ポリシーの適用

```typescript
import { OfflinePolicyEnforcement } from "./server/policy/offlinePolicyEnforcement";

const policy = new OfflinePolicyEnforcement();
policy.setOfflineMode(true);

// 新しい Persona の作成を試みる
try {
  policy.enforcePolicy("createPersona");
  // これは例外をスローします
} catch (error) {
  console.error(error.message); // "Cannot create new persona in offline mode"
}
```

### ポリシーステートの取得

```typescript
const state = policy.getPolicyState();
console.log(state.allowNewPersonaCreation); // false (オフライン時)
```

## ダッシュボード表示

Founder ダッシュボードの「Offline Policy Panel」で、現在のポリシーステートを確認できます:

- 接続ステータス（Online/Offline）
- 各ポリシールールの状態（許可/禁止）
- 許可されたミューテーションタイプ

## 関連ファイル

- `server/policy/offlinePolicyEnforcement.ts`
- `client/src/dashboard/offline/OfflinePolicyPanel.tsx`

