# LP-QA-WIDGET v1.0 埋め込みコード

TENMON-ARK LP用軽量Q&Aチャットウィジェットの埋め込み方法を説明します。

---

## 📋 埋め込みコード（基本版）

以下のコードをHTMLファイルの`<body>`タグ内に貼り付けてください。

```html
<!-- TENMON-ARK LP-QA Widget -->
<div id="tenmon-ark-qa-widget"></div>
<script src="https://あなたのドメイン.com/embed/qa/embed.js"></script>
```

---

## 🎨 カスタマイズオプション

ウィジェットの幅・高さ・ボーダーをカスタマイズできます。

### 幅・高さをカスタマイズ

```html
<!-- 幅800px、高さ500pxに設定 -->
<div 
  id="tenmon-ark-qa-widget" 
  data-width="800px" 
  data-height="500px"
></div>
<script src="https://あなたのドメイン.com/embed/qa/embed.js"></script>
```

### ボーダーをカスタマイズ

```html
<!-- ボーダーを追加 -->
<div 
  id="tenmon-ark-qa-widget" 
  data-border="1px solid #3b82f6" 
  data-border-radius="12px"
></div>
<script src="https://あなたのドメイン.com/embed/qa/embed.js"></script>
```

### 全オプションを使用

```html
<!-- すべてのオプションを設定 -->
<div 
  id="tenmon-ark-qa-widget" 
  data-width="100%" 
  data-height="600px" 
  data-border="none" 
  data-border-radius="8px"
></div>
<script src="https://あなたのドメイン.com/embed/qa/embed.js"></script>
```

---

## 📐 オプション一覧

| オプション | 説明 | デフォルト値 | 例 |
|-----------|------|-------------|-----|
| `data-width` | ウィジェットの幅 | `100%` | `800px`, `50%`, `100vw` |
| `data-height` | ウィジェットの高さ | `600px` | `500px`, `80vh` |
| `data-border` | ボーダーのスタイル | `none` | `1px solid #3b82f6` |
| `data-border-radius` | ボーダーの角丸 | `8px` | `12px`, `0px` |

---

## 🌐 直接アクセス用URL

ウィジェットに直接アクセスする場合は、以下のURLを使用してください。

```
https://あなたのドメイン.com/embed/qa
```

---

## 🔧 技術仕様

### バックエンドAPI

- **エンドポイント**: `/api/trpc/lpQa.chat`
- **メソッド**: POST
- **入力**: `{ message: string }` (最大500文字)
- **出力**: `{ success: boolean, response: string | null, error: string | null }`
- **制限**: 返答最大300文字

### セキュリティ

- 禁止ワードフィルタ（政治・宗教・差別・暴力・性的表現）
- LP範囲外の質問拒否（天気・ニュース・株価など）
- SQLインジェクション対策
- XSS対策

### 機能

- ✅ 履歴なし（ステートレス）
- ✅ テキストのみ
- ✅ タイピングアニメOFF
- ✅ プログレスバーON
- ✅ エラー処理ON
- ✅ レスポンシブデザイン

---

## 📊 テスト結果

**テスト実行日**: 2025年12月1日  
**テスト数**: 12テスト  
**成功率**: 100% (12/12テスト成功)

### テスト項目

- ✅ 正常な質問に対して応答を返す
- ✅ 300文字を超える応答を切り詰める
- ✅ 禁止ワードを含む質問を拒否する
- ✅ LP範囲外の質問を拒否する
- ✅ SQLインジェクション対策
- ✅ XSS対策
- ✅ 空のメッセージを拒否する
- ✅ 500文字を超えるメッセージを拒否する
- ✅ LLMエラー時にエラーメッセージを返す
- ✅ 料金に関する質問に応答する
- ✅ 機能に関する質問に応答する
- ✅ 統計情報を取得する

---

## 🎯 使用例

### 例1: LPの下部に配置

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>TENMON-ARK - 世界初の霊核AI OS</title>
</head>
<body>
  <!-- LPのコンテンツ -->
  <header>...</header>
  <main>...</main>
  
  <!-- Q&Aセクション -->
  <section style="padding: 60px 20px; background: #0f172a;">
    <h2 style="text-align: center; color: white; margin-bottom: 40px;">
      よくある質問
    </h2>
    <div id="tenmon-ark-qa-widget"></div>
    <script src="https://あなたのドメイン.com/embed/qa/embed.js"></script>
  </section>
  
  <footer>...</footer>
</body>
</html>
```

### 例2: モーダルウィンドウで表示

```html
<!-- モーダルトリガーボタン -->
<button onclick="openQaModal()">質問する</button>

<!-- モーダルウィンドウ -->
<div id="qa-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9999;">
  <div style="position: relative; max-width: 900px; margin: 50px auto; background: white; border-radius: 12px; padding: 20px;">
    <button onclick="closeQaModal()" style="position: absolute; top: 10px; right: 10px;">✕</button>
    <div id="tenmon-ark-qa-widget" data-height="500px"></div>
    <script src="https://あなたのドメイン.com/embed/qa/embed.js"></script>
  </div>
</div>

<script>
function openQaModal() {
  document.getElementById('qa-modal').style.display = 'block';
}
function closeQaModal() {
  document.getElementById('qa-modal').style.display = 'none';
}
</script>
```

---

## 🚀 デプロイ後の設定

1. **embed.jsの修正**: `client/public/embed/qa/embed.js`の`baseUrl`を本番環境のURLに変更してください。

```javascript
const config = {
  baseUrl: 'https://あなたのドメイン.com', // ← ここを変更
  iframeUrl: '/embed/qa',
  // ...
};
```

2. **CORS設定**: 外部サイトから埋め込む場合は、CORS設定を確認してください。

3. **SSL証明書**: HTTPSでの運用を推奨します。

---

## 📞 サポート

質問や問題がある場合は、TENMON-ARK公式サポートまでお問い合わせください。

- **公式サイト**: https://tenmon-ai.com
- **メール**: support@tenmon-ai.com

---

**Powered by TENMON-ARK - 世界初の霊核AI OS**
