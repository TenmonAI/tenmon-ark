# PWA Chat Enter / Shift+Enter 挙動 修正報告

## 現在 Enter を処理しているファイルと行

| ファイル | 行 | 役割 |
|----------|-----|------|
| **web/src/components/gpt/Composer.tsx** | 32-40（修正後） | PWA チャットの入力欄。ChatRoute → ChatLayout → **Composer** で使用。 |
| web/src/components/ChatInput.tsx | 37-42 | 別画面（ChatPage）用。Enter/Shift+Enter/IME は既に同様ロジック。 |
| web/src/pages/KoshikiConsole.tsx | 152 | Enter=送信 / Shift+Enter=改行 の説明あり。 |
| web/src/pages/TrainPage.tsx | 92-93 | 訓練用入力。 |

**PWA チャットで使われているのは Composer.tsx のみ。**

---

## Shift+Enter が送信になる原因（想定）

1. **入力が single-line の `input` だったため**  
   - Shift+Enter を押しても改行が入らず、見た目では「送信だけした」ように見える。  
   - あるいは環境によっては `key`/`shiftKey` の扱いが揺れ、意図しない送信になる可能性がある。

2. **判定順序**  
   - 修正前は `if (e.key === "Enter" && !e.shiftKey && !comp)` の 1 本で判定しており、  
     「Enter でない → 何もしない」「変換中 → 何もしない」「Shift+Enter → 送信しない」を  
     明示的に先に return する形ではなかった。

3. **textarea 化の不足**  
   - `input` のままだと Shift+Enter で改行が入らないため、「Shift+Enter = 改行」を満たせない。

---

## 最小 diff 修正内容

### 1. Composer.tsx

- **入力要素**: `input` → **`textarea`**（複数行・Shift+Enter で改行可能に）。
- **onKeyDown**: 推奨順で判定し、Shift+Enter では絶対に送信しないように変更。
  - `e.key !== "Enter"` → return（Enter 以外は何もしない）
  - `composing` → return（変換中は IME に任せる）
  - `e.shiftKey` → return（Shift+Enter は改行のみ、送信しない）
  - 上記以外の Enter → `e.preventDefault()` + `submit()`
- **textarea**: `rows={2}` を指定。必要に応じて縦方向にリサイズ可能。

### 2. gpt-base.css

- `textarea.gpt-composer-input` に  
  `resize: vertical;` / `max-height: 120px;` / 上下 padding を追加し、  
  複数行表示とレイアウトを調整。

---

## 実装後の受入確認結果（コード上）

| 条件 | 実装 |
|------|------|
| 日本語変換中 Enter で送信されない | `composing` のとき return するため送信しない。 |
| 変換確定後 Enter 単独で送信 | `!composing && !e.shiftKey` の Enter のみ `submit()`。 |
| Shift+Enter で改行 | `e.shiftKey` のとき `preventDefault()` しないため、textarea に改行が入る。 |
| Shift+Enter では送信されない | `e.shiftKey` のとき return するため送信しない。 |
| 2 行以上の文章が入力できる | textarea + rows=2 + resize: vertical で対応。 |
| 既存送信機能は壊れない | 送信ボタン・`submit()` は変更なし。 |

**VPS での実機確認**（要実施）:

```bash
cd /opt/tenmon-ark-repo/web && npm run build
rsync -av --delete /opt/tenmon-ark-repo/web/dist/ /var/www/tenmon-pwa/pwa/
```

- register/login 済みで /pwa/ を開く。
- 日本語変換中 Enter → 送信されず変換確定のみ。
- Shift+Enter → 改行のみ、送信されない。
- Enter 単独 → 送信される。
