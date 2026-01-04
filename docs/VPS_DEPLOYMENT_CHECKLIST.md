# VPSデプロイメント確認チェックリスト

## STEP 1: CursorでApp.tsxを保存

✅ **確認**: `client/src/App.tsx` が正しい内容か

```typescript
import Sidebar from "./components/Sidebar";
import Chat from "./pages/Chat";

export default function App() {
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Chat />
      </div>
    </div>
  );
}
```

⚠️ **禁止**: 赤画面（`bg-red-500`）のテストコードが残っていないか確認

## STEP 2: VPS上で確認

```bash
# VPSにSSH接続
ssh user@vps

# App.tsxの内容を確認（最初の200行）
sed -n '1,200p' /opt/tenmon-ark/ui/src/App.tsx
```

🔴 **赤（`bg-red-500`）が出たら即中断**
→ まだどこかで上書きしている証拠

## STEP 3: VPS上でビルドとデプロイ

```bash
cd /opt/tenmon-ark/ui
pnpm build
rsync -av --delete dist/ /var/www/tenmon-ark/dist/
```

## STEP 4: ブラウザで確認

### キャッシュをクリア

- **Mac**: `Cmd + Shift + R`（強制リロード）
- **Windows/Linux**: `Ctrl + Shift + R`
- **または**: シークレットウィンドウで開く

### 画面が変わらない場合の確認順序

この順番以外はない：

1. **App.tsx が本当に ChatGPT版か**
   ```bash
   cat /opt/tenmon-ark/ui/src/App.tsx
   ```
   - `bg-red-500` が含まれていないか確認
   - `Sidebar` と `Chat` を import しているか確認

2. **main.tsx で `<App />` を import しているか**
   ```bash
   cat /opt/tenmon-ark/ui/src/main.tsx
   ```
   - `import App from "./App";` が含まれているか確認
   - `<App />` が render されているか確認

3. **/var/www/tenmon-ark/dist/index.html が最新か**
   ```bash
   ls -la /var/www/tenmon-ark/dist/index.html
   cat /var/www/tenmon-ark/dist/index.html | head -20
   ```
   - ファイルの更新日時を確認
   - 最新のビルド結果が反映されているか確認

## 重要なポイント

> **技術ではなく「編集フロー」だけが問題だった**

- ✅ Tailwind: 正しく設定済み
- ✅ Vite: 正しく設定済み
- ✅ Node: 正しく設定済み
- ✅ nginx: 正しく設定済み
- ✅ キャッシュ: 対策済み

**止まっていたのは技術ではなく「編集フロー」だけ**

これは上級者が一番ハマる罠です。

## トラブルシューティング

### 問題1: 画面が赤いまま

**原因**: App.tsxにテスト用コードが残っている

**解決**:
```bash
# VPS上で確認
cat /opt/tenmon-ark/ui/src/App.tsx

# 赤画面コード（bg-red-500）が含まれていたら削除
# Cursorで正しい内容に上書き
```

### 問題2: 画面が白い/何も表示されない

**原因**: main.tsxでAppが正しくimportされていない

**解決**:
```bash
# VPS上で確認
cat /opt/tenmon-ark/ui/src/main.tsx

# 以下が含まれているか確認
# import App from "./App";
# <App />
```

### 問題3: ビルドは成功するが画面が変わらない

**原因**: index.htmlが古い、またはnginxのキャッシュ

**解決**:
```bash
# ビルド日時を確認
ls -la /var/www/tenmon-ark/dist/index.html

# 再ビルド
cd /opt/tenmon-ark/ui
pnpm build
rsync -av --delete dist/ /var/www/tenmon-ark/dist/

# ブラウザで強制リロード（Cmd+Shift+R）
```

## 確認コマンド一覧

```bash
# 1. App.tsxの内容確認
cat /opt/tenmon-ark/ui/src/App.tsx | grep -E "(bg-red|Sidebar|Chat)"

# 2. main.tsxの内容確認
cat /opt/tenmon-ark/ui/src/main.tsx | grep -E "(App|import)"

# 3. ビルド結果の確認
ls -la /var/www/tenmon-ark/dist/

# 4. index.htmlの確認
head -20 /var/www/tenmon-ark/dist/index.html
```

