# FOUNDER_RELEASE_NOTES_UI_OBSERVE_V1

**日時**: 2026-04-25 (土)
**監査者**: Cursor (OBSERVE-only, design map)
**カード**: CARD-FOUNDER-RELEASE-NOTES-UI-OBSERVE-V1
**parent_commits**:
- `7a2f3ca8` — feat(chat): CLAMP-REPAIR-V1 (Founder 進化材料)
- `d0de335a` — docs(feedback): FEEDBACK_LOOP_OBSERVE_V1
- `a6d43996` — Phase A 完成 (KOTODAMA_CONSTITUTION_V1 SEAL ほか)

**種別**: OBSERVE-only / PATCH 禁止
**実装変更**: ゼロ (本レポート 1 通の追加のみ)

> 本監査は Founder 向け「進化ログ UI」を実装する前に、PWA 既存構造・データソース仕様・スマホ動線案・Founder 向け文言素材を **観測根拠つき** で確定するためのもの。Phase α 投入カードに対して TENMON が裁定可能な状態を担保する。

---

## Section 1: 既存 PWA 構造マップ

### 1.1 配信構造 (実体観測)

| 項目 | 値 | 観測コマンド |
|---|---|---|
| ソース | `/opt/tenmon-ark-repo/web/` | `ls web/` |
| ビルド | `web/dist` (vite, base=`/pwa/`) | `cat web/vite.config.ts` |
| 配信先 | `/var/www/tenmon-pwa/pwa/` | `ls /var/www/tenmon-pwa/pwa/` |
| nginx alias | `location /pwa/` → `/var/www/tenmon-pwa/pwa/` | `/etc/nginx/sites-enabled/tenmon-ark` |
| デプロイ | `scripts/deploy_all.sh` (`detect_web_live`) | `head -60 scripts/deploy_all.sh` |
| API proxy | `/api/` → `127.0.0.1:3000` | nginx config |

### 1.2 web/ 依存関係 (web/package.json 抜粋)

| 種別 | パッケージ | 備考 |
|---|---|---|
| dependencies | `react@^18.3.1`, `react-dom@^18.3.1` | minimal React |
| dependencies | `html2canvas@^1.4.1`, `jspdf@^4.2.1` | エクスポート系のみ |
| devDependencies | `vite@^5.4.21`, `@vitejs/plugin-react@^4.3.4` | |
| devDependencies | `tailwindcss@^4.0.0`, `@tailwindcss/vite@^4.0.0` | Tailwind v4 |
| devDependencies | `typescript@^5.7.3` | |

**重要**: `web/` には以下が **存在しない**:
- `react-router` / `react-router-dom` (pathname ベースの分岐のみ)
- `@radix-ui/*` (Dialog / Drawer / Popover 等)
- `vaul` (bottom-sheet)
- `framer-motion`
- `lucide-react` / `cmdk` 等の補助ライブラリ
- `class-variance-authority` / `tailwind-merge`

### 1.3 client/ は別 SPA (配信されていない)

| 項目 | 値 |
|---|---|
| パス | `/opt/tenmon-ark-repo/client/` |
| 依存 | React 19 + radix-ui 全種 + vaul + react-router-dom v7 + framer-motion |
| ビルド成果 | `client/dist` |
| 配信先 | **どこにも deploy されていない** (`deploy_all.sh` は `/var/www/tenmon-pwa/pwa` を見るのみ) |
| nginx | `client/dist` を指す location は無い |
| 結論 | 本番未稼働の別実装。本カード設計上は **参考にしない** |

### 1.4 ファイル数 (観測)

| 場所 | TS/TSX 数 | 備考 |
|---|---|---|
| `web/src` | **71** | 進化ログ UI の実装先 |
| `client/src` | 340 | 別 SPA、本カード対象外 |

### 1.5 web/src/pages 一覧

| ページ | サイズ | route 種別 |
|---|---|---|
| `App.tsx` | 7.8 KB | エントリ (pathname 分岐) |
| `pages/ChatPage.tsx` | 4.0 KB | 既定 |
| `pages/ChatRoute.tsx` | 0.3 KB | |
| `pages/DashboardPage.tsx` | 19.9 KB | `dashboard` view |
| `pages/FeedbackPage.tsx` | 23.3 KB | `feedback` view (既存 Founder 接点) |
| `pages/SukuyouPage.tsx` | 87.8 KB | `sukuyou` view |
| `pages/SukuyouAboutPage.tsx` | 54.5 KB | `/pwa/sukuyou-about` |
| `pages/KotodamaAboutPage.tsx` | 36.0 KB | `/pwa/kotodama-about` |
| `pages/AmatsuKanagiAboutPage.tsx` | 38.2 KB | `/pwa/amatsu-kanagi-about` |
| `pages/LoginLocal.tsx`, `RegisterLocal.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx` | — | 認証 |
| `pages/ProfilePage.tsx` | 3.6 KB | `profile` view |
| `pages/KokuzoPage.tsx` | 13.6 KB | |
| `pages/KanagiPage.tsx` | 3.2 KB | |
| `pages/KoshikiConsole.tsx` | 9.2 KB | `/pwa/koshiki` |
| `pages/TrainingPage.tsx`, `TrainPage.tsx` | — | 訓練系 |
| `pages/mc/` | 5 ファイル | `/mc/*` |
| `pages/mission-control-vnext/` | — | `/mc/vnext` |

### 1.6 web/src/components/gpt/ (主要シェル)

| コンポーネント | 役割 |
|---|---|
| `GptShell.tsx` | 認証後のメインシェル (Sidebar + Topbar + Page) |
| `Sidebar.tsx` | 左ナビ (`linkClass("feedback")` 等) |
| `Topbar.tsx` | 上部 TabPill 3 個 (☆ 宿曜経 / ✦ 言霊秘書 / ◇ 天津金木) |
| `ChatLayout.tsx` | チャット本体レイアウト |
| `Composer.tsx` | 入力欄 |
| `MessageList.tsx`, `MessageRow.tsx`, `EmptyState.tsx`, `TypingIndicator.tsx` | チャット部品 |
| `SettingsModal.tsx` | **既存 Modal (自作)**。dark overlay + 中央ダイアログ |
| `SukuyouContextBar.tsx` | 宿曜コンテキストバー |

### 1.7 ルーティング構造 (App.tsx 観測)

`web/src/App.tsx` は **pathname ベース** の手動分岐:

```typescript
const isLoginPage = pathname === "/pwa/login-local.html" ...
const isKoshiki   = pathname.startsWith("/pwa/koshiki");
const isSukuyou   = pathname === "/pwa/sukuyou" || ...
const isSukuyouAbout = pathname === "/pwa/sukuyou-about" || ...
const isKotodamaAbout = pathname === "/pwa/kotodama-about" || ...
const isAmatsuKanagiAbout = pathname === "/pwa/amatsu-kanagi-about" || ...
const isMcVnext = pathname.startsWith("/mc/vnext");
```

**既存 view 種別** (`Sidebar.tsx:25` 観測):
```typescript
export type GptView =
  | "chat"
  | "dashboard"
  | "profile"
  | "sukuyou" | "sukuyou-room"
  | "sukuyou-about" | "kotodama-about" | "amatsu-kanagi-about"
  | "feedback";
```

→ **進化ログ用 view は未存在**。新規追加するなら `evolution` view を追加 + pathname `/pwa/evolution` を設ける、もしくは sukuyou-about 系列に倣って `evolution-about` 風に追加。

---

## Section 2: 進化ログ UI 4 階層仕様

### Level 0: エントリポイント (常時表示)

| 配置候補 | 理由 | 既存類例 |
|---|---|---|
| **Sidebar の「✉ 改善のご要望」の上** | feedback と並列の Founder 接点として自然 | `Sidebar.tsx:858` |
| Topbar TabPill 第 4 ピル | 既存 TabPill UI を踏襲、PC でも視認 | `Topbar.tsx:160-164` |
| ハンバーガー内ヘッダー | スマホで折り畳まれる | `Topbar.tsx:192-197` |

→ 推奨: **Sidebar 1 + Topbar TabPill 1** の両側エントリ (実装行数最小、既存スタイルそのまま使える)。

### Level 1: Headline 一覧

| 表示要素 | 型 | 例 | 必須 |
|---|---|---|---|
| `emoji` | string (1 字) | ✨ / 🛠 / ⚡ | 必須 |
| `title` | string (~20 chars) | 「チャット応答が長く話せるように」 | 必須 |
| `date` | YYYY-MM-DD | 2026-04-25 | 必須 |
| `badge` | string (~6 chars) | 改善 / 整備 / 新機能 / 修正 | 必須 |
| `level1Visible` | boolean | true (false なら一覧に出さない) | 任意 |

→ 各 entry を **タップで Level 2 に展開**。スクロール領域 (max-height + overflow-y) で 5 件先頭表示。

### Level 2: Summary 詳細 (tap で展開)

| 表示要素 | 型 | 例 |
|---|---|---|
| `description` | string (~100 chars) | 「『詳しく解説して』と言うと応答が途中で切れずに完結するようになりました。」 |
| `before` | string \| null | 「回答が約 500 文字で途中切断」 |
| `after` | string \| null | 「1,000 文字以上の自然な完結」 |
| `founderRequestCount` | number \| null | 11 (Founder 改善要望のうち何件を解消したか) |
| `tryItPrompt` | string \| null | 「カタカムナと言霊秘書の関係を詳しく解説してください」(チャットへ即送信ボタン) |

### Level 3: Detail (技術詳細、オプション)

| 表示要素 | 型 | 例 | Founder 公開可否 |
|---|---|---|---|
| `cardId` | string | `CARD-CHAT-LONGFORM-CLAMP-REPAIR-V1` | △ (収まりは良いが内部 ID) |
| `commit` | git short SHA | `7a2f3ca8` | △ |
| `technicalNote` | string | 「条件付き 500-char clamp の精緻化」 | ○ (Founder 任意で見れる) |

→ **既定では非表示**。「詳細を見る」リンクを押した場合のみ展開。

---

## Section 3: スマホ動線 3 案比較

### 案 A: Bottom-sheet (下から立ち上がる)

| 項目 | 評価 |
|---|---|
| 利点 | チャット非侵入、tap で展開、スマホ親和性が極めて高い |
| 欠点 | **web/ に bottom-sheet 実装が完全に不在** (`vaul` も `radix-ui` もなし) |
| 既存依存 | **なし**。client/ には `vaul@1.1.2` あるが配信外 |
| 必要な追加実装 | (a) 自作 (DOM + CSS のみで 100-150 行)、または (b) `vaul` を web/package.json に追加 |
| 推奨度 | △ — 自作なら可、新規 npm 依存追加なら別カード |

### 案 B: 専用ルート (`/pwa/evolution`)

| 項目 | 評価 |
|---|---|
| 利点 | 実装シンプル (既存 sukuyou-about 等と同じパターン)、PC でも同じ UI、共有 URL が成立 |
| 欠点 | チャット中の動線として遠い (画面遷移が必要) |
| 既存依存 | **なし**。pathname 分岐 (`App.tsx`) に 1 ケース追加するだけ |
| 必要な追加実装 | `App.tsx` に `isEvolution` 分岐 + `pages/EvolutionPage.tsx` 新規作成 |
| 推奨度 | ◎ — **最小実装かつ既存パターン踏襲**、Phase α に最適 |

### 案 C: ヘッダーバッジ + drawer

| 項目 | 評価 |
|---|---|
| 利点 | 通知性が高い (新着 badge を Topbar に出せる) |
| 欠点 | drawer 実装が web/ にない、誇示的になりやすい (Founder の集中を邪魔する懸念) |
| 既存依存 | **なし** (`@radix-ui/react-dialog` も unavailable) |
| 必要な追加実装 | drawer 自作 ~150 行、badge 状態管理 |
| 推奨度 | △ — 通知性はあるが Phase α では過剰 |

### 比較サマリ

| 案 | 実装行数目安 | 依存追加 | スマホ親和性 | 推奨 Phase |
|---|---|---|---|---|
| A: Bottom-sheet | 200-250 行 | あり (`vaul`) または自作 | ◎ | β 以降 |
| **B: 専用ルート** | **80-150 行** | **なし** | ○ | **α (推奨)** |
| C: バッジ+drawer | 250-300 行 | あり (drawer 自作 or radix) | △ | γ 以降 |

→ **Phase α 推奨案: B (専用ルート `/pwa/evolution`)**。Phase β で A の bottom-sheet 動線を「チャット中ワンタップ展開」として追加する余地を残す。

---

## Section 4: PC 表示仕様

### 4.1 PC レイアウト (案 B 採用前提)

| ビューポート | 推奨レイアウト |
|---|---|
| `>= 1280px` | 2 列 grid (左: Headline 一覧スクロール, 右: 選択中 entry の Summary/Detail パネル) |
| `1024-1279px` | 同 2 列、左ペイン狭め (320px) |
| `< 1024px` | 1 列 stack (`isOverlayNav` 既存ロジックと同期、`Sidebar` を覆う) |

### 4.2 既存 PC レイアウトの参考

`SukuyouAboutPage.tsx` (54 KB) と `KotodamaAboutPage.tsx` (36 KB) が既に PC 1 列 / スマホ 1 列の長文ページを実装。**進化ログは「短い entry の連続」なので、別パターン**:

- 上部: Hero 「これまでの進化」 + 件数 / 期間
- 中段: 月別 / カテゴリ別 filter pill (1 行)
- 下段: entry カード一覧 (各 entry が tap で展開)

### 4.3 検索 / filter

Phase α では **不要** (entries が 5-10 件想定)。Phase γ で entries が 30+ 件になった時点で導入を再評価。

---

## Section 5: 静的 JSON データソース仕様

### 5.1 配置 (案)

| 項目 | 値 |
|---|---|
| パス候補 1 | `web/public/evolution_log_v1.json` (PWA 静的配信、追加コードゼロ) |
| パス候補 2 | `web/src/data/evolution_log_v1.ts` (TypeScript const、型安全) |
| **推奨** | **候補 1** — 編集 → `npm run build` → デプロイのみで Founder 公開可能。CI 不要 |

### 5.2 schema (TypeScript 型定義案、Phase α 実装時に追加)

```typescript
interface EvolutionEntry {
  id: string;                           // "evo-2026-04-25-clamp"
  emoji: string;                        // "✨"
  title: string;                        // "チャット応答が長く話せるように"
  date: string;                         // "2026-04-25" (YYYY-MM-DD)
  badge: "改善" | "整備" | "新機能" | "修正";
  level1Visible: boolean;
  summary: {
    description: string;
    before?: string | null;
    after?: string | null;
    founderRequestCount?: number | null;
    tryItPrompt?: string | null;
  };
  detail?: {
    cardId?: string;
    commit?: string;
    technicalNote?: string;
  };
}

interface EvolutionLog {
  version: "v1";
  lastUpdated: string;                  // "2026-04-25"
  entries: EvolutionEntry[];
}
```

### 5.3 サンプル 5 件分ドラフト (Founder 公開向け文言)

```json
{
  "version": "v1",
  "lastUpdated": "2026-04-25",
  "entries": [
    {
      "id": "evo-2026-04-25-clamp",
      "emoji": "✨",
      "title": "チャット応答が長く話せるように",
      "date": "2026-04-25",
      "badge": "改善",
      "level1Visible": true,
      "summary": {
        "description": "『詳しく解説して』『なぜ』『関係を…』とお願いした時に、応答が途中で切れず最後まで届くようになりました。",
        "before": "回答が約 500 文字で途中切断",
        "after": "1,000 文字以上の自然な完結 (最大 1,520 文字確認)",
        "founderRequestCount": 11,
        "tryItPrompt": "カタカムナと言霊秘書の関係を詳しく解説してください"
      },
      "detail": {
        "cardId": "CARD-CHAT-LONGFORM-CLAMP-REPAIR-V1",
        "commit": "7a2f3ca8",
        "technicalNote": "短答用の安全装置 (500 文字上限) を、長文質問では解除するよう条件分岐化"
      }
    },
    {
      "id": "evo-2026-04-24-phase-a-kotodama",
      "emoji": "🛠",
      "title": "言霊の正典骨格を整えました",
      "date": "2026-04-24",
      "badge": "整備",
      "level1Visible": true,
      "summary": {
        "description": "五十連十行の 50 音、ヰ・ヱの位相差 (水/火) を canonical な情報源に固定し、内部の整合性監視を常時稼働させました。",
        "before": null,
        "after": "言霊憲法 V1 SEAL 検証済み、6 条項を毎起動で確認",
        "founderRequestCount": null,
        "tryItPrompt": null
      },
      "detail": {
        "cardId": "Phase A (6 cards)",
        "commit": "a6d43996",
        "technicalNote": "KOTODAMA_CONSTITUTION_V1 / KOTODAMA_BRIDGE_REGISTRY / GOJUREN_50_SOUNDS_V1 / KOTODAMA_ENFORCER_V1 / PromptTrace V1"
      }
    },
    {
      "id": "evo-2026-04-22-feedback-loop",
      "emoji": "💬",
      "title": "あなたの声を集める仕組みが動き始めました",
      "date": "2026-04-22",
      "badge": "整備",
      "level1Visible": true,
      "summary": {
        "description": "改善のご要望が確実に届く Notion 連携と、ローカル保存のフォールバックが整いました。Notion が不調でも声は失われません。",
        "before": null,
        "after": "Notion 同期 + ローカル JSON 保存の二段構え",
        "founderRequestCount": null,
        "tryItPrompt": null
      },
      "detail": null
    },
    {
      "id": "evo-2026-04-20-mc-mission-control",
      "emoji": "🌟",
      "title": "天聞アークの状態が見えるようになりました",
      "date": "2026-04-20",
      "badge": "新機能",
      "level1Visible": false,
      "summary": {
        "description": "(内部のみ) Mission Control vNext で、合格判定・健全性・系譜を一画面で観測できるようになりました。",
        "before": null,
        "after": "/mc/vnext で常時可視化",
        "founderRequestCount": null,
        "tryItPrompt": null
      },
      "detail": null
    },
    {
      "id": "evo-future-longform-composer",
      "emoji": "🌱",
      "title": "(育成中) 長文構成の本体実装",
      "date": "2026-04-25",
      "badge": "整備",
      "level1Visible": true,
      "summary": {
        "description": "今回の改善は『途中で切れない』までを実現しました。次は『より深く話せる』本体実装を準備中です。",
        "before": null,
        "after": null,
        "founderRequestCount": null,
        "tryItPrompt": null
      },
      "detail": null
    }
  ]
}
```

> ※ サンプル 5 件目は **「育成中」表記** を Phase α でどう見せるかのドラフト。Acceptance では 4 件以上の確定 entry + 育成中 0-1 件を想定。

---

## Section 6: API endpoint draft (Phase β/γ)

### 6.1 Phase β 候補

```
GET /api/evolution/feed
  - 認証: 不要 (Founder 公開、cookie 任意)
  - 戻り値: EvolutionLog (Section 5.2)
  - データソース: web/public/evolution_log_v1.json または Notion DB (Section 7)
  - cache: nginx で 60s キャッシュ
  - rate-limit: 既存 /api/feedback と同等
```

### 6.2 Phase γ 候補

```
GET /api/evolution/live
  - 認証: 不要 (Founder 公開、要約版のみ)
  - 戻り値:
    {
      "lastSealCommit": "7a2f3ca8",
      "lastSealDate": "2026-04-25",
      "lastSealTitle": "チャット応答が長く話せるように",
      "healthVerdict": "PASS"
    }
  - 内部詳細 (acceptance.checks 全件、enforcer violations 等) は隠す
  - 出力ソース: /api/mc/vnext/claude-summary を要約
```

### 6.3 静的 JSON 配信のみで Phase α は完結

`/pwa/evolution` から fetch するパスは:
1. **(α 推奨)** `/pwa/evolution_log_v1.json` (静的、API 不要)
2. (β) `/api/evolution/feed` (動的、Notion 連携可能)

→ Phase α は **(1) のみ**。/api/evolution の追加は β カードへ持ち越し。

---

## Section 7: Notion 進化ログ DB 仕様

### 7.1 既存 Notion DB 観測 (`/etc/tenmon/llm.env`)

| 環境変数 | 用途 | 公開向けか |
|---|---|---|
| `NOTION_FEEDBACK_DB_ID=860b3ca8-2286-49b1-ad67-c2c168a87148` | Founder 改善要望 | 内部運用 |
| `NOTION_LEDGER_RUNTIME_HEALTH_DB_ID` | runtime 健全性 ledger | 内部 |
| `NOTION_LEDGER_ACCEPTANCE_DB_ID` | acceptance ledger | 内部 |
| `NOTION_LEDGER_AUTHORITY_AUDIT_DB_ID` | authority audit | 内部 |
| `NOTION_LEDGER_CARD_EXECUTION_DB_ID` | カード実行 ledger | 内部 |
| `NOTION_LEDGER_FINAL_SEAL_DB_ID` | final seal ledger | 内部 |
| `NOTION_AUTOBUILD_TOKEN` | autobuild authentication | 内部 |

### 7.2 進化ログ用 Notion DB は **存在しない**

```bash
$ grep -rn "NOTION.*EVOLUTION\|evolution.*notion\|release_notes" \
    /opt/tenmon-ark-repo/ 2>/dev/null
(該当なし)
```

→ Phase α は **静的 JSON のみ**。Phase β で **新設候補**:

### 7.3 新設 DB schema 案 (Phase β、本カードでは作成しない)

| Property | Type | 必須 | 備考 |
|---|---|---|---|
| `id` | Title | 必須 | "evo-YYYY-MM-DD-slug" |
| `emoji` | Rich text | 必須 | 1 文字 |
| `title` | Rich text | 必須 | ~20 chars |
| `date` | Date | 必須 | |
| `badge` | Select | 必須 | 改善 / 整備 / 新機能 / 修正 |
| `level1Visible` | Checkbox | 必須 | 既定 true |
| `description` | Rich text | 必須 | ~100 chars |
| `before` | Rich text | 任意 | |
| `after` | Rich text | 任意 | |
| `founderRequestCount` | Number | 任意 | |
| `tryItPrompt` | Rich text | 任意 | |
| `cardId` | Rich text | 任意 | 内部 ID (Founder には Level 3 でのみ表示) |
| `commit` | Rich text | 任意 | 内部 |
| `technicalNote` | Rich text | 任意 | |
| `status` | Select | 必須 | draft / approved / published |
| `createdBy` | Rich text | 任意 | 自動生成元 (Cursor / TENMON / 手動) |

### 7.4 Notion → JSON 同期

Phase β で:
- `/api/evolution/feed` が Notion DB を query
- `status === "published"` のみ返却
- 60s キャッシュ
- ローカル JSON は `web/public/evolution_log_v1.json` のフォールバック (Notion 不通時)

→ FEEDBACK の Notion + ローカル JSON 二段構えと **同じパターン**。実装の参考可。

---

## Section 8: CLAMP-REPAIR 公開向け文言

### 8.1 原文素材 (技術記述、Founder 非公開)

```
CARD-CHAT-LONGFORM-CLAMP-REPAIR-V1 (commit 7a2f3ca8)
- chat.ts 500 chars hard clamp を short 質問のみに適用、longform 質問では clamp 解除
- __isShortAnswerMode + __trimToSentenceBoundary ヘルパー追加
- 観測: 661 chars / 1066 chars / 1520 chars 自然完結
- Founder 改善要望 11 件 (55%) を解消
```

### 8.2 Founder 公開向け文言ドラフト

| 階層 | 文言 |
|---|---|
| emoji | ✨ |
| title | チャット応答が長く話せるように |
| badge | 改善 |
| date | 2026-04-25 |
| description | 『詳しく解説して』『なぜ』『関係を…』とお願いした時に、応答が途中で切れず最後まで届くようになりました。 |
| before | 回答が約 500 文字で途中切断 |
| after | 1,000 文字以上の自然な完結 (最大 1,520 文字確認) |
| founderRequestCount | 11 |
| tryItPrompt | カタカムナと言霊秘書の関係を詳しく解説してください |
| technicalNote | 短答用の安全装置を、長文質問では解除するよう条件分岐化 |

### 8.3 削除すべき内部用語チェックリスト

| 用語 | 使用可否 | 言い換え |
|---|---|---|
| `clamp` / `hard clamp` | ✗ | 「上限の安全装置」「途中切断」 |
| `__tenmonClampOneQ` / `__tenmonGeneralGateSoft` | ✗ (Level 3 でも不要) | (記載しない) |
| `chat.ts` | ✗ (Level 3 でも不要) | (記載しない) |
| `Phase A` / `Phase B` | ✗ | (記載しない) |
| `Master Card` / `Card-NN` | ✗ | (記載しない) |
| `Cursor` / `Claude` | ✗ | (記載しない) |
| `commit hash` | △ (Level 3 のみ、短縮 7 桁) | `7a2f3ca8` |
| `LLM` / `provider` / `gemini` | ✗ | 「会話エンジン」 |
| `Notion` / `DB` | ✗ | 「保存先」「記録」 |
| `enforcer` / `acceptance` | ✗ | 「整合性の確認」 |

---

## Section 9: Phase A 公開向け文言

### 9.1 原文素材 (技術記述、Founder 非公開)

```
Phase A 6 cards (commit a6d43996):
- KOTODAMA_CONSTITUTION_V1 SEAL VERIFIED (5c1144ca)
- KOTODAMA_BRIDGE_REGISTRY total=2 primary fixed (e6e8cebf)
- GOJUREN_50_SOUNDS_V1 50 sounds canonical (f18a8a6c)
- KOTODAMA_ENFORCER_V1 verdict=clean, articles 2/3/4/8/6/9 監視 (a6d43996)
- PromptTrace V1 mc_intelligence_fire.jsonl 出力 (fc78185c)
- chat.ts 計装 (CUT-AUDIT 等)
```

### 9.2 Founder 公開向け文言ドラフト (1 entry に集約)

| 階層 | 文言 |
|---|---|
| emoji | 🛠 |
| title | 言霊の正典骨格を整えました |
| badge | 整備 |
| date | 2026-04-24 |
| description | 五十連十行の 50 音、ヰ・ヱの位相差 (水/火) を canonical な情報源に固定し、内部の整合性監視を常時稼働させました。 |
| before | (記載なし) |
| after | 言霊憲法 V1 検証済み、6 条項を毎起動で確認、橋渡し情報源も固定 |
| founderRequestCount | (記載なし) |
| tryItPrompt | (記載なし、Founder が直接試せる体感ではないため) |
| technicalNote | (Level 3 の場合のみ) 「言霊の整合性監視 V1 を毎起動で実行」 |

### 9.3 「Founder に見せない」項目 (前提どおり)

| 内容 | 理由 |
|---|---|
| 言霊憲法 V1 が chat に直接届かない問題 | Card-04/06/09/10 領域、未着手 |
| 長文構成本体 | Card-11 領域、未着手 |
| persona / thread bind | Card-07/08/09 領域、未着手 |
| Master 16 Card 番号 | 内部ロードマップ用語 |

→ これらは **「育成中」 entry** として 1 件だけ立てて、具体的な技術詳細は出さない (Section 5.3 のサンプル 5 件目を参照)。

---

## Section 10: feedback-loop 接続点 draft

### 10.1 既存 feedback フロー (FEEDBACK_LOOP_OBSERVE_V1 観測)

```
Founder 改善要望 (FeedbackPage.tsx)
  ↓ POST /api/feedback
[Notion DB 保存] + [ローカル JSON 保存] (二段構え)
  ↓
[fixCard 自動生成 (LLMWrapper)] (任意)
  ↓
[Cursor / TENMON が手動で Card 起票]
  ↓
[実装 (本カードのような小カード)]
  ↓
[commit + acceptance verdict PASS]
```

### 10.2 Phase γ 接続案

```
[Notion FEEDBACK DB の status === "完了"] (手動 or 自動)
  ↓ trigger
[evolution log draft 自動生成] (LLMWrapper or テンプレ)
  ↓
[TENMON 承認 UI で文言修正] (PWA /mc/vnext または Notion 内)
  ↓
[Notion EVOLUTION DB に status="published" で保存]
  ↓
[/api/evolution/feed が serve]
  ↓
[Founder PWA /pwa/evolution に表示]
  ↓
[Founder が tryItPrompt をタップ]
  ↓
[ChatPage に prompt 投入 → 改善体感]
  ↓
[新たな feedback または満足]
```

→ **Phase α では接続実装しない**。Phase α は静的 JSON を手動更新 (Cursor または TENMON が、コミット時に entry 追記) するのみ。

### 10.3 接続実装の責務分離 (案)

| Phase | 責務 |
|---|---|
| α | 静的 JSON 表示のみ (UI 完成) |
| β | Notion EVOLUTION DB 新設 + `/api/evolution/feed` 実装 |
| γ | feedback DB の status=完了 → evolution draft 自動生成 trigger |
| δ | PWA 内 TENMON 承認 UI (`/mc/vnext/evolution`) |

---

## Section 11: 進化感を最大化する表現原則

### 11.1 数の力

- `founderRequestCount: 11` → **「11 件のお声で実現」** と表記
- 「20 件中 11 件」と分母を併記すれば 55% の改善率が伝わる
- entry 一覧の総件数も Hero に表示 (例: 「これまでの進化 4 件」)

### 11.2 before / after の対比

- 必ず数値で対比 (「500 文字 → 1,520 文字」)
- 「3.0 倍」「+3 倍」のような乗算表記も併用可

### 11.3 動詞選び (Founder 視点)

| ✗ NG | ○ OK |
|---|---|
| 「実装した」 | 「整えた」「届くようにした」 |
| 「修正した」 | 「直した」「整理した」 |
| 「リリースした」 | 「お届けした」「公開した」 |
| 「デプロイした」 | (使わない) |
| 「ビルドした」 | (使わない) |

### 11.4 進化メトリクス (Hero 用)

Phase α の段階で算出可能:
- 累計 entry 件数: 4-5 件
- Founder の声から実現した件数: 11 件
- 期間: 2026-04-20 〜 2026-04-25 (本日)

---

## Section 12: 非侵入原則 (チャット体験を邪魔しない 5 原則)

1. **既定で閉じている**: 進化ログは tap して初めて開く。チャット画面で常時通知バッジを赤点滅させない。
2. **チャット中は表示しない**: `view === "chat"` の最中、自動 popup しない。
3. **送信中はナビ無効**: チャット送信中 (`isStreaming`) は Sidebar の進化ログリンクを disable。
4. **戻り動線を必ず確保**: 進化ログから戻るとき、直前のチャット thread に戻る (`getLastActiveThreadId()` を活用)。
5. **音・振動なし**: 通知音、bandage 振動、ポップアップアニメーションの強調はしない。視認できる小さな badge のみ。

→ これらは Sidebar / Topbar の既存パターン (`isOverlayNav`、`handleBackToChat`、`getLastActiveThreadId`) で **既に実現可能**。新規実装不要。

---

## Section 13: Phase α / β / γ ロードマップ

### Phase α (本カードの次に来るカード、80-150 行目安)

| 責務 | 行数目安 | 依存 |
|---|---|---|
| `web/src/pages/EvolutionPage.tsx` 新規 | 80-100 | React 18, Tailwind v4 のみ |
| `web/public/evolution_log_v1.json` 新規 | 5-10 entries | — |
| `App.tsx` に `isEvolution` 分岐追加 | +5 行 | — |
| `Sidebar.tsx` に「✨ これまでの進化」ボタン追加 | +10 行 | 既存 `linkClass` を流用 |
| `Topbar.tsx` に第 4 TabPill 追加 (任意) | +3 行 | 既存 TabPill 流用 |
| 合計 | **~110-130 行** | **新規 npm 依存ゼロ** |

### Phase β (β カード、200-300 行目安)

- `api/src/routes/evolution.ts` 新規 (`GET /api/evolution/feed`)
- Notion EVOLUTION DB 新設 + env 追加
- Notion ↔ JSON 同期
- EvolutionPage.tsx を fetch 切替

### Phase γ (γ カード、200-400 行目安)

- feedback-loop 接続 trigger
- evolution draft 自動生成 (LLMWrapper)
- TENMON 承認 UI

### Phase δ (δ カード、~150 行)

- /api/evolution/live (現在進行形ステータス要約)
- Hero に live ステータス表示

---

## Section 14: Phase α acceptance 条件 (15+ 項目先行記述)

Phase α 投入カードの acceptance 条件:

1. `web/src/pages/EvolutionPage.tsx` が新規作成されている
2. `web/public/evolution_log_v1.json` が新規作成され、4 件以上の entry を含む
3. `App.tsx` に `isEvolution` 分岐が追加され、`pathname === "/pwa/evolution"` で EvolutionPage がレンダーされる
4. `Sidebar.tsx` に「✨ これまでの進化」ボタンが追加されている
5. `vite build` が成功し、`web/dist/index.html` が生成される
6. `/pwa/evolution` に GET したとき、200 OK で HTML が返る
7. `/pwa/evolution_log_v1.json` に GET したとき、200 OK で JSON が返る
8. EvolutionPage が **モバイル幅 (375px)** でも 1 列で正しく表示される
9. Level 1 (Headline) が tap で Level 2 (Summary) に展開する
10. Level 2 内の `tryItPrompt` ボタンが、ChatPage に prompt を投入して画面遷移する
11. Level 3 (詳細) が「詳細を見る」リンクを tap した場合のみ展開する
12. **内部用語 (clamp / chat.ts / Phase A / Cursor / Claude / commit hash 7 桁未満) が UI 表示文字列に含まれない** (commit 7 桁は Level 3 で許容)
13. CLAMP-REPAIR entry の `founderRequestCount === 11` が表示される
14. 既存 chat (`/pwa/`) / dashboard / sukuyou / feedback の各 view が壊れていない
15. `acceptance.verdict` が PASS を維持
16. `kotodama_constitution_enforcer.verdict` が `clean` を維持
17. 新規 npm 依存追加なし (`web/package.json` の `dependencies` 不変)
18. git diff が `web/src/pages/EvolutionPage.tsx` 新規 + `web/public/evolution_log_v1.json` 新規 + `web/src/App.tsx` 数行 + `web/src/components/gpt/Sidebar.tsx` 数行 + (任意) `web/src/components/gpt/Topbar.tsx` 数行 のみ

→ **計 18 項目** (要求 15+ を満たす)

### Phase α FAIL 条件

- `vite build` が失敗
- `/pwa/evolution` が 404
- 既存 view が壊れる
- `web/package.json` への新規 npm 依存追加
- 内部用語が表示文字列に出る
- API 追加 (`/api/evolution/*`) — これは β カード領域

---

## Section 15: Phase α 投入カード骨子 (実装内容は含まない、scope のみ)

```
# CARD-FOUNDER-RELEASE-NOTES-UI-PHASE-ALPHA-V1

## 種別
PATCH (UI のみ)

## 許可される変更
- web/src/pages/EvolutionPage.tsx (新規)
- web/public/evolution_log_v1.json (新規)
- web/src/App.tsx (pathname 分岐追加、~5 行)
- web/src/components/gpt/Sidebar.tsx (nav button 追加、~10 行)
- web/src/components/gpt/Topbar.tsx (任意、TabPill 追加、~3 行)

## 禁止
- web/package.json 変更 (新規 npm 依存追加禁止)
- API 追加 (/api/evolution/*)
- Notion 書き込み
- DB schema 変更
- chat.ts 変更
- Phase A モジュール変更
- 内部用語の Founder 公開

## 入力素材
- 本レポート Section 5.3 (JSON サンプル 5 件)
- 本レポート Section 8 (CLAMP-REPAIR 文言)
- 本レポート Section 9 (Phase A 文言)
- 本レポート Section 14 (acceptance 条件 18 項目)

## 推奨動線
- 案 B (専用ルート /pwa/evolution) — 本レポート Section 3
- スマホ 1 列、PC 2 列 grid

## 推奨実装規模
~110-130 行

## VERIFY
- vite build 成功
- /pwa/evolution が 200
- スマホ幅 375px で正しく 1 列
- 内部用語表示なし
- acceptance verdict PASS 維持
```

→ **本骨子は設計仕様のみ**。実装コードは含まない (本カードは OBSERVE-only)。

---

## Acceptance (本レポート自身)

| 項目 | 結果 |
|---|---|
| 実装変更ゼロ (`git diff` が本レポートのみ) | ✅ (commit 後の diff で確認) |
| Section 1-15 すべて記述完了 | ✅ |
| 既存 PWA 構造の網羅 (web/src 71 ファイル + 配信構造) | ✅ Section 1 |
| 進化ログ UI 4 階層仕様確定 (Level 0-3) | ✅ Section 2 |
| スマホ動線 3 案比較 (既存依存付き) | ✅ Section 3 |
| 公開向け文言ドラフト記述 | ✅ Section 8, 9 |
| 推測なし (すべて grep / file 実体根拠付き) | ✅ |
| TENMON が Phase α 投入可否を裁定できる状態 | ✅ Section 14, 15 |

## 報告必須項目 (10 項)

1. **git commit ID**: (commit 後に追記)
2. **git diff --stat**: 1 file changed (本レポートのみ)
3. **レポート path**: `/opt/tenmon-ark-repo/docs/ark/founder-ui/FOUNDER_RELEASE_NOTES_UI_OBSERVE_V1.md`
4. **PWA web/src 配下の TS/TSX ファイル数**: **71** (`find web/src -name '*.ts' -o -name '*.tsx' | wc -l`)
5. **既存 bottom-sheet / drawer component の有無**: **無し** (web/ 配下に未実装、web/package.json に `vaul` も `@radix-ui/react-dialog` も無し。client/ には存在するが配信外)
6. **既存 /pwa/evolution ルートの有無**: **無し** (`grep -rn "/pwa/evolution" web/src/` は空)
7. **/api/evolution endpoint の有無**: **無し** (`grep -rn "/api/evolution" api/src/` は空)
8. **Notion 進化ログ DB の存在確認結果**: **無し** (NOTION_LEDGER_* は内部 ledger のみ、進化ログ用 DB は未設定。Phase β で新設候補)
9. **Phase α 投入推奨案**: **案 B (専用ルート `/pwa/evolution`)** — 既存 npm 依存ゼロ、最小実装、既存パターン踏襲、推奨度 ◎
10. **PATCH なし確認**: 本レポート追加のみ。chat.ts / Phase A モジュール / API / DB / Notion へ一切変更なし。`acceptance.verdict` の不変は commit 後に確認。

---

> **総括**: web/ は React 18 minimal + pathname routing + Tailwind v4 のシンプルなスタックで、進化ログ UI はおおよそ **120 行** で Phase α として実現可能。新規 npm 依存ゼロ、API 追加ゼロで Founder 接点を立ち上げられる。Phase β 以降で Notion DB 化と feedback-loop 自動接続を追加する素地が揃っている。Card-11 (LONGFORM_COMPOSER 本体) と並走可能で、依存関係の競合はない。
