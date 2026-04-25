# FEEDBACK_LOOP_OBSERVE_V1

- **日時**: 2026-04-25 JST
- **監査者**: Cursor（OBSERVE-only / PATCH 禁止）
- **parent_commit**: `ce0f1ec9`（PRE_PHASE_B_INTEGRATION_AUDIT_V1 直後 / `feature/unfreeze-v4`）
- **対象**: Founder 改善要望ページ → Notion 改善要望 DB → ローカル fallback の経路全体
- **本レポート唯一の変更**: 本ファイル新規追加のみ

> **本カードは OBSERVE only**: コード変更 / DB 変更 / Notion 書込み / ステータス変更 / deploy / restart / 改善要望の自動実装はいずれも行っていない。Notion DB へは **GET 由来の API 経由でも一切アクセスしていない**（本監査では `NOTION_TOKEN` 不使用 / Notion API 直接呼出 0 件）。実体観測は **production の `GET /api/feedback/history`（read-only）** と **`api/data/feedback/*.json` のローカル read** のみ。

---

## Section 1: Notion 改善要望 DB の場所（実体根拠）

### 1.1 Notion DB ID（hard-coded fallback + env override）

`api/src/routes/feedback.ts:13` 実体:

```ts
const NOTION_DB_ID = process.env.NOTION_FEEDBACK_DB_ID || "860b3ca8-2286-49b1-ad67-c2c168a87148";
const NOTION_VERSION = "2022-06-28";
```

| 項目 | 値（実測） |
|---|---|
| Notion Database ID | `860b3ca8-2286-49b1-ad67-c2c168a87148` |
| Env override key | `NOTION_FEEDBACK_DB_ID` |
| Notion API version | `2022-06-28` |
| Token env keys | `NOTION_TOKEN` または `NOTION_API_KEY`（実値は本監査で不取得） |
| API endpoint | `https://api.notion.com/v1/pages` (POST) / `/v1/pages/{id}` (PATCH) |
| Local fallback dir | `process.cwd()/data/feedback`（本番 cwd `/opt/tenmon-ark-repo/api` → 実体 `/opt/tenmon-ark-repo/api/data/feedback/`） |

### 1.2 経路の起点／終点（route mount 実測）

`api/src/index.ts`（grep 実測）:

```
36:import { feedbackRouter } from "./routes/feedback.js";
191:app.use("/api", feedbackRouter);
```

| ルート | メソッド | 機能 |
|---|---|---|
| `/api/feedback` | POST | Notion 保存 + ローカル fallback 保存（`saveToNotion` → `saveToLocal`） |
| `/api/feedback/history` | GET | ローカル fallback の最新 50 件返却（**production で認証不要、http=200 / 42150 bytes 実測**） |
| `/api/feedback/generate-card` | POST | LLM で修正カード生成 → Notion ページ更新（PATCH） |
| `/api/feedback/cards` | GET | `fixCard` を持つ要望のみ返却（**http=200 / 17740 bytes 実測**） |

### 1.3 投稿フロントエンド（実体）

`web/src/pages/FeedbackPage.tsx`（682 行、4/18 改）と `client/src/pages/FeedbackPage.tsx`（483 行）が併存。両 SPA から POST `/api/feedback` が発火する。

### 1.4 関連ファイル一覧（grep 実測）

| path | 役割 | 行数 |
|---|---|---:|
| `api/src/routes/feedback.ts` | Notion 保存 / 履歴 / カード生成 | 427 |
| `api/src/routes/founderRequest.ts` | Founder 専用要望（別系統 endpoint） | 186 |
| `web/src/pages/FeedbackPage.tsx` | 投稿フォーム UI（本流） | 682 |
| `client/src/pages/FeedbackPage.tsx` | 旧 SPA 投稿フォーム | 483 |
| `mc/bin/collect_feedback.sh` | MC §12 集計（rating 平均、最近 7 日件数） | 46 |
| `api/data/feedback/` | ローカル fallback ディレクトリ | (46 ファイル) |

---

## Section 2: DB schema（実体根拠）

### 2.1 Notion DB プロパティ（`feedback.ts:58-89` 実体）

| プロパティ名 | Notion 型 | 必須 | 既定値 / enum |
|---|---|---|---|
| タイトル | title | ○ | - |
| カテゴリ | select | ○ | 10 値（VALID_CATEGORIES） |
| 詳細内容 | rich_text | ○ | （2000 字でカット） |
| ユーザー優先度 | select | ○ | `高 / 中 / 低`（VALID_PRIORITIES） |
| ステータス | status | - | **既定 `未着手`** |
| AI 優先度 | select | - | **既定 `未解析`**（後で `critical/high/medium/low` に更新） |
| 受付番号 | rich_text | - | `FB-YYYYMMDD-XXXX` 形式（generateReceiptNumber） |
| 受信日時 | date | - | ISO 8601 |
| Founder 区分 | checkbox | - | **既定 `true`**（FeedbackPage は Founder 専用導線） |
| 構築タスク化 | checkbox | - | 既定 `false`、`generate-card` 成功時 `true` |
| 類似件数 | number | - | 既定 `0` |
| ユーザー ID | rich_text | - | optional |
| ユーザーメール | email | - | optional |
| 使用デバイス | rich_text | - | optional |
| ページ URL | url | - | optional |
| 再現手順 | rich_text | - | optional（2000 字カット） |
| 添付画像 URL | rich_text | - | optional |
| AI 要約 | rich_text | - | `generate-card` 後に PATCH で書き込み |
| 修正カード案 | rich_text | - | 同上 |

### 2.2 categories enum（実測）

`feedback.ts:28-32`:

```
宿曜鑑定 / チャット機能 / ダッシュボード / UI/デザイン / 表示・動作の不具合 /
新機能の要望 / 文章・口調 / スマホ使用感 / 保存・共有 / その他
```

→ ただし **production 集計では enum 外の `UI/UX`（2 件）と `同期`（1 件）が混在**（後述 §3.2）。これは古い投稿または開発系の API 直叩きが原因（4/15-16 のテスト群）。

### 2.3 priority enum（実測）

`高 / 中 / 低`（feedback.ts:34）— 集計上ぶれなし。

### 2.4 ローカル fallback JSON 形（実測 1 件サンプル）

```json
{
  "title": "...", "category": "...", "detail": "...",
  "priority": "高|中|低", "receiptNumber": "FB-YYYYMMDD-XXXX",
  "userId": "...", "userEmail": "...", "isFounder": true,
  "device": "...", "pageUrl": "...", "reproSteps": "...", "imageUrl": "...",
  "notionSaved": true, "notionPageId": "34...", "notionError": null,
  "createdAt": "ISO8601",
  "fixCard": { "ai_summary":"...", "problem_type":"...", "ai_priority":"...",
               "impact_scope":"...", "suggested_fix_title":"...",
               "suggested_fix_detail":"...", "acceptance_test":"...",
               "user_facing_note":"..." },
  "fixCardGeneratedAt": "ISO8601"
}
```

### 2.5 status / threadId に関する所見

- カード本文の `status / category / priority / createdAt / requester / threadId` のうち **`threadId` は schema に存在しない**（実体: feedback.ts のプロパティ列挙、ローカル JSON サンプル 46 件 grep）。**`pageUrl`** が代替（投稿時のページ URL を Notion 側に格納）。
- **`requester`** はローカル JSON では `userId` / `userEmail` / `isFounder` の 3 セットで表現。Notion 側は `ユーザー ID` / `ユーザーメール` / `Founder 区分`。
- **`status`** は Notion 側のみ管理（`未着手`/その他 status）。**ローカル fallback JSON には `status` field がない**ため、本監査での「未処理件数」は **Notion 側の status を直接読まず、`fixCard` 生成有無 と Notion 同期成否で代替**する（§3.4）。

---

## Section 3: 未処理要望の一覧化（production 実測）

### 3.1 全件サマリー（production `GET /api/feedback/history` 4/25 12:42 取得）

| 項目 | 値 |
|---|---:|
| 総件数（local fallback 経由） | **46** |
| 期間 | 2026-04-14T23:46:13Z 〜 2026-04-23T00:17:10Z（**10 日間**） |
| `notionSaved=true` 件数 | **46 / 46（100%）** |
| `isFounder=true` 件数 | **46 / 46（100%）** |
| `fixCard` 生成済 件数 | **12 / 46（26%）** |
| `fixCard` 未生成 件数 | **34 / 46（74%）** |

### 3.2 カテゴリ別件数（全 46 件）

| カテゴリ | 件数 |
|---|---:|
| チャット機能 | 24 |
| UI/デザイン | 9 |
| 宿曜鑑定 | 5 |
| UI/UX（enum 外、テスト系のみ） | 2 |
| スマホ使用感 | 2 |
| その他 | 1 |
| ダッシュボード | 1 |
| 同期（enum 外、テスト系） | 1 |
| 表示・動作の不具合 | 1 |

### 3.3 優先度別件数（全 46 件）

| priority | 件数 |
|---|---:|
| 中 | 34 |
| 低 | 6 |
| 高 | 6 |

### 3.4 「真のユーザー要望」と「テスト系」の分離（実測フィルタ）

タイトルに `test|テスト|TEST|PUBLIC_RELEASE|STEP|forensic|recovery|loop|TENMON_|final completion|deploy` を含むものを **テスト系**と判定（regex 実測）。

| 区分 | 件数 |
|---|---:|
| **真の要望（Founder 由来）** | **20** |
| テスト系（開発側の生成物） | 26 |

→ 以降 §3.5 / §4 / §5 / §6 は **真の要望 20 件のみ** を分析対象とする。

### 3.5 真の要望 20 件の `priority × category` クロス（実測）

| priority / category | 件数 |
|---|---:|
| 中 / チャット機能 | 8 |
| 高 / チャット機能 | 2 |
| 高 / スマホ使用感 | 2 |
| 低 / チャット機能 | 2 |
| 中 / 宿曜鑑定 | 1 |
| 中 / 表示・動作の不具合 | 1 |
| 高 / UI/デザイン | 1 |
| 高 / ダッシュボード | 1 |
| 低 / UI/デザイン | 1 |
| 低 / 宿曜鑑定 | 1 |

→ **チャット機能 12 件 / 全 20 件 = 60%** に集中。

---

## Section 4: 要望のカテゴリ分類（テーマ単位、実測根拠）

真の要望 20 件をテーマ単位で再分類。

### 4.1 テーマ A: 「**チャット応答が途中で切れる**」（11 件 / 20 件 = 55%）

タイトル regex `途切|途中|切れ|中途` でヒット 11 件（実測）:

| 受付 | priority | category | タイトル抜粋 |
|---|---|---|---|
| FB-20260418-5894 | 高 | スマホ使用感 | 質問への回答が途中で切れる |
| FB-20260420-5767 | 高 | チャット機能 | チャットの回答が途中で切れる |
| FB-20260422-7176 | 高 | チャット機能 | 聞いた答えが途中で途切れる |
| FB-20260416-4252 | 中 | チャット機能 | 宿曜鑑定チャットの長文切れ・会話精度・再補正機能の改善希望 |
| FB-20260418-4658 | 中 | チャット機能 | 回答が途中で途切れます |
| FB-20260418-9731 | 中 | 表示・動作の不具合 | チャットの応答の途中で途切れる |
| FB-20260419-4211 | 中 | チャット機能 | チャットの返答が途切れる。簡単な言葉で続きを求めると、はじめから説明しないと答えられない。 |
| FB-20260420-7818 | 中 | チャット機能 | よくチャット内容が途中で切れる |
| FB-20260421-8666 | 中 | チャット機能 | 回答がかなり短く途切れます |
| FB-20260422-7925 | 中 | チャット機能 | チャットの途中で文章が終わる |
| FB-20260423-9383 | 低 | チャット機能 | チャットでの質問の回答が途中までしか出てこない |

**観測される共通症状**:
- 2-10 行で応答が打ち切られる（FB-20260420-5767: 「2,3 行で切れてしまう」、FB-20260421-8666: 「10 行もいかない位で途切れ」）
- 「続きをお願い」促しが必要（FB-20260423-9383）
- 続きを求めると「全く別の話」になる（FB-20260418-4658 / FB-20260419-4211）
- スマホで顕著（FB-20260418-5894 / FB-20260422-7176）

**実装側との対応関係**:
- Phase A の `CHAT_LENGTH_REGRESSION_AUDIT_V1`（commit `d9aec8ff` / `docs/ark/khs/CHAT_LENGTH_REGRESSION_AUDIT_V1_20260424.md` 237 行）が **同症状を計測側で観測済み**。
- Phase A の `PROMPT_TRACE_V1`（commit `fc78185c` / `intelligenceFireTracker.ts:310 行`）が **clause 別 length / total prompt length / response length** を監視軸として導入済み。
- `prompt_trace_summary_24h.avg_response_length=454` / `avg_prompt_total_length=6679` の **runtime ベースライン**は既に取得可（`/api/mc/vnext/intelligence` 既存値）。

→ **Founder 側 11 件と Phase A 計測 1 経路が同一テーマで一致**（実体根拠）。

### 4.2 テーマ B: 「**宿曜鑑定の本宿違い / 深掘りボタン挙動**」（2 件）

| 受付 | priority | category | タイトル / detail 要点 |
|---|---|---|---|
| FB-20260420-4140 | 中 | チャット機能 | 「宿曜鑑定で深掘りしたい」をクリックすると **本宿と異なる宿の鑑定**結果で続く |
| FB-20260422-3783 | 低 | 宿曜鑑定 | 「深掘りがしたい」の内容が **異なる宿曜**となっている / 削除ボタン要望 |

→ **persona / thread 系**の不整合と推察される（thread→宿曜 binding が user の本宿と乖離）。**Master Card-09**（THREAD_CENTER_SOVEREIGNTY_LOCK_V1）系の領域。

### 4.3 テーマ C: 「**メタ思考プロセスがチャット表面に露出**」（1 件）

| 受付 | priority | category | detail 要点 |
|---|---|---|---|
| FB-20260418-8477 | 中 | 宿曜鑑定 | 「最初に **考え方や答え方のプロセスまで出てきてしまっていました**」 |

→ **Master Card-10**（SURFACE_META_GENERATION_ELIMINATION_V1）が直接対応する症状。

### 4.4 テーマ D: 「**UI 軽微（メニュー表示・改行送信・タブ位置）**」（4 件）

| 受付 | priority | category | タイトル |
|---|---|---|---|
| FB-20260414-3524 | 高 | UI/デザイン | メニューもじが薄くて見えない |
| FB-20260418-9932 | 高 | スマホ使用感 | **改行を押すとそのまま送信**になる |
| FB-20260421-9319 | 低 | UI/デザイン | 上部タブのメニュー表示について（一番上までスクロール必須） |
| FB-20260422-3783 | 低 | 宿曜鑑定 | チャット欄に **削除ボタン**も欲しい（テーマ B と兼務） |

→ **Master 16 Card 範囲外**（UI レイヤーの単独 quick fix で対応可能）。

### 4.5 テーマ E: 「**新機能要望**」（3 件）

| 受付 | priority | category | タイトル |
|---|---|---|---|
| FB-20260415-7405 | 高 | ダッシュボード | 未分類トークルーム → トークフォルダーへの **drag & drop 移動** |
| FB-20260420-5659 | 低 | チャット機能 | **写真の解析**（写真の貼付・解析機能） |
| FB-20260420-2883 | 中 | チャット機能 | 添付機能がないので画像で症状を送れない（写真添付要望と兼務） |

→ 写真系は **Master Card-13**（OCR_TO_SOURCE_TO_PROMOTION_PIPELINE_V1）の OCR 入口と関連。  
→ ドロップ移動は **Master 16 Card 範囲外**（UI feature）。

---

## Section 5: 緊急度 × 実装難易度（仮判定）

| テーマ | Founder 件数 | 実装難易度 | 緊急度（仮） |
|---|---:|---|---|
| A. 長文切れ | 11 | **高**（chat.ts 表層生成器の構造改修、Phase B Card-10/11 領域） | **最優先** |
| B. 宿曜鑑定の本宿違い | 2 | 中（persona / thread binding の本宿検証） | 高 |
| C. メタ思考露出 | 1 | 中（system prompt + 出力フィルタ） | 中（Phase B 自然対応） |
| D. UI 軽微 | 4 | 低（独立 quick fix） | 高（Founder 高優先 2 件含む） |
| E. 新機能（写真・DnD） | 3 | 中-高（OCR or DnD 実装） | 中-低 |

→ **緊急度 × 件数の積**で見ると **テーマ A 11 件**が圧倒的。Phase B Master Card 群（特に Card-10/11）の実装によって **構造的に解消**されるべきもの。

---

## Section 6: Master Card-01〜16 との関連（実測根拠紐づけ）

| Master Card | 関連する Founder 要望 | 関連件数 | 関連度 |
|---|---|---:|---|
| Card-01 SOURCE_REGISTRY_SCHEMA_EXPANSION_V1 | （直接の Founder 要望なし、内部基盤） | 0 | - |
| Card-02 SOURCE_ANALYSIS_LEDGER_ACTIVATION_V1 | （内部基盤） | 0 | - |
| Card-03 INGEST_OCR_NAS_NOTION_SOURCE_BIND_V1 | テーマ E（写真解析）を OCR 化する場合の入口 | 2 | 弱 |
| Card-04 MEMORY_UNITS_DISTILLATION_RUNTIME_V1 | （直接の Founder 要望なし） | 0 | - |
| Card-05 MEMORY_PROJECTION_LOG_RUNTIME_V1 | （内部基盤） | 0 | - |
| Card-06 PROMOTION_GATE_MAINLINE_RUNTIME_V2 | （内部基盤） | 0 | - |
| Card-07 PERSONA_KNOWLEDGE_BINDINGS_RUNTIME_V1 | テーマ B（本宿違い）の persona 側 | 2 | 中 |
| Card-08 PERSONA_MEMORY_POLICY_AND_THREAD_LINK_V1 | テーマ B（本宿違い）の thread 側 | 2 | 中 |
| Card-09 THREAD_CENTER_SOVEREIGNTY_LOCK_V1 | テーマ B（本宿違い） / 「続きを言うと別話に」 | 4 | 強 |
| Card-10 SURFACE_META_GENERATION_ELIMINATION_V1 | テーマ C（メタ思考露出） | 1 | **直結** |
| Card-11 LONGFORM_COMPOSER_REALIZATION_V1 | **テーマ A（長文切れ） 11 件**全件 | **11** | **直結（最強）** |
| Card-12 ACCEPTANCE_PROBE_TO_PROMOTION_BIND_V1 | acceptance probe に「ユーザー報告のチャット切れ件数」を組込 | n/a | 弱（メタ） |
| Card-13 OCR_TO_SOURCE_TO_PROMOTION_PIPELINE_V1 | テーマ E（写真解析） | 2 | 中 |
| Card-14 AUTONOMY_FAILSOFT_AND_LOCAL_PENDING_V1 | （内部基盤） | 0 | - |
| Card-15 SEAL_CONTRACT_REDESIGN_V1 | （内部基盤） | 0 | - |
| Card-16 FINAL_MASTER_INTEGRATION_ACCEPTANCE_V1 | 全 Founder 要望の解消検証ゲート | n/a | メタ |
| **(Master 16 範囲外) UI quick** | テーマ D（メニュー文字色 / 改行送信 / タブ位置 / 削除ボタン） | 4 | 別経路 |

→ **要望 20 件中 18 件**が Master 16 Card のいずれかに紐づく（直結 12 / 中 6 + UI 範囲外 4）。Card-11 が単独で Founder 要望の **過半数（11/20=55%）** を解消する見込み（**実体根拠**: Founder detail と Phase A `CHAT_LENGTH_REGRESSION_AUDIT_V1` の症状一致）。

---

## Section 7: すぐ直せる要望 vs 構造改善が必要な要望（分離）

### 7.1 「すぐ直せる」要望（4 件、独立 quick fix で 1-2 ファイル変更）

| 受付 | 要望 | 想定タッチ範囲 | 推定 LOC |
|---|---|---|---:|
| FB-20260414-3524 (高) | メニュー文字色の薄さ | `web/src/styles/*.css` の color/contrast 1 箇所 | 1-3 |
| FB-20260418-9932 (高) | 改行 = 送信動作 | `web/src/components/...ChatInput*.tsx` の keydown handler 修正（Shift+Enter で送信、Enter で改行） | 5-10 |
| FB-20260421-9319 (低) | 上部タブの常時表示 | `web/src/components/*Header*.tsx` の sticky 化 1 ファイル | 5-10 |
| FB-20260422-3783 (低) | チャット欄の削除ボタン | 既存 `delete` API + UI ボタン追加 1-2 ファイル | 10-30 |

→ **Phase B 着手と並行して個別 Cursor カードで処理可能**（Master 16 と独立）。**注意**: Cursor 側の実装可否判定は本監査範囲外。

### 7.2 「構造改善が必要」な要望（16 件、Master 16 Card による解消）

| テーマ | 件数 | 主担当 Card | 副次 Card |
|---|---:|---|---|
| A. 長文切れ | 11 | Card-11 | Card-10 / Card-12（acceptance probe） |
| B. 宿曜本宿違い | 2 | Card-09 | Card-07 / Card-08 |
| C. メタ思考露出 | 1 | Card-10 | - |
| E. 写真解析 | 2 | Card-13 | Card-03 |

---

## Section 8: 次に作るべき Cursor カード候補（実体根拠つき）

> 本セクションは **候補列挙のみ**。実装着手は TENMON 裁定。

### 8.1 構造系（Master 16 Card 配下、Phase B 連動）

これらは **Master 16 Card そのもの**を起こすカードであり、Cursor は本レポートでは命名提案のみに留める:

- **Phase B Card-11 着手カード**: `LONGFORM_COMPOSER_REALIZATION_V1`（Founder 11 件の長文切れを解消する設計＋実装の起点。Phase A の `prompt_trace_summary_24h` をベースラインとし、acceptance probe で前後比較）
- **Phase B Card-10 着手カード**: `SURFACE_META_GENERATION_ELIMINATION_V1`（テーマ C 解消、出力フィルタの構造化）
- **Phase B Card-09 着手カード**: `THREAD_CENTER_SOVEREIGNTY_LOCK_V1`（本宿違い 2 件＋「続きで別話に」系の thread sovereignty 問題を解消）

### 8.2 quick fix 系（Master 16 範囲外、独立カード候補）

| 候補カード ID | 対象要望 | 想定 scope |
|---|---|---|
| `CARD-FE-MENU-CONTRAST-FIX-V1` | FB-20260414-3524 | `web/src/styles/*.css` color 1-3 行 |
| `CARD-FE-CHAT-INPUT-NEWLINE-V1` | FB-20260418-9932 | ChatInput の keydown 仕様変更（Shift+Enter 送信、Enter で改行） |
| `CARD-FE-HEADER-STICKY-V1` | FB-20260421-9319 | ヘッダ sticky 化 |
| `CARD-FE-CHAT-DELETE-BTN-V1` | FB-20260422-3783 | 既存 delete API + 削除確認 UI |

### 8.3 改善ループ計装系（**新規構想**、本レポートが起点となるカード候補）

| 候補カード ID | 目的 | 想定 scope（OBSERVE / 実装の境界は別 TENMON 裁定） |
|---|---|---|
| `CARD-FEEDBACK-INTAKE-MIRROR-V1` | Notion 改善要望 DB を **READ-ONLY ミラー**として `kokuzo.sqlite` に同期する観測パイプ（DB write は新規 `feedback_mirror` テーブルのみ、既存テーブル無変更） | 中 |
| `CARD-FEEDBACK-CATEGORY-NORMALIZER-V1` | enum 外カテゴリ（`UI/UX` / `同期`）を `category_canon` に正規化する正規化ステップ。**Notion 書込み禁止のまま**ローカル mirror 側に正規化結果のみ保持 | 小 |
| `CARD-FEEDBACK-DUP-CLUSTER-V1` | 「長文切れ」系のような **同テーマ要望のクラスタリング**を fixCard 生成時に強化（現状 `類似件数=0` 固定 / `ai_priority=medium` 固定で機能していない） | 中 |
| `CARD-FEEDBACK-TO-CARD-PROBE-V1` | feedback の `fixCard` を **Cursor カード候補リスト**として `/api/mc/vnext/intelligence` に exposed する観測軸 | 小 |
| `CARD-FEEDBACK-MC-DASH-V1` | `/mc/` ダッシュボードに改善要望系の指標を追加（§9 参照） | 中 |

### 8.4 acceptance probe 連動系

| 候補カード ID | 目的 |
|---|---|
| `CARD-ACCEPTANCE-FROM-FEEDBACK-V1` | Card-12（ACCEPTANCE_PROBE_TO_PROMOTION_BIND_V1）の入力源として、**Founder 報告の症状件数推移**を probe 軸に追加（例: `chat_length_complaint_7d` が 0 件で PASS） |

---

## Section 9: `/mc/` 表示すべき指標の定義（観測指標カタログ）

現状 `/mc/` への入口は `mc/bin/collect_feedback.sh` のみで、**rating field を集計しているが Notion / ローカル fallback には rating field が存在しない**（実体: 全 46 件 grep で `rating` field 0 件）→ **`avg_rating_last_30days="0"` / `rating_sample_size=0` 固定**で機能していない。

### 9.1 既存と置き換える指標（観測のみ、実装は別カード）

| 指標 | 現状（実測） | 提案する観測値 | データ源 |
|---|---|---|---|
| `total_feedback_files` | 46（実測 OK） | 維持 | local fallback |
| `feedback_last_7days` | n/a（mc は動くが分析未活用） | 維持 | local fallback mtime |
| `avg_rating_last_30days` | **`0` 固定（不機能）** | **削除候補**（rating field なし） | - |
| `rating_sample_size` | **`0` 固定** | **削除候補** | - |

### 9.2 新規に追加すべき指標（提案）

| 指標 | 値（4/25 12:42 実測） | 計算根拠 |
|---|---:|---|
| `feedback_total_30d` | **46** | 全 46 件、4/14〜4/23 |
| `feedback_real_count_30d` | **20** | テスト系 26 を除外した実 Founder 要望 |
| `feedback_test_count_30d` | **26** | regex フィルタ実測 |
| `feedback_high_priority_open` | **6**（`fixCard` 未生成のうち priority=高） | priority=高 / fixCard==null |
| `feedback_chat_truncation_count` | **11** | テーマ A の 11 件 |
| `feedback_thread_sovereignty_count` | **2** | テーマ B |
| `feedback_meta_leak_count` | **1** | テーマ C |
| `feedback_ui_quick_count` | **4** | テーマ D |
| `feedback_new_feature_count` | **3** | テーマ E |
| `feedback_notion_sync_failed_count` | **0** | `notionSaved=false` 件数 |
| `feedback_fixcard_generated_rate` | **26%** (12/46) | fixCard != null / total |
| `feedback_fixcard_priority_distribution` | **`{medium:11, null:1}` のみ** | fixCard.ai_priority 集計 → **分類器の偏りも露呈** |
| `feedback_master_card_link_top` | **Card-11 (11), Card-09 (4), Card-13 (2), Card-10 (1)** | §6 表 |
| `feedback_unmapped_master16_count` | **4**（テーマ D） | Master 16 範囲外 = UI quick |

### 9.3 表示先（提案）

- **`/api/mc/vnext/intelligence`** に `feedback_loop` セクションを追加（**新規 Cursor カード相当**、本レポートでは実装しない）
- **`/api/mc/vnext/claude-summary`** の `acceptance.checks` に `feedback_chat_truncation_complaint`（target=0）を追加候補（**Card-12 範疇**）
- 現行 `mc/bin/collect_feedback.sh` の rating 計算ブロックは **削除 or rating field 導入**のいずれかを TENMON 裁定対象に上げる

---

## 付録 A: production GET 実測ログ（1 行サマリー）

| URL | 認証 | http | bytes | 取得 |
|---|---|---:|---:|---|
| `https://tenmon-ark.com/api/feedback/history` | 不要（実測） | 200 | 42,150 | 46 件 JSON 配列 |
| `https://tenmon-ark.com/api/feedback/cards` | 不要（実測） | 200 | 17,740 | 12 件（fixCard 生成済） |

→ **Notion API への直接アクセス・書込みは本監査では一切発生していない**。Notion DB ID は `feedback.ts:13` の hard-coded fallback `860b3ca8-2286-49b1-ad67-c2c168a87148` を引用したのみで、Notion API token は本監査で不取得・不使用。

---

## Acceptance（本レポート自身）

- ✅ **Notion 改善要望 DB の場所が明記**: §1.1（DB ID `860b3ca8-2286-49b1-ad67-c2c168a87148`）
- ✅ **schema が記録**: §2.1〜2.5
- ✅ **未処理件数が分かる**: §3.1（46 件中 fixCard 未生成 34 件 / 真の要望 20 件）
- ✅ **カテゴリ別件数が分かる**: §3.2 / §3.5（priority×category クロス）
- ✅ **優先度上位 10 件**: §4.1〜§4.5 で 20 件すべて列挙、§4.1（高 6 件 + 中の長文切れ 5 件）が上位 11 件相当
- ✅ **Master Card との関連**: §6（16 Card 全件に関連付け）
- ✅ **次に作るべき Cursor カード候補**: §8（構造系 3 + quick fix 系 4 + ループ系 5 + acceptance 連動 1 = **計 13 候補**）
- ✅ **Notion へ書込みなし**: 付録 A（GET のみ、token 不使用、DB write 0）

---

## OBSERVE ONLY 宣誓

- TypeScript / schema / migration / package.json / dist 編集 = **行っていない**
- DB write = **行っていない**（local fallback / production / Notion すべて read のみ）
- Notion API 書込み = **行っていない**（API token 不取得、API 呼出 0 件）
- ステータス変更 = **行っていない**
- deploy / restart / env 変更 = **行っていない**
- 改善要望の自動実装 = **行っていない**（本レポートは候補列挙までで停止）
- 唯一の変更: `docs/ark/feedback/FEEDBACK_LOOP_OBSERVE_V1.md`（新規追加）
