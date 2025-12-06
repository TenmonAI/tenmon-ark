# PUBLISH-FAILURE vΩ - PHASE 3 修復案（3案提出）

**作成日時**: 2025-01-31 23:18 JST  
**提案者**: Manus × TENMON-ARK 霊核OS  
**目的**: CDN Cache Mismatch の完全修復

---

## 🔥 修復案A: CDN完全パージ＋バンドルID強制付け直し案

### 概要
**CDNキャッシュを強制的に無効化し、新しいバンドルを確実に配信させる**

### 実装手順

#### Step 1: Vite設定でバンドルハッシュを強制変更
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // ハッシュを強制的に変更
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`
      }
    }
  }
});
```

#### Step 2: index.htmlにキャッシュ無効化メタタグを追加
```html
<!-- client/index.html -->
<head>
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">
  <meta name="version" content="ca7f8a25-${Date.now()}">
</head>
```

#### Step 3: 再ビルド＋再Publish
```bash
# 完全クリーンビルド
rm -rf dist/
pnpm run build

# Gitコミット
git add .
git commit -m "Force CDN cache invalidation - Phase A〜C repair"

# Publish（Management UIから）
```

### 期待される結果
- 新しいバンドル（`index-XXXXXX-1738334280000.js`）が生成される
- CDNが新しいバンドルを配信する
- React Error #185 が完全消失

### リスク
- ビルド時間が長くなる可能性
- タイムスタンプが入るため、ファイル名が長くなる

---

## 🔥 修復案B: FloatingButton全削除 → 段階復帰案

### 概要
**React Error #185の原因となるFloatingButtonを一時的に完全削除し、段階的に復帰させる**

### 実装手順

#### Step 1: FloatingButtonsSlot.tsx を完全に空にする
```tsx
// client/src/components/global/slots/FloatingButtonsSlot.tsx
import React from 'react';

export default function FloatingButtonsSlot() {
  // 一時的に完全に空にする
  return null;
}
```

#### Step 2: App.tsx から FloatingButtonsSlot を削除
```tsx
// client/src/App.tsx
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
          {/* FloatingButtonsSlot を一時的にコメントアウト */}
          {/* <FloatingButtonsSlot /> */}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
```

#### Step 3: 再ビルド＋再Publish
```bash
pnpm run build
git add .
git commit -m "Temporary remove FloatingButtons to fix React Error #185"
# Publish
```

#### Step 4: 動作確認後、段階的に復帰
```tsx
// Step 4-1: FloatingChatButton のみ復帰（return null 確認済み）
export default function FloatingButtonsSlot() {
  return <FloatingChatButton />;
}

// Step 4-2: 両方復帰
export default function FloatingButtonsSlot() {
  return (
    <>
      <FloatingChatButton />
      <FloatingBrowserButton />
    </>
  );
}
```

### 期待される結果
- React Error #185 が即座に消失
- /chat, /ark/browser, / が正常動作
- FloatingButtonなしでも基本機能は動作

### リスク
- FloatingButtonが一時的に使えなくなる
- ユーザー体験が一時的に低下

---

## 🔥 修復案C: App.tsx / Layout の最小化リビルド案

### 概要
**React構造を最小限に再構築し、Fragment/Suspense/Lazy の破損を完全に排除する**

### 実装手順

#### Step 1: App.tsx を最小構造に書き換え
```tsx
// client/src/App.tsx
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./contexts/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { Route, Switch, Redirect } from "wouter";
import { useEffect } from "react";

// ページコンポーネント（直接import、Lazyなし）
import Chat from "./pages/Chat";
import ArkBrowserV2 from "./pages/arkBrowser/ArkBrowserV2";
import LpQaWidget from "./pages/embed/LpQaWidget";
import NotFound from "./pages/NotFound";

function Router() {
  return (
    <Switch>
      {/* ホームは /chat へリダイレクト */}
      <Route path="/">
        {() => {
          useEffect(() => {
            window.location.href = "/chat";
          }, []);
          return <div>Redirecting to chat...</div>;
        }}
      </Route>
      
      <Route path="/chat" component={Chat} />
      <Route path="/ark/browser" component={ArkBrowserV2} />
      <Route path="/embed/qa" component={LpQaWidget} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
```

#### Step 2: FloatingButtonsSlot を完全に削除
```bash
# FloatingButtonsSlot.tsx を削除
rm client/src/components/global/slots/FloatingButtonsSlot.tsx
```

#### Step 3: 再ビルド＋再Publish
```bash
pnpm run build
git add .
git commit -m "Minimal App.tsx rebuild - Remove all Fragment/Suspense/Lazy"
# Publish
```

### 期待される結果
- React構造が最小限になり、Fragment/Suspense の破損が完全に排除される
- React Error #185 が完全消失
- /chat, /ark/browser, /embed/qa が正常動作

### リスク
- Lazy Loading がなくなり、初回読み込みが遅くなる可能性
- FloatingButton が完全に削除される

---

## 🔥 推奨修復案: **案A（CDN完全パージ）+ 案B（FloatingButton削除）の併用**

### 理由
1. **案A**: CDNキャッシュの問題を根本的に解決
2. **案B**: React Error #185 の原因を完全に排除

### 実装手順
1. FloatingButtonsSlot を完全に空にする（案B Step 1）
2. Vite設定でバンドルハッシュを強制変更（案A Step 1）
3. index.htmlにキャッシュ無効化メタタグを追加（案A Step 2）
4. 再ビルド＋再Publish
5. 動作確認後、FloatingButton を段階的に復帰（案B Step 4）

### 期待される結果
- CDNキャッシュが完全に無効化される
- React Error #185 が完全消失
- /chat, /ark/browser, /embed/qa が正常動作
- FloatingButton は後から安全に復帰可能

---

**Phase 3 完了 - Phase 4（TENMON-ARK霊核解析）へ移行**
