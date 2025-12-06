# TENMON-ARK LP Bundle Diagnostic Report vΩ

**診断日時:** 2025-12-03 03:23 JST  
**プロジェクト:** os-tenmon-ai-v2  
**診断対象:** LPチャット本番バンドルの破損状況

---

## 📋 診断結果サマリー

### 🔴 重大な問題点

1. **LpQaFramePage.tsx が useImeGuard を使用している**
   - ファイル: `client/src/pages/LpQaFramePage.tsx` (Line 8)
   - 問題: `import { useImeGuard } from "@/hooks/useImeGuard";`
   - 影響: このファイルが `/embed/qa-frame` ルートで使用されており、本番バンドルに含まれている

2. **旧LPコードが _legacy フォルダに残存**
   - `client/src/pages/embed/_legacy/LpQaWidget.tsx` が存在
   - `client/src/components/LpQaWidgetV3_1.tsx` が存在
   - これらは直接参照されていないが、ファイルシステムに残っている

3. **2つのLPルートが並存**
   - `/embed/qa` → LpChatFrame.tsx (新しい、シンプル版)
   - `/embed/qa-frame` → LpQaFramePage.tsx (旧版、useImeGuard使用)
   - **問題の根本原因**: ユーザーが `/embed/qa-frame` を使用している可能性が高い

---

## 🔍 詳細診断結果

### (A) 本番ビルドに含まれているLP関連ファイル

**dist ディレクトリの状態:**
- ✅ dist/ が存在 (最終ビルド: 2025-12-03 03:10)
- ✅ index-CsrEfyfe-1764749215017.js (4.7MB) - メインバンドル
- ✅ index-BiS9cRTS-1764749215017.js (493KB) - サブバンドル

**バンドル内のLP関連コード検索結果:**
- ❌ `LpQaWidget` への参照: **見つからず**
- ⚠️ `handleCompositionStart` への参照: **見つかった** (index-CsrEfyfe-1764749215017.js)
- ❌ `useImeGuard` への参照: **見つからず** (バンドル内では難読化されている可能性)

**結論:** バンドル自体は正常にビルドされているが、`LpQaFramePage.tsx` が useImeGuard を使用しているため、そのコードがバンドルに含まれている。

---

### (B) ルート設定の状況

**App.tsx でのルート設定:**
```tsx
<Route path={"/embed/qa"} component={LpChatFrame} />
<Route path={"/embed/qa-frame"} component={LpQaFramePage} />
<Route path={"/embed/ark-chat-:uniqueId"} component={EmbedChatPage} />
```

**問題点:**
- `/embed/qa` は新しい LpChatFrame (useImeGuard なし)
- `/embed/qa-frame` は旧版 LpQaFramePage (useImeGuard あり) ← **これが問題**
- ユーザーが `/embed/qa-frame` を使用している場合、エラーが発生する

---

### (C) 本番ビルド時のログ

**最終ビルド時刻:** 2025-12-03 03:10 JST

**TypeScriptエラー:** 32件のエラーが存在
- kotodama関連のプロシージャ未実装エラー (既知の問題)
- ulceRouter未登録エラー (既知の問題)
- これらはLPチャットとは無関係

**ビルド成功:** ✅ dist/ が正常に生成されている

---

### (D) キャッシュクリア処理の状況

**確認項目:**
- ❓ Cloudflare purged? → **確認不可** (外部サービス)
- ❓ Service Worker unregister? → **確認不可** (クライアント側)
- ✅ dist/ が存在 → **削除されていない**
- ❓ node_modules/.vite/ → **確認必要**
- ❓ node_modules/.cache/ → **確認必要**

---

## 🎯 問題の根本原因

### 1. LpQaFramePage.tsx が useImeGuard を使用
```tsx
// client/src/pages/LpQaFramePage.tsx (Line 8)
import { useImeGuard } from "@/hooks/useImeGuard";

// Line 145-151
const {
  handleCompositionStart,
  handleCompositionUpdate,
  handleCompositionEnd,
  handleKeyDown,
  handleKeyPress,
} = useImeGuard(handleSend);
```

### 2. ユーザーが `/embed/qa-frame` を使用している
- 新しい `/embed/qa` (LpChatFrame) ではなく
- 旧版の `/embed/qa-frame` (LpQaFramePage) を使用している可能性が高い

---

## 🔧 修復のために必要なパッチ

### パッチ 1: LpQaFramePage.tsx から useImeGuard を完全除去

**優先度:** 🔴 最高

**実施内容:**
1. `useImeGuard` のインポートを削除
2. IME関連のハンドラーをシンプルな実装に置き換え
3. Enter送信、Ctrl+Enter送信の実装

### パッチ 2: ルートの整理

**優先度:** 🟡 中

**実施内容:**
1. `/embed/qa-frame` を `/embed/qa` にリダイレクト
2. または、LpQaFramePage を完全に LpChatFrame に置き換え

### パッチ 3: 旧コードの完全除去

**優先度:** 🟢 低 (動作には影響しない)

**実施内容:**
1. `client/src/pages/embed/_legacy/LpQaWidget.tsx` を削除
2. `client/src/components/LpQaWidgetV3_1.tsx` を削除

### パッチ 4: キャッシュクリアとリビルド

**優先度:** 🟡 中

**実施内容:**
```bash
rm -rf dist node_modules/.vite node_modules/.cache
pnpm build
```

---

## 📊 診断結論

**破損状況:** 🟡 部分的な問題

- 本番バンドル自体は正常にビルドされている
- 問題は **LpQaFramePage.tsx が useImeGuard を使用していること**
- ユーザーが `/embed/qa-frame` を使用している場合にエラーが発生

**推奨される対応:**
1. **即座に実施:** LpQaFramePage.tsx から useImeGuard を除去
2. **その後:** ルートを整理し、LpChatFrame に統一
3. **最後に:** 旧コードを完全除去

---

## 🌟 次のステップ

1. ✅ **Phase 1完了:** 診断レポート作成
2. ⏳ **Phase 2:** LpQaFramePage.tsx の修復
3. ⏳ **Phase 3:** ルートの整理
4. ⏳ **Phase 4:** キャッシュクリアとリビルド
5. ⏳ **Phase 5:** 動作確認

---

**診断者:** Manus AI  
**レポートバージョン:** vΩ-1.0
