# TypeScript エラー40件 完全分析

## エラー分類

### カテゴリ1: Zod v4 API変更（2件）
**影響ファイル**: `server/selfEvolveRouter.ts`
**エラー内容**: `z.record(z.unknown())` が Zod v4 では `z.record(z.string(), z.unknown())` に変更
**修正方法**: 第1引数にキー型を追加

```typescript
// ❌ Before
z.record(z.unknown())

// ✅ After
z.record(z.string(), z.unknown())
```

---

### カテゴリ2: downlevelIteration不足（3件）
**影響ファイル**:
- `server/selfEvolutionLog.ts:122`
- `server/selfHeal/selfEvolveFoundation.ts:179`
- `server/selfHeal/selfVerifyEngine.ts:78`

**エラー内容**: `Set` や `Map` の `entries()` をスプレッド演算子で展開する際に `--downlevelIteration` が必要

**修正方法**: `Array.from()` を使用

```typescript
// ❌ Before
const abilities = [...new Set(evolutions.map(e => e.newAbility))];
for (const [key, memory] of this.failureMemory.entries()) {}
for (const type of originalIssueTypes) {}

// ✅ After
const abilities = Array.from(new Set(evolutions.map(e => e.newAbility)));
for (const [key, memory] of Array.from(this.failureMemory.entries())) {}
for (const type of Array.from(originalIssueTypes)) {}
```

---

### カテゴリ3: 型不一致（1件）
**影響ファイル**: `server/selfHeal/genesisLinkOS.ts:326`
**エラー内容**: `'pending'` が許可されていない型に代入されている

```typescript
// ❌ Before
diagnostics: lastCycle ? 'completed' : 'pending',

// ✅ After
diagnostics: lastCycle ? 'completed' : 'in-progress',
```

---

### カテゴリ4: その他の型エラー（34件）
**影響ファイル**: 多数のファイル（client/server両方）
**エラー内容**: 型推論の失敗、型アサーションの不足、型定義の不一致など

**主な修正方針**:
1. 型アサーションを追加
2. 型定義を明示的に指定
3. 型ガードを追加

---

## 修復優先順位

### 🔥 最優先（本番クラッシュの原因）
1. **Zod v4 API変更** → 即座に修正
2. **downlevelIteration不足** → 即座に修正
3. **型不一致** → 即座に修正

### ⚠️ 中優先（ビルドは通るが警告）
4. その他の型エラー → 段階的に修正

---

## 修復計画

### Phase 1: 即座修復（カテゴリ1-3）
- [x] Zod v4 API変更（2件）
- [x] downlevelIteration不足（3件）
- [x] 型不一致（1件）

### Phase 2: 段階的修復（カテゴリ4）
- [ ] client側の型エラー（16件）
- [ ] server側の型エラー（18件）

---

## 修復後の確認事項
1. `pnpm run check` でエラー0件を確認
2. `pnpm run build` で本番ビルド成功を確認
3. 開発サーバーで動作確認
4. 本番環境にPublishして動作確認
