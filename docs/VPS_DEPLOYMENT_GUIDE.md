# VPSデプロイメントガイド

## ローカル環境での実装完了

以下のファイルがローカル環境（`/Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset/client`）で実装済みです：

### 実装済みファイル
- `tailwind.config.js` - Tailwind CSS設定
- `postcss.config.js` - PostCSS設定
- `src/index.css` - Tailwindディレクティブ追加
- `src/main.tsx` - CSSインポート追加
- `src/App.tsx` - 3カラム構成のメインレイアウト
- `src/components/Sidebar.tsx` - 左サイドバー
- `src/pages/Chat.tsx` - メインチャット画面

### インストール済みパッケージ
- `tailwindcss@^4.1.18`
- `postcss@^8.5.6`
- `autoprefixer@^10.4.23`

## VPSへの反映手順

### オプション1: ローカルでビルドしてVPSに転送

```bash
# ローカル環境でビルド
cd /Users/sarutahiko/Downloads/os-tenmon-ai-v2-reset/client
pnpm build

# VPSに転送（dist/ ディレクトリを転送）
rsync -av --delete dist/ user@vps:/var/www/tenmon-ark.com/
```

### オプション2: VPS上で直接作業

VPSにSSH接続して、`/opt/tenmon-ark/ui` で同じ作業を実行：

```bash
# VPSにSSH接続
ssh user@vps

# ディレクトリ移動
cd /opt/tenmon-ark/ui

# パッケージインストール
pnpm add -D tailwindcss postcss autoprefixer

# 設定ファイル作成（ローカルからコピーまたは手動作成）
# tailwind.config.js, postcss.config.js を配置

# ビルド
pnpm build

# デプロイ
rsync -av --delete dist/ /var/www/tenmon-ark.com/
```

## 確認事項

1. **Tailwind CSSが正しく動作するか**
   - ビルド時にエラーが出ないか確認
   - ブラウザでスタイルが適用されているか確認

2. **3カラムレイアウトが表示されるか**
   - 左サイドバーが表示されるか
   - メインチャット画面が表示されるか

3. **レスポンシブ対応**
   - モバイル表示での動作確認

## トラブルシューティング

### Tailwind CSSが適用されない場合

1. `tailwind.config.js` の `content` パスを確認
2. `postcss.config.js` が正しく設定されているか確認
3. ビルド時にTailwindが処理されているか確認（`pnpm build` のログを確認）

### ビルドエラーが発生する場合

1. パッケージのバージョン確認
2. `node_modules` を削除して再インストール
   ```bash
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```
