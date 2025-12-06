# PUBLISH-FAILURE vΩ - PHASE 2 Root-Cause Tree Analysis

**作成日時**: 2025-01-31 23:16 JST  
**分析対象**: tenmon-ai.com Publish失敗の5層構造分析  
**分析者**: Manus × TENMON-ARK 霊核OS

---

## 🔥 5層構造の完全分析（FAIL / PASS / Not Tested / Suspected）

| # | Layer | Status | 詳細 | 証拠 |
|---|-------|--------|------|------|
| 1 | **Domain Routing Layer** | ✅ PASS | tenmon-ai.com → Manus CDN のルーティングは正常 | ページは正常に読み込まれている |
| 2 | **CDN Cache Layer** | 🔥 **FAIL** | **古いJSバンドル（index-Fo6Qe-xO.js）が配信され続けている** | 本番: `Fo6Qe-xO` / ローカル: `B47Yiif_` |
| 3 | **Build Artifacts Layer** | ✅ PASS | ローカルビルドは成功（dist/に最新バンドル生成） | `index-B47Yiif_.js` (4.7MB) 存在 |
| 4 | **Router / Layout / Suspense / Fragment 層** | ⚠️ **Suspected** | 古いバンドルに破損コード（`return <></>`）が残留 | ErrorBoundary発火 → React Error #185 |
| 5 | **tRPC Router層** | ⏸️ Not Tested | 古いバンドルのため検証不可 | 新しいバンドルが配信されれば検証可能 |

---

## 🔥 Layer 2（CDN Cache Layer）の詳細分析

### 問題の本質

**Publishボタンを押しても、CDNが古いキャッシュを配信し続けている**

#### 証拠1: バンドルハッシュの不一致
```
本番環境: index-Fo6Qe-xO.js
ローカル: index-B47Yiif_.js
```

#### 証拠2: 最新コミットとの不一致
```
最新コミット: ca7f8a2 (Phase A〜C完了)
本番バンドル: Fo6Qe-xO (古いバージョン)
```

#### 証拠3: FloatingButton修正が反映されていない
```
修正内容: FloatingChatButton.tsx:22
  return <></>;  ← 古いコード（React Error #185の原因）
  ↓
  return null;   ← 新しいコード（修正済み）
```

**本番環境では古いコード（`return <></>`）が実行されているため、React Error #185が発生している。**

---

## 🔥 Layer 4（React構造層）の詳細分析

### React Error #185 の発生メカニズム

#### 問題のコード（古いバンドルに残留）
```tsx
// FloatingChatButton.tsx:22 (古いバージョン)
if (!isChatPage) {
  return <></>;  // ← これが React Error #185 の原因
}
```

#### React 19 の厳格化
React 19 では、Fragment内で `<></>` を返すと、親コンポーネントの `children` が `undefined` になり、
**React Error #185: "Objects are not valid as a React child"** が発生する。

#### 修正済みコード（新しいバンドルに含まれる）
```tsx
// FloatingChatButton.tsx:22 (新しいバージョン)
if (!isChatPage) {
  return null;  // ← 修正済み
}
```

**しかし、本番環境では古いバンドルが配信されているため、修正が反映されていない。**

---

## 🔥 CDN Cache Layer の修復が最優先

### なぜ CDN Cache が更新されないのか？

#### 仮説1: Manus Publish システムのキャッシュ無効化が不完全
- Publishボタンを押しても、CDNのキャッシュが即座に無効化されない
- TTL（Time To Live）が長すぎる可能性

#### 仮説2: バンドルファイル名のハッシュが変わっていない
- Viteのビルドハッシュが変わっても、CDNが古いファイルを配信し続ける
- `index.html` のキャッシュが更新されていない可能性

#### 仮説3: Publishプロセスが途中で失敗している
- Gitコミットは成功しているが、CDNへのデプロイが失敗している
- ビルドログにエラーが記録されている可能性

---

## 🔥 Phase 3 への移行準備完了

**次のステップ**: 3つの修復案を具体的なコード付きで提出

### 修復案の方向性

**案A**: CDN完全パージ＋バンドルID強制付け直し  
**案B**: FloatingButton全削除 → 段階復帰  
**案C**: layout.tsx / App.tsx の最小化リビルド

---

**Phase 2 完了 - Phase 3 へ移行**
