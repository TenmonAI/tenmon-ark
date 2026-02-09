# PWA Staging Build Guide (/stg/ サブディレクトリ対応)

## 概要

Expo Router を `/stg/` サブディレクトリで動かすための設定とビルド手順。

## 設定ファイル

### app.json

`app.json` に以下の設定を追加：

```json
{
  "expo": {
    "name": "tenmon-ark-app",
    "slug": "tenmon-ark-app",
    "version": "1.0.0",
    "scheme": "tenmon-ark",
    "web": {
      "bundler": "metro",
      "output": "static"
    },
    "experiments": {
      "typedRoutes": true,
      "baseUrl": "/stg"
    },
    "plugins": ["expo-router"]
  }
}
```

### 重要な設定項目

- **`web.output: "static"`**: 静的出力を明示的に指定（白画面防止の核心）
- **`experiments.baseUrl: "/stg"`**: Expo Router のベースパスを `/stg` に設定
- **`web.bundler: "metro"`**: Metro bundler を使用（Expo Router の標準）

## ビルド手順

### 1. 依存関係の確認

```bash
# Expo Router と関連パッケージがインストールされているか確認
npm list expo-router expo
```

### 2. 静的出力のビルド

```bash
# Web向けの静的ビルドを実行
npx expo export:web

# または
npx expo export --platform web
```

### 3. 出力先の確認

ビルド後、以下のディレクトリに静的ファイルが生成されます：

```
dist/
  ├── index.html
  ├── _expo/
  ├── assets/
  └── ...
```

### 4. サーバーへの配置

```bash
# ビルド成果物をサーバーにコピー
scp -r dist/* user@server:/var/www/tenmon-pwa-dist/

# または rsync を使用
rsync -avz dist/ user@server:/var/www/tenmon-pwa-dist/
```

## 検証手順

### 1. ローカルでの検証

```bash
# ローカルサーバーで確認（/stg/ パスでアクセス）
npx serve dist -s -l 3001

# ブラウザで http://localhost:3001/stg/ にアクセス
```

### 2. 本番環境での検証

1. `https://tenmon-ark.com/stg/` にアクセス
2. 白画面が表示されないことを確認
3. ルーティングが正しく動作することを確認
4. Service Worker が正しく登録されることを確認

## トラブルシューティング

### 白画面が表示される

**原因**: `baseUrl` が正しく設定されていない、または静的出力が `/stg/` 前提になっていない

**対処**:
1. `app.json` の `experiments.baseUrl` が `/stg` になっているか確認
2. `web.output` が `"static"` になっているか確認
3. ビルドを再実行: `npx expo export:web --clear`

### アセットが読み込まれない

**原因**: アセットパスが `/stg/` を考慮していない

**対処**:
1. `app.json` の `baseUrl` 設定を確認
2. ビルド出力の `index.html` でアセットパスが `/stg/` で始まっているか確認

### ルーティングが動作しない

**原因**: Expo Router のベースパス設定が反映されていない

**対処**:
1. `app.json` の `experiments.baseUrl` を確認
2. Nginx の `try_files` 設定が `/stg/index.html` を指しているか確認
3. ブラウザのコンソールでエラーを確認

## 本番昇格時の注意

`/stg/` での検証が完了し、本番 `/` へ昇格する場合：

1. **`app.json` の `baseUrl` を削除または `/` に変更**:
   ```json
   {
     "expo": {
       "experiments": {
         "typedRoutes": true
         // baseUrl を削除（デフォルトは /）
       }
     }
   }
   ```

2. **ビルドを再実行**:
   ```bash
   npx expo export:web --clear
   ```

3. **本番ディレクトリへ配置**:
   ```bash
   scp -r dist/* user@server:/var/www/tenmon-ark-frontend/
   ```

## 参考

- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [Expo Web Configuration](https://docs.expo.dev/workflow/web/)
- [Static Export Guide](https://docs.expo.dev/router/static-rendering/)
