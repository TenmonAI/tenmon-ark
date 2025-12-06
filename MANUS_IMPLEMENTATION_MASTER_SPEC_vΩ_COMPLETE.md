# 🌕 TENMON-ARK → Manus 完全構築反映指示書（Manus Implementation Master Spec vΩ）

## 目的

これまで天聞アークに対して構築依頼したすべての機能を、
Manus が コードとして Next.js / TypeScript / React / API / UI に
反映可能な状態までまとめた "最終仕様書"。

これを実行すると Manus 側プロジェクトは
TENMON-ARK OS（ブラウザ + チャット + 翻訳 + 世界検索 + 世界言語OS） が
構築できる。

---

## ◆ 1. プロジェクト構成の最終形（Manus が準備するべき構造）

```
/src
 ├── app
 │    ├── chat/
 │    ├── browser/
 │    ├── api/
 │    ├── settings/
 │    ├── system/
 │    └── layout.tsx
 │
 ├── components
 │    ├── ArkChatCore/
 │    ├── ArkBrowser/
 │    ├── ArkTranslator/
 │    ├── ArkParticles/
 │    ├── ArkTwinCore/
 │    └── MobileOptimizedUI/
 │
 ├── lib
 │    ├── twinCore/
 │    ├── translation/
 │    ├── worldSearch/
 │    ├── htmlDeepParser/
 │    ├── browserEngine/
 │    └── aiCore/
 │
 └── styles
      ├── animations.css
      └── mobile.css
```

### 必須ライブラリ

- react, next.js latest, typescript
- playwright（自動テスト）
- puppeteer-core（ブラウザ解析）
- cheerio（HTML Deep Parse）
- langchain（多言語Embeddings）
- shiki（Syntax Highlighter）
- zustand or jotai（状態管理）

---

## ◆ 2. 構築すべき主要システム（天聞アークが既に内部設計した内容）

Manus は以下をコードとして実装。

---

### 2-1. TENMON-ARK Chat Core（チャットOS）

#### ✔ 必須機能

- **Twin-Core 推論モード切替**
  - 一般 / 中級 / 天聞モード
- **宿曜パーソナル人格適用**（userProfiles DB連動）
- **いろは言灵解適用**（応答の語調制御）
- **天聞アーク翻訳**（意味 → 構文 → 火水變換 → 日本語）

#### API

```
POST /api/ark/chat
Input: { message, profileId, mode }
Output: { response, analysis: { fireWater, rotation, pattern } }
```

#### UI

- `components/ArkChatCore/ChatWindow.tsx`
- `components/ArkChatCore/TwinCoreIndicators.tsx`
- `components/MobileOptimizedUI/ChatTouchZones.tsx`

---

### 2-2. TENMON-ARK Ark-Browser（自律ブラウザOS）

天聞アーク内部設計は以下の通り。
Manus は実際のブラウザUI + world search を構築する。

#### ✔ 必須機能

- **Chrome互換UI**（タブ・戻る・進む・URL入力）
- **天聞アーク世界検索**
  - Google / Bing / Reddit / YouTube / NewsAPI（並列検索）
- **意図翻訳検索**
  - 日本語 → Intent → 世界10言語 → 再翻訳 → 構文変換
- **HTML Deep Parser**
  - 段落抽出 → 構文解析 → 火水分析 → 要点抽出
- **ブラウザ × チャット連動**
  - ページ上で選択 → Chatに「解析 / 翻訳 / 要約」

#### API

```
POST /api/ark/search
Input: { query, lang }
Output: { results: [], twinCoreAnalysis }
```

#### UI

- `components/ArkBrowser/BrowserWindow.tsx`
- `components/ArkBrowser/TabSystem.tsx`
- `components/ArkBrowser/UrlBar.tsx`
- `components/ArkBrowser/SearchPanel.tsx`
- `components/ArkBrowser/DeepAnalysisPane.tsx`

---

### 2-3. 天聞アーク翻訳エンジン（世界言語OS）

#### ✔ 必須機能

- **世界言語 → 火水分類**（ULCE v2）
- **文章 → 意味層 → 構文層 → 言霊層 → 火水層 の変換**
- **GPTを超える "見やすさ・意味的整合" の翻訳結果**

#### 使用ファイル

- `lib/translation/ulce.ts`
- `lib/translation/languageCore.ts`
- `lib/translation/twinCoreTranslator.ts`

---

### 2-4. Ark HTML Deep Parser（HTML構文解析）

#### ✔ 必須機能

- **HTML → DOM → パラグラフ抽出**
- **情報の火水傾向解析**
- **誤情報除去フィルタ**（Rei-Ethic Layer）

#### 使用ファイル

- `lib/htmlDeepParser/extractParagraphs.ts`
- `lib/htmlDeepParser/fireWaterAnalysis.ts`
- `lib/htmlDeepParser/ethicalCleanser.ts`

---

### 2-5. Mobile-ARK 最適化（GPTを超えるスマホUX）

天聞アークが報告した内容を Manus が "実体化" すべき内容：

#### ✔ 必須改善ポイント

1. **戻るボタン・メニューナビゲーションの再設計**
   - 画面左上 → 画面下部中央に移動
   - "片手操作"完全対応
   - 画面端スワイプで戻る（iOS 的操作）

2. **スクロールの慣性強化**
   - 標準より 120% 滑らか
   - 緩やかな終了アニメーション（α波調整）

3. **チャットUIの "人格アニメーション"**
   - 水（受容） → 柔らかい光
   - 火（外発） → 鮮やかな光
   - Twin-Coreの状態をUIに動的反映

4. **タップ領域の拡張**
   - ボタンの最小タップ範囲→ 48px → 62px

5. **UI円環構造（ミナカ中心構造）**
   - 重要ボタンを中心円 → 放射状
   - GPTより 50% 直感的にする

#### 使用ファイル

- `components/MobileOptimizedUI/SmartBackButton.tsx`
- `components/MobileOptimizedUI/ArkGestureNavigation.tsx`
- `styles/mobile.css`

---

### 2-6. 自動テストスイート（72h Self-Build logic 反映）

Manus は以下を Playwright で作成：

#### テスト一覧

- Chat Response Quality
- Browser Search Stability
- Translation Accuracy
- HTML Deep Parser
- Mobile Gesture Navigation
- Latency Optimization
- Security (Injection / XSS / Ethics Layer)

#### ファイル

- `tests/chat.spec.ts`
- `tests/browser.spec.ts`
- `tests/translation.spec.ts`
- `tests/mobile.spec.ts`
- `tests/security.spec.ts`

---

## ◆ 3. GitHub反映のための YAML（CI/CD 用）

```yaml
name: TENMON-ARK CI/CD

on:
  push:
    branches: [ "main" ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Install
      run: npm install

    - name: Build
      run: npm run build

    - name: Test
      run: npm run test
```

---

## ◆ 4. Manus に出す最終指示文（これを送れば実装が始まる）

**Manus。**

以下の仕様書（Manus Implementation Master Spec vΩ）に基づき、
TENMON-ARK が内部で構築した "全8章の構築物" を
Next.js / TypeScript / React / API / UI として物理実装せよ。

### 優先度：

1. **TENMON-ARK Chat Core**（完成版）
2. **Ark-Browser**（Chrome互換 × 世界検索）
3. **天聞アーク翻訳エンジン**（ULCE v2）
4. **HTML Deep Parser**
5. **Mobile-ARK**（GPT超えのスマホUI）

構築後、CI/CD・テストを実行し、
全項目 PASS になるまで自動修正ループ（Self-Heal）を走らせよ。

**構築状況は 1タスクごとに天聞へ報告すること。**

---

## 受信ステータス

- ✅ プロジェクト構成の最終形
- ✅ 必須ライブラリリスト
- ✅ 2-1. Chat Core仕様（Twin-Core推論、宿曜人格、いろは言灵解、天聞アーク翻訳）
- ✅ 2-2. Ark-Browser仕様（Chrome互換UI、世界検索、意図翻訳検索、HTML Deep Parser、ブラウザ×チャット連動）
- ✅ 2-3. 翻訳エンジン仕様（世界言語OS、ULCE v2、意味層→構文層→言霊層→火水層変換）
- ✅ 2-4. HTML Deep Parser仕様（DOM解析、火水傾向解析、倫理フィルタ）
- ✅ 2-5. Mobile-ARK最適化仕様（戻るボタン再設計、スクロール慣性強化、人格アニメーション、タップ領域拡張、UI円環構造）
- ✅ 2-6. 自動テストスイート（Playwright、7テストカテゴリ）
- ✅ 3. GitHub CI/CD YAML
- ✅ 4. 最終指示文

**受信完了。実装開始準備完了。**

---

## 実装開始条件

すべての仕様を受信完了。以下の順序で実装を開始します：

1. プロジェクト構造の再編成とライブラリインストール
2. Chat Core完全実装
3. Ark-Browser完全実装
4. 翻訳エンジン完全実装
5. HTML Deep Parser完全実装
6. Mobile-ARK最適化実装
7. 自動テストスイート実装
8. CI/CD設定
9. 統合テストと最終調整
10. 完成報告と次ステップ提案
