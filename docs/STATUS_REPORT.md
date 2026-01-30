# TENMON-ARK プロジェクト現状レポート

**作成日**: 2025-01-04  
**対象環境**: VPS `/opt/tenmon-ark`  
**目的**: 現在稼働中の構成と、Web UI改修の現状を棚卸し

---

## 1. 現在稼働中の構成（事実）

### ブラウザ表示
- URL: https://tenmon-ark.com
- UI: カードUI
  - 「TENMON-ARK / Session: 778695 | Tai-Freeze: Active」
  - 「天聞アークと対話を開始してください」
  - 入力欄「問いかけを入力...」と「送信」ボタン

### サーバー側
- `/opt/tenmon-ark` に `assets/` と `index.html` (399 bytes) が存在
- Viteの `dist/` 出力のように見える

### 既に実行済み
- ✅ `pnpm --filter tenmon-ark-web add -D @tailwindcss/vite tailwindcss postcss autoprefixer`
- ✅ `pnpm --filter tenmon-ark-web add -D vite @vitejs/plugin-react`
- ✅ `pnpm v10.4.1` が利用可能

---

## 2. リポジトリ構造（調査コマンド）

### VPS上で実行すべき調査コマンド

```bash
# 1. ソースコードルートの特定
cd /opt/tenmon-ark
find . -name "pnpm-workspace.yaml" -o -name "package.json" | head -10

# 2. ワークスペース構成の確認
cat pnpm-workspace.yaml 2>/dev/null || echo "pnpm-workspace.yaml not found"
cat package.json | grep -A 5 "workspaces"

# 3. tenmon-ark-web パッケージの実体パス確認
find . -name "package.json" -exec grep -l "tenmon-ark-web" {} \; | head -5

# 4. ディレクトリ構造の確認
tree -L 3 -I 'node_modules|dist' 2>/dev/null || find . -type d -maxdepth 3 -not -path '*/node_modules/*' -not -path '*/dist/*' | head -20
```

### 想定される構造（ローカルリポジトリから推測）

```
/opt/tenmon-ark/
├── package.json (ルート)
├── pnpm-workspace.yaml (存在する場合)
├── web/ (tenmon-ark-web パッケージ)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.*
│   ├── postcss.config.*
│   ├── src/
│   └── dist/ (ビルド出力)
└── ... (その他のパッケージ)
```

---

## 3. Web（tenmon-ark-web）の状態（調査コマンド）

### パッケージ情報の確認

```bash
# tenmon-ark-web パッケージの場所を特定
cd /opt/tenmon-ark
WEB_DIR=$(find . -name "package.json" -exec grep -l "tenmon-ark-web" {} \; | head -1 | xargs dirname)
echo "Web package directory: $WEB_DIR"
cd "$WEB_DIR"

# package.json の確認
cat package.json

# Tailwind関連の依存関係確認
cat package.json | grep -A 30 "devDependencies" | grep -E "(tailwind|postcss|autoprefixer)"

# インストール済みパッケージの確認
pnpm list | grep -E "(tailwind|postcss|autoprefixer|vite)"
```

### 想定される package.json（ローカルリポジトリから）

```json
{
  "name": "tenmon-ark-web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.3",
    "@vitejs/plugin-react": "^5.0.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^4.1.14",
    "vite": "^7.1.7"
  }
}
```

---

## 4. Tailwind導入の達成状況（チェックリスト）

### VPS上で実行すべき確認コマンド

```bash
cd /opt/tenmon-ark
WEB_DIR=$(find . -name "package.json" -exec grep -l "tenmon-ark-web" {} \; | head -1 | xargs dirname)
cd "$WEB_DIR"

echo "=== 1. tailwind.config.* の有無 ==="
ls -la tailwind.config.* 2>/dev/null || echo "❌ tailwind.config.* not found"

echo "=== 2. postcss.config.* の有無 ==="
ls -la postcss.config.* 2>/dev/null || echo "❌ postcss.config.* not found"

echo "=== 3. vite.config.ts の確認 ==="
cat vite.config.ts 2>/dev/null | grep -E "(tailwindcss|@tailwindcss/vite)" || echo "❌ Tailwind plugin not found in vite.config.ts"

echo "=== 4. src/index.css の確認 ==="
cat src/index.css 2>/dev/null | grep -E "(@import.*tailwind|@tailwind)" || echo "❌ Tailwind directives not found"

echo "=== 5. node_modules の確認 ==="
ls -d node_modules/@tailwindcss 2>/dev/null || echo "❌ @tailwindcss not installed"
ls -d node_modules/tailwindcss 2>/dev/null || echo "❌ tailwindcss not installed"
```

### チェックリスト

- [ ] **tailwind.config.* が存在する**
  - 必要: `tailwind.config.js` または `tailwind.config.ts`
  - Tailwind v4の場合: 設定ファイルは不要（オプション）

- [ ] **postcss.config.* が存在する（v3の場合）**
  - Tailwind v4の場合: PostCSS設定は不要（@tailwindcss/viteプラグインが処理）

- [ ] **vite.config.ts に @tailwindcss/vite プラグインが設定されている**
  ```typescript
  import tailwindcss from "@tailwindcss/vite";
  plugins: [react(), tailwindcss()]
  ```

- [ ] **src/index.css に Tailwindディレクティブが含まれている**
  - Tailwind v4: `@import "tailwindcss";`
  - Tailwind v3: `@tailwind base; @tailwind components; @tailwind utilities;`

- [ ] **node_modules に必要なパッケージがインストールされている**
  - `@tailwindcss/vite` (v4)
  - または `tailwindcss`, `postcss`, `autoprefixer` (v3)

---

## 5. 推測される問題点（推測と根拠）

### 問題候補1: Tailwind CSS v4 と v3 の混在

**根拠**: 
- `@tailwindcss/vite` がインストールされている（v4のプラグイン）
- しかし、`tailwindcss`, `postcss`, `autoprefixer` もインストールされている（v3の構成）

**検証コマンド**:
```bash
cd /opt/tenmon-ark
WEB_DIR=$(find . -name "package.json" -exec grep -l "tenmon-ark-web" {} \; | head -1 | xargs dirname)
cd "$WEB_DIR"
cat package.json | grep -E "(tailwindcss|@tailwindcss)" | head -5
```

**解決策**: v4を使用する場合は、v3のパッケージを削除し、vite.config.tsで@tailwindcss/viteプラグインを使用

### 問題候補2: ビルド成果物が古い

**根拠**: 
- `/opt/tenmon-ark` の `index.html` が399 bytes（古い可能性）
- 新しくビルドした場合は、サイズが変わる可能性がある

**検証コマンド**:
```bash
# ビルド実行
cd /opt/tenmon-ark
WEB_DIR=$(find . -name "package.json" -exec grep -l "tenmon-ark-web" {} \; | head -1 | xargs dirname)
cd "$WEB_DIR"
pnpm build

# ビルド後のindex.htmlサイズ確認
ls -lh dist/index.html
cat dist/index.html | wc -c

# 現在配信中のindex.htmlと比較
ls -lh /opt/tenmon-ark/index.html
cat /opt/tenmon-ark/index.html | wc -c
```

**解決策**: 新しいビルド成果物を配信ディレクトリにコピー

### 問題候補3: Nginxのキャッシュ

**根拠**: 
- ブラウザで表示が変わらない
- ビルドは成功している可能性がある

**検証コマンド**:
```bash
# Nginx設定の確認（権限があれば）
sudo cat /etc/nginx/sites-enabled/tenmon-ark 2>/dev/null | grep -A 5 "location.*\.html"
sudo cat /etc/nginx/sites-enabled/tenmon-ark 2>/dev/null | grep -i cache
```

**解決策**: Nginx設定でindex.htmlのキャッシュを無効化（`Cache-Control: no-store`）

### 問題候補4: ビルド成果物の配置先が間違っている

**根拠**: 
- `/opt/tenmon-ark` に直接 `assets/` と `index.html` がある
- 通常、Viteの `dist/` ディレクトリが配信される

**検証コマンド**:
```bash
# Nginx設定でdocrootを確認（権限があれば）
sudo cat /etc/nginx/sites-enabled/tenmon-ark 2>/dev/null | grep -E "(root|alias)" | head -3

# 実際のディレクトリ構造確認
ls -la /opt/tenmon-ark/ | head -20
```

**解決策**: Nginxのdocrootを正しいディレクトリ（例: `/opt/tenmon-ark/web/dist`）に設定

### 問題候補5: vite.config.ts の base パスの不一致

**根拠**: 
- サブディレクトリに配置されている場合、baseパスの設定が必要

**検証コマンド**:
```bash
cd /opt/tenmon-ark
WEB_DIR=$(find . -name "package.json" -exec grep -l "tenmon-ark-web" {} \; | head -1 | xargs dirname)
cd "$WEB_DIR"
cat vite.config.ts | grep -E "(base|publicPath)"
```

**解決策**: vite.config.tsの`base`を正しく設定（ルートの場合は`base: "/"`）

---

## 6. 次のアクション（最短で反映させる手順）

### STEP 1: 現状確認（VPS上で実行）

```bash
# 1. ワークスペースルートの確認
cd /opt/tenmon-ark
pwd
ls -la | head -20

# 2. tenmon-ark-webパッケージの場所確認
WEB_DIR=$(find . -name "package.json" -exec grep -l '"name".*"tenmon-ark-web"' {} \; | head -1 | xargs dirname)
echo "Web package directory: $WEB_DIR"
cd "$WEB_DIR"

# 3. 現在の構成確認
echo "=== Package.json ==="
cat package.json

echo "=== Vite config ==="
cat vite.config.ts 2>/dev/null || echo "vite.config.ts not found"

echo "=== CSS file ==="
cat src/index.css 2>/dev/null | head -10
```

### STEP 2: Tailwind v4 の完全導入（推奨）

```bash
cd "$WEB_DIR"

# v3のパッケージを削除（v4を使用する場合）
pnpm remove tailwindcss postcss autoprefixer

# v4のプラグインのみを保持
pnpm list | grep -E "(tailwind|postcss)"

# vite.config.ts の確認・修正
cat > vite.config.ts << 'EOF'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true
      }
    }
  }
});
EOF

# src/index.css の確認・修正
cat > src/index.css << 'EOF'
@import "tailwindcss";

html, body, #root {
  height: 100%;
  margin: 0;
  padding: 0;
}
EOF

# ビルド実行
pnpm build

# ビルド結果確認
ls -lh dist/
ls -lh dist/index.html
```

### STEP 3: ビルド成果物の配置

```bash
cd "$WEB_DIR"

# 現在の配信ディレクトリを確認（Nginx設定から推測）
# 例: /opt/tenmon-ark または /var/www/tenmon-ark.com

# バックアップ（安全のため）
sudo cp -r /opt/tenmon-ark /opt/tenmon-ark.backup.$(date +%Y%m%d_%H%M%S)

# ビルド成果物を配置
sudo rsync -av --delete dist/ /opt/tenmon-ark/

# または、Nginx設定で指定されているdocrootに配置
# sudo rsync -av --delete dist/ /var/www/tenmon-ark.com/
```

### STEP 4: Nginxキャッシュ対策（必要に応じて）

```bash
# Nginx設定ファイルの確認
sudo cat /etc/nginx/sites-enabled/tenmon-ark | grep -A 10 "server.*443"

# index.htmlのキャッシュ無効化設定を追加
# 以下の設定を server { ... listen 443 ... } ブロック内に追加:
#
# location = /index.html {
#     add_header Cache-Control "no-store" always;
#     try_files $uri =404;
# }
#
# location /assets/ {
#     add_header Cache-Control "public, max-age=31536000, immutable" always;
#     try_files $uri =404;
# }

# Nginx設定の構文チェック
sudo nginx -t

# Nginxリロード
sudo systemctl reload nginx
```

### STEP 5: 動作確認

```bash
# ブラウザで確認
# 1. シークレットウィンドウで https://tenmon-ark.com を開く
# 2. 開発者ツール（F12）→ Networkタブ
# 3. 強制リロード（Cmd+Shift+R / Ctrl+Shift+R）
# 4. index.html のレスポンスヘッダーを確認
#    - Cache-Control: no-store が設定されているか確認
```

---

## 7. 変更リスク

### Lockfile更新
- `pnpm-lock.yaml` が更新される可能性
- チームで共有している場合は、変更をコミットする必要がある

### キャッシュ関連
- **ブラウザキャッシュ**: シークレットウィンドウまたは強制リロードで回避
- **Nginxキャッシュ**: `Cache-Control: no-store` 設定で回避
- **Viteビルドキャッシュ**: `dist/` ディレクトリをクリーンビルド（`emptyOutDir: true`）

### ビルド成果物の互換性
- 既存のHTML/CSS/JSと互換性がなくなる可能性
- バックアップを取ってから配置すること

### パッケージバージョン
- Tailwind v4 と v3 の混在を避ける
- 既存のコンポーネントがv3のTailwindクラスを使用している場合、互換性確認が必要

---

## 8. 推奨アプローチ

### オプションA: Tailwind v4 を使用（推奨）

**理由**: 
- 最新バージョン
- Viteプラグインでシンプルに導入可能
- PostCSS設定が不要

**手順**:
1. v3パッケージを削除
2. @tailwindcss/vite プラグインを使用
3. CSSに `@import "tailwindcss";` を追加
4. ビルド＆デプロイ

### オプションB: Tailwind v3 を使用（既存コードとの互換性重視）

**理由**: 
- 既存のTailwindクラスとの互換性
- 安定性

**手順**:
1. @tailwindcss/vite を削除
2. tailwindcss, postcss, autoprefixer をインストール
3. tailwind.config.js と postcss.config.js を作成
4. CSSに `@tailwind base; @tailwind components; @tailwind utilities;` を追加
5. ビルド＆デプロイ

---

## 9. トラブルシューティング

### ビルドエラーが出る場合

```bash
# クリーンインストール
cd "$WEB_DIR"
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

### ブラウザでTailwindが効かない場合

```bash
# 1. ビルド結果のCSSを確認
cat dist/assets/*.css | head -50

# 2. Tailwindクラスが含まれているか確認
cat dist/assets/*.css | grep -E "(\.bg-gray|\.text-gray)" | head -5

# 3. HTMLにCSSが正しく読み込まれているか確認
cat dist/index.html | grep -E "(\.css|link.*stylesheet)"
```

### 404エラーが出る場合

```bash
# Nginx設定でdocrootを確認
sudo cat /etc/nginx/sites-enabled/tenmon-ark | grep -E "(root|alias)"

# 実際のファイル配置を確認
ls -la /opt/tenmon-ark/index.html
ls -la /opt/tenmon-ark/assets/ 2>/dev/null | head -10
```

---

## 10. 次のステップ（優先順位順）

1. **現状確認**: VPS上で調査コマンドを実行し、実際の構成を確認
2. **Tailwind導入状況の確認**: チェックリストに基づいて確認
3. **ビルド実行**: 新しい構成でビルドを実行
4. **デプロイ**: ビルド成果物を配信ディレクトリに配置
5. **Nginx設定**: キャッシュ対策を実施（必要に応じて）
6. **動作確認**: ブラウザで表示を確認

---

**注意**: このレポートはローカルリポジトリの情報を基に作成しています。VPS上で実際に調査コマンドを実行し、結果を反映させてください。

