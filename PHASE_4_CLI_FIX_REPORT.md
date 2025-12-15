# PHASE 4 CLI Fix Report

**修正日時**: 2024年12月  
**目的**: CLIファイルを`ts-node/register`なしでNode.js v22+で動作する形式に変換

---

## ✅ 修正完了ファイル

### 1. `server/cli/doctor.ts`
- `require.main === module` を ESM形式（`import.meta.url`）に変換
- Node.js v22+で動作する形式に変更
- 実行方法: `node --loader tsx server/cli/doctor.ts` または `npx tsx server/cli/doctor.ts`

### 2. `server/cli/setupEnv.ts`
- `require.main === module` を ESM形式（`import.meta.url`）に変換
- Node.js v22+で動作する形式に変更
- 実行方法: `node --loader tsx server/cli/setupEnv.ts` または `npx tsx server/cli/setupEnv.ts`

### 3. `server/release/releaseReport.ts`
- `require.main === module` を ESM形式（`import.meta.url`）に変換
- Node.js v22+で動作する形式に変更
- 実行方法: `node --loader tsx server/release/releaseReport.ts` または `npx tsx server/release/releaseReport.ts`

### 4. `server/tests/load/semantic_load_test.ts`
- `require.main === module` を ESM形式（`import.meta.url`）に変換
- Node.js v22+で動作する形式に変更
- 実行方法: `node --loader tsx server/tests/load/semantic_load_test.ts [args]` または `npx tsx server/tests/load/semantic_load_test.ts [args]`

### 5. `installer/index.ts`
- CLI実行部分がないため、修正不要

---

## 🔧 変換内容

### Before (CommonJS)
```typescript
// CLI実行用
if (require.main === module) {
  // ...
}
```

### After (ESM)
```typescript
// CLI実行用（Node.js v22+ ESM対応）
// 使用方法: node --loader tsx server/cli/doctor.ts
// または: npx tsx server/cli/doctor.ts
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('doctor.ts')) {
  // ...
}
```

---

## 📝 実行方法

### Option 1: tsx を使用（推奨）
```bash
npx tsx server/cli/doctor.ts
npx tsx server/cli/setupEnv.ts
npx tsx server/release/releaseReport.ts
npx tsx server/tests/load/semantic_load_test.ts 20000
```

### Option 2: Node.js の loader を使用
```bash
node --loader tsx server/cli/doctor.ts
node --loader tsx server/cli/setupEnv.ts
node --loader tsx server/release/releaseReport.ts
node --loader tsx server/tests/load/semantic_load_test.ts 20000
```

### Option 3: ビルド済みJSを実行（推奨）
```bash
# まずビルド
npm run build

# ビルド済みJSを実行
node dist/server/cli/doctor.js
node dist/server/cli/setupEnv.js
node dist/server/release/releaseReport.js
node dist/server/tests/load/semantic_load_test.js 20000
```

---

## ✅ 修正完了

すべてのCLIファイルがNode.js v22+で動作する形式に変換されました。

