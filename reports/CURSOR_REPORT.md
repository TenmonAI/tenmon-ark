## 1. 変更目的（何を実現したか）

- `web/` 配下を **ChatGPT ライト風の「TENMON-ARK GPTシェル」UI** に全面刷新し、`/pwa/` 配下で「白基調 + 左カラム + チャット + Composer」が立ち上がるようにした。
  - エントリポイントは `main.tsx` → `App.tsx` → `GptShell` → `Sidebar/Topbar/ChatLayout`。
  - 旧タブ UI（`App` 内でのタブ切替 + 既存 ChatPage レイアウト）は残存するが、`App` のエクスポートは `GptShell` 専用になっており、実際の `/pwa/` 入口は GPT シェルのみ。
- **same-origin `/api/chat` のみ**を叩く軽量チャットクライアントを実装し、`API_BASE_URL = ""` + `fetch("/api/chat")` で mixed content を確実に排除した。
  - `web/src/config/api.ts` で `API_BASE_URL = ""` を固定し、`web/src/api/chat.ts` の `postChat()` が `fetch(\`${API_BASE_URL}/api/chat\`, …)` を呼ぶ。
  - これにより、nginx の `location /api/` 経由で同一オリジンの API のみを利用する前提に揃えた（外部ホスト参照は排除）。
- **ローカルスレッド + メッセージ履歴の永続化**を `IndexedDB + localStorage` で実現し、PWA らしくブラウザ内で会話履歴が復元されるようにした。
  - `web/src/hooks/useChat.ts` で `tenmon_thread_id_v1` を `localStorage` に保持し、`web/src/lib/db.ts` で `threads/messages` ストアを持つ IndexedDB (`tenmon_ark_pwa_v1`) を管理。
- UI スキンを「**紙白 (#FAFAF7) + 深緑 (#2F6F5E) + 金の一点 (#C9A14A) + 観測リング**」にアップデートし、天聞アークらしい静かな威圧感を付与。
  - `web/src/styles/gpt-tokens.css` と `web/src/styles/gpt-base.css` にトークン + レイアウトクラスを定義し、コンポーネント側はすべてクラス指定のみ（インラインスタイル最小）で 1px 単位の制御をしやすくした。
- **軽量 i18n（多言語切替）**を自前実装し、日本語をデフォルト (`navigator.language` が `ja*` の場合) としつつ、Settings から他言語に即時切替できるようにした。
  - `web/src/i18n/strings.ts` / `useI18n.ts` を追加し、`Sidebar/Topbar/Composer/SettingsModal` の文言を `t(key)` 経由に統一。

---

## 2. 変更ファイル一覧（追加/変更/削除）

### 追加ファイル（web/）

- `web/src/components/gpt/GptShell.tsx`
- `web/src/components/gpt/Sidebar.tsx`
- `web/src/components/gpt/Topbar.tsx`
- `web/src/components/gpt/ChatLayout.tsx`
- `web/src/components/gpt/MessageList.tsx`
- `web/src/components/gpt/MessageRow.tsx`
- `web/src/components/gpt/Composer.tsx`
- `web/src/components/gpt/TypingIndicator.tsx`
- `web/src/components/gpt/SettingsModal.tsx`
- `web/src/styles/gpt-tokens.css`
- `web/src/styles/gpt-base.css`
- `web/src/pages/ChatRoute.tsx`
- `web/src/pages/DashboardPage.tsx`
- `web/src/pages/ProfilePage.tsx`
- `web/src/lib/exportImport.ts`
- `web/src/lib/types.ts`
- `web/src/i18n/strings.ts`
- `web/src/i18n/useI18n.ts`

### 既存ファイルの主な変更

- `web/src/App.tsx`
  - 旧タブ UI を廃止し、`GptShell` を `I18nProvider` でラップした単一エクスポートに変更。
- `web/src/main.tsx`
  - `./styles/gpt-base.css` を読み込み、`<App />` を `React.StrictMode` でマウント。
- `web/src/config/api.ts`
  - `API_BASE_URL = ""` を定義し、`API_CHAT_URL = API_BASE_URL + "/api/chat"` に変更。
  - コメントで「同一オリジン相対パスのみ（http://...:3000 は使わない。nginx location /api/ に統一）」と明記。
- `web/src/api/chat.ts`
  - `import { API_BASE_URL } from "../config/api.js";`
  - `fetch(\`${API_BASE_URL}/api/chat\`, { … body: { threadId: req.sessionId, message: req.message } })` に一本化。
- `web/src/hooks/useChat.ts`
  - `tenmon_thread_id_v1` を `localStorage` に保存する `getOrCreateThreadId()` を実装。
  - `listMessagesByThread` / `replaceThreadMessages` / `upsertThread` を使って、`sessionId` ごとの履歴を IndexedDB 上に保存・復元。
  - `Message` 型（`role: "user" | "assistant"`）と `PersistMessage` 型（`role: "user" | "tenmon"`）を相互変換して保存。
- `web/src/lib/db.ts`
  - IndexedDB (`tenmon_ark_pwa_v1`) に `threads` / `messages` ストアを作成し、`by_thread` / `by_thread_createdAt` インデックスを付与。
  - `upsertThread` / `replaceThreadMessages` / `listMessagesByThread` / `exportAll` / `importAll` を実装。
- `web/src/pages/ChatPage.tsx`
  - 既存の「黒背景 + ChatWindow/ChatInput UI」は残存するが、`App.tsx` からは直接参照されていない（`GptShell` 経由の ChatRoute が新しいエントリ）。
- `web/src/pages/KanagiPage.tsx`, `KokuzoPage.tsx`, `TrainPage.tsx`, `TrainingPage.tsx`
  - いずれも `/api/kanagi/...` / `/api/kokuzo/...` / `/api/train/...` を **相対パス (`/api/...`)** で呼び出すようになっており、same-origin に統一。
- `web/vite.config.ts`
  - `base: "/pwa/"` を明示。
  - `server.proxy["/api"]` を `target: "http://localhost:3000"` に設定し、開発時のみローカル API へプロキシ。
- `web/scripts/deploy_web_live.sh`
  - `REPO=/opt/tenmon-ark-repo/web` → `npm ci`（失敗時 `npm install`）→ `npm run build` → `rsync` で `/var/www/html` 配下に `dist/` を同期。
  - `WEB_BUILD_MARK:<git_sha> <ISO8601>` を `/var/www/html/build.txt` に書き出し、`nginx` を `systemctl reload`。
- `web/scripts/smoke_web.sh`
  - `rg` で `tenmon-ark.sessionId|session_id:|input:` を `src/api/chat.ts` / `src/hooks/useChat.ts` / `src/types/chat.ts` / `src/App.tsx` から検査し、禁止パターンを検出すると `FAIL`。
  - P1 復元フック (`setRestored(true)` と `<p>restored</p>`) の存在チェックを行う（旧 UI 用。新 GPT シェルには直接影響しないが、リポジトリ全体のゲートとして残っている）。

### 削除ファイル

- 今回の差分において、`web/` 配下の完全削除ファイルはなし（旧 UI コンポーネント群は残存）。

---

## 3. 画面構成（Sidebar / Topbar / Chat / Dashboard / Profile / Settings）

### 3.1 全体構成（GptShell）

- `web/src/components/gpt/GptShell.tsx`
  - `view: "chat" | "dashboard" | "profile"` と `settingsOpen: boolean` を持つシェルコンポーネント。
  - 左側に `Sidebar`、右側に `Topbar + コンテンツ領域` を配置する 2 カラムレイアウト。
  - メイン領域は `view` に応じて以下を表示:
    - `"chat"` → `<ChatRoute />`（= `<ChatLayout />`）
    - `"dashboard"` → `<DashboardPage />`
    - `"profile"` → `<ProfilePage />`
  - `onNewChat` は `setView("chat"); window.location.reload();` で、現状は単純にページをリロードしてスレッドを切り替える設計。

### 3.2 Sidebar

- `web/src/components/gpt/Sidebar.tsx`
  - `GptView`（`"chat" | "dashboard" | "profile"`）と、`onView`, `onNewChat`, `onOpenSettings` を受け取る。
  - 構造:
    - 上部 (`.gpt-sidebar-top`):
      - `+ {t("sidebar.newChat")}` ボタン（Primary: 深緑 `--ark-green`）で新規チャット。
      - `Search` 行（アイコン + `t("sidebar.search")`、現時点ではダミー）。
    - 中央 (`.gpt-sidebar-history`):
      - `Today` ラベル (`t("sidebar.today")`)
      - `Chat` ボタン（`view === "chat"` のとき `gpt-sidebar-item-active`）
      - `Explore` ラベル (`t("sidebar.explore")`)
      - `Dashboard` / `Profile` ボタン。
    - 下部 (`.gpt-sidebar-bottom`):
      - `⚙️ {t("sidebar.settings")}` ボタン（SettingsModal を開く）。
      - ユーザーブロック:
        - 丸いアバター (`.gpt-sidebar-avatar`) 内に `"T"` と、右下に `--ark-gold` のドット (`.gpt-sidebar-avatar-dot`) を 1 点のみ表示。
        - 右側に 2 行のラベル:
          - `TENMON-ARK`（`t("sidebar.brandLine1")`、字間 0.08em、全大文字）
          - `天聞アーク`（`t("sidebar.brandLine2")`、muted な小さめテキスト）。

### 3.3 Topbar

- `web/src/components/gpt/Topbar.tsx`
  - `title`（デフォルト `"TENMON-ARK"`）を受け取り、左側に極小のリングマーク + タイトル、右側に `/api/chat` のメタ情報を表示。
  - 左:
    - `.gpt-topbar-mark`: 16px の丸い線画サークル（`border: 1px solid var(--gpt-text-primary)`）。
    - `.gpt-topbar-title`: `title` を小さめ・太字で表示。
  - 右:
    - `.gpt-topbar-meta`: `t("topbar.chatMeta")` → `/api/chat (same-origin)` / 日本語環境では `/api/chat （同一オリジン）` を表示。

### 3.4 Chat（ChatLayout / MessageList / Composer）

- `web/src/components/gpt/ChatLayout.tsx`
  - `useChat()` を呼び出し、`messages` / `sendMessage` / `loading` を受け取り、`MessageList` と `Composer` を組み合わせる。
  - 上: `MessageList`（メッセージ + タイピングインジケータ）。
  - 下: `Composer`（入力欄 + 送信ボタン）。

- `web/src/components/gpt/MessageList.tsx`
  - `messages: Message[]`（`web/src/types/chat.ts` の `Message` 型: `{ role: "user" | "assistant"; content: string }`）と `loading: boolean` を受け取る。
  - 各メッセージを `MessageRow` でレンダリングし、末尾に `TypingIndicator` を付与（`loading === true` のとき）。
  - `useEffect` で `messages` もしくは `loading` 変更時にスクロールを最下部へ。

- `web/src/components/gpt/MessageRow.tsx`
  - `role: "user" | "assistant"` に応じて `gpt-message-row-user` / `gpt-message-row-assistant` + `gpt-message-bubble-{user|assistant}` を切り替え。

- `web/src/components/gpt/Composer.tsx`
  - `onSend(text: string)` / `loading` を受け取り、`input` + 送信ボタンを提供。
  - 日本語 IME を考慮し、`onCompositionStart/End` と `nativeEvent.isComposing` を用いて、変換中の Enter 送信をブロック。
  - 文言:
    - プレースホルダ: `t("composer.placeholder")` （日本語だと「天聞アークにメッセージを送る…」）。
    - 送信ボタンは `gpt-btn-primary` で深緑、ローディング時は `gpt-spinner` を表示。

### 3.5 Dashboard / Profile

- `web/src/pages/DashboardPage.tsx`
  - 枠のみ。KOKUZO API を呼ばず、「KOKUZO は次フェーズで接続します（UI先行 / API準備中）。」と `Coming soon` カードを表示。
  - フェーズ案内: 「ファイル一覧 / インデックス / Seeds 表示」「進捗/可観測/監査ビュー」「Founder 機能の出し分け」など。

- `web/src/pages/ProfilePage.tsx`
  - `Account: TENMON-ARK (same-origin)` / `Plan: Default` / `Data: Stored in this browser. Use Settings to export/import.` をカードで表示。
  - 実際のアカウント API 連携はまだ行っていない（スタブ的 UI）。

### 3.6 Settings（SettingsModal + SettingsPanel）

- `web/src/components/gpt/SettingsModal.tsx`
  - `open` / `onClose` を受け取り、オーバーレイ + パネルを描画。
  - 左のナビゲーション (`SECTIONS`):
    - General / Appearance / Language / Data / About（いずれも `t("settings.section.*")`）。
  - 右側ボディ:
    - ヘッダ：`Settings` タイトル (`t("settings.title")`) と `Close` ボタン (`t("settings.close")`)。
    - `"data"` セクション: 既存の `SettingsPanel` をそのままマウントし、`open={true}` / `onImported={() => window.location.reload()}` で Export/Import 完了後にリロード。
    - `"language"` セクション:
      - 言語セレクタ (`select`) で `supportedLangs`（`["ja","en","es","fr","zh-Hans","zh-Hant","ko"]`）から選択。
      - 選択時に `setLang(e.target.value)` を呼び、`localStorage("tenmon_lang_v1")` と `<html lang="...">` を更新。
    - それ以外のセクションは `t("settings.comingSoon")`（「このセクションは準備中です。」等）を表示。

---

## 4. /pwa/ のルーティングと起動点（main.tsx / App.tsx / routes）

- `web/vite.config.ts`
  - `base: "/pwa/"` に設定されており、ビルド後の静的アセットは `/pwa/*` パスで提供される。
  - エントリ HTML (`index.html`) は `/pwa/index.html` からロードされ、`<div id="root">` に React アプリがマウントされる。

- `web/src/main.tsx`
  - `ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);`
  - `./styles/gpt-base.css` を読み込んで全体レイアウトとトークンを適用。

- `web/src/App.tsx`
  - `I18nProvider` 配下に `GptShell` を配置しただけのシンプルな構造:
    - `export default function App() { return <I18nProvider><GptShell /></I18nProvider>; }`
  - ルーター（`react-router` 等）は利用せず、`GptView` を `useState` で切り替えるだけ。

- ルーティング相当:
  - Chat: `GptShell` → `ChatRoute` (`web/src/pages/ChatRoute.tsx`) → `ChatLayout` → `useChat`。
  - Dashboard: `GptShell` → `DashboardPage`。
  - Profile: `GptShell` → `ProfilePage`。

ブラウザレベルのパスはすべて `/pwa/` 配下で、アプリ内の「Chat / Dashboard / Profile」遷移は `useState` によるビュー切り替えで実現されている（URL パスは変えない）。

---

## 5. API 契約（/api/chat の payload/response、same-origin 前提）

### 5.1 クライアント側契約

- `web/src/config/api.ts`
  - `export const API_BASE_URL = "";`
  - `export const API_CHAT_URL = API_BASE_URL + "/api/chat";`
  - コメントで「同一オリジン相対パスのみ（http://...:3000 は使わない。nginx location /api/ に統一）」と明記。

- `web/src/api/chat.ts`
  - 型:
    - `ChatRequest` / `ChatResponse` は `web/src/types/chat.ts` からインポート。
  - 実装:
    - `postChat(req: ChatRequest): Promise<ChatResponse>`:
      - `fetch(\`${API_BASE_URL}/api/chat\`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ threadId: req.sessionId, message: req.message }) })`
      - `const data = (await res.json()) as ChatResponse; return data;`

- `web/src/hooks/useChat.ts`
  - `sendMessage(text: string)`:
    - `content = text.trim()` が空なら何もしない。
    - 先に `messages` ステートに `{"role":"user","content": content}` を push。
    - `postChat({ message: content, sessionId: sid })` を呼び、`res.response` を `{"role":"assistant","content": res.response}` として追加。
  - ここから見る限り、最低限 `ChatResponse` には `response: string` プロパティが存在する必要がある（サーバ側 `api/src/routes/chat.ts` の実装からも、最終 `res.json({ response: <string>, … })` であることが確認されている）。

### 5.2 same-origin 前提

- すべての fetch は `/api/...` の相対 URL で行われており、`https://` や `http://localhost:3000` などの絶対パスは `web/` には存在しない。
  - 例:
    - `KanagiPage`: `fetch("/api/kanagi/reason", …)`
    - `KokuzoPage`: `fetch("/api/kokuzo/files")`, `fetch("/api/kokuzo/upload")`, `fetch("/api/kokuzo/index")`
    - `TrainPage`: `fetch("/api/train/message")`, `fetch("/api/train/commit")`
    - `TrainingPage`: `fetch("/api/training/sessions")` など。
- 開発時のみ、Vite の dev サーバ (`localhost:5173`) から API (`localhost:3000`) へプロキシされるよう、`vite.config.ts` の `server.proxy["/api"]` が設定されている。

---

## 6. ローカル保存（IndexedDB / LocalStorage、Export/Import の仕様）

### 6.1 Thread ID の LocalStorage 保持

- `web/src/hooks/useChat.ts`
  - `THREAD_ID_KEY = "tenmon_thread_id_v1"`
  - `getOrCreateThreadId()`:
    - `window.localStorage.getItem("tenmon_thread_id_v1")` が存在し有効ならそれを利用。
    - なければ `crypto.randomUUID()` か `Date.now()` ベースの乱数文字列で新規生成し、`localStorage` に保存。

### 6.2 IndexedDB 構造（threads / messages）

- `web/src/lib/db.ts`
  - DB 名: `tenmon_ark_pwa_v1`
  - バージョン: `1`
  - ストア:
    - `"threads"`: `keyPath: "id"`
    - `"messages"`: `keyPath: "id"`, インデックス:
      - `"by_thread"`: `keyPath: "threadId"`
      - `"by_thread_createdAt"`: `keyPath: ["threadId", "createdAt"]`
  - API:
    - `upsertThread(t: PersistThread)`: `threads` ストアに `id/title/updatedAt` を保存（`updatedAt` がなければ `Date.now()`）。
    - `replaceThreadMessages(threadId, msgs: PersistMessage[])`:
      - `messages` ストアで `threadId` に一致する全メッセージの key を取得し削除。
      - 渡された `msgs` をそのまま `store.put(m)` で再挿入。
    - `listMessagesByThread(threadId)`:
      - `"by_thread_createdAt"` インデックスで `[threadId, 0]`〜`[threadId, MAX_SAFE_INTEGER]` の範囲を取得し、`createdAt` 昇順で返す。
    - `exportAll()`:
      - `threads` / `messages` をそれぞれ `getAll()` し、`{ version: "TENMON_PWA_EXPORT_V1", threads, messages }` を返す。
    - `importAll(data)`:
      - JSON から `threads` / `messages` 配列を抽出。
      - スキーマチェック:
        - `thread.id` が string であること。
        - `message.id` / `threadId` / `role`（`"user" | "tenmon"`）/ `text` が正しいこと。
      - `threads` / `messages` ストアを `clear()` してから再挿入。

### 6.3 Export/Import UI

- `web/src/lib/exportImport.ts`
  - `exportAll()` → `dbExportAll()` ラッパー。
  - `importAll(payload)` → `dbImportAll(payload)` ラッパー。
  - `downloadJson(filename, obj)` / `readJsonFile(file)` を提供し、JSON ファイルのダウンロード・アップロードをカバー。

- `web/src/components/SettingsPanel.tsx`（既存）
  - JSON Export:
    - `exportAll()` で取得したデータを `JSON.stringify` し、`Blob` + `URL.createObjectURL` + `<a download>` で `tenmon-ark-backup-YYYY-MM-DD.json` を保存。
  - JSON Import:
    - `<input type="file" accept="application/json">` でファイル選択。
    - `FileReader` でテキストを読み込み、`JSON.parse` → `importAll(data)` を実行。
    - 成功時は「Importしました。リロードします…」と表示し、`setTimeout(() => location.reload(), 100)` で即リロード。

### 6.4 Settings 画面からの案内

- `ProfilePage` の Data カード:
  - 「Stored in this browser. Use Settings to export/import.」と明示。
  - 実際の Export/Import は Settings → Data controls → SettingsPanel で行う。

---

## 7. キャッシュ / Service Worker の有無と影響

- `web/` 配下には Service Worker (`service-worker.ts`, `sw.js`, `workbox` 設定など) は存在しない。
- `vite.config.ts` も PWA プラグイン（`@vite-pwa/plugin` 等）を利用していない。
- 従って:
  - **ブラウザレベルのオフラインキャッシュ / pre-cache / runtime cache** は未設定。
  - キャッシュはブラウザ標準の HTTP キャッシュの範囲に留まり、ビルドごとに `dist/` 以下のハッシュ付きファイルが更新されれば自動的に切り替わる。
  - `deploy_web_live.sh` が `rsync -a --delete` で `/var/www/html/` を丸ごと置き換え、`build.txt` に `WEB_BUILD_MARK:<sha> <timestamp>` を書いているため、**「いつ・どの commit が反映されたか」はサーバ側で判別可能**。

---

## 8. ビルド手順（pnpm -C web install/build）

### 8.1 開発〜ビルドの前提

- `web/package.json`（別途存在）に基づき、`pnpm` か `npm` で依存を解決する。
- Vite + React + Tailwind 構成 (`@vitejs/plugin-react`, `@tailwindcss/vite` etc.) を使用。

### 8.2 推奨コマンド

ローカル開発:

```bash
cd web
pnpm install           # または npm install
pnpm run dev           # Vite dev server (base=/pwa/, port=5173)
```

本番ビルド:

```bash
cd web
pnpm install           # もしくは `npm ci`（CI環境）
pnpm run build         # Vite build → dist/
```

サーバ側では `web/scripts/deploy_web_live.sh` が `npm ci`（失敗時 `npm install`）→ `npm run build` を呼び出すため、運用上は `npm` 系コマンドで統一されている。

---

## 9. VPS デプロイ手順（deploy_web_live.sh の要約と注意）

- `web/scripts/deploy_web_live.sh` の処理フロー:

```bash
REPO="/opt/tenmon-ark-repo/web"
LIVE="/var/www/html"

cd "$REPO"

# 1. 依存のインストール
if ! npm ci 2>/dev/null; then
  echo "[deploy-web] npm ci failed, falling back to npm install"
  npm install
fi

# 2. ビルド
npm run build   # → dist/

# 3. dist を本番ディレクトリへ同期
sudo rsync -a --delete "$REPO/dist/" "$LIVE/"

# 4. build stamp を出力
GIT_SHA="$(cd /opt/tenmon-ark-repo && git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
ISO8601="$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%SZ")"
echo "WEB_BUILD_MARK:${GIT_SHA} ${ISO8601}" | sudo tee "$LIVE/build.txt" >/dev/null

# 5. nginx reload
sudo systemctl reload nginx
```

### 注意点

- `rsync -a --delete "$REPO/dist/" "$LIVE/"` のため、`$LIVE` 直下の既存ファイルは `dist/` にないものがあれば削除される。
  - `/var/www/html/` を他用途と共有している場合、事前にサブディレクトリ（例: `/var/www/html/pwa/`）に分離する必要がある。
- `WEB_BUILD_MARK:<sha> <timestamp>` は現在の Git HEAD と UTC 時刻を記録するため、**どの commit がデプロイされたか**を `curl /build.txt` などで即座に確認できる。
- `nginx` は `systemctl reload` で設定を再読み込みしている（プロセス再起動ではない）。設定変更直後にログを確認する場合は `journalctl -u nginx` 側も確認する必要がある。

---

## 10. 反映確認（curl で HTML → JS hash → bundle 内文字列確認）

### 10.1 HTML の取得

```bash
curl -sS https://tenmon-ark.com/pwa/ > /tmp/pwa_index.html
```

- `index.html` 内には、Vite ビルド済みの JS/CSS への `<script type="module" src="/pwa/assets/index-XXXX.js">` のようなハッシュ付きファイル名が出力されている。

### 10.2 JS バンドル名の抽出

```bash
JS_PATH=$(grep -oE '/pwa/assets/index-[^"]+\.js' /tmp/pwa_index.html | head -n1)
echo "$JS_PATH"
```

### 10.3 バンドルの取得と文字列確認

```bash
curl -sS "https://tenmon-ark.com${JS_PATH}" > /tmp/pwa_bundle.js

# 例: Ark スキンのトークンを確認
grep -q 'FAFAF7' /tmp/pwa_bundle.js   # --bg: #FAFAF7 が埋め込まれているか
grep -q 'TENMON-ARK' /tmp/pwa_bundle.js
grep -q '/api/chat' /tmp/pwa_bundle.js
```

これにより:

- 新しいスキントークン（`#FAFAF7`, `#2F6F5E`, `#C9A14A`）がバンドルに含まれているか。
- `"/api/chat"` が同一オリジンの相対パスとして埋め込まれているか。
- `TENMON-ARK` / `天聞アーク` などの UI テキストが最新になっているか。

をサーバ側バンドルから直接検証できる。

### 10.4 build stamp の確認

```bash
curl -sS https://tenmon-ark.com/build.txt
# 例: WEB_BUILD_MARK:abcd123 2026-02-10T12:34:56Z
```

`git rev-parse --short HEAD` で手元の SHA と比較することで、**期待する commit が本番に出ているか**を確認できる。

---

## 11. 既知の問題 / 未完ポイント

1. **`GptShell` の「New chat」操作が単純リロード**
   - 現状 `handleNewChat` は `setView("chat"); window.location.reload();` であり、内部的に `tenmon_thread_id_v1` をリセットしていない。
   - 新しいスレッドを意図しても、`localStorage` に既存の threadId が残っている場合、再ロード後も同じスレッドが再利用される。
   - 真の「新規チャット」を実装するには、`localStorage.removeItem("tenmon_thread_id_v1")` や、新しい threadId を生成して `useChat` に渡す経路が必要。

2. **旧 UI（`ChatPage`, `KanagiPage`, `KokuzoPage`, `TrainPage`, `TrainingPage`）との共存**
   - `App.tsx` からは参照されていないが、コードとしては残っており、`web/scripts/smoke_web.sh` の一部チェック（`setRestored(true)` / `<p>restored</p>`）は旧 UI 前提のまま。
   - 将来的に `/pwa/legacy` などで旧 UI を残すか、完全に削除するかの整理が必要。

3. **SettingsPanel の UI と GPT スキンの統合レベル**
   - `SettingsPanel` 自体は旧 UI スタイル（インラインスタイル + ダークテーマ）で実装されており、`SettingsModal` の中で浮いて見える可能性がある。
   - 機能優先でそのまま内包しているため、ビジュアル一貫性は今後の調整課題。

4. **Service Worker / PWA マニフェストの未実装**
   - 現状、PWA としてのオフラインキャッシュやホームスクリーン追加用マニフェストは確認できない。
   - `/pwa/` はベースパスのみで、厳密な「PWA（installable, offline-ready）」としては未完成。

5. **言語リソースの充実度**
   - `strings.ts` は Sidebar/Topbar/Composer/Settings 周辺に必要な最小限のキーのみを定義している。
   - 本文（例: Dashboard のテキスト、Profile の説明）についてはまだ多言語化されていないため、日本語/英語以外では一部英語のまま表示される。

---

## 12. 次のアクション（最小diffで直す順番）

1. **New chat の真正なスレッド切替**
   - 優先度: 高 / 影響範囲: `GptShell` + `useChat` + `useChat` の API。
   - 最小 diff 方針:
     - `handleNewChat` 内で `localStorage.removeItem("tenmon_thread_id_v1")` → `window.location.reload()` に変更するだけでも、「別スレッドとして再生成」されるようになる。
     - 理想形は `useChat` に `initialSessionId` プロップを追加し、`GptShell` 側で threadId を明示管理することだが、初手は removeItem + reload でよい。

2. **SettingsPanel のスタイルを GPT スキンに合わせる**
   - 優先度: 中 / 影響範囲: `SettingsPanel`, `gpt-base.css`。
   - 最小 diff 方針:
     - 既存のインラインスタイルを `gpt-page-card` / `gpt-input` / `gpt-btn` に寄せるヘルパークラスを追加し、見た目を統一。
     - ロジックは一切変更せず、スタイルのみクラスベースにリファクタ。

3. **旧 UI と GPT シェルの関係性を README に明記**
   - 優先度: 中 / 影響範囲: ドキュメントのみ。
   - 最小 diff 方針:
     - `web/README.md`（または `docs/PWA_INTEGRATION_AUDIT_REPORT.md` 等）に「/pwa/ は GptShell ベース」「旧 ChatPage はレガシー」と明記し、新規開発時の参照先を統一。

4. **Smoke テストの GPT シェル対応**
   - 優先度: 中 / 影響範囲: `web/scripts/smoke_web.sh`。
   - 最小 diff 方針:
     - 既存の `P1_PERSIST_GATE_V1` チェック（`setRestored(true)` / `<p>restored</p>`）を「旧 UI パス限定」にするか、GPT シェル用の新しいゲート（例: `tenmon_thread_id_v1` + `useChat` の存在確認）に置き換える。

5. **多言語リソースの拡充**
   - 優先度: 低〜中。
   - 最小 diff 方針:
     - `DashboardPage` / `ProfilePage` のテキストを `strings.ts` に切り出し、`t()` で参照するようにする。
     - 既存の日本語/英語をベースに、他言語は英語フォールバックでもよい。

6. **将来的な PWA 対応（Service Worker + manifest）**
   - 優先度: 中〜長期。
   - 最小 diff 方針:
     - `vite-plugin-pwa` 等を導入し、`/pwa/manifest.webmanifest` + Service Worker を追加。
     - まずは「静的アセットの pre-cache」と「offline fallback (/pwa/offline.html)」のみを対象とし、API キャッシュは別フェーズで検討。

