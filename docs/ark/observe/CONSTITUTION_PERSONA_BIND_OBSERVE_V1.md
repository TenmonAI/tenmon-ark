# CONSTITUTION_PERSONA_BIND_OBSERVE_V1

- 日時: 2026-04-25 (JST 2026-04-26 06:39)
- 監査者: Cursor (副因 C 真因切り分け)
- parent_commit: `67a0229c` (RELEASE-NOTES-MEMORY-DISTILL-V1)
- 種別: **OBSERVE only** (DB write ゼロ、PATCH 完全禁止)
- カード: `CARD-CONSTITUTION-PERSONA-BIND-OBSERVE-V1`
- DB: `/opt/tenmon-ark-data/kokuzo.sqlite` (`-readonly` SELECT のみ)
- 観測ログ: `/tmp/cpg/persona-bind-observe.txt` (本レポートの根拠)

> 注: 本カードは観測のみ。修復・shema 拡張・migration・restart は一切行わない。修復方針は Section 8〜9 で起案するが、適用は Phase 2 別カードで行う。

---

## Section 1: thread 構造の観測

### 1.1 schema (`thread_center_memory`)

実体スキーマ (sqlite3 `.schema` 出力):

```
CREATE TABLE thread_center_memory (
  id INTEGER PRIMARY KEY,
  thread_id TEXT NOT NULL,
  center_type TEXT NOT NULL,
  center_key TEXT,
  center_reason TEXT,
  next_axes_json TEXT,
  source_route_reason TEXT,
  source_scripture_key TEXT,
  source_topic_class TEXT,
  source_self_phase TEXT,
  source_intent_phase TEXT,
  confidence REAL NOT NULL DEFAULT 0.0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
, essential_goal TEXT, success_criteria_json TEXT, constraints_json TEXT, clarification_focus TEXT);
```

### 1.2 thread_id 体系 (規模)

| 指標 | 値 |
|---|---|
| total rows | 9,178 |
| unique thread_id | 8,707 |

上位 thread_id はほぼ「`acc-*`」「`audit-*`」「`ACC_*`」等の audit / acceptance 用 thread。center_count はほぼすべて 2 (concept + scripture の 2 entry) で揃っている。

### 1.3 default thread の center

`thread_id='default'` 全件 (id 順):

| id | center_type | center_key | confidence | updated_at |
|---|---|---|---|---|
| 422 | concept   | HOKEKYO | 0.80 | 2026-04-12T12:48:43.987Z |
| 423 | scripture | HOKEKYO | 0.98 | 2026-04-12T12:48:43.986Z |

- **`essential_goal`**: 「直前の話題を踏まえて前に進めたい（推定）」
- center entry は **2 件のみ、両方とも `HOKEKYO` (法華経)**。
- 「kotodama_constitution_v1」「言霊憲法」「constitution」を含む center entry は default thread では **0 件**。

### 1.4 center_key 分布 (上位)

| center_key | cnt |
|---|---|
| (空文字) | 6,298 |
| `kotodama` | 1,226 |
| `KHSL:LAW:KHSU:41c0bff9cfb8:p0:qcb9cdda1f01d` | 428 |
| `hokekyo` | 365 |
| `HOKEKYO` | 205 |
| `kotodama_hisho` | 174 |
| `self_reflection` | 156 |
| `katakamuna` | 64 |
| `tenmon_fusion` | 26 |
| `mizuho_den` | 24 |
| `KUKAI` | 12 |
| ... |

**`kotodama_constitution_v1` を center_key に含む entry は全 thread 通して 0 件。**
WHERE 句:

```sql
WHERE center_key LIKE '%constitution%'
   OR center_key LIKE '%kotodama_constitution%'
   OR essential_goal LIKE '%言霊憲法%'
   OR center_reason LIKE '%kotodama_constitution_v1%'
```

→ 0 件。

---

## Section 2: persona 構造の観測

### 2.1 schema (`persona_profiles`)

主要カラム: `id, slug, name, status, role_summary, system_mantra, mission, hallucination_fallback, evidence_threshold, retrieval_mode, memory_inheritance_mode, created_at, updated_at`

(`personality_json` カラムは本実体には**存在しない** — カード前提と相違あり。)

### 2.2 全件 (本番 / Stage2 区別)

| id (UUID) | slug | name | status | hallucination_fallback | retrieval_mode | created_at |
|---|---|---|---|---|---|---|
| `7d516068-3738-4671-8862-50203c61fd52` | `kukai-deepread` | 空海深層解読 | **draft** | admit_unknown | grounded_first | 2026-04-01 20:37:41 |
| `250e4565-3fd0-4ef6-8bf3-7c4f55f9cde9` | `stage2-persona-1775085424` | **Stage2 Persona** | **active** | **abstain** | balanced | 2026-04-01 23:17:04 |

**persona_profiles 全 2 件のみ**。`role_summary='memory projection verification'`, `slug='stage2-persona-…'` から、`Stage2 Persona` は **memory projection 検証用 fixture**。

「default」persona は `persona_profiles` テーブルに **存在しない**。`personaState.js` 側で `default` を文字列リテラルとして定義している可能性 (本カードでは Phase A モジュール内部詳細は読まない)。

### 2.3 hallucination_fallback の意味

- `kukai-deepread` (draft): `admit_unknown` — 不明なら「分からない」と表明
- `stage2-persona-…` (active): `abstain` — **回答自体を控える**

→ `default thread` に唯一 link されている本番 active persona は `Stage2 Persona`。これは「memory projection verification」用であり、実応答用 persona ではない。`abstain` 設定は本番で発火すると沈黙応答に繋がる。

---

## Section 3: persona_knowledge_bindings 構造

### 3.1 実体 schema (カード前提と相違)

実体カラム:

```
id, persona_id, source_type, source_id, source_label,
binding_mode, priority, active, metadata_json, created_at, updated_at
```

カード前提との対応:
- `binding_type` → **`binding_mode`**
- `knowledge_id` → **`source_id`**
- `binding_metadata` → **`metadata_json`**

### 3.2 persona_id 別分布 (全 105 件)

| persona_id | cnt |
|---|---|
| `250e4565-…` (**Stage2 Persona**) | 50 |
| `7d516068-…` (**kukai-deepread**) | 50 |
| `verify_persona_kb_runtime_a_v1` | 3 |
| `verify_persona_kb_runtime_b_v1` | 2 |

→ 「default persona 50 件」というカード前提は誤り。**実体は kukai-deepread / Stage2 が 50 件ずつ**で、`persona_id='default'` は 0 件。

### 3.3 binding_mode / source_type 分布

binding_mode:

| binding_mode | cnt |
|---|---|
| retrieve | 101 |
| flavor   | 2 |
| guard    | 1 |
| enforce  | 1 |

source_type:

| source_type | cnt |
|---|---|
| `kokuzo_canon` | 100 |
| `constitution` | 2 |
| `source_family` | 1 |
| `memory_family` | 1 |
| `kotodama_law` | 1 |

`source_type='constitution'` は **2 件のみ**で、両方とも verify fixture (Section 3.4)。

### 3.4 既存 constitution / kotodama 関連 binding 全件

| persona_id | source_type | source_id | source_label | binding_mode | priority |
|---|---|---|---|---|---|
| `verify_persona_kb_runtime_a_v1` | constitution | `TENMON_TIANJIN_GOLDEN_WOOD_ROOT_V1` | 天津金木 root | enforce | 5 |
| `verify_persona_kb_runtime_a_v1` | kotodama_law | `kotodama_law_trace_v1` | (空) | retrieve | 10 |
| `verify_persona_kb_runtime_b_v1` | constitution | `KHS_RUNTIME_CONTRACT_V1` | (空) | guard | 5 |

→ 全 3 件とも `verify_persona_kb_runtime_*_v1` (verify fixture)。本番運用 persona (`kukai-deepread` / `Stage2 Persona`) には `source_type='constitution'` の binding は **0 件**。

### 3.5 article_01〜12 の bind 状況 (期待: 0)

```sql
SELECT COUNT(*) FROM persona_knowledge_bindings
WHERE source_id LIKE 'kotodama_constitution_v1_article_%'
   OR source_id IN (
     SELECT id FROM memory_units
     WHERE scope_id = 'kotodama_constitution_v1'
   );
```

→ **0 件** (期待通り)。`MEMORY-DISTILL-APPLY-V1` で投入された 12 unit は **persona に bind されていない**。

### 3.6 補助観察: kukai-deepread / Stage2 の 50 件は同一 source_id

両 persona の bind 50 件は **完全に同じ 50 個の UUID source_id** を `kokuzo_canon` 系で `retrieve / priority=50 / active=1` として bind している。これは「等価な kokuzo canon set を 2 persona で共有」する設計。

---

## Section 4: thread_persona_links 構造

### 4.1 schema

```
id TEXT PRIMARY KEY,
thread_id TEXT NOT NULL,
persona_id TEXT NOT NULL,
link_mode TEXT NOT NULL DEFAULT 'fixed',
created_at, updated_at
```

(カード前提の `link_type` / `link_metadata` カラムは**存在しない** — 実体は `link_mode` のみ。)

### 4.2 全件 + persona_id 別分布

| 指標 | 値 |
|---|---|
| total rows | **112,975** |
| `250e4565-…` (Stage2 Persona) | **112,973** |
| `verify_persona_ts_45d43643` | 1 |
| `verify_persona_ts_43ee360d` | 1 |

→ **99.998% (112,973 / 112,975) が Stage2 Persona** に link されている。`kukai-deepread` (UUID `7d516068`) は thread_persona_links に **1 件も登場しない**。

### 4.3 thread_id 上位 (link 多い順)

| thread_id | link_count |
|---|---|
| `quality_probe` | 1,957 |
| `gov_def`       | 1,611 |
| `gate_def`      | 1,595 |
| **`default`**   | **1,566** |
| `la_probe`      | 1,112 |
| `sl_ark`        | 1,112 |
| `sl_gr`         | 1,112 |
| `sl_kt`         | 1,112 |
| `gov_grounded`  | 1,101 |
| `gov_ark`       | 1,095 |

### 4.4 default thread の persona link

直近 10 件すべて:

```
thread_id  = default
persona_id = 250e4565-3fd0-4ef6-8bf3-7c4f55f9cde9   (Stage2 Persona)
link_mode  = auto_default
created_at = 2026-04-09 21:32〜22:17
```

- **default thread の persona link は 100% Stage2 Persona、link_mode='auto_default' のみ**。
- 直近 link は 2026-04-09 で停止。それ以降の追記は確認できない。
- `kukai-deepread` への default thread link は 0 件。

### 4.5 link_mode 観測 (補助)

最新 1 万件範囲のサンプル: `auto_default` が支配的。`fixed` は default 値だが現状ほぼ未使用。

---

## Section 5: chat.ts での persona / thread 使用箇所

### 5.1 `persona_profiles` / `persona_knowledge_bindings` への参照

`chat.ts` 内 grep:

```
grep -nE "persona_profile|persona_knowledge_bindings|personaProfile|personaKnowledgeBindings"
  api/src/routes/chat.ts
→ 0 件
```

→ **`chat.ts` 本体は `persona_profiles` も `persona_knowledge_bindings` も一切参照しない**。

`api/src/` 全体で `persona_knowledge_bindings` を grep:

```
api/src/db/persona_memory_schema.sql:35:  CREATE TABLE IF NOT EXISTS persona_knowledge_bindings (
api/src/db/persona_memory_schema.sql:113: CREATE INDEX IF NOT EXISTS idx_persona_profiles_status ...
```

→ **schema 定義以外、コード上で `persona_knowledge_bindings` を SELECT している箇所は存在しない**。105 件の binding は登録されているが、現行 chat 経路で読み出しはされていない。

### 5.2 thread_id / threadCenter の参照

`chat.ts` 内に `threadId` 参照は多数 (`__sukuyouSeedByThread`, `kokuzoRecall(threadId)` など、メモリ管理用)。`thread_center_memory` 直接 SELECT は **`chat.ts` に 0 件**。`threadCenterMemory.ts` モジュール経由で `chat_refactor/scripture_trunk_v1.ts`, `chat_front.ts`, `gates_impl.ts`, `support_selfdiag_trunk_v1.ts` などから `upsertThreadCenter` / `getLatestThreadCenter` が呼ばれる構造。

### 5.3 persona 関連 import (chat.ts)

```
chat.ts:10  import { getCurrentPersonaState } from "../persona/personaState.js";
chat.ts:13  import { naturalRouter } from "../persona/naturalRouter.js";
chat.ts:22  import { parseLaneChoice } from "../persona/laneChoice.js";
```

→ persona は `personaState.js` / `naturalRouter.js` / `laneChoice.js` を経由するルート。これらが `persona_profiles` テーブルを参照しているかは本カードで観測対象外 (Phase A モジュール扱い、grep のみで詳細読まず)。`personaRegistry.ts` は `persona_profiles` を SELECT するが、`chat.ts` は `personaRegistry` を直接 import していない。

### 5.4 KOTODAMA_CONSTITUTION_V1 / memory_units の chat.ts での扱い

```
chat.ts:367  // CARD-CONSTITUTION-PROMOTION-GATE-V1: KOTODAMA_CONSTITUTION_V1 12 条本文を起動時に注入
chat.ts:2558 kotodama_constitution_v1: String(_kotodamaConstitutionV1Clause ?? "").length,
```

→ chat.ts は `_kotodamaConstitutionV1Clause` を **system prompt に直接注入**する経路 (PROMOTION-GATE) のみで kotodama_constitution_v1 を扱う。`memory_units` は chat.ts から直接 SELECT されない (memoryProjection 経由)。

`memoryProjection.ts` のクエリ:

```ts
// distilledThreadUnits
SELECT * FROM memory_units
 WHERE memory_scope='thread' AND scope_id=?
   AND memory_type IN ('conversation_distill','thread_center_distill','scripture_distill')

// distilledSourceUnits
SELECT * FROM memory_units
 WHERE memory_scope='source' AND memory_type='source_distill'
```

→ `MEMORY-DISTILL-APPLY-V1` で投入した 12 unit の実体:
- `memory_scope='source'`
- `scope_id='kotodama_constitution_v1'`
- `memory_type='scripture_distill'`

`distilledThreadUnits` は `memory_scope='thread'` 限定のため**マッチしない**。`distilledSourceUnits` は `memory_type='source_distill'` 限定のため**マッチしない**。
→ **`memoryProjection` 経由でも 12 unit は chat に届かない**。記憶層 12 条が chat に届く「公式」経路は現状存在せず、PROMOTION-GATE による system prompt 直接注入のみが伝達路。

`scope_id LIKE 'kotodama_constitution_v1'` を chat.ts / api/src 全体で grep → **0 件**。

---

## Section 6: 動的観測 (chat 応答での bind 確認)

### 6.1 第 4 条 / 第 7 条 / 五十連十行 の応答

| 質問 | response len | route_reason | thread_id (応答 JSON) |
|---|---|---|---|
| 「言霊憲法 V1 第 4 条は何ですか？」 | **151** | `NATURAL_GENERAL_LLM_TOP` | `default` |
| 「言霊憲法 V1 第 7 条は何ですか？」 | **282** (journal: 278) | `NATURAL_GENERAL_LLM_TOP` | `default` |
| 「五十連十行とは何ですか？」 | **841** | `NATURAL_GENERAL_LLM_TOP` | `default` |

→ 第 4 条 144+ chars 維持 (Acceptance #23 OK)。すべて `NATURAL_GENERAL_LLM_TOP` route。

### 6.2 thread_id / persona_id の取得状況

chat API レスポンス JSON の keys:
```
[ "__evolutionLedgerV1Done", "candidates", "decisionFrame", "evidence",
  "reportAvailable", "requestId", "response", "rewriteDelta",
  "rewriteUsed", "threadId", "timestamp" ]
```

- `threadId="default"` は応答 JSON に明示されている。
- **`personaId` / `persona_id` キーは応答 JSON に存在しない**。
- `route_taken` / `routeReason` も応答 JSON には含まれない (journal のみで観測可能)。

### 6.3 PromptTrace / journal での persona 情報

journalctl `[CUT-AUDIT]`:
```
threadId: "default"
routeReason: "NATURAL_GENERAL_LLM_TOP"
provider: "gemini"
model: "models/gemini-2.5-flash"
```

→ **journal にも persona_id / persona_name は含まれない**。

`mc_intelligence_fire.jsonl` `prompt_trace.clause_lengths` (第 4 条の例):

```json
{
  "khs_constitution":         1148,
  "kotodama_constitution_v1": 2895,   ← PROMOTION-GATE で 12 条本文注入
  "kotodama_hisho":           2010,
  "kotodama_one_sound":       213,
  "kotodama_genten":          183,
  "unified_sound":            144,
  "iroha":                    703,
  "amaterasu":                185,
  "truth_layer":              295,
  "khs_root_fractal":         204
}
prompt_total_length: 9325
response_length:     151
```

→ **PromptTrace には `persona_id` / `thread_id` フィールドが存在しない**。clause_lengths レベルでは `kotodama_constitution_v1=2895` が PROMOTION-GATE で注入されている事実のみ確認可能。

### 6.4 まとめ

- 12 条が chat に届いている経路は **PROMOTION-GATE (system prompt 注入 2895 chars)** **のみ**。
- thread_id / persona_id / route_taken は **公開 API レスポンスにも PromptTrace にも露出していない**。
- 副因 C-2 (persona bind) を修復しても、現状 chat.ts は `persona_knowledge_bindings` を読まないので影響しない。

---

## Section 7: 副因 C の 4 観点詰まり度

実体根拠ベースで、各観点の **詰まり度を 0-100** で判定。100 が完全詰まり (機能していない)。

| 観点 | 詰まり度 | 根拠 |
|---|---|---|
| **C-1. thread bind** | **100 / 100** | `thread_center_memory` 全 9,178 件中、`kotodama_constitution_v1` を含む center entry は **0 件**。default thread の center は `HOKEKYO` (concept + scripture) の 2 件のみで、2026-04-12 から不変。`center_type='constitution'` カテゴリすら未使用。 |
| **C-2. persona bind** | **95 / 100** | `persona_knowledge_bindings` 全 105 件中、`kotodama_constitution_v1_article_*` への bind は **0 件**。本番運用 persona (`kukai-deepread` / `Stage2 Persona`) に `source_type='constitution'` の binding 0 件。constitution binding 3 件はすべて `verify_persona_kb_runtime_*_v1` fixture。**さらに `chat.ts` は `persona_knowledge_bindings` を一切 SELECT しないので、bind を追加しても現流路では発火しない** (-5 で 95 とした、bind 構造は存在するため)。 |
| **C-3. thread_persona link** | **90 / 100** | `thread_persona_links` 全 112,975 件のうち **99.998% が `Stage2 Persona` (`hallucination_fallback='abstain'`)** に link。default thread の persona も `Stage2 Persona` (`auto_default`) のみ 1,566 件。`kukai-deepread` は thread_persona_links に 0 件。本番会話の persona ハンドルは事実上「memory projection verification fixture」を踏んでいる。`chat.ts` は thread_persona_links を直接 SELECT しないため -10。 |
| **C-4. route 流路** | **85 / 100** | `chat.ts` 本体は `persona_profiles` / `persona_knowledge_bindings` / `thread_persona_links` を **直接 SELECT しない**。`thread_center_memory` も直接 SELECT は 0 件 (`threadCenterMemory.ts` モジュール経由)。`memory_units` は `memoryProjection` 経由でのみアクセス。`memoryProjection` の 2 つの distill クエリ (`memory_scope='thread' AND memory_type IN (...,'scripture_distill')` / `memory_scope='source' AND memory_type='source_distill'`) のいずれにも、現行 12 条 (`memory_scope='source'`/`memory_type='scripture_distill'`) は **マッチしない** (scope と type の不一致)。**12 条を chat に届ける唯一の現行経路は PROMOTION-GATE による system prompt 直接注入** (clause_lengths.kotodama_constitution_v1=2895)。 |

### 7.1 4 観点の総括

- C-1 (thread bind): **完全詰まり**。
- C-2 (persona bind): **構造上は詰まり、ただし現流路では中継不在 (修復しても chat に届かない)**。
- C-3 (thread_persona link): **詰まり、かつ active link 先の `abstain` persona が本番不適**。
- C-4 (route 流路): **persona/thread 系の table はいずれも chat.ts 直結ではなく、唯一 PROMOTION-GATE が機能中**。

→ **真因の中心は C-1 と C-4** (構造を作っても流路にならない問題)。C-2 / C-3 は「構造上の不整合」を表しているが、それ単独では即効薬にならない。

---

## Section 8: 修復シナリオ 5 つ

> いずれも **本カードでは適用しない** (Phase 2 別カードで適用)。本セクションは起案のみ。

### 8.1 シナリオ 1: thread_center に 12 条 entry 追加 (Card-09a)

- 対象 table: `thread_center_memory`
- 追加内容案:
  ```
  thread_id   = 'default'
  center_type = 'constitution' (新カテゴリ) または 'scripture'
  center_key  = 'kotodama_constitution_v1'
  essential_goal = '言霊憲法 V1 12 条を本会話の center に置く'
  confidence  = 1.0
  ```
- 規模: 1 件追加 (既存 9,178 → 9,179)
- リスク: **低**。ただし default thread の既存 center=HOKEKYO と競合する可能性。`center_type` ごとに 1 entry を保持するロジック (gates_impl.ts / scripture_trunk_v1.ts 等) があるため、新 type ならば干渉しない。
- 効果: thread center を読む `naturalRouter` / `sacredContextBuilder.ts` (経由で `getLatestThreadCenter`) に憲法シグナルを露出可能。
- 制約: **chat.ts が thread_center_memory を直接 SELECT しない**ため、別モジュール (memoryProjection / personaRuntime / sacredContextBuilder 等) が拾うことが前提。

### 8.2 シナリオ 2: persona_knowledge_bindings に 12 条 bind (Card-09b)

- 対象 table: `persona_knowledge_bindings`
- 追加内容案: 本番 persona に対し
  ```
  source_type = 'constitution'
  source_id   = 'kotodama_constitution_v1_article_01' .. 'article_12'
  source_label = '言霊憲法 V1 第 N 条'
  binding_mode = 'enforce' (or 'retrieve')
  priority     = 5
  ```
  → 12 件 (× 本番 persona 数)。
- 規模: 12 〜 24 件追加 (105 → 117〜129)。
- リスク: **中**。本番運用 persona の特定が必要 (Stage2 Persona は abstain なので不適、kukai-deepread は draft、本番 default persona の実体特定が必要)。
- 効果: `persona_knowledge_bindings` を読むモジュール (本観測時点では `chat.ts` 直結はゼロ。`personaRuntime.ts` 等の Phase A 周辺で読まれる可能性あり) に憲法を bind 可能。
- 制約: **chat.ts 本体が `persona_knowledge_bindings` を SELECT しない**ため、そのままでは伝達路にならない。

### 8.3 シナリオ 3: thread_persona_link 整理 (Card-09c)

- 対象 table: `thread_persona_links`
- 内容案: default thread の link を「`Stage2 Persona` (`abstain`) only」から、本番運用 persona (新規 `default-prod-v1` 相当 or `kukai-deepread` を active 化) に切り替える。
- 規模: 1 件 INSERT (新 link) + 古い `auto_default` link は historical record として残置。
- リスク: **中**。`chat.ts` は直接 thread_persona_links を読まないが、`personaState.js` / `naturalRouter.js` 経由で persona ハンドル決定に影響する可能性。
- 効果: persona resolver が回ったときに `abstain` ではない persona を引ける。
- 副次: 副因 C-3 観測上の異常 (本番 thread が verification fixture に link) 自体の解消。

### 8.4 シナリオ 4: 上記 3 つ複合 (Card-09 統合)

- 対象: `thread_center_memory` + `persona_knowledge_bindings` + `thread_persona_links` + `memory_units`
- 段取り (3 段階適用):
  1. (Card-09 Step1) `thread_center_memory` に `center_type='constitution'`, `center_key='kotodama_constitution_v1'` entry を default thread に 1 件 INSERT。
  2. (Card-09 Step2) 本番 persona 特定後、`persona_knowledge_bindings` に 12 条を bind。
  3. (Card-09 Step3) `thread_persona_links` の default thread link を本番 persona に整理。
- リスク: **中**。多 table の同時変更だが、どれも INSERT/上書き idempotent 化で安全に。
- 効果: 構造的健全化 + 副因 C-1/C-2/C-3 の数値改善。**ただし C-4 (route 流路) には不十分**: `chat.ts` 直接 SELECT 経路が依然不在。

### 8.5 シナリオ 5: chat.ts 側で memory_units 検索の追加 (or memoryProjection 拡張)

- 対象: 本来 `chat.ts` または `memoryProjection.ts`。
- 内容案: memoryProjection の `distilledSourceUnits` クエリに `memory_type IN ('source_distill','scripture_distill')` を追加し、`scope_id='kotodama_constitution_v1'` を含む 12 unit を pickup できるようにする。または chat.ts に専用 SELECT を 1 ブロック追加。
- リスク: **中〜高**。`api/src/*` を変更するため、既存 PROMOTION-GATE の 2895 chars 注入を保護しつつ追加挿入が必要。回帰しやすいので diff 確認と golden test (第 4 条 144+ chars) が必須。
- 効果: **C-4 (route 流路) に直接効く唯一のシナリオ**。`memory_units` 12 unit が現実に chat に届く伝達路が二重化される (PROMOTION-GATE + memory hit)。
- 制約: **本カードでは Phase A モジュールも `api/src/*` も触らない**ため、適用不可。Phase 2 で Card 化が必要。

---

## Section 9: 推奨修復シナリオ + リスク評価

### 9.1 推奨: **シナリオ 4 (統合) + シナリオ 5 (route 補強) の 2 段組み**

理由:

1. **シナリオ 4 単独では route 流路に届かない**。chat.ts が `persona_knowledge_bindings` / `thread_persona_links` / `thread_center_memory` を直接読まない以上、DB 構造を整えても伝達されない。
2. **シナリオ 5 単独では C-1/C-2/C-3 の構造的負債が残る**。観測上の検診 (`doctor v2`) が「副因 C 完全解消」と判定するためには、構造データも整える必要がある。
3. 両者を組み合わせれば、構造 (C-1〜C-3) + 流路 (C-4) を同時にカバーできる。

### 9.2 段階的適用案 (Phase 2 で 4 cards)

| 順序 | カード名 | 種別 | 対象 |
|---|---|---|---|
| 1 | `CARD-CONSTITUTION-THREAD-CENTER-BIND-V1` | DB INSERT | `thread_center_memory`: default thread に kotodama_constitution_v1 entry 1 件 |
| 2 | `CARD-CONSTITUTION-PERSONA-BIND-APPLY-V1` | DB INSERT | `persona_knowledge_bindings`: 本番 persona に 12 条 bind (本番 persona 特定が前提) |
| 3 | `CARD-CONSTITUTION-THREAD-PERSONA-LINK-FIX-V1` | DB INSERT | `thread_persona_links`: default thread の link を本番 persona に切替 |
| 4 | `CARD-CONSTITUTION-MEMORY-PROJECTION-EXPAND-V1` | code (memoryProjection.ts 1 行追加) | `memory_type IN ('source_distill','scripture_distill')` に拡張 |

各カードは個別 OBSERVE → APPLY → VERIFY (PRE/POST) のペアで進める運用に揃える (`MEMORY-DISTILL-APPLY-V1` の前例に倣う)。

### 9.3 リスク評価表

| シナリオ | DB write | code change | restart | 第 4 条 144+ chars 退行リスク | 推奨度 |
|---|---|---|---|---|---|
| 1. thread_center | 1 件 | なし | 不要 | 低 (system prompt 不変) | ◎ |
| 2. persona_knowledge | 12〜24 件 | なし | 不要 | 低 | ○ (本番 persona 特定後) |
| 3. thread_persona_link | 1 件 | なし | 不要 | 低 | ○ |
| 4. 統合 | 〜26 件 | なし | 不要 | 低 | ◎ |
| 5. memoryProjection 拡張 | 0 件 | 1 行 | 必要 (api restart) | 中 (golden test 必須) | ◎ (route 補強) |

---

## Section 10: PROMOTION-GATE / MEMORY-DISTILL との相補性

| 層 | 状態 | 役割 | 検証ポイント |
|---|---|---|---|
| **PROMOTION-GATE** (system prompt) | **稼働中** (clause_lengths.kotodama_constitution_v1 = **2895** 連続検証) | LLM に毎回 12 条本文を投入 | `mc_intelligence_fire.jsonl.prompt_trace.clause_lengths.kotodama_constitution_v1 == 2895` |
| **MEMORY-DISTILL** (memory_units) | **登録済 12 unit / 拾われていない** | 記憶層に蒸留物を保持 | `SELECT COUNT(*) FROM memory_units WHERE scope_id='kotodama_constitution_v1' = 12`、ただし memoryProjection の現行クエリではマッチしない |
| **THREAD/PERSONA BIND** (本副因 C) | **未稼働** (構造ゼロ) | 会話 router に憲法シグナルを露出 | thread_center_memory / persona_knowledge_bindings / thread_persona_links に kotodama_constitution_v1 が出現するか |

→ **3 層のうち、稼働しているのは PROMOTION-GATE のみ**。MEMORY-DISTILL は「実体は持つが、現行クエリでは引かれない」状態 (副因 A は phrase hit ベースでは確認されたものの、chat 経路における memoryProjection でのヒットは未確認)。本副因 C 修復は「3 層を完成させる」最終段階。

---

## Section 11: doctor v2 sample との関係

- 既知数値: `kotodama_50_coverage = 0.26`
- 現状の 0.26 が示すのは 50 音骨格カバレッジ (clause: `unified_sound 144〜220`, `kotodama_one_sound 213〜598`, `kotodama_genten 183〜278` 程度)。
- 副因 C 修復 (シナリオ 4 + 5) を行った場合、以下の予測:
  - `thread_center_memory` への憲法 entry → naturalRouter / sacredContextBuilder で 50 音遵守シグナルが安定化 → **+0.05〜+0.10 改善余地**。
  - `persona_knowledge_bindings` への 12 条 bind → personaRuntime 経由 memoryProjection に憲法 unit が含まれる → **+0.05〜+0.08 改善余地**。
  - `memoryProjection` クエリ拡張 (シナリオ 5) → 12 unit が直接 chat memory pack に登場 → **+0.10〜+0.15 改善余地**。
- 統合最大予測: `kotodama_50_coverage` を **0.26 → 0.45〜0.55** に押し上げ可能 (推定値、確定は適用 POST で計測)。

---

## Section 12: TENMON 裁定用サマリー

### 観測完了状態

- **C-1 thread bind 詰まり度: 100 / 100** (default thread center = HOKEKYO のみ)
- **C-2 persona bind 詰まり度: 95 / 100** (105 件中 12 条 bind 0 件、chat.ts 不参照)
- **C-3 thread_persona link 詰まり度: 90 / 100** (default = Stage2 abstain only、kukai-deepread 不在)
- **C-4 route 流路 詰まり度: 85 / 100** (chat.ts は persona/thread table を直接 SELECT しない、memoryProjection も scripture_distill 不検索、唯一 PROMOTION-GATE が機能)

### 5 修復シナリオ起案完了

1. thread_center 追加
2. persona_knowledge_bindings 追加
3. thread_persona_link 整理
4. **(推奨) 1+2+3 統合**
5. **(推奨) memoryProjection 拡張 / chat.ts memory hit 追加**

### 推奨

**シナリオ 4 + シナリオ 5 の 2 段組み**を Phase 2 (4 cards 段階適用) で進める。

### 三層伝達状態

- PROMOTION-GATE: ◎ 稼働 (2895 chars, response 144+ chars 維持)
- MEMORY-DISTILL: △ 登録済だが現行クエリではヒットせず
- THREAD/PERSONA BIND: × 未稼働 (本副因 C)

### Acceptance (本レポート自身)

- [x] 実装変更ゼロ
- [x] DB write ゼロ (sqlite3 -readonly SELECT のみ)
- [x] 4 観点詰まり度確定 (C-1=100, C-2=95, C-3=90, C-4=85)
- [x] 5 シナリオ起案
- [x] 推奨シナリオ確定 (4 + 5)
- [x] TENMON が次の修復カード起案を裁定できる状態

---

## 補助観測: 全状態 (本カード Acceptance #15-22 の根拠)

| 項目 | 値 |
|---|---|
| `tenmon-ark-api` PID | **1063225** (active 維持) |
| `tenmon-runtime-watchdog` PID | **1596760** (active 維持) |
| `tenmon-auto-patch` | **inactive / disabled 維持** |
| nginx PID (master) | **891111** (維持) |
| `acceptance.verdict` (3 連続) | **PASS / PASS / PASS** |
| `enforcer.verdict` | (claude-summary endpoint 上は `null` 報告 — 観察として記録) |
| `/pwa/evolution` HTTP | **200** |
| `KOTODAMA_CONSTITUTION_V1.txt` SHA256 | `3eec740366e76298e859937ceb9710e351392271202579bd2a761fff37b1cbab` (`.sha256` と一致) |
| `memory_units WHERE scope_id='kotodama_constitution_v1'` | **12** (MEMORY-DISTILL APPLY 結果不変) |
| 第 4 条 chat 応答 | **151 chars** (144+ 維持) |
| route_reason | `NATURAL_GENERAL_LLM_TOP` |
| `clause_lengths.kotodama_constitution_v1` | **2895** (PROMOTION-GATE 不変) |
| git diff vs `67a0229c` | 本レポート 1 通追加のみ (期待) |

---

(End of CONSTITUTION_PERSONA_BIND_OBSERVE_V1)
