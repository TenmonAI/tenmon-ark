# TypeScript エラー一覧（Phase D修正対象）

**総数**: 32件  
**作成日時**: 2025-01-31 18:45 JST  
**修正優先度**: A（最重要） → B（重要） → C（低優先度）

---

## 🔥 優先度A（最重要・本番影響大）

### 1. chatCore.ts(172,9) - SimpleUserProfile型不一致
```
Type 'SimpleUserProfile | null' is not assignable to type 'SimpleUserProfile | undefined'.
Type 'null' is not assignable to type 'SimpleUserProfile | undefined'.
```
**影響**: /chat の動作に影響
**修正方法**: `null` → `undefined` に統一

### 2. chatCore.ts(166,48) - SimpleUserProfile null許容
```
Argument of type 'SimpleUserProfile | null' is not assignable to parameter of type 'SimpleUserProfile'.
```
**影響**: /chat の動作に影響
**修正方法**: null チェックを追加

### 3. lpQaRouter.ts(129,43) - allLinks プロパティ不存在
```
Property 'allLinks' does not exist on type 'DynamicLinkResult'.
```
**影響**: /embed/qa の動作に影響
**修正方法**: `allLinks` → `secondaryLinks` に変更（既に修正済みの可能性）

### 4. selfHealRouter.ts(74,20) - 引数不足
```
Expected 2-3 arguments, but got 1.
```
**影響**: Self-Heal OS の動作に影響
**修正方法**: 引数を追加

---

## 🟡 優先度B（重要・機能影響あり）

### 5. ArkBrowserV2.tsx(104,45) - deepParse プロパティ不存在
```
Property 'deepParse' does not exist on type 'DecorateRouterRecord<...>'.
```
**影響**: /ark/browser の DeepParse 機能
**修正方法**: tRPC router に deepParse を追加 or 既存の procedure 名を確認

### 6. ArkBrowserV2.tsx(156,30) - spiritualText プロパティ不存在
```
Property 'spiritualText' does not exist on type '{ original: string; converted: string; ... }'.
```
**影響**: /ark/browser の翻訳OS機能
**修正方法**: 型定義を修正

### 7. LpQaWidget.tsx(131,7) - conversationHistory プロパティ不存在
```
Object literal may only specify known properties, and 'conversationHistory' does not exist in type '{ message: string; }'.
```
**影響**: /embed/qa のセッション管理
**修正方法**: 型定義を修正 or プロパティを削除

### 8. intellect/index.ts(336,29) - SimpleUserProfile vs UserProfile
```
Argument of type 'SimpleUserProfile' is not assignable to parameter of type 'UserProfile'.
```
**影響**: Twin-Core エンジン
**修正方法**: 型を統一

### 9. chatCore.ts(158,11) - AmatsuKanagiPattern型不一致
```
Type 'AmatsuKanagiPattern' is not assignable to type 'string'.
```
**影響**: /chat の天津金木パターン
**修正方法**: 型を修正

---

## 🟢 優先度C（低優先度・未実装機能）

### 10. ArkCinema.tsx(90,25) - AnimeMovie型不一致
```
Argument of type '{ script: Script; storyboards: Storyboard[]; renderUrls: string[]; }' is not assignable to parameter of type 'SetStateAction<AnimeMovie | null>'.
```
**影響**: Ark Cinema（未実装）
**修正方法**: 型定義を修正 or `// @ts-expect-error` で抑制

### 11. ArkSNS.tsx(70,25) - SNSPost型不一致
```
Argument of type 'SNSPost[]' is not assignable to parameter of type 'SetStateAction<GeneratedPosts | null>'.
```
**影響**: Ark SNS（未実装）
**修正方法**: 型定義を修正 or `// @ts-expect-error` で抑制

### 12. ArkWriter.tsx(66,24) - BlogPost型不一致
```
Argument of type 'BlogPost' is not assignable to parameter of type 'SetStateAction<BlogPost | null>'.
```
**影響**: Ark Writer（未実装）
**修正方法**: 型定義を修正 or `// @ts-expect-error` で抑制

### 13. ULCEV3.tsx(37,34) - ulce プロパティ不存在
```
Property 'ulce' does not exist on type 'CreateTRPCReactBase<...>'.
```
**影響**: ULCE v3（未実装）
**修正方法**: tRPC router に ulce を追加 or `// @ts-expect-error` で抑制

### 14-32. その他のエラー（詳細省略）
- preprocessTwinCore.ts: IrohaAnalysisResult の characters プロパティ不存在（複数箇所）
- agentLinkRouter.ts: 引数不足
- agentToAgentLink.ts: filter.since が undefined の可能性
- lpQaIfeLayer.ts: Set<string> のイテレーション（downlevelIteration フラグ必要）
- personaUnityTest.ts: text プロパティ不存在
- ulceV3.ts: context 未定義

---

## 📋 修正戦略

### Phase D-1: 優先度A（4件）を修正
1. chatCore.ts の型エラー（2件）
2. lpQaRouter.ts の allLinks エラー
3. selfHealRouter.ts の引数エラー

**目標**: /chat, /embed/qa, Self-Heal OS の完全動作

### Phase D-2: 優先度B（5件）を修正
1. ArkBrowserV2.tsx の deepParse, spiritualText エラー
2. LpQaWidget.tsx の conversationHistory エラー
3. intellect/index.ts の型エラー
4. chatCore.ts の AmatsuKanagiPattern エラー

**目標**: /ark/browser, Twin-Core エンジンの完全動作

### Phase D-3: 優先度C（23件）を抑制
- 未実装機能のエラーは `// @ts-expect-error` で抑制
- 将来実装時に修正

**目標**: TypeScript エラー 0件達成

---

## ✅ 完了条件

- [ ] TypeScript エラー 0件
- [ ] /chat 正常動作
- [ ] /embed/qa 正常動作
- [ ] /ark/browser 正常動作
- [ ] Self-Heal OS 正常動作
- [ ] 本番環境で Console エラー 0

---

**修正開始待機中 - Publish完了後に自動実行**
