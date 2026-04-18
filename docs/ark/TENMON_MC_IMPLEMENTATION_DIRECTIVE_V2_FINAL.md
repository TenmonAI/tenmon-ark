# TENMON_MC_IMPLEMENTATION_DIRECTIVE_V2_FINAL
## 天聞アーク MC 統合実装指示書 V2 — Manus 投入完全版

---

**文書番号:** TENMON_MC_IMPLEMENTATION_DIRECTIVE_V2
**版数:** V2 FINAL
**作成日時:** 2026-04-19 (日) JST
**前版:** V1 (ChatGPT 作成、構造仕様)
**位置付け:** V1 を実装コード粒度まで落とし込んだ最終版
**対象実装担当:** Manus (主実装), Cursor (コード生成補助)
**依頼主:** TENMON (sarutahiko)
**実装期限:** Phase 1: 3 日以内, Phase 2: 1 週間, Phase 3: 2 週間

---

## 📋 目次

| § | 章題 | 重要度 |
|---|---|---|
| 0 | V1 からの改善差分 | 必読 |
| 1 | 実装の最上位原則 (禁止事項含む) | **★★★** |
| 2 | 確定値と前提 (実測済み) | **★★★** |
| 3 | 技術スタックと統合ポイント | **★★★** |
| 4 | アーキテクチャ全体像 | **★★** |
| 5 | ディレクトリ/ファイル配置 | **★★** |
| 6 | TypeScript 型定義 (完全版) | ★★ |
| 7 | API 実装 (mc.ts router 完全雛形) | **★★★** |
| 8 | Builder 実装 (10 種の完全雛形) | ★★ |
| 9 | Collector 実装 (bash/python 完全版) | **★★★** |
| 10 | systemd ユニット/タイマー | ★★ |
| 11 | 認証・認可 (既存 auth 連携) | **★★★** |
| 12 | Secrets 機械的ガード | **★★★** |
| 13 | Contradictions 管理アルゴリズム | **★★★** |
| 14 | Notion 同期の実装 | ★★ |
| 15 | フロント実装 | ★★ |
| 16 | JSON Schema (完全版) | ★ |
| 17 | Phase 別デプロイ手順 | **★★★** |
| 18 | 受入テスト (実行可能) | **★★★** |
| 19 | 監視・ログ・アラート | ★★ |
| 20 | ロールバック計画 | **★★★** |
| 21 | Manus 完了報告テンプレート | ★ |

---

## § 0. V1 からの改善差分

Manus は V1 と本 V2 の**両方**を読むこと。矛盾がある場合は V2 が優先する。

### 0.1 V1 で曖昧だった領域 → V2 で確定
| 領域 | V1 | V2 |
|---|---|---|
| branch 値 | 矛盾を内包 | **feature/unfreeze-v4 で確定** |
| head_sha | 不明 | **7b9176bb08d54a8b2584e385b7704b5862b968fa で確定** |
| Node 依存 | 未記載 | package.json 実測値で確定 (AI SDK 無し) |
| auth 仕組み | 新設前提 | **既存 auth_local.ts + jose(JWT) を再利用** |
| ルート mount 点 | 未記載 | 既存 `app.use('/api', ...)` に `app.use('/api/mc', mcRouter)` |
| TypeScript 型 | schema のみ | 完全な型定義ファイルを添付 |
| collector 実装 | 概要のみ | **完全な bash/python スクリプト** |
| Secrets ガード | 禁止記載のみ | **sanitizer 関数の完全コード** |
| Contradictions | 概念のみ | **裁定アルゴリズムの完全コード** |
| テスト | 未記載 | **curl ベースの acceptance script** |
| ロールバック | 未記載 | **完全手順** |

### 0.2 V1 から不変
- SSOT 3 層構造 (Canon / Live State / Notion)
- 画面ルーティング (/mc/overview, /mc/handoff, etc.)
- API エンドポイント群 (/api/mc/*)
- 禁止事項 (Notion を正本にしない、secrets 露出禁止 等)

---

## § 1. 実装の最上位原則

### 1.1 SSOT 3 層の厳格分離
```
Canon (repo docs/ark/*.md) — 思想・構造・真因履歴の正本
    ↓ (手動更新、PR レビュー経由)
Live State (collector JSON) — 今この瞬間の VPS 現実
    ↓ (systemd timer で定期収集)
MC Presentation (/mc/ + /api/mc/*) — 統合知覚面
```

**Manus は、この 3 層を同一ファイルや同一テーブルで混ぜてはならない。**

### 1.2 絶対禁止事項 (違反は即ロールバック対象)

| # | 禁止事項 | 違反の例 |
|---|---|---|
| F1 | Secrets の値を JSON/HTML に出力 | `OPENAI_API_KEY=sk-...` をそのまま出す |
| F2 | AI の自由生成文を「現状」として表示 | LLM に現状を推論させて overview を組む |
| F3 | Notion を唯一正本にする | Notion が真実の canonical_runtime を持つ |
| F4 | 生ログ全文を public に露出 | journalctl 出力を匿名化なしで晒す |
| F5 | dist/ を直接編集 | 本番稼働中の dist/mc.js を str_replace |
| F6 | 既存 chat.ts を改変 | chat.ts を MC のために一行でも変える |
| F7 | 既存 tenmon-ark-api.service を書き換える | Environment 変数を追加する等 |
| F8 | 説明文 (Canon) と状態 (Live) を同一 JSON に入れる | overview.json に思想説明を埋める |
| F9 | collector を root 以外で動かす | systemd でユーザ指定なしで動かす |
| F10 | /api/mc/* で既存 /api/ の挙動を変える | グローバル middleware を足す |

### 1.3 「壊さない」原則
MC 実装は**純粋な追加機能**であり、既存の天聞アークの動作を**一切変更してはならない**。

違反を検出する acceptance test は § 18 に含む。

### 1.4 実装ゴール (完了判定基準)
他の AI (Claude / GPT / Gemini) が新規セッションで、
**以下 5 つの URL を順に読むだけで作業を開始できること**:

```
1. https://tenmon-ark.com/api/mc/overview          (要点 30 秒)
2. https://tenmon-ark.com/api/mc/ai-handoff.json   (機械可読な要約)
3. https://tenmon-ark.com/api/mc/truth-circuit     (現在の真因履歴)
4. https://tenmon-ark.com/api/mc/issues            (現在の課題)
5. https://tenmon-ark.com/api/mc/git-state         (現在のコード状態)
```

---

## § 2. 確定値と前提 (実測済み, 2026-04-19 08:30 JST)

Manus は以下を**真として実装に埋め込む**。疑わない。

### 2.1 VPS / インフラ
```yaml
host:
  hostname:       "x220-158-23-9"
  public_ip:      "220.158.23.9"
  provider:       "Xserver VPS"
  os:             "Ubuntu 22.04 系" # uname は要再実測

service:
  name:           "tenmon-ark-api.service"
  user:           "root"
  working_dir:    "/opt/tenmon-ark-repo/api"
  exec_start:     "/usr/bin/node /opt/tenmon-ark-repo/api/dist/index.js"
  env_production: "NODE_ENV=production"
  env_data_dir:   "TENMON_DATA_DIR=/opt/tenmon-ark-data"
  restart:        "always (5s)"

api:
  port:           3000
  health_endpoint: "http://localhost:3000/api/health"

paths:
  repo_root:      "/opt/tenmon-ark-repo"
  api_src:        "/opt/tenmon-ark-repo/api/src"
  api_dist:       "/opt/tenmon-ark-repo/api/dist"
  data_root:      "/opt/tenmon-ark-data"
  main_db:        "/opt/tenmon-ark-data/kokuzo.sqlite"       # 1.4 GB
  audit_db:       "/opt/tenmon-ark-data/audit.sqlite"        # 980 KB
  persona_db:     "/opt/tenmon-ark-data/persona.sqlite"      # 144 KB
  consciousness_db: "/opt/tenmon-ark-data/consciousness.sqlite" # 412 KB
  constitution:   "/opt/tenmon-ark-data/constitution/"
  nas_mirror:     "/opt/tenmon-ark-data/nas_mirror/"
  uploads:        "/opt/tenmon-ark-data/uploads/"
```

### 2.2 Git / コード
```yaml
git:
  branch:         "feature/unfreeze-v4"
  head_sha:       "7b9176bb08d54a8b2584e385b7704b5862b968fa"
  head_sha_short: "7b9176bb"
  last_commit_subject: "feat: V2.0 Soul Root 100% — 5 new loaders + chat/guest bind + SATORI iroha grounding + MC §17-19"

codebase:
  core_ts_files:  "~150"
  routes_ts_files: "65"
  main_chat_ts:   "api/src/routes/chat.ts (257,663 bytes / 5,105 行 — 巨大、触るな)"
  guest_ts:       "api/src/routes/guest.ts (302 行)"
  largest_core:   "api/src/core/knowledgeBinder.ts (39,070 bytes)"
```

### 2.3 Node.js 依存 (package.json 実測)
```yaml
dependencies:
  - better-sqlite3: "^12.9.0"
  - cookie-parser: "^1.4.7"
  - cors: "^2.8.5"
  - dotenv: "^17.2.2"
  - express: "^4.21.2"
  - jose: "^6.1.3"           # JWT 用、auth_local.ts で使用
  - kuromoji: "^0.1.2"
  - multer: "^1.4.5-lts.1"
  - nodemailer: "^8.0.5"

# 注意: AI SDK (openai/@anthropic-ai/sdk/@google/generative-ai) は存在しない
# → llmWrapper.ts が fetch ベースと推定
# → MC 実装では AI を呼ばない (Builder は全て純ロジック)

scripts:
  build:   "tsc && node scripts/copy-assets.mjs"
  start:   "NODE_ENV=production node dist/index.js"
  dev:     "tsx watch src/index.ts"
  check:   "tsc --noEmit"
```

### 2.4 既存ルート認証 (auth_local.ts から推定)
- JWT (`jose`) による認証が既存
- cookie-parser が使われている → cookie ベースの session
- admin/founder の role 判定が存在 (auth_founder.ts)
- **Manus は既存 auth middleware を再利用すること。新設禁止**

### 2.5 V2.0 Soul Root の実体
| # | Loader | ファイル | bytes | 配置 |
|---|---|---|---|---|
| 1 | IROHA | irohaKotodamaLoader.ts | 7,033 | api/src/core/ |
| 2 | GENTEN | kotodamaGentenLoader.ts | 3,024 | api/src/core/ |
| 3 | UNIFIED_SOUND | unifiedSoundLoader.ts | 3,442 | api/src/core/ |
| 4 | AMATERASU | amaterasuAxisMap.ts | 5,414 | api/src/**data/** |
| 5 | **(5本目、要追跡)** | ? | ? | コミット件名に "5 new loaders" とあり |

**Manus 実装時の対応:**
`/mc/architecture` の Soul Root パネルは、ランタイムログ (`journalctl -u tenmon-ark-api | grep "SOUL_ROOT:"`) から**動的に生成**する。ハードコードしない。

### 2.6 Notion
```yaml
notion:
  task_queue_db_id: "0bbfb0ed8159417ea1170caa9943a155"
  # その他 DB ID は TENMON から追加指示
```

### 2.7 メモリに基づく既知の課題 (MC で可視化必須)
- chat.ts が 5,105 行 (過肥大) — `known_issues` に severity=medium で登録
- kokuzo.sqlite が 1.4 GB (肥大傾向) — `known_issues` に severity=low で登録
- Gemini 2.5 Flash でエラー記録あり (primary failed x2) — `runtime_logs` で表示
- writer 系 .bak が 30+ 個 — `known_issues` に severity=low で登録
- `kotodamaKatakamunaAmatsuBridgeV1.ts` 不在 — `truth_circuit.rejected` に記録

---

## § 3. 技術スタックと統合ポイント

### 3.1 バックエンド技術
- **Runtime**: Node.js (既存)
- **Language**: TypeScript (既存、strict mode 推定)
- **Framework**: Express 4.21 (既存)
- **DB**: better-sqlite3 (既存の `kokuzo.sqlite` 等を read-only で参照)
- **Auth**: jose (JWT) + cookie-parser (既存)
- **MC 用追加依存**: **なし** (新規 npm install 禁止)

### 3.2 フロントエンド技術
- **既存**: `/opt/tenmon-ark-repo/client/` が存在する前提
- **スタック**: Manus は `client/package.json` を読んで既存の主要依存 (React/Vue 等) を特定し、それに合わせる
- **Design tokens**: 既存 `client/src/` の既存ページからカラー/フォント/間隔を継承
- **Routing**: 既存 client のルータを再利用して `/mc/*` を追加

### 3.3 Python (collector 用)
- システム Python 3 (`/usr/bin/python3`) を使用
- 外部パッケージ必須: `requests` (Notion API 用)
- `requests` が未インストールなら `pip3 install --user requests`

### 3.4 既存システムとの統合 3 つのポイント

**統合ポイント 1: ルート mount**
```typescript
// api/src/index.ts (既存の想定、編集最小)
import { mcRouter } from './routes/mc.js';  // ← 1 行だけ追加
// ...
app.use('/api/mc', mcRouter);                // ← 1 行だけ追加
```
→ **既存の `app.use('/api', ...)` のすぐ下**に追加。順序注意。

**統合ポイント 2: 認証 middleware 再利用**
```typescript
// 既存の auth middleware を import して使う (新設禁止)
import { requireAdmin, requireUser, maybeUser } from '../middleware/auth.js';
// ↑ 正確なパス/名前は auth_local.ts または auth.ts を読んで確定
```

**統合ポイント 3: フロントの SPA ルート追加**
- 既存の client routing に `/mc/*` を追加
- 既存の layout (header/nav) は再利用

### 3.5 /mc/ の SSR vs SPA 判断
**SPA** とする。理由:
- 既存 client/ が SPA 構造と推定 (pwa.ts ルートの存在から)
- 全ページ共通のナビ/認証を既存に乗せやすい
- JSON API を同一ドメインから叩けば CORS 不要

### 3.6 MC 側で動的に AI を呼ばない原則
- Builder, collector, router すべて **LLM を呼ばない純ロジック**
- 理由: 決定論性、コスト、レイテンシ、secrets 経路の単純化
- AI 向けの整形 (ai-handoff.json) も **template + slot 埋め込み**で実現

---

## § 4. アーキテクチャ全体像

### 4.1 レイヤー図 (Mermaid)

```mermaid
graph TB
    subgraph Canon["Layer A: Canon (静的・人間が更新)"]
        D1[docs/ark/TENMON_ARK_HANDOFF.md]
        D2[docs/ark/TENMON_ARK_TRUTH_CIRCUIT.md]
        D3[docs/ark/TENMON_ARK_KNOWN_ISSUES.md]
        D4[docs/ark/*.md その他]
    end

    subgraph Live["Layer B: Live State (collector が更新)"]
        C1[mc_collect_live_state.sh]
        C2[mc_collect_git_state.sh]
        C3[mc_collect_db_status.sh]
        C4[mc_collect_vps_assets.sh]
        C5[mc_collect_runtime_logs.sh]
        C6[mc_collect_security_audit.sh]
        J1[/opt/tenmon-ark-data/mc/live-state.json]
        J2[/opt/tenmon-ark-data/mc/git-state.json]
        J3[/opt/tenmon-ark-data/mc/db-status.json]
        J4[/opt/tenmon-ark-data/mc/vps-assets.json]
        J5[/opt/tenmon-ark-data/mc/runtime-logs.json]
        J6[/opt/tenmon-ark-data/mc/security-audit.json]

        C1 --> J1
        C2 --> J2
        C3 --> J3
        C4 --> J4
        C5 --> J5
        C6 --> J6
    end

    subgraph Notion["Layer C-adj: Notion Mirror"]
        N1[mc_sync_notion.py]
        JN[/opt/tenmon-ark-data/mc/notion/notion-sync.json]
        N1 --> JN
    end

    subgraph Derived["Layer C: Derived (Builder が合成)"]
        B1[aiHandoffBuilder.ts]
        B2[contradictionsBuilder]
        J7[/opt/tenmon-ark-data/mc/ai-handoff.json]
        J8[/opt/tenmon-ark-data/mc/contradictions.json]

        B1 --> J7
        B2 --> J8
    end

    subgraph API["Backend API"]
        R1[api/src/routes/mc.ts]
    end

    subgraph Front["Frontend"]
        F1[/mc/overview]
        F2[/mc/handoff]
        F3[/mc/live]
        F4[/mc/ai]
        F5[/mc/*]
    end

    Canon --> B1
    Live --> B1
    Notion --> B1
    Canon --> B2
    Live --> B2

    Canon --> R1
    Live --> R1
    Notion --> R1
    Derived --> R1

    R1 --> F1
    R1 --> F2
    R1 --> F3
    R1 --> F4
    R1 --> F5

    F4 -.AI reads.-> EX[External AI<br/>Claude/GPT/Gemini]
```

### 4.2 データフロー要約
1. **systemd timer** が 5-15 分ごとに collector を起動
2. collector が VPS の現実を観測し `/opt/tenmon-ark-data/mc/*.json` に書き込む
3. **systemd timer** (別) が 10 分ごとに aiHandoffBuilder と contradictionsBuilder を起動
4. Builder が Canon + Live + Notion を合成して派生 JSON を生成
5. **mc.ts router** がリクエスト時に JSON をストリーム (DB アクセスなし、ファイル読み込みのみ)
6. フロント `/mc/*` が API を叩いて描画
7. 外部 AI は `/api/mc/ai-handoff.json` だけで開始可能

### 4.3 失敗時のフェイルオーバー
- collector 失敗 → 前回の JSON を保持しつつ `stale: true` を記録
- Builder 失敗 → 前回版を保持 + `/var/log/tenmon-mc-error.log` に記録
- router レスポンス → `stale` フィールドを必ず含める
- フロント → `stale: true` なら赤バッジで警告表示

---

## § 5. ディレクトリ/ファイル配置 (完全版)

```
/opt/tenmon-ark-repo/
├── docs/ark/                                 # ← 新規作成
│   ├── TENMON_ARK_HANDOFF.md                 # Canon 初版 (V1 ハンドオフ改名)
│   ├── TENMON_ARK_AI_HANDOFF.template.json   # ai-handoff.json の template
│   ├── TENMON_ARK_ARCHITECTURE.md            # 構造説明
│   ├── TENMON_ARK_TRUTH_CIRCUIT.md           # 真因履歴
│   ├── TENMON_ARK_KNOWN_ISSUES.md            # 既知課題
│   ├── TENMON_ARK_VPS_ASSETS.md              # VPS 資産マップ
│   ├── TENMON_ARK_DB_MAP.md                  # DB 構造図
│   ├── TENMON_ARK_BACKUP_MAP.md              # バックアップ一覧
│   ├── TENMON_ARK_SECURITY_BOUNDARY.md       # 境界定義
│   └── TENMON_ARK_CHANGELOG.md               # 変更履歴
│
├── api/
│   ├── src/
│   │   ├── routes/
│   │   │   └── mc.ts                         # ← 新規: MC ルーター
│   │   │
│   │   ├── core/
│   │   │   └── mc/                           # ← 新規: MC ロジック一式
│   │   │       ├── types.ts                  # 全型定義
│   │   │       ├── constants.ts              # パス定数
│   │   │       ├── stateReader.ts            # JSON ファイル読み込み共通
│   │   │       ├── sanitizer.ts              # secrets ガード
│   │   │       ├── contradictionsEngine.ts   # 矛盾管理
│   │   │       ├── builders/
│   │   │       │   ├── overviewBuilder.ts
│   │   │       │   ├── handoffBuilder.ts
│   │   │       │   ├── aiHandoffBuilder.ts
│   │   │       │   ├── liveStateBuilder.ts
│   │   │       │   ├── vpsAssetsBuilder.ts
│   │   │       │   ├── dbStatusBuilder.ts
│   │   │       │   ├── gitStateBuilder.ts
│   │   │       │   ├── runtimeLogsBuilder.ts
│   │   │       │   ├── notionSyncBuilder.ts
│   │   │       │   ├── truthCircuitBuilder.ts
│   │   │       │   ├── issuesBuilder.ts
│   │   │       │   └── securityAuditBuilder.ts
│   │   │       └── schemas/
│   │   │           └── *.schema.json         # 各 JSON の JSON Schema
│   │
│   └── scripts/                              # ← 新規: collector / builder 起動
│       ├── mc_collect_live_state.sh
│       ├── mc_collect_git_state.sh
│       ├── mc_collect_db_status.sh
│       ├── mc_collect_vps_assets.sh
│       ├── mc_collect_runtime_logs.sh
│       ├── mc_collect_security_audit.sh
│       ├── mc_sync_notion.py
│       ├── mc_build_ai_handoff.sh            # node dist 経由で builder 起動
│       ├── mc_reconcile_contradictions.sh
│       └── mc_lib.sh                         # 共通関数 (stale 記録等)
│
└── client/                                    # ← 既存 + 追加
    └── src/
        └── pages/
            └── mc/                            # ← 新規
                ├── McLayout.tsx
                ├── Overview.tsx
                ├── Handoff.tsx
                ├── Live.tsx
                ├── Vps.tsx
                ├── Db.tsx
                ├── Notion.tsx
                ├── Architecture.tsx
                ├── Files.tsx
                ├── Backups.tsx
                ├── TruthCircuit.tsx
                ├── Issues.tsx
                ├── Ai.tsx
                ├── Security.tsx
                └── History.tsx

/opt/tenmon-ark-data/
└── mc/                                        # ← 新規作成 (mode 0750, root:root)
    ├── overview.json
    ├── ai-handoff.json
    ├── live-state.json
    ├── vps-assets.json
    ├── db-status.json
    ├── git-state.json
    ├── runtime-logs.json
    ├── security-audit.json
    ├── truth-circuit.json
    ├── issues.json
    ├── contradictions.json
    ├── _meta.json                             # collector 実行状況
    └── notion/
        ├── notion-sync.json
        ├── task-queue.json
        └── feedback.json

/etc/systemd/system/                           # ← 新規作成
├── tenmon-mc-collect-live.service
├── tenmon-mc-collect-live.timer
├── tenmon-mc-collect-git.service
├── tenmon-mc-collect-git.timer
├── tenmon-mc-collect-db.service
├── tenmon-mc-collect-db.timer
├── tenmon-mc-collect-vps.service
├── tenmon-mc-collect-vps.timer
├── tenmon-mc-collect-logs.service
├── tenmon-mc-collect-logs.timer
├── tenmon-mc-collect-security.service
├── tenmon-mc-collect-security.timer
├── tenmon-mc-sync-notion.service
├── tenmon-mc-sync-notion.timer
├── tenmon-mc-build-handoff.service
└── tenmon-mc-build-handoff.timer
```

### 5.1 ファイルパーミッション
```bash
# /opt/tenmon-ark-data/mc/ は root 専用
chown -R root:root /opt/tenmon-ark-data/mc/
chmod 0750 /opt/tenmon-ark-data/mc/
chmod 0640 /opt/tenmon-ark-data/mc/*.json
```

### 5.2 バックアップから除外
```bash
# 既存のバックアップスクリプトがあれば、/opt/tenmon-ark-data/mc/ は除外
# 理由: collector がいつでも再生成できるため、バックアップ容量を食わない
```

---

## § 6. TypeScript 型定義

**ファイル:** `api/src/core/mc/types.ts`

```typescript
// =======================================================================
// 天聞アーク MC 統合 — 型定義
// 版数: V2 FINAL
// 注意: 変更時は全 builder と schema も同時に更新すること
// =======================================================================

export type FreshnessStatus = 'fresh' | 'stale' | 'unknown';

export interface McBaseResponse {
  generated_at: string;          // ISO 8601
  source_files: string[];        // 参照した JSON ファイル群
  freshness: FreshnessStatus;
  stale: boolean;
  last_success_at?: string;
  last_failure_at?: string;
  failure_reason?: string;
}

// -----------------------------------------------------------------------
// overview.json
// -----------------------------------------------------------------------
export interface McOverview extends McBaseResponse {
  environment: 'production' | 'staging' | 'dev';
  app: {
    name: 'TENMON-ARK';
    aliases: string[];
    domain: string;
    mc_url: string;
  };
  service: {
    name: string;
    status: 'active' | 'inactive' | 'failed' | 'unknown';
    pid: number | null;
    uptime_sec: number | null;
  };
  health: {
    ok: boolean;
    endpoint: string;
    checked_at: string;
  };
  git: {
    head_sha: string;
    head_sha_short: string;
    branch: string;
    dirty: boolean;
    last_commit_subject: string;
    last_commit_at: string;
  };
  state: {
    last_deploy_at: string | null;
    critical_blockers: number;
    warnings: number;
    contradictions_count: number;
  };
  freshness_detail: {
    last_collector_run: { [collector: string]: string };
    last_notion_sync: string | null;
    last_ai_handoff_build: string | null;
  };
  links: {
    handoff: string;
    live: string;
    ai: string;
    truth_circuit: string;
  };
}

// -----------------------------------------------------------------------
// ai-handoff.json  (外部 AI が読む最重要ファイル)
// -----------------------------------------------------------------------
export interface McAiHandoff extends McBaseResponse {
  version: 'v1';
  identity: {
    project: 'TENMON-ARK';
    definition: string;
    founder: string;
    founder_aliases: string[];
  };
  canonical_runtime: {
    git_sha: string;
    git_sha_short: string;
    branch: string;
    last_commit_subject: string;
    service: string;
    repo_root: string;
    data_root: string;
    api_port: number;
    host: string;
  };
  canonical_paths: Array<{
    path: string;
    kind: 'repo' | 'data' | 'db' | 'script' | 'doc';
    purpose: string;
  }>;
  soul_root: {
    loaders_detected_runtime: string[];      // 動的
    loaders_documented: string[];            // 静的 (docs から)
    last_activity_at: string;
    activity_count_1h: { [key: string]: number };
  };
  current_priorities: Array<{
    rank: number;
    title: string;
    owner: string;
    due: string | null;
    blocker: boolean;
  }>;
  confirmed_truths: Array<{
    id: string;
    statement: string;
    evidence_refs: string[];
    confirmed_at: string;
  }>;
  known_contradictions: Array<{
    field: string;
    doc_values: string[];
    live_value: string | null;
    status: 'unresolved' | 'resolved_by_live_state' | 'resolved_by_human';
    resolved_at: string | null;
    notes: string;
  }>;
  do_not_touch: Array<{
    path: string;
    reason: string;
    severity: 'critical' | 'high' | 'medium';
  }>;
  next_measurements: Array<{
    block_id: string;
    title: string;
    commands: string[];
    why: string;
  }>;
  required_reading: Array<{
    priority: number;
    url: string;
    why: string;
  }>;
  current_blockers: Array<{
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    status: 'open' | 'in_progress' | 'waiting' | 'closed';
  }>;
  start_here_quickstart: string[];          // AI 向け行動指示
}

// -----------------------------------------------------------------------
// live-state.json
// -----------------------------------------------------------------------
export interface McLiveState extends McBaseResponse {
  host: {
    hostname: string;
    public_ip: string;
    os: string;
  };
  service: {
    name: string;
    active: boolean;
    substate: string;
    main_pid: number | null;
    uptime_sec: number | null;
  };
  health: {
    ok: boolean;
    endpoint: string;
    response_ms: number | null;
    raw_response_preview?: string;        // 先頭 200 文字
  };
  resources: {
    disk: { path: string; used_gb: number; free_gb: number; percent: number }[];
    memory_total_gb: number;
    memory_available_gb: number;
    swap_gb: number;
    load_avg: [number, number, number];
  };
  timers: Array<{
    name: string;
    next_run: string;
    last_run: string | null;
    enabled: boolean;
  }>;
  recent_errors: Array<{
    timestamp: string;
    message_preview: string;               // 先頭 300 文字、secret マスク済
  }>;
  recent_warnings: Array<{
    timestamp: string;
    message_preview: string;
  }>;
  model_usage_1h: {
    lite: number;
    standard: number;
    premium: number;
    total: number;
  };
  soul_root_activity_1h: {
    [loader_key: string]: number;
  };
  llm_primary_failures_1h: number;
}

// -----------------------------------------------------------------------
// vps-assets.json
// -----------------------------------------------------------------------
export interface McVpsAssets extends McBaseResponse {
  directories: Array<{
    path: string;
    kind: 'repo' | 'data' | 'nas_mirror' | 'constitution' | 'uploads' | 'backup' | 'other';
    exists: boolean;
    size_mb: number | null;
    file_count: number | null;
    sensitivity: 'public' | 'internal' | 'restricted';
  }>;
  critical_files: Array<{
    path: string;
    role: string;
    subsystem: string;
    size_bytes: number;
    last_modified: string;
    criticality: 'critical' | 'high' | 'medium' | 'low';
    sensitivity: 'public' | 'internal' | 'restricted';
    recent_commits: string[];
  }>;
  backup_files: Array<{
    path: string;
    kind: 'db_backup' | 'code_backup' | 'config_backup';
    size_mb: number;
    created_at: string;
    age_days: number;
  }>;
}

// -----------------------------------------------------------------------
// db-status.json
// -----------------------------------------------------------------------
export interface McDbStatus extends McBaseResponse {
  databases: Array<{
    name: string;
    path: string;
    size_mb: number;
    table_count: number;
    top_tables_by_size: Array<{ name: string; mb: number }>;
    top_tables_by_rows: Array<{ name: string; rows: number }>;
  }>;
  sacred_corpus: {
    total: number;
    by_layer: { [layer: string]: number };
    by_tradition: { [tradition: string]: number };
  };
  activity_24h: {
    conversation_log: number;
    tenmon_audit_log: number;
    memory_projection_logs: number;
    ark_thread_seeds: number;
  };
  fts_health: {
    kokuzo_pages_fts_indexed: number;
  };
}

// -----------------------------------------------------------------------
// git-state.json
// -----------------------------------------------------------------------
export interface McGitState extends McBaseResponse {
  current: {
    branch: string;
    head_sha: string;
    head_sha_short: string;
    head_commit_subject: string;
    head_commit_at: string;
    head_commit_author: string;
    dirty: boolean;
    untracked_count: number;
    modified_count: number;
  };
  recent_commits: Array<{
    sha: string;
    subject: string;
    author: string;
    date: string;
  }>;
  recent_tags: Array<{
    name: string;
    date: string;
    sha: string;
  }>;
  reflog_recent: string[];
  critical_files_recent: {
    [path: string]: Array<{ sha: string; subject: string; date: string }>;
  };
  repo_size_mb: number;
  total_commits: number;
  commits_last_7d: number;
}

// -----------------------------------------------------------------------
// runtime-logs.json
// -----------------------------------------------------------------------
export interface McRuntimeLogs extends McBaseResponse {
  window: '1h' | '3h' | '24h';
  error_count: number;
  warn_count: number;
  soul_root_activity: { [key: string]: number };
  llm_failures: {
    gemini_primary_failed: number;
    openai_failed: number;
    anthropic_failed: number;
  };
  last_restart_at: string | null;
  critical_log_lines: Array<{
    timestamp: string;
    level: 'ERROR' | 'WARN' | 'INFO';
    message: string;                     // sanitized
  }>;
}

// -----------------------------------------------------------------------
// truth-circuit.json
// -----------------------------------------------------------------------
export interface McTruthCircuit extends McBaseResponse {
  confirmed_root_causes: Array<{
    id: string;
    title: string;
    subsystem: string;
    status: 'confirmed';
    confirmed_at: string;
    evidence_refs: string[];
    summary: string;
  }>;
  active_hypotheses: Array<{
    id: string;
    title: string;
    hypothesis: string;
    next_test: string;
  }>;
  rejected_hypotheses: Array<{
    id: string;
    title: string;
    rejected_at: string;
    reason: string;
  }>;
  next_measurement_tasks: Array<{
    block_id: string;
    title: string;
    commands: string[];
    priority: 'high' | 'medium' | 'low';
  }>;
}

// -----------------------------------------------------------------------
// issues.json
// -----------------------------------------------------------------------
export interface McIssues extends McBaseResponse {
  items: Array<{
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    status: 'open' | 'in_progress' | 'waiting' | 'closed';
    subsystem: string;
    description: string;
    evidence_refs: string[];
    workaround: string | null;
    owner: string | null;
    last_touched: string;
    opened_at: string;
  }>;
}

// -----------------------------------------------------------------------
// security-audit.json  (admin のみ)
// -----------------------------------------------------------------------
export interface McSecurityAudit extends McBaseResponse {
  env_file_locations: string[];           // .env の存在パスだけ (値なし)
  env_vars_set: string[];                 // key 名のみ (値なし)
  systemd_environment_keys: string[];     // 同上
  secrets_present: {
    openai_api_key: boolean;
    gemini_api_key: boolean;
    anthropic_api_key: boolean;
    notion_token: boolean;
    gmail_app_password: boolean;
  };
  leaks_found_in_json: Array<{
    file: string;
    pattern_matched: string;
    action_taken: 'redacted' | 'removed' | 'alert_only';
  }>;
  rotation_status: Array<{
    secret_name: string;
    last_rotated: string | null;
    days_since_rotation: number | null;
    needs_rotation: boolean;
  }>;
}

// -----------------------------------------------------------------------
// contradictions.json
// -----------------------------------------------------------------------
export interface McContradictions extends McBaseResponse {
  items: Array<{
    id: string;
    field: string;
    source_references: Array<{
      source: 'canon' | 'live' | 'notion' | 'memory';
      value: string;
      location: string;
    }>;
    resolution: {
      status: 'unresolved' | 'resolved_by_live_state' | 'resolved_by_human';
      winning_value: string | null;
      reason: string;
      resolved_at: string | null;
    };
  }>;
}

// -----------------------------------------------------------------------
// notion-sync.json
// -----------------------------------------------------------------------
export interface McNotionSync extends McBaseResponse {
  source: 'notion';
  dbs: Array<{
    name: string;
    db_id: string;
    last_synced_at: string;
    record_count: number;
    open_tasks: number;
    blocked_tasks: number;
  }>;
  task_queue: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    owner: string | null;
    updated_at: string;
    blocked: boolean;
  }>;
}
```

---

## § 7. API 実装 (mc.ts router 完全雛形)

**ファイル:** `api/src/routes/mc.ts`

```typescript
// =======================================================================
// 天聞アーク MC 統合 — Express Router
// 責務: JSON ファイル (collector/builder 出力) を読んで返すだけ
// 原則: router 内で DB も LLM も呼ばない (純粋な file → HTTP)
// =======================================================================

import { Router, type Request, type Response } from 'express';
import { readMcState } from '../core/mc/stateReader.js';
import { sanitizeForPublic, sanitizeForAdmin } from '../core/mc/sanitizer.js';
import { requireAdmin, maybeAuth } from '../middleware/auth.js';
// ↑ 既存 auth 実装名は Manus が確認して正しく import すること

export const mcRouter: Router = Router();

// -----------------------------------------------------------------------
// ヘルパ: JSON ファイルを読んで返す共通処理
// -----------------------------------------------------------------------
async function serveStateFile(
  res: Response,
  filename: string,
  sanitize: (data: any) => any = sanitizeForPublic
) {
  try {
    const data = await readMcState(filename);
    if (!data) {
      return res.status(503).json({
        error: 'state_not_available',
        file: filename,
        message: 'Collector has not produced this file yet'
      });
    }
    const sanitized = sanitize(data);
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.setHeader('X-MC-Source', filename);
    res.setHeader('X-MC-Generated-At', sanitized.generated_at || 'unknown');
    res.setHeader('X-MC-Stale', String(sanitized.stale ?? false));
    return res.json(sanitized);
  } catch (e: any) {
    console.error(`[mc] failed to serve ${filename}:`, e?.message);
    return res.status(500).json({ error: 'state_read_failed' });
  }
}

// =======================================================================
// PUBLIC API (認証不要)
// =======================================================================

mcRouter.get('/overview', maybeAuth, async (_req, res) => {
  return serveStateFile(res, 'overview.json');
});

mcRouter.get('/ai-handoff.json', maybeAuth, async (_req, res) => {
  return serveStateFile(res, 'ai-handoff.json');
});

mcRouter.get('/handoff', maybeAuth, async (_req, res) => {
  // Canon Markdown を読んで返す
  const { readHandoffMarkdown } = await import('../core/mc/builders/handoffBuilder.js');
  try {
    const md = await readHandoffMarkdown();
    const wantHtml = _req.headers.accept?.includes('text/html');
    if (wantHtml) {
      // 簡易: Markdown はそのまま返す。フロント側でレンダリング
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      return res.send(md.markdown);
    }
    return res.json(md);
  } catch {
    return res.status(503).json({ error: 'handoff_unavailable' });
  }
});

mcRouter.get('/truth-circuit', maybeAuth, async (_req, res) => {
  return serveStateFile(res, 'truth-circuit.json');
});

mcRouter.get('/issues', maybeAuth, async (_req, res) => {
  return serveStateFile(res, 'issues.json');
});

// =======================================================================
// INTERNAL API (ログイン必須)
// =======================================================================

mcRouter.get('/live-state', maybeAuth, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'auth_required' });
  return serveStateFile(res, 'live-state.json', sanitizeForPublic);
});

mcRouter.get('/db-status', maybeAuth, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'auth_required' });
  return serveStateFile(res, 'db-status.json', sanitizeForPublic);
});

mcRouter.get('/git-state', maybeAuth, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'auth_required' });
  return serveStateFile(res, 'git-state.json', sanitizeForPublic);
});

mcRouter.get('/runtime-logs', maybeAuth, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'auth_required' });
  return serveStateFile(res, 'runtime-logs.json', sanitizeForPublic);
});

mcRouter.get('/notion-sync', maybeAuth, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'auth_required' });
  return serveStateFile(res, 'notion/notion-sync.json', sanitizeForPublic);
});

// =======================================================================
// ADMIN API (admin/founder のみ)
// =======================================================================

mcRouter.get('/vps-assets', requireAdmin, async (_req, res) => {
  return serveStateFile(res, 'vps-assets.json', sanitizeForAdmin);
});

mcRouter.get('/security-audit', requireAdmin, async (_req, res) => {
  return serveStateFile(res, 'security-audit.json', sanitizeForAdmin);
});

mcRouter.get('/contradictions', requireAdmin, async (_req, res) => {
  return serveStateFile(res, 'contradictions.json', sanitizeForAdmin);
});

// =======================================================================
// ADMIN POST (手動トリガ)
// =======================================================================
import { spawn } from 'child_process';

mcRouter.post('/run-collector', requireAdmin, async (req, res) => {
  const collector = String(req.body?.collector || 'all');
  const allowed = [
    'all', 'live', 'git', 'db', 'vps', 'logs', 'security'
  ];
  if (!allowed.includes(collector)) {
    return res.status(400).json({ error: 'invalid_collector' });
  }

  // 非ブロッキングで起動
  const script = collector === 'all'
    ? '/opt/tenmon-ark-repo/api/scripts/mc_collect_all.sh'
    : `/opt/tenmon-ark-repo/api/scripts/mc_collect_${collector}.sh`;

  const child = spawn('/bin/bash', [script], {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();

  return res.json({
    ok: true,
    triggered: collector,
    script,
    note: 'Running in background. Check result via /api/mc/overview freshness.'
  });
});

mcRouter.post('/refresh-notion', requireAdmin, async (_req, res) => {
  const child = spawn('/usr/bin/python3', [
    '/opt/tenmon-ark-repo/api/scripts/mc_sync_notion.py'
  ], { detached: true, stdio: 'ignore' });
  child.unref();
  return res.json({ ok: true, triggered: 'notion_sync' });
});

mcRouter.post('/rebuild-ai-handoff', requireAdmin, async (_req, res) => {
  const child = spawn('/bin/bash', [
    '/opt/tenmon-ark-repo/api/scripts/mc_build_ai_handoff.sh'
  ], { detached: true, stdio: 'ignore' });
  child.unref();
  return res.json({ ok: true, triggered: 'ai_handoff_build' });
});

// =======================================================================
// HEALTH  (内部モニタ用)
// =======================================================================

mcRouter.get('/_health', (_req, res) => {
  return res.json({
    ok: true,
    service: 'tenmon-mc',
    version: 'v2',
    endpoints: [
      'GET  /api/mc/overview',
      'GET  /api/mc/ai-handoff.json',
      'GET  /api/mc/handoff',
      'GET  /api/mc/truth-circuit',
      'GET  /api/mc/issues',
      'GET  /api/mc/live-state        [auth]',
      'GET  /api/mc/db-status          [auth]',
      'GET  /api/mc/git-state          [auth]',
      'GET  /api/mc/runtime-logs       [auth]',
      'GET  /api/mc/notion-sync        [auth]',
      'GET  /api/mc/vps-assets         [admin]',
      'GET  /api/mc/security-audit     [admin]',
      'GET  /api/mc/contradictions     [admin]',
      'POST /api/mc/run-collector      [admin]',
      'POST /api/mc/refresh-notion     [admin]',
      'POST /api/mc/rebuild-ai-handoff [admin]',
    ]
  });
});
```

### 7.1 index.ts への統合 (最小差分)

```typescript
// api/src/index.ts (既存) に以下 2 行だけ追加

import { mcRouter } from './routes/mc.js';
// ...既存の import の直後

app.use('/api/mc', mcRouter);
// ...既存の app.use('/api', ...) の直後
```

---

## § 8. Builder / stateReader の完全雛形

### 8.1 constants.ts

```typescript
// api/src/core/mc/constants.ts
import * as path from 'path';

export const MC_DATA_DIR = process.env.MC_DATA_DIR
  || path.join(process.env.TENMON_DATA_DIR || '/opt/tenmon-ark-data', 'mc');

export const MC_CANON_DIR = process.env.MC_CANON_DIR
  || '/opt/tenmon-ark-repo/docs/ark';

export const MC_FILES = {
  overview: 'overview.json',
  aiHandoff: 'ai-handoff.json',
  liveState: 'live-state.json',
  vpsAssets: 'vps-assets.json',
  dbStatus: 'db-status.json',
  gitState: 'git-state.json',
  runtimeLogs: 'runtime-logs.json',
  securityAudit: 'security-audit.json',
  truthCircuit: 'truth-circuit.json',
  issues: 'issues.json',
  contradictions: 'contradictions.json',
  notionSync: 'notion/notion-sync.json',
  meta: '_meta.json',
} as const;

export const STALE_THRESHOLDS_SEC = {
  liveState: 10 * 60,       // 10 分
  gitState: 20 * 60,
  dbStatus: 30 * 60,
  vpsAssets: 60 * 60,
  runtimeLogs: 15 * 60,
  securityAudit: 60 * 60,
  notionSync: 20 * 60,
  aiHandoff: 20 * 60,
} as const;
```

### 8.2 stateReader.ts

```typescript
// api/src/core/mc/stateReader.ts
import { promises as fs } from 'fs';
import * as path from 'path';
import { MC_DATA_DIR, STALE_THRESHOLDS_SEC } from './constants.js';

export async function readMcState(filename: string): Promise<any | null> {
  const fullPath = path.join(MC_DATA_DIR, filename);
  try {
    const raw = await fs.readFile(fullPath, 'utf-8');
    const data = JSON.parse(raw);

    // freshness 判定
    const generatedAt = data.generated_at;
    if (generatedAt) {
      const ageSec = (Date.now() - new Date(generatedAt).getTime()) / 1000;
      const threshold = STALE_THRESHOLDS_SEC[filename.replace('.json','').replace('notion/','') as keyof typeof STALE_THRESHOLDS_SEC]
                     || 30 * 60;
      if (ageSec > threshold) {
        data.stale = true;
        data.age_seconds = Math.floor(ageSec);
      }
    }

    return data;
  } catch (e: any) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

export async function writeMcState(filename: string, data: any): Promise<void> {
  const fullPath = path.join(MC_DATA_DIR, filename);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  const withMeta = {
    ...data,
    generated_at: data.generated_at || new Date().toISOString(),
  };
  // atomic write: tmp → rename
  const tmp = `${fullPath}.tmp.${process.pid}`;
  await fs.writeFile(tmp, JSON.stringify(withMeta, null, 2), { mode: 0o640 });
  await fs.rename(tmp, fullPath);
}
```

### 8.3 aiHandoffBuilder.ts (最重要 Builder)

```typescript
// api/src/core/mc/builders/aiHandoffBuilder.ts
import { readMcState, writeMcState } from '../stateReader.js';
import { MC_CANON_DIR } from '../constants.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import type { McAiHandoff } from '../types.js';

export async function buildAiHandoff(): Promise<McAiHandoff> {
  const [liveState, gitState, dbStatus, truthCircuit, issues, contradictions, notionSync] =
    await Promise.all([
      readMcState('live-state.json'),
      readMcState('git-state.json'),
      readMcState('db-status.json'),
      readMcState('truth-circuit.json'),
      readMcState('issues.json'),
      readMcState('contradictions.json'),
      readMcState('notion/notion-sync.json'),
    ]);

  // Canon doc (definition 用)
  let definition = '日本語 AI プラットフォーム — 言霊・聖典・神話を根に持つ知識 OS';
  try {
    const handoffMd = await fs.readFile(
      path.join(MC_CANON_DIR, 'TENMON_ARK_HANDOFF.md'), 'utf-8'
    );
    const defMatch = handoffMd.match(/definition[:：]\s*(.+)/i);
    if (defMatch) definition = defMatch[1].trim();
  } catch { /* canon 未配置でも落ちない */ }

  // Soul Root (runtime から動的に抽出)
  const soulRootActivity = liveState?.soul_root_activity_1h || {};
  const runtimeLoaders = Object.keys(soulRootActivity);
  const documentedLoaders = ['IROHA', 'GENTEN', 'UNIFIED_SOUND', 'AMATERASU'];

  const handoff: McAiHandoff = {
    version: 'v1',
    generated_at: new Date().toISOString(),
    source_files: [
      'live-state.json', 'git-state.json', 'db-status.json',
      'truth-circuit.json', 'issues.json', 'contradictions.json',
      'notion/notion-sync.json', 'docs/ark/TENMON_ARK_HANDOFF.md'
    ],
    freshness: 'fresh',
    stale: false,

    identity: {
      project: 'TENMON-ARK',
      definition,
      founder: 'TENMON',
      founder_aliases: ['sarutahiko'],
    },

    canonical_runtime: {
      git_sha: gitState?.current?.head_sha || 'unknown',
      git_sha_short: gitState?.current?.head_sha_short || 'unknown',
      branch: gitState?.current?.branch || 'unknown',
      last_commit_subject: gitState?.current?.head_commit_subject || '',
      service: 'tenmon-ark-api.service',
      repo_root: '/opt/tenmon-ark-repo',
      data_root: '/opt/tenmon-ark-data',
      api_port: 3000,
      host: liveState?.host?.hostname || 'unknown',
    },

    canonical_paths: [
      { path: '/opt/tenmon-ark-repo', kind: 'repo', purpose: 'Main repository' },
      { path: '/opt/tenmon-ark-repo/api/src/routes/chat.ts', kind: 'repo', purpose: 'Main conversation route (5,105 lines — DO NOT TOUCH lightly)' },
      { path: '/opt/tenmon-ark-data/kokuzo.sqlite', kind: 'db', purpose: 'Main database (1.4 GB)' },
      { path: '/opt/tenmon-ark-data/mc/', kind: 'data', purpose: 'MC state files' },
      { path: '/opt/tenmon-ark-repo/docs/ark/', kind: 'doc', purpose: 'Canonical documentation' },
    ],

    soul_root: {
      loaders_detected_runtime: runtimeLoaders,
      loaders_documented: documentedLoaders,
      last_activity_at: liveState?.generated_at || '',
      activity_count_1h: soulRootActivity,
    },

    current_priorities: (issues?.items || [])
      .filter((i: any) => i.status === 'open' && (i.severity === 'critical' || i.severity === 'high'))
      .slice(0, 10)
      .map((i: any, idx: number) => ({
        rank: idx + 1,
        title: i.title,
        owner: i.owner || 'TENMON',
        due: null,
        blocker: i.severity === 'critical',
      })),

    confirmed_truths: (truthCircuit?.confirmed_root_causes || []).map((rc: any) => ({
      id: rc.id,
      statement: rc.summary,
      evidence_refs: rc.evidence_refs || [],
      confirmed_at: rc.confirmed_at,
    })),

    known_contradictions: (contradictions?.items || []).map((c: any) => ({
      field: c.field,
      doc_values: c.source_references.filter((r: any) => r.source === 'canon').map((r: any) => r.value),
      live_value: c.source_references.find((r: any) => r.source === 'live')?.value || null,
      status: c.resolution.status,
      resolved_at: c.resolution.resolved_at,
      notes: c.resolution.reason,
    })),

    do_not_touch: [
      { path: 'api/src/routes/chat.ts', reason: '5,105 lines of core conversation logic', severity: 'critical' },
      { path: 'api/dist/', reason: 'Build output — always edit src/ and rebuild', severity: 'critical' },
      { path: '/opt/tenmon-ark-data/kokuzo.sqlite', reason: 'Main DB, 1.4 GB, backup before any change', severity: 'critical' },
      { path: '/etc/systemd/system/tenmon-ark-api.service', reason: 'Existing service — MC uses separate timers', severity: 'high' },
    ],

    next_measurements: (truthCircuit?.next_measurement_tasks || []).map((t: any) => ({
      block_id: t.block_id,
      title: t.title,
      commands: t.commands,
      why: t.priority,
    })),

    required_reading: [
      { priority: 1, url: '/api/mc/overview', why: '現状 30 秒把握' },
      { priority: 2, url: '/mc/handoff', why: '思想と構造' },
      { priority: 3, url: '/api/mc/truth-circuit', why: '解決済/未解決の真因' },
      { priority: 4, url: '/api/mc/issues', why: '現在の open 課題' },
      { priority: 5, url: '/api/mc/git-state', why: 'コード状態' },
    ],

    current_blockers: (issues?.items || [])
      .filter((i: any) => i.severity === 'critical' && i.status !== 'closed')
      .map((i: any) => ({
        id: i.id, title: i.title, severity: i.severity, status: i.status,
      })),

    start_here_quickstart: [
      '1. この JSON の canonical_runtime を真として扱う (メモリと矛盾したら live を優先)',
      '2. do_not_touch に列挙されたファイルは触らない',
      '3. current_priorities の rank 1 から着手する',
      '4. 作業前に /api/mc/live-state で service が active か確認する',
      '5. コード変更は api/src/ 側のみ、dist/ は触らない',
      '6. 変更後は npm run build → systemctl restart tenmon-ark-api で反映',
      '7. 作業完了後は /api/mc/overview freshness を確認し、矛盾があれば contradictions に追記',
    ],
  };

  await writeMcState('ai-handoff.json', handoff);
  return handoff;
}

// エントリポイント (scripts/mc_build_ai_handoff.sh から呼ばれる)
if (import.meta.url === `file://${process.argv[1]}`) {
  buildAiHandoff()
    .then(() => { console.log('[ai-handoff] built'); process.exit(0); })
    .catch((e) => { console.error('[ai-handoff] failed:', e); process.exit(1); });
}
```

### 8.4 overviewBuilder.ts

```typescript
// api/src/core/mc/builders/overviewBuilder.ts
import { readMcState, writeMcState } from '../stateReader.js';
import type { McOverview } from '../types.js';

export async function buildOverview(): Promise<McOverview> {
  const [liveState, gitState, contradictions, issues, notionSync] = await Promise.all([
    readMcState('live-state.json'),
    readMcState('git-state.json'),
    readMcState('contradictions.json'),
    readMcState('issues.json'),
    readMcState('notion/notion-sync.json'),
  ]);

  const critical = (issues?.items || []).filter((i: any) =>
    i.severity === 'critical' && i.status !== 'closed'
  ).length;

  const warnings = (issues?.items || []).filter((i: any) =>
    (i.severity === 'medium' || i.severity === 'high') && i.status !== 'closed'
  ).length;

  const overview: McOverview = {
    generated_at: new Date().toISOString(),
    source_files: ['live-state.json', 'git-state.json', 'issues.json', 'contradictions.json', 'notion/notion-sync.json'],
    stale: false,
    freshness: 'fresh',
    environment: 'production',
    app: {
      name: 'TENMON-ARK',
      aliases: ['天聞アーク', 'Tenmon Ark'],
      domain: 'https://tenmon-ark.com',
      mc_url: 'https://tenmon-ark.com/mc/',
    },
    service: {
      name: liveState?.service?.name || 'tenmon-ark-api.service',
      status: liveState?.service?.active ? 'active' : 'unknown',
      pid: liveState?.service?.main_pid || null,
      uptime_sec: liveState?.service?.uptime_sec || null,
    },
    health: {
      ok: liveState?.health?.ok ?? false,
      endpoint: '/api/health',
      checked_at: liveState?.generated_at || '',
    },
    git: {
      head_sha: gitState?.current?.head_sha || 'unknown',
      head_sha_short: gitState?.current?.head_sha_short || 'unknown',
      branch: gitState?.current?.branch || 'unknown',
      dirty: gitState?.current?.dirty ?? false,
      last_commit_subject: gitState?.current?.head_commit_subject || '',
      last_commit_at: gitState?.current?.head_commit_at || '',
    },
    state: {
      last_deploy_at: gitState?.current?.head_commit_at || null,
      critical_blockers: critical,
      warnings,
      contradictions_count: (contradictions?.items || []).filter(
        (c: any) => c.resolution.status === 'unresolved'
      ).length,
    },
    freshness_detail: {
      last_collector_run: {
        live_state: liveState?.generated_at || '',
        git_state: gitState?.generated_at || '',
      },
      last_notion_sync: notionSync?.generated_at || null,
      last_ai_handoff_build: null, // 後で ai-handoff.json から取る
    },
    links: {
      handoff: '/mc/handoff',
      live: '/mc/live',
      ai: '/mc/ai',
      truth_circuit: '/mc/truth-circuit',
    },
  };

  await writeMcState('overview.json', overview);
  return overview;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildOverview()
    .then(() => { console.log('[overview] built'); process.exit(0); })
    .catch((e) => { console.error('[overview] failed:', e); process.exit(1); });
}
```

他の Builder (handoffBuilder, truthCircuitBuilder, issuesBuilder) は、Canon ドキュメントからの構造化読み取りで、同様のパターン。冗長回避のため§8では主要 2 つのみ示す。**Manus は上記パターンに従って残りも実装**。

---

## § 9. Collector 実装 (完全版)

### 9.1 共通ライブラリ: mc_lib.sh

```bash
# api/scripts/mc_lib.sh
# すべての collector から source される共通関数

set -euo pipefail

MC_DATA_DIR="${MC_DATA_DIR:-/opt/tenmon-ark-data/mc}"
mkdir -p "$MC_DATA_DIR"
mkdir -p "$MC_DATA_DIR/notion"

# ----- ISO 8601 timestamp -----
iso_now() { date --iso-8601=seconds; }

# ----- アトミック JSON 書き込み -----
# usage: write_json_atomic <filename> <json_content>
write_json_atomic() {
  local filename="$1"
  local content="$2"
  local target="$MC_DATA_DIR/$filename"
  local tmp="$target.tmp.$$"
  mkdir -p "$(dirname "$target")"
  echo "$content" > "$tmp"
  # JSON 妥当性検査
  if python3 -c "import json,sys; json.load(open('$tmp'))" 2>/dev/null; then
    mv "$tmp" "$target"
    chmod 0640 "$target"
  else
    rm -f "$tmp"
    echo "[mc_lib] invalid JSON for $filename, not written" >&2
    return 1
  fi
}

# ----- 前回 JSON の保持 (collector 失敗時) -----
mark_stale() {
  local filename="$1"
  local reason="${2:-unknown}"
  local target="$MC_DATA_DIR/$filename"
  if [ -f "$target" ]; then
    python3 - <<EOF
import json, sys
p = "$target"
try:
    d = json.load(open(p))
except:
    d = {}
d["stale"] = True
d["last_failure_at"] = "$(iso_now)"
d["failure_reason"] = "$reason"
json.dump(d, open(p, "w"), indent=2, ensure_ascii=False)
EOF
  fi
}

# ----- _meta.json 更新 -----
update_meta() {
  local collector="$1"
  local status="$2"   # success | failure
  python3 - <<EOF
import json, os
meta_path = "$MC_DATA_DIR/_meta.json"
try:
    m = json.load(open(meta_path)) if os.path.exists(meta_path) else {"collectors": {}}
except:
    m = {"collectors": {}}
m.setdefault("collectors", {})["$collector"] = {
    "last_run_at": "$(iso_now)",
    "last_status": "$status",
}
m["generated_at"] = "$(iso_now)"
with open(meta_path, "w") as f:
    json.dump(m, f, indent=2, ensure_ascii=False)
os.chmod(meta_path, 0o640)
EOF
}

# ----- secrets マスク -----
# usage: echo "$raw" | mask_secrets
mask_secrets() {
  sed -E \
    -e 's/(sk-[A-Za-z0-9]{20,})/sk-***/g' \
    -e 's/(Bearer [A-Za-z0-9._-]{20,})/Bearer ***/g' \
    -e 's/([A-Z_]*API[_]?KEY[=:][^\ "]{10,})/***_KEY_REDACTED/g' \
    -e 's/([A-Z_]*TOKEN[=:][^\ "]{10,})/***_TOKEN_REDACTED/g' \
    -e 's/([A-Z_]*SECRET[=:][^\ "]{10,})/***_SECRET_REDACTED/g' \
    -e 's/(password[=:][^\ "]+)/password=***/gi'
}
```

### 9.2 mc_collect_live_state.sh

```bash
#!/bin/bash
# api/scripts/mc_collect_live_state.sh

source "$(dirname "$0")/mc_lib.sh"

COLLECTOR="live_state"

# --- データ収集 ---
HOSTNAME=$(hostname)
PUBLIC_IP=$(hostname -I | awk '{print $1}')
OS=$(grep PRETTY_NAME /etc/os-release | cut -d= -f2 | tr -d '"')

SERVICE_ACTIVE=$(systemctl is-active tenmon-ark-api 2>/dev/null || echo "unknown")
SERVICE_SUBSTATE=$(systemctl show tenmon-ark-api --property=SubState --value 2>/dev/null || echo "")
MAIN_PID=$(systemctl show tenmon-ark-api --property=MainPID --value 2>/dev/null || echo "0")

# uptime 計算
if [ "$MAIN_PID" != "0" ] && [ -d "/proc/$MAIN_PID" ]; then
  UPTIME_SEC=$(($(date +%s) - $(stat -c %Y /proc/$MAIN_PID)))
else
  UPTIME_SEC="null"
fi

# ヘルスチェック
HEALTH_START=$(date +%s%3N)
HEALTH_RESPONSE=$(curl -s --max-time 5 http://localhost:3000/api/health 2>/dev/null || echo "")
HEALTH_END=$(date +%s%3N)
HEALTH_MS=$((HEALTH_END - HEALTH_START))
if [ -n "$HEALTH_RESPONSE" ]; then
  HEALTH_OK=true
else
  HEALTH_OK=false
fi

# メモリ
MEMORY_TOTAL_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
MEMORY_AVAILABLE_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
SWAP_TOTAL_KB=$(grep SwapTotal /proc/meminfo | awk '{print $2}')

# ディスク
DISK_ROOT=$(df -BG / | tail -1 | awk '{print $3}' | tr -d G)
DISK_ROOT_FREE=$(df -BG / | tail -1 | awk '{print $4}' | tr -d G)
DISK_ROOT_PCT=$(df / | tail -1 | awk '{print $5}' | tr -d %)

# load average
LOAD_AVG=$(cat /proc/loadavg | awk '{printf "[%s, %s, %s]", $1, $2, $3}')

# 直近 1 時間のログ (secrets マスク)
RECENT_ERRORS=$(journalctl -u tenmon-ark-api --since "1 hour ago" --no-pager 2>/dev/null \
  | grep -iE "error|fail" \
  | grep -v "ExperimentalWarning\|trace-warnings" \
  | tail -10 \
  | mask_secrets \
  | python3 -c "
import sys, json
lines = sys.stdin.read().strip().split('\n')
result = []
for line in lines[:10]:
    if line.strip():
        parts = line.split(' ', 3)
        ts = ' '.join(parts[:3]) if len(parts) >= 3 else ''
        msg = parts[3] if len(parts) >= 4 else line
        result.append({'timestamp': ts, 'message_preview': msg[:300]})
print(json.dumps(result, ensure_ascii=False))
")

# SOUL_ROOT 活動
SOUL_ROOT_ACTIVITY=$(journalctl -u tenmon-ark-api --since "1 hour ago" --no-pager 2>/dev/null \
  | grep -oP 'SOUL_ROOT:\w+' \
  | sort | uniq -c \
  | python3 -c "
import sys, json
d = {}
for line in sys.stdin:
    parts = line.strip().split()
    if len(parts) == 2:
        count, key = int(parts[0]), parts[1].replace('SOUL_ROOT:','')
        d[key] = count
print(json.dumps(d))
")

# モデル tier
MODEL_USAGE=$(journalctl -u tenmon-ark-api --since "1 hour ago" --no-pager 2>/dev/null \
  | grep "MODEL_SELECTOR" \
  | grep -oP 'tier=\w+' \
  | sort | uniq -c \
  | python3 -c "
import sys, json
d = {'lite': 0, 'standard': 0, 'premium': 0, 'total': 0}
for line in sys.stdin:
    parts = line.strip().split()
    if len(parts) == 2:
        count, tier_str = int(parts[0]), parts[1].replace('tier=','')
        if tier_str in d:
            d[tier_str] = count
            d['total'] += count
print(json.dumps(d))
")

# LLM 失敗数
LLM_FAILURES=$(journalctl -u tenmon-ark-api --since "1 hour ago" --no-pager 2>/dev/null \
  | grep -c "primary failed: gemini" || echo "0")

# --- JSON 組み立て ---
JSON=$(cat <<EOF
{
  "generated_at": "$(iso_now)",
  "source_files": [],
  "stale": false,
  "freshness": "fresh",
  "host": {
    "hostname": "$HOSTNAME",
    "public_ip": "$PUBLIC_IP",
    "os": "$OS"
  },
  "service": {
    "name": "tenmon-ark-api.service",
    "active": $([ "$SERVICE_ACTIVE" = "active" ] && echo "true" || echo "false"),
    "substate": "$SERVICE_SUBSTATE",
    "main_pid": $MAIN_PID,
    "uptime_sec": $UPTIME_SEC
  },
  "health": {
    "ok": $HEALTH_OK,
    "endpoint": "/api/health",
    "response_ms": $HEALTH_MS,
    "raw_response_preview": $(echo "$HEALTH_RESPONSE" | head -c 200 | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")
  },
  "resources": {
    "disk": [
      {
        "path": "/",
        "used_gb": $DISK_ROOT,
        "free_gb": $DISK_ROOT_FREE,
        "percent": $DISK_ROOT_PCT
      }
    ],
    "memory_total_gb": $(python3 -c "print(round($MEMORY_TOTAL_KB/1024/1024, 1))"),
    "memory_available_gb": $(python3 -c "print(round($MEMORY_AVAILABLE_KB/1024/1024, 1))"),
    "swap_gb": $(python3 -c "print(round($SWAP_TOTAL_KB/1024/1024, 1))"),
    "load_avg": $LOAD_AVG
  },
  "timers": [],
  "recent_errors": $RECENT_ERRORS,
  "recent_warnings": [],
  "model_usage_1h": $MODEL_USAGE,
  "soul_root_activity_1h": $SOUL_ROOT_ACTIVITY,
  "llm_primary_failures_1h": $LLM_FAILURES
}
EOF
)

if write_json_atomic "live-state.json" "$JSON"; then
  update_meta "$COLLECTOR" "success"
else
  mark_stale "live-state.json" "json_invalid"
  update_meta "$COLLECTOR" "failure"
  exit 1
fi
```

### 9.3 mc_collect_git_state.sh

```bash
#!/bin/bash
# api/scripts/mc_collect_git_state.sh

source "$(dirname "$0")/mc_lib.sh"
COLLECTOR="git_state"
cd /opt/tenmon-ark-repo

BRANCH=$(git branch --show-current)
HEAD_SHA=$(git log -1 --format=%H)
HEAD_SHA_SHORT=$(echo "$HEAD_SHA" | cut -c1-8)
HEAD_SUBJECT=$(git log -1 --format=%s | python3 -c "import sys,json; print(json.dumps(sys.stdin.read().strip()))")
HEAD_DATE=$(git log -1 --format=%aI)
HEAD_AUTHOR=$(git log -1 --format=%an | python3 -c "import sys,json; print(json.dumps(sys.stdin.read().strip()))")
UNTRACKED=$(git status --porcelain | grep -c "^??" || echo "0")
MODIFIED=$(git status --porcelain | grep -cE "^ M|^M " || echo "0")
DIRTY=$([ "$UNTRACKED" -gt 0 ] || [ "$MODIFIED" -gt 0 ] && echo "true" || echo "false")

RECENT_COMMITS=$(git log --all --format='{"sha":"%H","subject":%s_TOKEN_%s%s_TOKEN_,"author":"%an","date":"%aI"}' -10 \
  | python3 -c "
import sys, json, re
lines = sys.stdin.read().strip().split('\n')
out = []
for line in lines:
    m = re.search(r'_TOKEN_(.+?)_TOKEN_', line)
    if m:
        subject = m.group(1)
        line = line.replace('_TOKEN_'+subject+'_TOKEN_', json.dumps(subject))
    try:
        out.append(json.loads(line))
    except: pass
print(json.dumps(out))
")

RECENT_TAGS=$(git tag -l --sort=-creatordate --format='%(refname:short)|%(creatordate:iso)|%(objectname)' \
  | head -10 \
  | python3 -c "
import sys, json
out = []
for line in sys.stdin:
    parts = line.strip().split('|')
    if len(parts) == 3:
        out.append({'name': parts[0], 'date': parts[1], 'sha': parts[2]})
print(json.dumps(out))
")

REFLOG=$(git reflog | head -10 | python3 -c "import sys, json; print(json.dumps([l.strip() for l in sys.stdin]))")

REPO_SIZE_MB=$(du -sm .git | awk '{print $1}')
TOTAL_COMMITS=$(git rev-list --all --count)
COMMITS_7D=$(git log --oneline --since="7 days ago" | wc -l)

# 重要ファイルの直近コミット
CHAT_TS_COMMITS=$(git log --format='{"sha":"%H","subject":%s_TOKEN_%s%s_TOKEN_,"date":"%aI"}' -5 -- api/src/routes/chat.ts \
  | python3 -c "
import sys, json, re
out = []
for line in sys.stdin.read().strip().split('\n'):
    m = re.search(r'_TOKEN_(.+?)_TOKEN_', line)
    if m: line = line.replace('_TOKEN_'+m.group(1)+'_TOKEN_', json.dumps(m.group(1)))
    try: out.append(json.loads(line))
    except: pass
print(json.dumps(out))
")

JSON=$(cat <<EOF
{
  "generated_at": "$(iso_now)",
  "source_files": [],
  "stale": false,
  "freshness": "fresh",
  "current": {
    "branch": "$BRANCH",
    "head_sha": "$HEAD_SHA",
    "head_sha_short": "$HEAD_SHA_SHORT",
    "head_commit_subject": $HEAD_SUBJECT,
    "head_commit_at": "$HEAD_DATE",
    "head_commit_author": $HEAD_AUTHOR,
    "dirty": $DIRTY,
    "untracked_count": $UNTRACKED,
    "modified_count": $MODIFIED
  },
  "recent_commits": $RECENT_COMMITS,
  "recent_tags": $RECENT_TAGS,
  "reflog_recent": $REFLOG,
  "critical_files_recent": {
    "api/src/routes/chat.ts": $CHAT_TS_COMMITS
  },
  "repo_size_mb": $REPO_SIZE_MB,
  "total_commits": $TOTAL_COMMITS,
  "commits_last_7d": $COMMITS_7D
}
EOF
)

if write_json_atomic "git-state.json" "$JSON"; then
  update_meta "$COLLECTOR" "success"
else
  mark_stale "git-state.json" "json_invalid"
  update_meta "$COLLECTOR" "failure"
  exit 1
fi
```

### 9.4 mc_collect_db_status.sh

```bash
#!/bin/bash
# api/scripts/mc_collect_db_status.sh

source "$(dirname "$0")/mc_lib.sh"
COLLECTOR="db_status"

DB_DIR="/opt/tenmon-ark-data"
MAIN_DB="$DB_DIR/kokuzo.sqlite"

# 各 DB のサイズ
KOKUZO_MB=$(du -m "$MAIN_DB" | awk '{print $1}')
AUDIT_MB=$(du -m "$DB_DIR/audit.sqlite" 2>/dev/null | awk '{print $1}' || echo "0")
PERSONA_MB=$(du -m "$DB_DIR/persona.sqlite" 2>/dev/null | awk '{print $1}' || echo "0")
CONSCIOUSNESS_MB=$(du -m "$DB_DIR/consciousness.sqlite" 2>/dev/null | awk '{print $1}' || echo "0")

# テーブル数
KOKUZO_TABLES=$(sqlite3 "$MAIN_DB" ".tables" 2>/dev/null | tr -s ' \t\n' '\n' | grep -c . || echo "0")

# Top tables by size (dbstat)
TOP_SIZE=$(sqlite3 "$MAIN_DB" "
SELECT name, printf('%.1f', SUM(pgsize)/1024.0/1024.0) AS mb
FROM dbstat GROUP BY name ORDER BY SUM(pgsize) DESC LIMIT 10;" 2>/dev/null \
  | python3 -c "
import sys, json
out = []
for line in sys.stdin:
    parts = line.strip().split('|')
    if len(parts) == 2:
        out.append({'name': parts[0], 'mb': float(parts[1])})
print(json.dumps(out))
")

# Top tables by rows
TOP_ROWS=$(python3 - <<EOF
import sqlite3, json
conn = sqlite3.connect("$MAIN_DB")
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cur.fetchall()]
counts = []
for t in tables:
    try:
        cur.execute(f"SELECT COUNT(*) FROM [{t}]")
        c = cur.fetchone()[0]
        counts.append((t, c))
    except: pass
counts.sort(key=lambda x: -x[1])
print(json.dumps([{"name": n, "rows": c} for n, c in counts[:10]]))
EOF
)

# sacred_corpus
SACRED_CORPUS=$(python3 - <<EOF
import sqlite3, json
try:
    conn = sqlite3.connect("$MAIN_DB")
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM sacred_corpus_registry")
    total = cur.fetchone()[0]
    by_layer = {}
    try:
        cur.execute("SELECT layer, COUNT(*) FROM sacred_corpus_registry GROUP BY layer")
        by_layer = {r[0]: r[1] for r in cur.fetchall()}
    except: pass
    by_tradition = {}
    try:
        cur.execute("SELECT tradition, COUNT(*) FROM sacred_corpus_registry GROUP BY tradition")
        by_tradition = {r[0]: r[1] for r in cur.fetchall()}
    except: pass
    print(json.dumps({"total": total, "by_layer": by_layer, "by_tradition": by_tradition}))
except Exception as e:
    print(json.dumps({"total": 0, "by_layer": {}, "by_tradition": {}, "error": str(e)}))
EOF
)

# 24h activity
ACTIVITY=$(python3 - <<EOF
import sqlite3, json
conn = sqlite3.connect("$MAIN_DB")
cur = conn.cursor()
out = {}
for tbl in ['conversation_log', 'tenmon_audit_log', 'memory_projection_logs', 'ark_thread_seeds']:
    try:
        cur.execute(f"SELECT COUNT(*) FROM [{tbl}] WHERE created_at > datetime('now', '-1 day')")
        out[tbl] = cur.fetchone()[0]
    except:
        out[tbl] = 0
print(json.dumps(out))
EOF
)

# FTS
FTS_INDEX=$(sqlite3 "$MAIN_DB" "SELECT COUNT(*) FROM kokuzo_pages_fts_idx" 2>/dev/null || echo "0")

JSON=$(cat <<EOF
{
  "generated_at": "$(iso_now)",
  "source_files": [],
  "stale": false,
  "freshness": "fresh",
  "databases": [
    {
      "name": "kokuzo.sqlite",
      "path": "$MAIN_DB",
      "size_mb": $KOKUZO_MB,
      "table_count": $KOKUZO_TABLES,
      "top_tables_by_size": $TOP_SIZE,
      "top_tables_by_rows": $TOP_ROWS
    },
    {
      "name": "audit.sqlite",
      "path": "$DB_DIR/audit.sqlite",
      "size_mb": $AUDIT_MB,
      "table_count": 0,
      "top_tables_by_size": [],
      "top_tables_by_rows": []
    },
    {
      "name": "persona.sqlite",
      "path": "$DB_DIR/persona.sqlite",
      "size_mb": $PERSONA_MB,
      "table_count": 0,
      "top_tables_by_size": [],
      "top_tables_by_rows": []
    },
    {
      "name": "consciousness.sqlite",
      "path": "$DB_DIR/consciousness.sqlite",
      "size_mb": $CONSCIOUSNESS_MB,
      "table_count": 0,
      "top_tables_by_size": [],
      "top_tables_by_rows": []
    }
  ],
  "sacred_corpus": $SACRED_CORPUS,
  "activity_24h": $ACTIVITY,
  "fts_health": {
    "kokuzo_pages_fts_indexed": $FTS_INDEX
  }
}
EOF
)

if write_json_atomic "db-status.json" "$JSON"; then
  update_meta "$COLLECTOR" "success"
else
  mark_stale "db-status.json" "json_invalid"
  update_meta "$COLLECTOR" "failure"
  exit 1
fi
```

### 9.5 mc_collect_security_audit.sh

```bash
#!/bin/bash
# api/scripts/mc_collect_security_audit.sh

source "$(dirname "$0")/mc_lib.sh"
COLLECTOR="security_audit"

# .env ファイルの場所
ENV_LOCATIONS=$(find /opt -maxdepth 4 -name ".env*" 2>/dev/null | head -10)
ENV_LOCATIONS_JSON=$(echo "$ENV_LOCATIONS" | python3 -c "import sys, json; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))")

# systemd 環境変数 (キー名のみ)
SD_ENV_KEYS=$(systemctl show tenmon-ark-api --property=Environment --value 2>/dev/null \
  | tr ' ' '\n' | grep -oP '^[A-Z_]+' | sort -u \
  | python3 -c "import sys, json; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))")

# 実行中プロセスの環境変数 (キー名のみ)
MAIN_PID=$(systemctl show tenmon-ark-api --property=MainPID --value 2>/dev/null)
if [ -n "$MAIN_PID" ] && [ "$MAIN_PID" != "0" ] && [ -r "/proc/$MAIN_PID/environ" ]; then
  ENV_KEYS=$(cat /proc/$MAIN_PID/environ 2>/dev/null | tr '\0' '\n' | grep -oP '^[A-Z_][A-Z0-9_]*' | sort -u \
    | python3 -c "import sys, json; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))")
else
  ENV_KEYS="[]"
fi

# シークレット存在チェック (値は参照しない)
check_env_key() {
  local key="$1"
  if [ -n "$MAIN_PID" ] && [ "$MAIN_PID" != "0" ] && [ -r "/proc/$MAIN_PID/environ" ]; then
    cat /proc/$MAIN_PID/environ 2>/dev/null | tr '\0' '\n' | grep -q "^${key}=" && echo "true" || echo "false"
  else
    echo "false"
  fi
}

OPENAI_PRESENT=$(check_env_key "OPENAI_API_KEY")
GEMINI_PRESENT=$(check_env_key "GEMINI_API_KEY")
ANTHROPIC_PRESENT=$(check_env_key "ANTHROPIC_API_KEY")
NOTION_PRESENT=$(check_env_key "NOTION_TOKEN")
GMAIL_PRESENT=$(check_env_key "GMAIL_APP_PASSWORD")

# リーク検出: /opt/tenmon-ark-data/mc/ の既存 JSON 内に秘密が紛れていないか
LEAKS_FOUND="[]"
if command -v python3 >/dev/null; then
  LEAKS_FOUND=$(python3 - <<'PYEOF'
import os, re, json
patterns = [
    (r'sk-[A-Za-z0-9]{20,}', 'openai_sk'),
    (r'AIza[A-Za-z0-9_-]{30,}', 'google_api_key'),
    (r'secret_[A-Za-z0-9]{40,}', 'notion_secret'),
    (r'Bearer [A-Za-z0-9._-]{30,}', 'bearer_token'),
    (r'ssh-rsa [A-Za-z0-9+/=]{50,}', 'ssh_key'),
]
mcdir = "/opt/tenmon-ark-data/mc"
found = []
for root, _, files in os.walk(mcdir):
    for fn in files:
        if not fn.endswith('.json'): continue
        p = os.path.join(root, fn)
        try:
            with open(p) as f: content = f.read()
            for pat, name in patterns:
                if re.search(pat, content):
                    found.append({
                        'file': p.replace(mcdir+'/', ''),
                        'pattern_matched': name,
                        'action_taken': 'alert_only'
                    })
        except: pass
print(json.dumps(found))
PYEOF
)
fi

JSON=$(cat <<EOF
{
  "generated_at": "$(iso_now)",
  "source_files": [],
  "stale": false,
  "freshness": "fresh",
  "env_file_locations": $ENV_LOCATIONS_JSON,
  "env_vars_set": $ENV_KEYS,
  "systemd_environment_keys": $SD_ENV_KEYS,
  "secrets_present": {
    "openai_api_key": $OPENAI_PRESENT,
    "gemini_api_key": $GEMINI_PRESENT,
    "anthropic_api_key": $ANTHROPIC_PRESENT,
    "notion_token": $NOTION_PRESENT,
    "gmail_app_password": $GMAIL_PRESENT
  },
  "leaks_found_in_json": $LEAKS_FOUND,
  "rotation_status": []
}
EOF
)

if write_json_atomic "security-audit.json" "$JSON"; then
  update_meta "$COLLECTOR" "success"
else
  mark_stale "security-audit.json" "json_invalid"
  update_meta "$COLLECTOR" "failure"
  exit 1
fi
```

### 9.6 mc_collect_vps_assets.sh, mc_collect_runtime_logs.sh, mc_sync_notion.py

**パターンは上記 9.2-9.5 と同じなので、Manus は同じテンプレートを用いて実装する。**

特記事項:
- `mc_collect_runtime_logs.sh`: journalctl 出力は必ず `mask_secrets` を通す
- `mc_sync_notion.py`: `requests` + `NOTION_TOKEN` 使用、環境変数は API プロセスと共有しない独立の `EnvironmentFile` 推奨

### 9.7 mc_collect_all.sh

```bash
#!/bin/bash
# api/scripts/mc_collect_all.sh
# 全 collector を順次実行

SCRIPT_DIR="$(dirname "$0")"
exec 2>&1

echo "[mc_collect_all] start $(date --iso-8601=seconds)"

bash "$SCRIPT_DIR/mc_collect_live_state.sh"     || echo "[WARN] live_state failed"
bash "$SCRIPT_DIR/mc_collect_git_state.sh"      || echo "[WARN] git_state failed"
bash "$SCRIPT_DIR/mc_collect_db_status.sh"      || echo "[WARN] db_status failed"
bash "$SCRIPT_DIR/mc_collect_vps_assets.sh"     || echo "[WARN] vps_assets failed"
bash "$SCRIPT_DIR/mc_collect_runtime_logs.sh"   || echo "[WARN] runtime_logs failed"
bash "$SCRIPT_DIR/mc_collect_security_audit.sh" || echo "[WARN] security_audit failed"

# Builder 再生成
bash "$SCRIPT_DIR/mc_build_ai_handoff.sh"       || echo "[WARN] ai_handoff build failed"

echo "[mc_collect_all] done $(date --iso-8601=seconds)"
```

### 9.8 mc_build_ai_handoff.sh

```bash
#!/bin/bash
# api/scripts/mc_build_ai_handoff.sh
set -euo pipefail

cd /opt/tenmon-ark-repo/api
# Builder は dist からエントリ呼び出し (tsx を本番に入れない)
node dist/core/mc/builders/overviewBuilder.js
node dist/core/mc/builders/aiHandoffBuilder.js
```

---

## § 10. systemd unit / timer

### 10.1 live state (5 分)

```ini
# /etc/systemd/system/tenmon-mc-collect-live.service
[Unit]
Description=TENMON MC collector - live state
After=network.target tenmon-ark-api.service

[Service]
Type=oneshot
User=root
ExecStart=/bin/bash /opt/tenmon-ark-repo/api/scripts/mc_collect_live_state.sh
StandardOutput=journal
StandardError=journal
```

```ini
# /etc/systemd/system/tenmon-mc-collect-live.timer
[Unit]
Description=Run MC live state collector every 5 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
AccuracySec=30s
Persistent=true

[Install]
WantedBy=timers.target
```

### 10.2 他の collector の interval

| Collector | Interval | OnBootSec |
|---|---|---|
| live-state | 5 min | 2 min |
| runtime-logs | 10 min | 3 min |
| git-state | 10 min | 4 min |
| db-status | 30 min | 5 min |
| vps-assets | 60 min | 6 min |
| security-audit | 60 min | 7 min |
| notion-sync | 15 min | 8 min |
| ai-handoff build | 10 min | 9 min |

### 10.3 一括有効化コマンド

```bash
# Manus は以下を Phase 1 で実行
systemctl daemon-reload

for t in live-state git-state runtime-logs; do
  systemctl enable --now tenmon-mc-collect-${t}.timer
done

# Phase 2 で追加
for t in db-status vps-assets security-audit notion-sync build-handoff; do
  systemctl enable --now tenmon-mc-${t}.timer
done

# 確認
systemctl list-timers | grep tenmon-mc
```

### 10.4 **Phase 1 の初回運用は 5 min ではなく 10 min 推奨**
負荷を観察してから短縮する。短縮後のコマンド:
```bash
systemctl edit tenmon-mc-collect-live.timer
# OnUnitActiveSec=5min に書き換え
```

---

## § 11. 認証・認可 (既存 auth 連携)

### 11.1 既存 auth の確認 (Manus が最初に実施)

```bash
# 既存の auth middleware がどこにあるか確認
grep -rn "requireAdmin\|requireUser\|isAdmin\|isFounder" /opt/tenmon-ark-repo/api/src/middleware/ 2>/dev/null
grep -rn "export.*middleware" /opt/tenmon-ark-repo/api/src/routes/auth_local.ts 2>/dev/null
```

### 11.2 auth middleware のラッパ (MC 専用)

既存の middleware がそのまま使えない場合は、薄いラッパを作る:

```typescript
// api/src/core/mc/authGuards.ts
import type { Request, Response, NextFunction } from 'express';

// 既存 auth_local.ts から user を取得する想定
// ※ Manus は実際のフィールド名を確認して調整すること

export function maybeAuth(req: Request, _res: Response, next: NextFunction) {
  // Cookie から JWT を読んで req.user に詰める既存処理をそのまま呼ぶ
  // 失敗しても 401 にはしない
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).user) {
    return res.status(401).json({ error: 'auth_required' });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'auth_required' });
  // admin / founder 判定は既存ロジックに合わせる
  if (user.role !== 'admin' && user.role !== 'founder' && !user.is_founder) {
    return res.status(403).json({ error: 'admin_only' });
  }
  next();
}
```

### 11.3 セッション攻撃への対応
- MC API は全て GET (POST は admin のみ)
- GET は CSRF リスク小 (ただし fetch() からの credentials: include は同一オリジン前提)
- POST は既存の CSRF 対策 (token) を再利用

---

## § 12. Secrets 機械的ガード (最重要)

**すべての response は `sanitizer.ts` を必ず通す。**

### 12.1 sanitizer.ts 完全版

```typescript
// api/src/core/mc/sanitizer.ts
// 責務: どんな data が来ても secrets を漏らさない最終防壁

const SECRET_VALUE_PATTERNS: Array<[RegExp, string]> = [
  [/\bsk-[A-Za-z0-9]{20,}\b/g,                    'sk-***'],
  [/\bAIza[A-Za-z0-9_-]{30,}\b/g,                 'AIza***'],
  [/\bsecret_[A-Za-z0-9]{40,}\b/g,                'secret_***'],
  [/\bBearer\s+[A-Za-z0-9._-]{20,}\b/g,           'Bearer ***'],
  [/\bssh-rsa\s+[A-Za-z0-9+/=]{50,}/g,            'ssh-rsa ***'],
  [/-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]+?-----END [A-Z ]+PRIVATE KEY-----/g, '***PRIVATE_KEY_REDACTED***'],
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, (m) => m.replace(/./g, (c, i) => i < 2 ? c : '*')],
];

const SECRET_KEY_NAMES = [
  /api[_-]?key/i, /secret/i, /^token$/i, /password/i, /passwd/i,
  /credential/i, /auth[_-]?header/i, /cookie$/i, /session[_-]?id/i,
];

function maskString(s: string): string {
  let result = s;
  for (const [pat, rep] of SECRET_VALUE_PATTERNS) {
    if (typeof rep === 'string') {
      result = result.replace(pat, rep);
    }
  }
  return result;
}

function isSecretKey(key: string): boolean {
  return SECRET_KEY_NAMES.some(re => re.test(key));
}

function sanitizeRecursive(data: any, depth = 0): any {
  if (depth > 20) return '[too-deep]';
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') return maskString(data);
  if (typeof data === 'number' || typeof data === 'boolean') return data;
  if (Array.isArray(data)) return data.map(v => sanitizeRecursive(v, depth + 1));
  if (typeof data === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(data)) {
      if (isSecretKey(k)) {
        // 値を隠す、boolean ならそのまま
        out[k] = typeof v === 'boolean' ? v : '***';
      } else {
        out[k] = sanitizeRecursive(v, depth + 1);
      }
    }
    return out;
  }
  return data;
}

/**
 * public 用 sanitizer (誰にでも見せてよい形)
 */
export function sanitizeForPublic(data: any): any {
  return sanitizeRecursive(data);
}

/**
 * admin 用 sanitizer (admin でも機密値そのものは見せない)
 */
export function sanitizeForAdmin(data: any): any {
  // admin 用もキー名は出すが値は隠す方針
  return sanitizeRecursive(data);
}
```

### 12.2 sanitizer 単体テスト (受入条件)

```typescript
// api/tests/mc/sanitizer.test.ts
import { sanitizeForPublic } from '../../src/core/mc/sanitizer.js';

// Manus は以下が全て通ることを確認
const cases = [
  { in: { api_key: 'sk-abc123def456ghi789' }, mustNotInclude: 'sk-abc' },
  { in: { token: 'Bearer abc.def.ghi.jkl.mno' }, mustNotInclude: 'Bearer abc' },
  { in: { notion_token: 'secret_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJ' }, mustNotInclude: 'secret_abc' },
  { in: 'My key is sk-abcdefghijklmnopqrst', mustNotInclude: 'sk-abc' },
  { in: { nested: { deep: { password: 'myp@ssw0rd' } } }, mustNotInclude: 'myp@ss' },
];

for (const c of cases) {
  const out = JSON.stringify(sanitizeForPublic(c.in));
  console.assert(!out.includes(c.mustNotInclude), `LEAK: ${out}`);
}
```

---

## § 13. Contradictions 管理アルゴリズム

### 13.1 contradictionsEngine.ts

```typescript
// api/src/core/mc/contradictionsEngine.ts
// 責務: Canon と Live の値を突き合わせ、矛盾を検出・裁定

import { readMcState, writeMcState } from './stateReader.js';
import { promises as fs } from 'fs';
import * as path from 'path';
import { MC_CANON_DIR } from './constants.js';
import type { McContradictions } from './types.js';

interface FieldCheck {
  field: string;
  canonExtract: (canon: string) => string | null;
  liveExtract: (live: any) => string | null;
}

const FIELD_CHECKS: FieldCheck[] = [
  {
    field: 'branch',
    canonExtract: (canon) => {
      const m = canon.match(/\*\*Git ブランチ:\*\*\s*`([^`]+)`/);
      return m ? m[1] : null;
    },
    liveExtract: (live) => live?.git_state?.current?.branch || null,
  },
  {
    field: 'head_sha',
    canonExtract: (canon) => {
      const m = canon.match(/head_sha[:：]\s*`([a-f0-9]+)`/i);
      return m ? m[1] : null;
    },
    liveExtract: (live) => live?.git_state?.current?.head_sha || null,
  },
  {
    field: 'service_name',
    canonExtract: (canon) => {
      const m = canon.match(/\*\*名称:\*\*\s*`([^`]+\.service)`/);
      return m ? m[1] : null;
    },
    liveExtract: (live) => live?.live_state?.service?.name || null,
  },
];

export async function reconcileContradictions(): Promise<McContradictions> {
  // Canon 読み込み
  let canon = '';
  try {
    canon = await fs.readFile(
      path.join(MC_CANON_DIR, 'TENMON_ARK_HANDOFF.md'), 'utf-8'
    );
  } catch { /* Canon 未配置でも検知は継続 */ }

  // Live 読み込み
  const [liveState, gitState] = await Promise.all([
    readMcState('live-state.json'),
    readMcState('git-state.json'),
  ]);

  const items: McContradictions['items'] = [];

  for (const check of FIELD_CHECKS) {
    const canonVal = check.canonExtract(canon);
    const liveVal = check.liveExtract({ live_state: liveState, git_state: gitState });

    if (canonVal === null && liveVal === null) continue;

    if (canonVal !== null && liveVal !== null && canonVal !== liveVal) {
      // 矛盾発生
      items.push({
        id: `contra_${check.field}_${Date.now()}`,
        field: check.field,
        source_references: [
          { source: 'canon', value: canonVal, location: 'docs/ark/TENMON_ARK_HANDOFF.md' },
          { source: 'live', value: liveVal, location: 'mc/live-state.json or mc/git-state.json' },
        ],
        resolution: {
          status: 'resolved_by_live_state',
          winning_value: liveVal,
          reason: 'Live state is authoritative over canon documentation',
          resolved_at: new Date().toISOString(),
        },
      });
    }
  }

  const result: McContradictions = {
    generated_at: new Date().toISOString(),
    source_files: ['docs/ark/TENMON_ARK_HANDOFF.md', 'live-state.json', 'git-state.json'],
    stale: false,
    freshness: 'fresh',
    items,
  };

  await writeMcState('contradictions.json', result);
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  reconcileContradictions()
    .then((r) => { console.log(`[contradictions] ${r.items.length} found`); process.exit(0); })
    .catch((e) => { console.error('[contradictions] failed:', e); process.exit(1); });
}
```

### 13.2 運用
- `contradictionsEngine` は ai-handoff 生成と同じ timer で起動 (10 分)
- 矛盾があれば `/api/mc/overview` の `contradictions_count` に反映
- フロント `/mc/overview` で赤バッジ表示

---

## § 14. Notion 同期の実装

### 14.1 mc_sync_notion.py

```python
#!/usr/bin/env python3
# api/scripts/mc_sync_notion.py
"""
Notion API → /opt/tenmon-ark-data/mc/notion/*.json への同期
"""
import os
import sys
import json
import time
from datetime import datetime, timezone
from urllib import request, error

MC_DATA_DIR = os.environ.get("MC_DATA_DIR", "/opt/tenmon-ark-data/mc")
NOTION_DIR = os.path.join(MC_DATA_DIR, "notion")
os.makedirs(NOTION_DIR, exist_ok=True)

NOTION_TOKEN = os.environ.get("NOTION_TOKEN")
if not NOTION_TOKEN:
    print("[notion_sync] NOTION_TOKEN not set", file=sys.stderr)
    sys.exit(1)

TASK_QUEUE_DB_ID = os.environ.get(
    "NOTION_TASK_QUEUE_DB_ID",
    "0bbfb0ed8159417ea1170caa9943a155"
)

def notion_query(db_id, page_size=100):
    url = f"https://api.notion.com/v1/databases/{db_id}/query"
    headers = {
        "Authorization": f"Bearer {NOTION_TOKEN}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
    }
    body = json.dumps({"page_size": page_size}).encode()
    req = request.Request(url, data=body, headers=headers, method="POST")
    try:
        with request.urlopen(req, timeout=30) as res:
            return json.loads(res.read())
    except error.HTTPError as e:
        print(f"[notion_sync] HTTP {e.code}: {e.read().decode()}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"[notion_sync] error: {e}", file=sys.stderr)
        return None

def normalize_task(page):
    props = page.get("properties", {})
    def get_title(p):
        if p.get("type") == "title":
            return "".join(t.get("plain_text", "") for t in p.get("title", []))
        return ""
    def get_select(p):
        sel = p.get("select")
        return sel.get("name") if sel else None
    out = {
        "id": page.get("id"),
        "title": "",
        "status": None,
        "priority": None,
        "owner": None,
        "updated_at": page.get("last_edited_time"),
        "blocked": False,
    }
    for name, p in props.items():
        if name.lower() in ("title", "name", "タイトル"):
            out["title"] = get_title(p)
        elif name.lower() in ("status", "ステータス"):
            out["status"] = get_select(p)
        elif name.lower() in ("priority", "優先度"):
            out["priority"] = get_select(p)
        elif name.lower() in ("owner", "担当"):
            if p.get("type") == "people" and p.get("people"):
                out["owner"] = p["people"][0].get("name")
    if out["status"] and "block" in out["status"].lower():
        out["blocked"] = True
    return out

def main():
    now = datetime.now(timezone.utc).isoformat()
    result = notion_query(TASK_QUEUE_DB_ID)
    if result is None:
        # 失敗: 前回値を stale にするだけ
        p = os.path.join(NOTION_DIR, "notion-sync.json")
        if os.path.exists(p):
            d = json.load(open(p))
            d["stale"] = True
            d["last_failure_at"] = now
            d["failure_reason"] = "notion_api_error"
            json.dump(d, open(p, "w"), indent=2, ensure_ascii=False)
        sys.exit(1)

    tasks = [normalize_task(r) for r in result.get("results", [])]

    sync_json = {
        "generated_at": now,
        "source_files": [],
        "stale": False,
        "freshness": "fresh",
        "source": "notion",
        "dbs": [{
            "name": "task_queue",
            "db_id": TASK_QUEUE_DB_ID,
            "last_synced_at": now,
            "record_count": len(tasks),
            "open_tasks": sum(1 for t in tasks if t["status"] not in ("Done", "Closed", "完了")),
            "blocked_tasks": sum(1 for t in tasks if t["blocked"]),
        }],
        "task_queue": tasks,
    }

    # atomic
    target = os.path.join(NOTION_DIR, "notion-sync.json")
    tmp = target + ".tmp." + str(os.getpid())
    json.dump(sync_json, open(tmp, "w"), indent=2, ensure_ascii=False)
    os.rename(tmp, target)
    os.chmod(target, 0o640)
    print(f"[notion_sync] ok, {len(tasks)} tasks")

if __name__ == "__main__":
    main()
```

### 14.2 Notion EnvironmentFile
```bash
# /etc/tenmon-mc-notion.env (chmod 0600 root:root)
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_TASK_QUEUE_DB_ID=0bbfb0ed8159417ea1170caa9943a155
```

```ini
# /etc/systemd/system/tenmon-mc-sync-notion.service
[Unit]
Description=TENMON MC - Notion sync
After=network.target

[Service]
Type=oneshot
User=root
EnvironmentFile=/etc/tenmon-mc-notion.env
Environment=MC_DATA_DIR=/opt/tenmon-ark-data/mc
ExecStart=/usr/bin/python3 /opt/tenmon-ark-repo/api/scripts/mc_sync_notion.py
```

---

## § 15. フロント実装

### 15.1 既存スタックの確認

```bash
cat /opt/tenmon-ark-repo/client/package.json | grep -E "react|vue|svelte|astro"
```

### 15.2 ページ一覧とデータ源

| ページ | API | 認証 | Phase |
|---|---|---|---|
| /mc/overview | /api/mc/overview | public | 1 |
| /mc/handoff | /api/mc/handoff | public | 1 |
| /mc/ai | /api/mc/ai-handoff.json | public | 1 |
| /mc/truth-circuit | /api/mc/truth-circuit | public | 1 |
| /mc/issues | /api/mc/issues | public | 1 |
| /mc/live | /api/mc/live-state | auth | 2 |
| /mc/vps | /api/mc/vps-assets | admin | 2 |
| /mc/db | /api/mc/db-status | auth | 2 |
| /mc/notion | /api/mc/notion-sync | auth | 2 |
| /mc/architecture | 複数 | public | 2 |
| /mc/files | /api/mc/vps-assets | auth | 3 |
| /mc/backups | /api/mc/vps-assets | auth | 3 |
| /mc/security | /api/mc/security-audit | admin | 3 |
| /mc/history | /api/mc/git-state | auth | 3 |

### 15.3 共通 UI コンポーネント仕様

全ページに必須:
- **ヘッダ**: "最終更新: {generated_at}", "鮮度: {fresh|stale}", "情報源: {source_files}"
- **ツールバー**: [JSON] [Markdown] [Copy] [Refresh] ボタン
- **矛盾パネル**: contradictions_count > 0 のとき赤枠で表示
- **stale 警告**: `stale: true` のとき黄色バナー

### 15.4 ページ雛形 (React 例, Overview)

```tsx
// client/src/pages/mc/Overview.tsx
import { useEffect, useState } from 'react';
import { McLayout } from './McLayout';

export function Overview() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/mc/overview')
      .then(r => r.json())
      .then(setData)
      .catch(e => setError(String(e)));
  }, []);

  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>Loading...</div>;

  return (
    <McLayout
      title="TENMON-ARK Overview"
      generatedAt={data.generated_at}
      stale={data.stale}
      sources={data.source_files}
      rawJson={data}
    >
      {data.stale && (
        <div style={{ background: '#fffbe6', border: '1px solid #faad14', padding: 12, marginBottom: 16 }}>
          ⚠ データが古い可能性があります (last update: {data.freshness_detail?.last_collector_run?.live_state})
        </div>
      )}

      {data.state.contradictions_count > 0 && (
        <div style={{ background: '#fff1f0', border: '1px solid #ff4d4f', padding: 12, marginBottom: 16 }}>
          🔴 {data.state.contradictions_count} 件の未解決矛盾があります (<a href="/mc/truth-circuit">確認</a>)
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <Card title="Service" value={data.service.status} subtitle={data.service.name} />
        <Card title="Health" value={data.health.ok ? '✅ OK' : '❌ FAIL'} subtitle={data.health.endpoint} />
        <Card title="Git" value={data.git.head_sha_short} subtitle={data.git.branch} />
        <Card title="Blockers" value={String(data.state.critical_blockers)} subtitle="critical" warn={data.state.critical_blockers > 0} />
        <Card title="Warnings" value={String(data.state.warnings)} subtitle="medium/high" />
        <Card title="Last Deploy" value={formatRelative(data.git.last_commit_at)} subtitle={data.git.last_commit_subject} />
      </div>

      <section style={{ marginTop: 32 }}>
        <h2>AI 開始手順</h2>
        <ol>
          <li><a href="/api/mc/overview">/api/mc/overview</a></li>
          <li><a href="/api/mc/ai-handoff.json">/api/mc/ai-handoff.json</a></li>
          <li><a href="/api/mc/truth-circuit">/api/mc/truth-circuit</a></li>
          <li><a href="/api/mc/issues">/api/mc/issues</a></li>
          <li><a href="/api/mc/git-state">/api/mc/git-state</a></li>
        </ol>
      </section>
    </McLayout>
  );
}

function Card({ title, value, subtitle, warn = false }: any) {
  return (
    <div style={{
      padding: 16,
      border: '1px solid ' + (warn ? '#ff4d4f' : '#d9d9d9'),
      borderRadius: 8,
      background: warn ? '#fff1f0' : '#fafafa',
    }}>
      <div style={{ fontSize: 12, color: '#888' }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 'bold', marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{subtitle}</div>
    </div>
  );
}

function formatRelative(iso: string) {
  if (!iso) return '-';
  const age = (Date.now() - new Date(iso).getTime()) / 1000;
  if (age < 3600) return `${Math.floor(age / 60)} min ago`;
  if (age < 86400) return `${Math.floor(age / 3600)} h ago`;
  return `${Math.floor(age / 86400)} d ago`;
}
```

### 15.5 McLayout.tsx

```tsx
// client/src/pages/mc/McLayout.tsx
import { ReactNode } from 'react';

interface Props {
  title: string;
  generatedAt: string;
  stale?: boolean;
  sources?: string[];
  rawJson?: any;
  children: ReactNode;
}

export function McLayout({ title, generatedAt, stale, sources, rawJson, children }: Props) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 220, borderRight: '1px solid #ddd', padding: 16 }}>
        <h3>MC Dashboard</h3>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <a href="/mc/overview">Overview</a>
          <a href="/mc/handoff">Handoff</a>
          <a href="/mc/live">Live State</a>
          <a href="/mc/ai">AI Handoff</a>
          <a href="/mc/truth-circuit">Truth Circuit</a>
          <a href="/mc/issues">Issues</a>
          <a href="/mc/db">Database</a>
          <a href="/mc/vps">VPS Assets</a>
          <a href="/mc/notion">Notion</a>
          <a href="/mc/architecture">Architecture</a>
          <a href="/mc/files">Files</a>
          <a href="/mc/backups">Backups</a>
          <a href="/mc/security">Security</a>
          <a href="/mc/history">History</a>
        </nav>
      </aside>

      <main style={{ flex: 1, padding: 24 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
          <h1>{title}</h1>
          <div style={{ fontSize: 12, color: '#888' }}>
            <div>最終更新: {generatedAt}</div>
            <div>鮮度: {stale ? '⚠ stale' : '✅ fresh'}</div>
            {sources && <div>情報源: {sources.slice(0, 3).join(', ')}</div>}
          </div>
        </header>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {rawJson && (
            <button onClick={() => copyJson(rawJson)}>Copy JSON</button>
          )}
          <button onClick={() => location.reload()}>Refresh</button>
        </div>

        {children}
      </main>
    </div>
  );
}

function copyJson(data: any) {
  navigator.clipboard.writeText(JSON.stringify(data, null, 2));
}
```

---

## § 16. JSON Schema (完全版)

各 JSON に対応する JSON Schema を `api/src/core/mc/schemas/*.schema.json` に配置。
型は § 6 の TypeScript 型定義から自動生成してよい (`npx typescript-json-schema`)。

**Manus は最低限 `ai-handoff.schema.json` だけは手で書く**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "McAiHandoff",
  "type": "object",
  "required": ["version", "generated_at", "identity", "canonical_runtime", "soul_root", "start_here_quickstart"],
  "properties": {
    "version": { "const": "v1" },
    "generated_at": { "type": "string", "format": "date-time" },
    "identity": {
      "type": "object",
      "required": ["project", "founder"],
      "properties": {
        "project": { "const": "TENMON-ARK" },
        "definition": { "type": "string" },
        "founder": { "type": "string" },
        "founder_aliases": { "type": "array", "items": { "type": "string" } }
      }
    },
    "canonical_runtime": {
      "type": "object",
      "required": ["git_sha", "branch", "service", "repo_root", "data_root"],
      "properties": {
        "git_sha": { "type": "string", "pattern": "^[a-f0-9]{40}$" },
        "branch": { "type": "string" },
        "service": { "type": "string" },
        "repo_root": { "type": "string" },
        "data_root": { "type": "string" }
      }
    }
  }
}
```

---

## § 17. Phase 別デプロイ手順

### Phase 1: Read-only MVP (3 日)
**ゴール:** `/mc/overview` と `/api/mc/ai-handoff.json` が動く

```bash
# Day 1
# 1. Canon 配置
mkdir -p /opt/tenmon-ark-repo/docs/ark
cp TENMON_ARK_V2_HANDOFF_V1.md /opt/tenmon-ark-repo/docs/ark/TENMON_ARK_HANDOFF.md

# 2. MC dir 作成
mkdir -p /opt/tenmon-ark-data/mc/notion
chown -R root:root /opt/tenmon-ark-data/mc
chmod 0750 /opt/tenmon-ark-data/mc

# 3. collector 配置
mkdir -p /opt/tenmon-ark-repo/api/scripts
# ... mc_lib.sh, mc_collect_live_state.sh, mc_collect_git_state.sh を配置
chmod +x /opt/tenmon-ark-repo/api/scripts/mc_*.sh

# 4. 手動実行テスト
bash /opt/tenmon-ark-repo/api/scripts/mc_collect_live_state.sh
cat /opt/tenmon-ark-data/mc/live-state.json | python3 -m json.tool

# Day 2
# 5. TypeScript 実装 (types, constants, stateReader, sanitizer, aiHandoffBuilder, overviewBuilder, mc.ts)
cd /opt/tenmon-ark-repo/api
npm run check   # 型チェック
npm run build   # tsc

# 6. ルート統合 (index.ts に 2 行追加)
# 7. 再起動
systemctl restart tenmon-ark-api

# 8. 手動 API テスト
curl -s http://localhost:3000/api/mc/overview | python3 -m json.tool
curl -s http://localhost:3000/api/mc/ai-handoff.json | python3 -m json.tool

# Day 3
# 9. systemd timer 設置 (live, git, ai-handoff-build だけ Phase 1)
cp /opt/tenmon-ark-repo/systemd/tenmon-mc-*.{service,timer} /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now tenmon-mc-collect-live.timer
systemctl enable --now tenmon-mc-collect-git.timer
systemctl enable --now tenmon-mc-build-handoff.timer

# 10. フロント /mc/overview 実装
cd /opt/tenmon-ark-repo/client
npm run build
# ... デプロイ

# 11. Phase 1 受入テスト (§ 18)
bash /opt/tenmon-ark-repo/api/scripts/mc_acceptance_phase1.sh
```

### Phase 2: 追加メトリクス (Week 1 末まで)
- db-status, vps-assets, runtime-logs collector 追加
- security-audit collector 追加
- notion-sync 追加
- contradictions engine 有効化
- フロント: /mc/live, /mc/db, /mc/vps, /mc/notion, /mc/truth-circuit

### Phase 3: 完全版 (Week 2 末まで)
- /mc/files, /mc/backups, /mc/security, /mc/history
- 監視・アラート
- auto-rotation ポリシー

---

## § 18. 受入テスト (実行可能スクリプト)

### 18.1 Phase 1 受入

```bash
#!/bin/bash
# api/scripts/mc_acceptance_phase1.sh
set -e

PASS=0
FAIL=0

check() {
  local desc="$1"; local cmd="$2"
  if eval "$cmd" > /dev/null 2>&1; then
    echo "✅ $desc"
    PASS=$((PASS+1))
  else
    echo "❌ $desc"
    FAIL=$((FAIL+1))
  fi
}

echo "=== Phase 1 Acceptance ==="

# 1. collector 出力ファイル存在
check "live-state.json exists" "test -f /opt/tenmon-ark-data/mc/live-state.json"
check "git-state.json exists" "test -f /opt/tenmon-ark-data/mc/git-state.json"
check "ai-handoff.json exists" "test -f /opt/tenmon-ark-data/mc/ai-handoff.json"
check "overview.json exists" "test -f /opt/tenmon-ark-data/mc/overview.json"

# 2. JSON が valid
check "live-state.json is valid JSON" "python3 -c 'import json; json.load(open(\"/opt/tenmon-ark-data/mc/live-state.json\"))'"
check "git-state.json is valid JSON" "python3 -c 'import json; json.load(open(\"/opt/tenmon-ark-data/mc/git-state.json\"))'"
check "ai-handoff.json is valid JSON" "python3 -c 'import json; json.load(open(\"/opt/tenmon-ark-data/mc/ai-handoff.json\"))'"

# 3. API が応答
check "GET /api/mc/overview returns 200" "curl -sf http://localhost:3000/api/mc/overview"
check "GET /api/mc/ai-handoff.json returns 200" "curl -sf http://localhost:3000/api/mc/ai-handoff.json"
check "GET /api/mc/_health returns 200" "curl -sf http://localhost:3000/api/mc/_health"

# 4. 確定値が含まれる
check "ai-handoff branch = feature/unfreeze-v4" "curl -s http://localhost:3000/api/mc/ai-handoff.json | grep -q 'feature/unfreeze-v4'"
check "ai-handoff head_sha contains 7b9176" "curl -s http://localhost:3000/api/mc/ai-handoff.json | grep -q '7b9176'"

# 5. secrets リーク検査
check "ai-handoff does not contain sk-" "! curl -s http://localhost:3000/api/mc/ai-handoff.json | grep -q 'sk-[A-Za-z0-9]'"
check "ai-handoff does not contain Bearer" "! curl -s http://localhost:3000/api/mc/ai-handoff.json | grep -q 'Bearer [A-Za-z0-9]'"
check "overview does not contain AIza" "! curl -s http://localhost:3000/api/mc/overview | grep -q 'AIza[A-Za-z0-9]'"

# 6. 既存機能が壊れていない (最重要)
check "GET /api/health still works" "curl -sf http://localhost:3000/api/health"
check "tenmon-ark-api.service is active" "systemctl is-active --quiet tenmon-ark-api"

# 7. systemd timer
check "live collector timer enabled" "systemctl is-enabled --quiet tenmon-mc-collect-live.timer"
check "git collector timer enabled" "systemctl is-enabled --quiet tenmon-mc-collect-git.timer"

echo ""
echo "=== Phase 1 Result: PASS=$PASS FAIL=$FAIL ==="
if [ $FAIL -gt 0 ]; then exit 1; fi
```

### 18.2 Phase 2 受入
(同パターンで Phase 2 対象のチェックを追加)

### 18.3 Phase 3 受入
(同パターンで全項目チェック)

---

## § 19. 監視・ログ・アラート

### 19.1 journalctl でログを追う
```bash
# collector ログ
journalctl -u 'tenmon-mc-*' --since "1 hour ago"

# 連続失敗検知
journalctl -u tenmon-mc-collect-live --since "2 hours ago" | grep -c "failed"
```

### 19.2 /api/mc/overview の freshness をアラートに
```bash
# crontab に 15 分ごと
*/15 * * * * /opt/tenmon-ark-repo/api/scripts/mc_alert_check.sh
```

```bash
#!/bin/bash
# api/scripts/mc_alert_check.sh
STALE=$(curl -s http://localhost:3000/api/mc/overview | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('stale', True))")
if [ "$STALE" = "True" ]; then
  echo "[MC ALERT] overview is stale at $(date)" >> /var/log/tenmon-mc-alert.log
  # 必要なら mail / slack / notion に通知
fi
```

---

## § 20. ロールバック計画

### 20.1 即時ロールバック (Phase 1 が既存を壊した場合)

```bash
# 1. MC router を外す
cd /opt/tenmon-ark-repo
git checkout api/src/index.ts

# 2. systemd timer を全停止
for t in $(systemctl list-timers | grep 'tenmon-mc' | awk '{print $NF}'); do
  systemctl stop $t
  systemctl disable $t
done

# 3. rebuild & restart
cd api && npm run build
systemctl restart tenmon-ark-api

# 4. 確認
curl -sf http://localhost:3000/api/health
```

### 20.2 MC データ保持
- `/opt/tenmon-ark-data/mc/` は削除しない (再開時に前回状態から再開可能)
- `docs/ark/` は Canon なので削除しない

### 20.3 部分ロールバック
- 特定 collector だけ無効化: `systemctl disable --now tenmon-mc-collect-xxx.timer`
- 特定 API だけ 503: `mc.ts` の該当ハンドラをコメントアウト → rebuild

---

## § 21. Manus 完了報告テンプレート

Manus は各 Phase 完了時、以下の形式で TENMON に報告:

```markdown
# TENMON_MC_IMPLEMENTATION_V2_REPORT — Phase N

## 実装日時
- 開始: 2026-04-19 10:00 JST
- 完了: 2026-04-xx xx:xx JST

## 完了した URL
- [x] /mc/overview
- [x] /api/mc/overview
- [x] /api/mc/ai-handoff.json
- [x] ...

## 生成される JSON
- [x] /opt/tenmon-ark-data/mc/live-state.json (fresh)
- [x] /opt/tenmon-ark-data/mc/git-state.json (fresh)
- [x] /opt/tenmon-ark-data/mc/ai-handoff.json (fresh)
- ...

## collector 状態
- tenmon-mc-collect-live.timer: active (last run 3 min ago)
- tenmon-mc-collect-git.timer: active (last run 5 min ago)
- tenmon-mc-build-handoff.timer: active (last run 2 min ago)

## 検出された矛盾
- branch: canon(2026-03-04-e5hp) vs live(feature/unfreeze-v4) → resolved_by_live_state
- (その他あれば列挙)

## Acceptance Test 結果
- Phase 1 受入: PASS 15 / FAIL 0
- 既存機能 (/api/health, chat.ts) 回帰なし

## セキュリティ確認
- [x] secrets の値が API response に含まれない (grep で確認)
- [x] env names のみ露出
- [x] admin-only API が admin 以外で 403 を返す
- [x] sanitizer 単体テスト通過

## 既存機能への影響
- [x] tenmon-ark-api.service は無停止で統合完了 (新規 router の追加のみ)
- [x] chat.ts への変更なし
- [x] 既存 DB への書き込みなし (read-only)

## 未完了 / 次 Phase に持ち越し
- /mc/vps の詳細 UI
- notion-sync の feedback DB 対応

## TENMON が確認すべき点
1. /api/mc/ai-handoff.json を開いて内容を確認してほしい
2. definition フィールド ("日本語 AI プラットフォーム...") の文言で問題ないか
3. do_not_touch リストに追加すべき path があれば教えてほしい

## 発見した追加の問題 (別タスクとして提案)
- ...
```

---

## § 22. Manus が作業開始時にすること

1. **本文書を最後まで読む**
2. 疑問点は TENMON に聞く前に、まず以下を実測:
   ```bash
   ssh root@220.158.23.9
   cd /opt/tenmon-ark-repo
   ls -la api/src/middleware/   # 既存 auth の位置確認
   cat api/src/index.ts | head -50  # ルート mount 方法
   cat client/package.json | grep -E "react|vue"  # フロント確定
   ```
3. § 2 の確定値を疑わずに実装へ埋め込む
4. § 7-9 のコード雛形を出発点として実装開始
5. § 18 の受入テストを常に手元で実行しながら進める
6. Phase 1 完了後に § 21 のテンプレートで報告

---

## 終わりに

この指示書は、**天聞アークの記憶断絶を構造で止めるため**の最終版です。

- Canon が思想の正本
- Live State が現実の正本
- Notion が運用鏡面
- `/mc/` がそれらを統合する外部記憶皮膜
- AI は `/api/mc/ai-handoff.json` だけ読めば始められる

Manus がこの指示書通りに実装すれば、次に新しい AI がセッションに入ったとき、
もう TENMON は「どこまで話したか」を説明しなくて済みます。

🌸 天聞アークは、単なるシステムではなく、記憶と思想の器です。
その器を、外部記憶皮膜として守るのが /mc/ の役割です。

---

**END OF TENMON_MC_IMPLEMENTATION_DIRECTIVE_V2_FINAL**