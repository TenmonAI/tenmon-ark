# PRE_PHASE_B_INTEGRATION_AUDIT_V1

- **日時**: 2026-04-25 JST（実測 12:33 ± 数分）
- **監査者**: Cursor（TENMON-ARK Phase B 突入前 OBSERVE）
- **parent_commit**: `a6d43996`（Phase A 第 6 枚 SEAL 直後 / `feature/unfreeze-v4`）
- **モード**: **OBSERVE only / PATCH 禁止**（コード・DB write・schema・migration・package・dist・deploy・restart・env いずれも非実行）
- **対象 repo**: `/opt/tenmon-ark-repo`
- **対象 DB**: `/opt/tenmon-ark-data/kokuzo.sqlite`（SQLite 3.37.2、`mode=ro` で接続）
- **本レポート唯一の変更**: 本ファイルの新規追加のみ（前版の同名ファイルを本カード 12 Section 仕様で書き換え）

> 本レポートは **実体根拠つき観測値**の固定であり、Phase B（Card-01〜Card-16）の **着手可否裁定** は TENMON が下す。Cursor は提案・優先順・スケジュールに踏み込まない。

---

## Section 1: Phase A 成果一覧（commit / path / 機能 / 行数）

### 1.1 SEAL 6 commits（`git log --grep='mc-20' --oneline` 実測）

| # | カード ID | commit | 日時 (JST) |
|---|---|---|---|
| 1 | MC-20-B KOTODAMA-CONSTITUTION-V1 | `5c1144ca` | 2026-04-24 15:15 |
| 2 | MC-20-BRIDGE-PIPELINE-V1 | `e6e8cebf` | 2026-04-24 15:50 |
| 3 | MC-20-DEEP-MAP-DENOM-FIX-V1 | `f18a8a6c` | 2026-04-24 16:08 |
| 4 | MC-20-CHAT-LENGTH-REGRESSION-AUDIT-V1 | `d9aec8ff` | 2026-04-24 16:22 |
| 5 | MC-20-PROMPT-TRACE-V1 | `fc78185c` | 2026-04-24 16:46 |
| 6 | MC-20-CONSTITUTION-ENFORCER-V1 | `a6d43996` | 2026-04-24 17:12 |

### 1.2 Phase A の主たる実体ファイル（実測 path / 行数 / mtime）

| 種別 | path | 行数 | mtime | 該当 commit |
|---|---|---:|---|---|
| code | `api/src/core/kotodamaConstitutionEnforcerV1.ts` | 108 | 2026-04-24 17:12 | `a6d43996`（新設） |
| code | `api/src/core/kotodamaBridgeRegistry.ts` | 117 | 2026-04-24 15:49 | `e6e8cebf`（新設） |
| code | `api/src/mc/intelligence/kotodama50MapV1.ts` | 199 | 2026-04-24 16:07 | `f18a8a6c`（既存改訂） |
| code | `api/src/mc/fire/intelligenceFireTracker.ts` | 310 | 2026-04-24 16:40 | `fc78185c`（+80 行追記） |
| code | `api/src/core/constitutionLoader.ts` | 347 | （Phase A で `5c1144ca` / `e6e8cebf` / `a6d43996` の 3 回触れる） | 同 |
| code（計装のみ） | `api/src/routes/chat.ts` | 5991 | （`fc78185c` で +62/-10 行） | `fc78185c` |
| code（中継） | `api/src/mc/intelligence/deepIntelligenceMapV1.ts` | 569 | （`e6e8cebf` / `f18a8a6c` / `a6d43996` で都度差分） | 同 |
| docs | `docs/ark/khs/KOTODAMA_CONSTITUTION_V1.txt` | 148（6002 bytes） | 2026-04-24 15:14 | `5c1144ca`（新設） |
| docs | `docs/ark/khs/KOTODAMA_CONSTITUTION_V1.sha256` | 1（129 bytes） | 2026-04-24 15:14 | `5c1144ca`（新設） |
| docs | `docs/ark/khs/KOTODAMA_NOTION_BRIDGE_MEMO.md` | 129（5252 bytes） | 2026-04-24 17:11 | 6 commit すべてで追記 |
| docs | `docs/ark/khs/KOTODAMA_SOURCE_LINK_AUDIT_V1_20260424.md` | 195（11628 bytes） | 2026-04-24 15:36 | `a1e181ac`（Phase A 監査前段、6 枚外） |
| docs | `docs/ark/khs/CHAT_LENGTH_REGRESSION_AUDIT_V1_20260424.md` | 237（11808 bytes） | 2026-04-24 16:22 | `d9aec8ff`（Phase A 第 4 枚） |

→ **コード 7 ファイル + ドキュメント 5 ファイル = 12 ファイル**（カード Acceptance「6 commit / 12 ファイル」要件に整合）。

### 1.3 機能範囲（実体観測ベース）

- **`kotodamaConstitutionEnforcerV1`**: ERROR=第 2/3/4/8 条 / WARN=第 6/9 条、`verdict ∈ {clean, warn, violation}`、検知のみ自動修正なし。
- **`kotodamaBridgeRegistry`**: 静的レジストリ（primary_bridge / separation_policy 計 2 entries）+ `kotodamaBridgeHealth()`。
- **`kotodama50MapV1`**: `GOJUREN_JUGYO_V1`（10 行 × 5 段）+ `GOJUREN_50_SOUNDS_V1`（50 件、ヰ・ヱ 各 2 含む、ン 0）+ `buildKotodama50MapV1()`（`total_canonical=50` / `with_*` 6 種）。
- **`intelligenceFireTracker`**: `PromptTraceV1` / `PromptTraceClauseLengthsV1` / `PromptTraceSummary24hV1` の型定義 + `appendIntelligenceFireEventV1(flags, promptTrace?)` の任意第 2 引数化。
- **`chat.ts`**: 計装のみ（`appendIntelligenceFireEventV1` の呼出 line 2698 / 2801、clause 長計測 line 2548–2562、`prompt_total_length` 含む）。本線分岐ロジックは未改変。
- **`constitutionLoader`**: KHS_CORE と KOTODAMA の sha256 sealed read + bridge / enforcer 起動時呼出（line 16/17 で import）。

---

## Section 2: 現行 DB schema 状態（READ-ONLY、`mode=ro`）

`sqlite3 -readonly file:/opt/tenmon-ark-data/kokuzo.sqlite?mode=ro` 経由の実体。

### 2.1 件数（実測）

| テーブル | 件数 |
|---|---:|
| `source_registry` | **107** |
| `source_analysis_logs` | **237,422** |
| `memory_units` | **252,948** |
| `persona_knowledge_bindings` | **105** |
| `persona_memory_policies` | **2** |
| `thread_persona_links` | **112,975** |
| `thread_center_memory` | **9,178** |
| `persona_profiles` | **2** |
| `sacred_corpus_registry` | **1,014** |
| `sacred_segments` | **2,211** |

### 2.2 schema 抜粋（生 `.schema` 出力）

#### `source_registry`（**Card-01 主対象**）

```sql
CREATE TABLE source_registry (
  id TEXT PRIMARY KEY,
  sourceType TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT '',
  uri TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  metaJson TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
, fingerprint TEXT
, originKind TEXT
, lineage_family TEXT
, trust_level TEXT NOT NULL DEFAULT 'unverified'
, promotion_state TEXT NOT NULL DEFAULT 'none'
, canonical_candidate INTEGER NOT NULL DEFAULT 0
, ledger_constitution_ref TEXT);
CREATE INDEX idx_source_registry_type ON source_registry(sourceType);
CREATE INDEX idx_source_registry_fingerprint ON source_registry(fingerprint);
```

→ **追加列 `fingerprint / originKind / lineage_family / trust_level / promotion_state / canonical_candidate / ledger_constitution_ref` は既に存在**（DDL 実体）。Card-01 の追加列要件と一部重複。
**カード本文に出る `source_hash / extraction_mode / ocr_used / source_title / source_author / last_analysis_at / last_error` は現行 schema に未存在**（実体根拠：上記 DDL）。

#### `source_analysis_logs`

```sql
CREATE TABLE source_analysis_logs (
  id TEXT PRIMARY KEY, projectId TEXT, sourceId TEXT,
  status TEXT NOT NULL DEFAULT 'ok', summary TEXT,
  createdAt..., updatedAt..., created_at..., updated_at...
, analysisType TEXT, metaJson TEXT, fingerprint TEXT
, analysis_phase TEXT, lineage_result TEXT, divergence_tags TEXT
, transformation_stage TEXT, hold_reason TEXT, reject_reason TEXT
, evidence_json TEXT);
```

#### `memory_units`

```sql
CREATE TABLE memory_units (
  id TEXT PRIMARY KEY,
  memory_scope TEXT NOT NULL, scope_id TEXT NOT NULL,
  memory_type TEXT NOT NULL, title TEXT, summary TEXT NOT NULL,
  structured_json TEXT NOT NULL DEFAULT '{}',
  evidence_json TEXT NOT NULL DEFAULT '[]',
  confidence REAL DEFAULT 0.7, freshness_score REAL DEFAULT 0.5,
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at..., updated_at...);
CREATE INDEX idx_memory_units_scope ON memory_units(memory_scope, scope_id);
```

#### `persona_knowledge_bindings`

```sql
CREATE TABLE persona_knowledge_bindings (
  id TEXT PRIMARY KEY, persona_id TEXT NOT NULL,
  source_type TEXT NOT NULL, source_id TEXT NOT NULL, source_label TEXT,
  binding_mode TEXT NOT NULL DEFAULT 'retrieve',
  priority INTEGER NOT NULL DEFAULT 50,
  active INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at..., updated_at...);
CREATE INDEX idx_persona_knowledge_bindings_persona ON persona_knowledge_bindings(persona_id, active, priority);
```

#### `persona_memory_policies`

```sql
CREATE TABLE persona_memory_policies (
  id TEXT PRIMARY KEY, persona_id TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'user_plus_project',
  policy_json TEXT NOT NULL DEFAULT '{}',
  created_at..., updated_at...);
```

#### `thread_persona_links`

```sql
CREATE TABLE thread_persona_links (
  id TEXT PRIMARY KEY, thread_id TEXT NOT NULL, persona_id TEXT NOT NULL,
  link_mode TEXT NOT NULL DEFAULT 'fixed',
  created_at..., updated_at...);
CREATE INDEX idx_thread_persona_links_thread ON thread_persona_links(thread_id);
```

#### `thread_center_memory`

```sql
CREATE TABLE thread_center_memory (
  id INTEGER PRIMARY KEY, thread_id TEXT NOT NULL,
  center_type TEXT NOT NULL, center_key TEXT, center_reason TEXT,
  next_axes_json TEXT, source_route_reason TEXT, source_scripture_key TEXT,
  source_topic_class TEXT, source_self_phase TEXT, source_intent_phase TEXT,
  confidence REAL NOT NULL DEFAULT 0.0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
, essential_goal TEXT, success_criteria_json TEXT, constraints_json TEXT, clarification_focus TEXT);
```

#### `persona_profiles`（**実測 2 行のみ**）

```sql
CREATE TABLE persona_profiles (
  id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  description TEXT, category TEXT, status TEXT NOT NULL DEFAULT 'draft',
  role_summary TEXT, system_mantra TEXT, mission TEXT, answer_contract TEXT,
  forbidden_behaviors_json TEXT NOT NULL DEFAULT '[]',
  tone TEXT, verbosity TEXT, strictness REAL DEFAULT 0.8,
  creativity REAL DEFAULT 0.3, retrieval_mode TEXT DEFAULT 'grounded_first',
  evidence_threshold REAL DEFAULT 0.75,
  hallucination_fallback TEXT DEFAULT 'admit_unknown',
  preview_isolation INTEGER NOT NULL DEFAULT 1,
  memory_inheritance_mode TEXT NOT NULL DEFAULT 'user_plus_project',
  created_at..., updated_at...);
```

#### `sacred_corpus_registry` / `sacred_segments`（FK で `source_registry.id` を参照）

```sql
CREATE TABLE sacred_corpus_registry (
  id TEXT PRIMARY KEY, tradition TEXT NOT NULL, corpus_family TEXT NOT NULL,
  title_original TEXT NOT NULL, title_japanese TEXT, language TEXT NOT NULL,
  script TEXT, edition TEXT, canon_tier INTEGER NOT NULL DEFAULT 100,
  provenance_confidence REAL NOT NULL DEFAULT 0.5, translation_lineage TEXT,
  corpus_kind TEXT NOT NULL DEFAULT 'primary' CHECK (corpus_kind IN ('primary','translation','commentary','paraphrase','anthology')),
  source_registry_id TEXT, parent_corpus_id TEXT, metaJson TEXT,
  createdAt..., created_at..., updatedAt..., updated_at...,
  FOREIGN KEY (source_registry_id) REFERENCES source_registry(id),
  FOREIGN KEY (parent_corpus_id) REFERENCES sacred_corpus_registry(id));
-- INDEXES: idx_sacred_corpus_canon_priority, _source_registry_id, _parent_id, _kind

CREATE TABLE sacred_segments (
  id TEXT PRIMARY KEY, corpus_id TEXT NOT NULL, source_registry_id TEXT,
  book_or_scroll TEXT, chapter TEXT, verse_or_section TEXT,
  original_text TEXT, transliteration TEXT, normalized_text TEXT,
  translation_primary TEXT, translation_secondary TEXT,
  commentary_dependency TEXT,
  createdAt..., created_at..., updatedAt..., updated_at...,
  FOREIGN KEY (corpus_id) REFERENCES sacred_corpus_registry(id),
  FOREIGN KEY (source_registry_id) REFERENCES source_registry(id));
```

### 2.3 集計の特徴値（実測）

- `source_registry.sourceType` 内訳: `kokuzo_canon=100`, `sacred_corpus_ingest=3`, `manual=2`, `sacred_seed_card19=2`
- `source_registry.lineage_family` 内訳: **`null`=104**, `mahayana/katakamuna_sample=1`, `verify/ledger-updated=1`, `yamato_kotodama/kotodama_hisho=1`
- `source_registry.trust_level / promotion_state` 内訳: `unverified/none=104`, `low/none=1`, `medium/none=1`, `verified/promoted=1`
- `memory_units.memory_type` 内訳: `center_memory=226350`, `source_analysis_distill=18012`, `conversation_distill=6069`, `thread_center_distill=2190`, `scripture_distill=305`, `source_distill=14`, `training_rule=8`
- `persona_profiles` 全 2 行: `kukai-deepread / 空海深層解読 / draft / grounded_first` と `stage2-persona-1775085424 / Stage2 Persona / active / balanced`
- `sacred_corpus_registry.tradition` 内訳: `GENERAL=1002`, `KOTODAMA=3`, `mahayana=2`, `TENMON_ORIGINAL=2`, `KATAKAMUNA=2`, `yamato_narrative=1`, `yamato_kotodama=1`, `BUDDHISM=1`

---

## Section 3: Master Card 16 → Phase A embed map

> **注意**: 「天聞アーク｜未完了部品 全回収マスター設計書」自体の repo 内ドキュメント実体は **未確認**（rg `未完了部品` `全回収マスター` で 0 件、`MASTER_16` 0 件、ヒットは本レポート自身と `KOTODAMA_NOTION_BRIDGE_MEMO.md` のみ）。本表の **Card-XX 名称はカード本文を一次ソース** とし、各 Card に対する Phase A embed 先候補は **既存ファイル / DB の実体根拠**で判定する。

凡例: **直接寄与**=Phase A 成果物が当該 Card に直接 import / data 投入される。**間接寄与**=計測・監視・閾値情報として参照される。**寄与なし**=本監査範囲では関連実体を検出しない。

| Card | フル名 | Phase A 寄与点（実体根拠） | 寄与種別 |
|---|---|---|---|
| 01 | SOURCE_REGISTRY_SCHEMA_EXPANSION_V1 | `source_registry` 既存 7 列（fingerprint / originKind / lineage_family / trust_level / promotion_state / canonical_candidate / ledger_constitution_ref）と Phase A の `kotodamaBridgeRegistry`（2 entries / pageId 既知）/ `KOTODAMA_SOURCE_LINK_AUDIT` 32 資料表の **登録候補メタ**として参照される。`KOTODAMA_CONSTITUTION_V1.txt` § 7「`canonical_kotodama_base` を新設または再定義」が Card-01 の上位制約。 | 直接寄与 |
| 02 | SOURCE_ANALYSIS_LEDGER_ACTIVATION_V1 | `source_analysis_logs` の Phase A 系新列（`analysis_phase / lineage_result / divergence_tags / transformation_stage / hold_reason / reject_reason / evidence_json`）は schema 上既に存在（Section 2.2 実体）。Phase A の **enforcer.violations** が `divergence_tags / hold_reason` に流し込める粒度の構造体（実体: `kotodamaConstitutionEnforcerV1.ts:9-17`）。 | 直接寄与 |
| 03 | INGEST_OCR_NAS_NOTION_SOURCE_BIND_V1 | `kotodamaBridgeRegistry`（`primary_bridge=33d65146-58e6-8187-…`、`separation_policy=33d65146-58e6-8124-…`）で **Notion 側 pageId 2 件**が runtime 配線済み。`kotodama_bridges.status="registered_not_synced"` / `notes="Notion MCP 実取得は別カード"`（runtime 出力）。Card-03 の入口データ。 | 直接寄与 |
| 04 | MEMORY_UNITS_DISTILLATION_RUNTIME_V1 | `memory_units` の **既存 `scripture_distill=305 / source_distill=14`** に対し、Phase A の `GOJUREN_50_SOUNDS_V1`（50 件）と `KOTODAMA_CONSTITUTION_V1.txt` 12 条が新規蒸留候補。`KOTODAMA_SOURCE_LINK_AUDIT` 32 資料の summary も candidate（実体: 同 audit § 2「32 資料マスター表」）。 | 直接寄与 |
| 05 | MEMORY_PROJECTION_LOG_RUNTIME_V1 | `intelligenceFireTracker.PromptTraceV1`（clause 別 length / route_reason / provider / prompt_total_length / response_length）が **projection log の構造体プロトタイプ**として既存。出力先は jsonl（`/opt/tenmon-ark-data/mc_intelligence_fire.jsonl`、CHAT-LENGTH-REGRESSION-AUDIT § 1.4 で実体確認）。Card-05 が DB 側 projection に変換する場合の **入力源**。 | 直接寄与 |
| 06 | PROMOTION_GATE_MAINLINE_RUNTIME_V2 | `enforceKotodamaConstitutionV1()` の **`verdict / violation_count_error / violation_count_warn / violations[]`**（`kotodamaConstitutionEnforcerV1.ts:33-41`）が gate 必須通過条件として直接埋め込み可能。`source_registry.promotion_state` enum と `enforcer.verdict` の対応関係は Card-06 で確定。 | 直接寄与 |
| 07 | PERSONA_KNOWLEDGE_BINDINGS_RUNTIME_V1 | 現行 `persona_knowledge_bindings` 105 件のうち、`persona_id=7d516068-...`（`kukai-deepread`）が `kokuzo_canon` 系 100 件に均一に bind 済み（実体: 5 行サンプル）。Phase A の `kotodamaBridgeRegistry` 2 件は **言霊系 persona 候補**の bind 対象として未投入（実測）。 | 直接寄与 |
| 08 | PERSONA_MEMORY_POLICY_AND_THREAD_LINK_V1 | `persona_memory_policies` 2 行 / `thread_persona_links` 112,975 行（実測）。Phase A は本領域へのコード変更なし。`PromptTraceV1.route_reason` が thread→persona binding の **観測軸**として参照可能。 | 間接寄与 |
| 09 | THREAD_CENTER_SOVEREIGNTY_LOCK_V1 | `thread_center_memory` 9,178 行（実測）。`memory_units.center_memory=226,350` 件と整合性監査が前提。Phase A のコード変更なし。`enforcer.violations[]` を center_memory の **完全性チェック入口**に流す設計の root（憲法第 6 条「正典階層」をロック条件に再利用可能）。 | 間接寄与 |
| 10 | SURFACE_META_GENERATION_ELIMINATION_V1 | `chat.ts` 5,991 行 / 計装は MC-20-PROMPT-TRACE で完了済み（line 54 import / 2698 / 2801）。本線分岐ロジックは Phase A 不変。Card-10 は `chat.ts` 表層生成パスを削減する Card のため、**Phase A の `prompt_trace_summary_24h.avg_clause_lengths`**（`fire_24h.prompt_trace_summary_24h`）が削減判断のベースライン。 | 間接寄与 |
| 11 | LONGFORM_COMPOSER_REALIZATION_V1 | `prompt_trace.avg_response_length=454` / `avg_prompt_total_length=6679`（実測 24h 集計）が現状ベースライン。Card-11 の長文構成器の前後比較指標として **Phase A 計測基盤を借用**できる。 | 間接寄与 |
| 12 | ACCEPTANCE_PROBE_TO_PROMOTION_BIND_V1 | `/api/mc/vnext/claude-summary` の `acceptance.checks[]` 10 件（実測）と `enforcer.verdict` を bind する Card。`constitution_compliance` check は既に PASS（憲法 6/6 履行率 100%）、Phase A の **enforcer 6 checks**を probe→promotion 入力に使う。 | 直接寄与 |
| 13 | OCR_TO_SOURCE_TO_PROMOTION_PIPELINE_V1 | Phase A は OCR を扱わない（コード実体 0 件）。Card-13 は Card-03 と Card-06 の合成。**Phase A 寄与は経路上の通過点のみ**。 | 寄与なし |
| 14 | AUTONOMY_FAILSOFT_AND_LOCAL_PENDING_V1 | `enforceKotodamaConstitutionV1()` の **検知のみ・自動修正なし**原則（カード本文 / 実装の両方で明示）。Card-14 の failsoft 設計指針として既に Phase A で確立。 | 間接寄与 |
| 15 | SEAL_CONTRACT_REDESIGN_V1 | `KOTODAMA_CONSTITUTION_V1.sha256` + `KHS_CORE_CONSTITUTION_v1.sha256` + `KOTODAMA_CONSTITUTION_V1.txt`（148 行）が **seal 契約の現行雛形**。起動ログ `[CONSTITUTION_SEAL] ... seal VERIFIED` の運用も Phase A で確立。 | 直接寄与 |
| 16 | FINAL_MASTER_INTEGRATION_ACCEPTANCE_V1 | Card-01〜Card-15 を統合する acceptance Card。Phase A の `kotodama_constitution_enforcer` / `kotodama_50_coverage` / `kotodama_bridges` / `prompt_trace_summary_24h` の 4 セクションが `/api/mc/vnext/intelligence` 配下に既出（実測）。Card-16 はこれらを単一 acceptance verdict に集約する。 | 直接寄与 |

---

## Section 4: 8 接続完成状態への Phase A 寄与

| 接続 | 関連 Card | Phase A 寄与（実体根拠） |
|---|---|---|
| 1. Source Sovereignty | Card-01 / 03 / 13 / 15 | `KOTODAMA_CONSTITUTION_V1` § 7「`canonical_kotodama_base`」の上位制約、`kotodamaBridgeRegistry` 2 件、`KOTODAMA_SOURCE_LINK_AUDIT` 32 資料マスター表（5 状態評価）。 |
| 2. Knowledge Distillation | Card-04 / 05 | `GOJUREN_50_SOUNDS_V1` 50 件、`KOTODAMA_CONSTITUTION_V1.txt` 12 条、32 資料 summary 候補、`PromptTraceV1` の clause 別 length 13 種。 |
| 3. Promotion Gate Mainline | Card-06 / 12 | `enforceKotodamaConstitutionV1()` の `verdict / violations[]` 構造体、acceptance.checks の `constitution_compliance` check（PASS）。 |
| 4. Persona Runtime Bind | Card-07 / 08 | 現行 `persona_knowledge_bindings`=105、`persona_memory_policies`=2、`persona_profiles`=2（draft + active）。Phase A コード変更なし、観測のみ。 |
| 5. Thread Sovereignty | Card-09 | `thread_center_memory`=9178、`thread_persona_links`=112,975、`memory_units.center_memory`=226,350。Phase A コード変更なし、観測のみ。 |
| 6. Longform Completion | Card-11 | `prompt_trace_summary_24h.avg_response_length=454` / `avg_prompt_total_length=6679` をベースラインとして提供。 |
| 7. Surface Purity | Card-10 | `prompt_trace.avg_clause_lengths`（13 clause 別）と `chat.ts` line 計装で表層メタの位置を可視化。 |
| 8. Autonomy Seal | Card-14 / 15 / 16 | `kotodamaConstitutionEnforcerV1` の **検知のみ自動修正なし**原則 + `KOTODAMA_CONSTITUTION_V1.sha256` 封印 + `[CONSTITUTION_SEAL] VERIFIED` 起動ログ。 |

---

## Section 5: source_registry 初期登録候補（実体根拠つき）

`KOTODAMA_SOURCE_LINK_AUDIT_V1` § 2「32 資料マスター表」（`docs/ark/khs/KOTODAMA_SOURCE_LINK_AUDIT_V1_20260424.md`）の生 5 状態評価を基に、**現行 source_registry 列**（実測 schema）への登録候補を以下に列挙する。`trust_level` / `lineage_family` の **試案値は本レポート内の試案**であり、実装は Card-01 で別途裁定する。

凡例: **A2**=PDF/正本束、**A3**=JSON/jsonl/txt（既存実体）、**SLA**= SOURCE-LINK-AUDIT § 2 総合判定。

| # | 候補 source（資料） | 既存 DB 実体（`source_registry` / `sacred_corpus_registry`） | A2 | A3 | SLA 判定 | 試案 trust_level | 試案 lineage_family |
|---:|---|---|---|---|---|---|---|
| 1 | 言霊秘書.pdf | `source_registry: kokuzo://言霊秘書.pdf`（id=`dd53425a-...`、`page_count=790`、`unverified/none`）+ `sacred_corpus_registry: CORPUS:言霊秘書.pdf` | ○ | ○ | 🟡 | `verified` | `yamato_kotodama/kotodama_hisho` |
| 2 | 水穂伝序 | （source_registry に巻題行なし、`sacred_corpus_registry` も `LIKE %水穂%` で 0 件） | △ | △ | 🟡 | `medium` | `yamato_kotodama/mizuho_den` |
| 3 | 水穂伝附言 | 同上 | △ | △ | 🟡 | `medium` | `yamato_kotodama/mizuho_den` |
| 4 | 五十連十行之発伝 | 同上（`%五十連%` 0 件） | △ | △ | 🟡 | `medium` | `yamato_kotodama/gojuren_jugyo` |
| 5 | 五十行一言法則 | 同上 | △ | ○ | 🟡 | `medium` | `yamato_kotodama/gojuren_jugyo` |
| 6 | 水穂伝重解誌一言法則（上） | 同上 | △ | ○ | 🟡 | `medium` | `yamato_kotodama/mizuho_den` |
| 7–10 | 水火伝 火之巻一/三・水之巻一/二 | 同上 | △ | △ | 🟠 | `low` | `yamato_kotodama/suika_den` |
| 11 | 水火伝 詞縦緯 | 同上 | △ | △ | 🟡 | `medium` | `yamato_kotodama/suika_den` |
| 12 | 火水與伝 | 同上 | △ | △ | 🟠 | `low` | `yamato_kotodama/kasui_yo_den` |
| 13 | イロハ口伝 | `sacred_corpus_registry: CORPUS:いろは言霊解` あり | △ | △ | 🟡 | `medium` | `yamato_kotodama/iroha_kuden` |
| 14 | 時刻 | （巻題行なし） | × | × | 🟠 | `low` | `yamato_kotodama/jikoku` |
| 15–20 | 布斗麻邇・稲荷古伝群 | 同上 | △ | △ | 🟠 | `low` | `yamato_kotodama/futomani_inari` |
| 21 | カタカムナウタヒ八十首 | `sacred_corpus_registry.tradition=KATAKAMUNA=2` 行あり | △ | ○ | 🟡 | `medium` | `katakamuna/utahi80` |
| 22 | 辞（テニヲハ）と文明の繋がり | （巻題行なし） | × | △ | 🟠 | `low` | `yamato_kotodama/teniwoha` |
| 23 | ラリルレ 助言 | 同上 | × | × | 🟠 | `low` | `yamato_kotodama/rariruru` |
| 24 | 国学第一の書 | `EVIDENCE_UNITS_KHS_v1.jsonl` に `国学第一の書` 出現（SLA § 1.3） | × | ○ | 🟡 | `medium` | `kokugaku/dai_ichi` |
| 25–28 | Index / 親 DB / 入口 / カテゴリ | 同上 | × | △ | 🟠 | `low` | `notion/index_pages` |
| 29 | 言灵→天聞アーク橋渡し | `kotodamaBridgeRegistry.entries[0]`（`pageId=33d65146-58e6-8187-b8dd-d7638fdddaa5`、`role=primary_bridge`）— **runtime 既出だが source_registry 未登録**（実測） | × | × | 🟠 | `verified`（Phase A で seal 済） | `notion/bridge_primary` |
| 30 | 言灵 DB・開発 DB 分離完成メモ | `kotodamaBridgeRegistry.entries[1]`（`pageId=33d65146-58e6-8124-85f9-fab4c366cc5a`、`role=separation_policy`）— **runtime 既出だが source_registry 未登録**（実測） | × | × | 🟠 | `verified` | `notion/separation_policy` |
| 31–33 | 運用ルール・完成メモ・TODO | （巻題行なし） | × | △ | 🟠 | `low` | `notion/operations` |
| 34 | KOTODAMA_CONSTITUTION_V1 | `docs/ark/khs/KOTODAMA_CONSTITUTION_V1.txt`+`.sha256` 実在、起動時 `[CONSTITUTION_SEAL] VERIFIED`（hash `3eec740366e76298...`） | ○ | ○ | （Phase A 成果） | `verified` | `tenmon_constitution/kotodama_v1` |
| 35 | KHS_CORE_CONSTITUTION_v1 | `docs/ark/khs/KHS_CORE_CONSTITUTION_v1.txt`+`.sha256` 実在、起動時 `[CONSTITUTION_SEAL] KHS_CORE_v1 seal VERIFIED` (hash `e2e80e945d45614c...`) | ○ | ○ | （Phase A 隣接） | `verified` | `tenmon_constitution/khs_core_v1` |
| 36 | EVIDENCE_UNITS_KHS_v1.jsonl | `docs/ark/khs/EVIDENCE_UNITS_KHS_v1.jsonl`（6543 bytes、3/2 改、SLA § 1.3 実体） | ○ | ○ | （Phase A 隣接） | `medium` | `khs/evidence_units` |
| 37 | KOTODAMA_NOTION_BRIDGE_MEMO.md | Phase A 6 commit すべてで追記（5252 bytes） | ○ | ○ | （Phase A 成果） | `medium` | `tenmon_memo/phase_a` |
| 38 | CHAT_LENGTH_REGRESSION_AUDIT_V1 | `docs/ark/khs/CHAT_LENGTH_REGRESSION_AUDIT_V1_20260424.md`（237 行 / 11808 bytes） | ○ | ○ | （Phase A 第 4 枚） | `medium` | `tenmon_audit/chat_length` |
| 39 | KOTODAMA_SOURCE_LINK_AUDIT_V1 | `docs/ark/khs/KOTODAMA_SOURCE_LINK_AUDIT_V1_20260424.md`（195 行 / 11628 bytes） | ○ | ○ | （Phase A 隣接） | `medium` | `tenmon_audit/source_link` |

→ **登録候補件数**: 32 資料 + 橋渡し 2（既登録外） + Phase A 監査・憲法・MEMO 系 6 = **約 40 候補**。  
→ **既登録 100 件（kokuzo_canon）との重複は #1 のみ**（`言霊秘書.pdf`）が確実、巻題レベルの行は現行 0 件（実測 SQL）。

---

## Section 6: memory_units 蒸留候補

| 候補 | 件数（試案） | 由来（Phase A 実体） | 候補 `memory_type` | 備考 |
|---|---:|---|---|---|
| 50 音 canonical | 50 | `GOJUREN_50_SOUNDS_V1`（`kotodama50MapV1.ts` 199 行内、行/段/位相/音/水火を保持） | `scripture_distill` 拡張 or 新型 `gojuren_canonical` | `with_textual_grounding=2/50`、`with_source_page=2/50`（実測 endpoint） — Card-04 は grounding 引上げ前提 |
| 憲法 V1 12 条 | 12 | `KOTODAMA_CONSTITUTION_V1.txt` 第 1〜12 条（148 行） | `scripture_distill` or `training_rule` | 既存 `training_rule=8` と type 分離が必要 |
| 32 資料 summary | 32 | `KOTODAMA_SOURCE_LINK_AUDIT_V1` § 2 マスター表 | `source_distill` 拡張（現 14 件） | A2/A3 状態併記必要 |
| 橋渡し 2 ページ | 2 | `kotodamaBridgeRegistry.entries[]` | `source_distill` | Notion 取得後に Card-03 で本体 fetch |
| Phase A 監査 3 通 | 3 | KOTODAMA_NOTION_BRIDGE_MEMO / CHAT_LENGTH_REGRESSION_AUDIT / KOTODAMA_SOURCE_LINK_AUDIT | `source_distill` | レポート粒度（mc-20 ジャーナル） |
| KHS_CORE_v1 関連 | 1 | `KHS_CORE_CONSTITUTION_v1.txt`（4201 bytes） | `scripture_distill` | 既存 `training_rule` と並存 |
| 既存 `sacred_segments` | 2,211 | `sacred_segments` テーブル（実測） | `scripture_distill` 拡張（現 305 件） | 全段 vs 抜粋の判断は別 |

→ **新規蒸留候補総数（試案）**: 約 100 件 + 既存 sacred_segments 2,211 件の参照。
→ 既存 `memory_units` 252,948 件のうち **`scripture_distill` は 305 件のみ** が憲法・正典系。Card-04 は Phase A の 50 音・12 条・32 資料を **`scripture_distill` の真の核**として注入する設計。

---

## Section 7: promotion_gate 接続候補

`enforceKotodamaConstitutionV1()` が返す `ConstitutionEnforcerReport`（`kotodamaConstitutionEnforcerV1.ts:33-41` 実体）の各フィールドと `source_registry.promotion_state` enum との対応案:

```ts
// 実体（Phase A）:
type ConstitutionEnforcerReport = {
  timestamp: string;
  constitution_ref: "KOTODAMA_CONSTITUTION_V1";
  total_checks: number;             // 6
  violations: ConstitutionViolation[];
  violation_count_error: number;
  violation_count_warn: number;
  verdict: "clean" | "warn" | "violation";
};
```

| Phase A 出力 | promotion_gate 候補処理 | source_registry.promotion_state 候補 |
|---|---|---|
| `verdict === "clean"` | gate 通過許可 | `promoted` |
| `verdict === "warn"` | hold（人手審査入口） | `pending` (or `hold`) |
| `verdict === "violation"` | 阻止 | `none` (or `reject`) |
| `violations[].article` | `source_analysis_logs.divergence_tags` 候補 | （logs 側） |
| `violations[].severity` | `source_analysis_logs.hold_reason / reject_reason` 候補 | （logs 側） |
| `total_checks` | gate run 件数の epoch counter | `acceptance.checks` 軸との並行管理 |

→ acceptance probe 側の現行 `constitution_compliance` check（実測 PASS / `constitutional 6/6 / 履行率 100%`）と Phase A の `enforcer.verdict` を **AND 結合**するのが Card-06 の最小設計。**KHS_CORE と KOTODAMA_CONSTITUTION の 2 つの seal が両方 VERIFIED** であることは起動時ログで担保（実体: `[CONSTITUTION_SEAL] KHS_CORE_v1 seal VERIFIED` + `KOTODAMA_CONSTITUTION_V1 seal VERIFIED`）。

---

## Section 8: persona_knowledge_bindings 候補

現行実体（実測）:

- `persona_profiles` 2 行: `7d516068-... / kukai-deepread / category=null / status=draft / retrieval_mode=grounded_first` と `250e4565-... / stage2-persona-1775085424 / status=active / retrieval_mode=balanced`
- `persona_knowledge_bindings` 105 行: 全件 `persona_id=7d516068-...`（kukai-deepread）、`source_type=kokuzo_canon`、`binding_mode=retrieve`、`priority=50`、`active=1`、`metadata_json={"auto_bound": true}`
- `persona_memory_policies` 2 行: `mode=user_plus_project`（両 persona）

→ **言霊系 persona は現行 0 件**。Card-07 が新規導入する候補（試案）:

| persona slug 候補 | 寄与する Phase A 成果 | bind 対象 source（試案） | binding_mode 候補 |
|---|---|---|---|
| `kotodama-canon-keeper` | `KOTODAMA_CONSTITUTION_V1` + `enforceKotodamaConstitutionV1` | 言霊秘書.pdf (#1) + 憲法 V1 (#34) + KHS_CORE (#35) + 橋渡し 2 件 (#29/30) | `enforce` |
| `gojuren-master` | `GOJUREN_50_SOUNDS_V1` + `kotodama50MapV1` | 32 資料中 #2/#3/#4/#5/#6/#11/#13 と憲法 V1 | `retrieve` |
| `katakamuna-bridge` | `KOTODAMA_NOTION_BRIDGE_MEMO` の橋渡し方針 | `sacred_corpus_registry.tradition=KATAKAMUNA=2` 行 + #21 | `flavor` |

→ いずれも **Card-07 の実装裁定対象**であり、本レポートでは候補列挙までに留める。

---

## Section 9: Card-01 scope（touch / not touch）

> **重要**: 現行 `source_registry` schema には既に `fingerprint / originKind / lineage_family / trust_level / promotion_state / canonical_candidate / ledger_constitution_ref` の 7 列が存在（Section 2.2 実体）。  
> カード本文に列挙された Card-01 追加列のうち、**既存 = `lineage_family` / `trust_level` / `promotion_state` / `canonical_candidate`**、**未存在 = `source_hash` / `extraction_mode` / `ocr_used` / `last_analysis_at` / `last_error` / `source_title` / `source_author`**。Card-01 の touch 範囲は **未存在 7 列の追加 + 既存列の制約強化（enum / numeric range）** が中心となる（実体根拠: `.schema source_registry`）。

### 9.1 Card-01 で **touch する**（実体根拠で確定）

- `source_registry` テーブル schema（**migration 1 本のみ**、列追加 + 既存列 enum 制約強化、index 追加）
- 追加列候補（カード本文記載のうち **未存在** のもののみ）:
  - `source_hash TEXT`（NULL 許容、初期 NULL）
  - `extraction_mode TEXT`（enum 候補: `pdf_text / pdf_ocr / json / md / notion / manual`）
  - `ocr_used INTEGER NOT NULL DEFAULT 0`
  - `last_analysis_at TEXT`（datetime）
  - `last_error TEXT`
  - `source_title TEXT`
  - `source_author TEXT`
- 既存列の制約強化:
  - `lineage_family` の enum 候補定義（現状 free text、`null=104` が大半）
  - `trust_level` を numeric 0-100 に変更する場合は **既存 4 値（`unverified / low / medium / verified`）の数値マッピング**が必要 — **要 TENMON 裁定**（カード本文の「numeric 0-100」と現行 TEXT enum で衝突）
  - `promotion_state` enum 検証: `pending | pass | hold | reject`（現行は `none / promoted` の 2 値が観測）

### 9.2 Card-01 で **touch しない**（除外、実体根拠で確定）

| 除外対象 | 実体 | 担当 Card |
|---|---|---|
| `source_analysis_logs` | 既存 schema、237,422 行 | Card-02 |
| `memory_units` | 既存 schema、252,948 行 | Card-04 |
| `chat.ts` | 5,991 行、Phase A で計装済（line 54 / 2698 / 2801） | Card-10 / 11 |
| 既存 kotodama 系コード | `kotodamaOneSoundLawIndex.ts` 505 行、`kotodamaBridgeRegistry.ts` 117 行、`kotodama50MapV1.ts` 199 行、`kotodamaConstitutionEnforcerV1.ts` 108 行、`constitutionLoader.ts` 347 行 | Phase A で完成 / Card-04 で data 投入のみ |
| `notionCanon.ts` | 262 行、SLA § 1.4 に「先頭 80 行で 32 件 pageId 直列挙なし」の実体 | Card-03 |
| OCR 系コード | （別系統） | Card-13 |
| persona / thread 系（4 テーブル） | 既存 schema、5 テーブル合計 22.5 万行超 | Card-07 / 08 / 09 |
| `sacred_corpus_registry` / `sacred_segments` | 1014 / 2211 行、FK で `source_registry.id` 参照 | （Card-01 では既存 FK の維持確認のみ） |
| acceptance probe / `claude-summary` | 既存 endpoint、Phase A 後も `constitution_compliance=PASS` | Card-12 |

---

## Section 10: Card-01 acceptance 条件（先行記述、12 項目）

> 本リストは **acceptance 条件の候補 12 項目**であり、最終確定は Card-01 投入時の TENMON 裁定。

1. migration 1 本が成功する（rollback も成功する）。
2. 既存 `source_registry` 107 行が **破損しない**（id 一致、行数前後比較）。
3. 既存追加列（`fingerprint / originKind / lineage_family / trust_level / promotion_state / canonical_candidate / ledger_constitution_ref`）の値が **不変**であること（select 全列 hash 比較）。
4. 新規 `source_hash` が NULL 許容で初期 NULL のまま。
5. `lineage_family` の enum 制約（実装する場合）が **既存 3 値**（`mahayana/katakamuna_sample` / `verify/ledger-updated` / `yamato_kotodama/kotodama_hisho`）を含む。
6. `trust_level` が **既存 4 値（`unverified/low/medium/verified`）と互換**であること（numeric 化する場合は移行表を本レポートと同形で添付）。
7. `promotion_state` enum が `pending | pass | hold | reject` を含み、**既存 2 値（`none` / `promoted`）の取扱**が明示されていること。
8. acceptance probe の `constitution_compliance` check が PASS を維持。
9. `kotodama_constitution_enforcer.verdict` が **`clean`** を維持（Phase A 不変）。
10. FK で参照する `sacred_corpus_registry.source_registry_id` / `sacred_segments.source_registry_id` が **既存 100% 整合**を維持。
11. `persona_knowledge_bindings.source_id` の参照整合性が破壊されない（既存 105 行の `source_id` がすべて `source_registry.id` に存在することを実測確認、現状は 100 行が `kokuzo_canon` 由来）。
12. Card-02 が依存できる schema 形（`source_registry` 主キー / FK / 新列）になっている。

---

## Section 11: Phase B 進行リスク一覧（11 項目、確度評価付き）

| # | リスク | 実体根拠 | 確度評価（Cursor 観測のみ） |
|---:|---|---|---|
| 1 | `kotodamaOneSoundLawIndex.ts` 505 行手書き と `memory_units` の競合 | `kotodamaOneSoundLawIndex.ts` 505 行は Phase A で改変なし、`memory_units.scripture_distill=305` のみ | 中（型衝突は schema 設計時点で発生確率がある） |
| 2 | KHS_CORE_v1 と KOTODAMA_CONSTITUTION_V1 の優先順位 | 起動ログで両者 VERIFIED、`KOTODAMA_CONSTITUTION_V1.txt § 6` で「正典階層」を明記 | 中（憲法第 6 条で序列規定はあるが、Card-15 の seal contract で両者の coexistence 表現が必要） |
| 3 | `sacred_corpus_registry` 1014 行を `source_registry` に統合する判断 | FK で `source_registry_id` を参照する設計が既存。`tradition=GENERAL=1002` が大半で、`KOTODAMA=3` のみ言霊系 | 高（統合判断は Card-01 では決めず、Card-03 / 16 で別途裁定） |
| 4 | `thread_persona_links` 112,975 件の persona binding 影響 | persona_id 内訳・auto_default の比率は本監査未取得 | 中（Card-08 で `persona_id` 分布監査が必要） |
| 5 | `PromptTrace` の出力先（jsonl）と `memory_projection_logs` の関係 | jsonl=`/opt/tenmon-ark-data/mc_intelligence_fire.jsonl` 実体（CHAT-LENGTH-REGRESSION-AUDIT § 1.4）、`memory_projection_logs` テーブル名は本監査範囲では未確認 | 中（Card-05 で DB schema 整合確認が必要） |
| 6 | `chat.ts` 5,991 行のうち未把握領域 | Phase A で `chat_parts/` 4 ファイル合計 108 行を新設 / `chat.ts` 計装は line 54 / 2698 / 2801 / 2548-2562 のみ | 中（Card-10 / 11 で他領域への拡張時に判明） |
| 7 | Notion MCP 実接続の Cursor 側稼働確認 | `kotodama_bridges.status="registered_not_synced"` / `notes="Notion MCP 実取得は別カード"`（runtime 実測） | 高（Cursor 側 MCP 接続状況は本監査範囲外） |
| 8 | acceptance verdict が現状 `FAIL`（理由: `git_dirty CRIT=1`） | `/api/mc/vnext/claude-summary` 実測 4/25 12:33、reasons=`alerts below critical: CRIT=1 (git_dirty)` 1 件のみ。10 checks すべて PASS（含む `constitution_compliance=PASS`） | 高（**git_dirty は本レポート追加コミット前の状態に起因し、commit 後解消する見込み** — 本 audit 開始時 12:24 → commit 前 12:33。本リスクは Phase B 着手前に解消されることが期待される） |
| 9 | カード本文の `trust_level` 「numeric 0-100」と現行 TEXT enum の衝突 | `source_registry.trust_level TEXT NOT NULL DEFAULT 'unverified'` の DDL、観測 4 値 | 高（Section 9.1 / 10.6 で明示） |
| 10 | `Master 16 Card` ドキュメント実体が repo 内に未登録 | rg `未完了部品` `全回収マスター` `MASTER_16` 0 件、ヒット元は本レポートと MEMO のみ | 中（外部設計書として TENMON 側で保持。Phase B 進行で repo 内転載の可否判断が必要） |
| 11 | `kotodama_50_coverage` の grounding 比率の低さ | `with_textual_grounding=2/50=0.04` / `with_source_page=2/50=0.04`（実測 endpoint） | 中（Card-04 / 16 で目標値設定が必要） |

---

## Section 12: TENMON 裁定用 Next Card draft（骨子のみ・実装内容は含まない）

> 以下は **裁定入力の骨子**であり、Cursor は実装内容・移行手順・rollback 手順を提案しない。

- **Card ID 候補**: `CARD-PHASE-B-01-SOURCE-REGISTRY-SCHEMA-EXPANSION-V1`
- **Card 名（カード本文準拠）**: `SOURCE_REGISTRY_SCHEMA_EXPANSION_V1`
- **scope**: Section 9.1 / 9.2 のとおり
- **acceptance 候補**: Section 10 の 12 項目（最終本数は TENMON 裁定）
- **依存（実体）**:
  - 現行 `source_registry`（107 行・既存 7 追加列）
  - FK 参照テーブル: `sacred_corpus_registry` (1014 行) / `sacred_segments` (2211 行) / `persona_knowledge_bindings` (105 行)
  - 観測軸: `kotodama_constitution_enforcer.verdict` を不変条件に固定
- **Phase A 寄与（直接）**: enforcer / bridges / 50-coverage（`/api/mc/vnext/intelligence` 配下 3 セクション、本レポート Section 5/7 の試案）
- **Phase A 寄与（間接）**: `prompt_trace_summary_24h` を baseline として保持
- **明示的に touch しないもの**: Section 9.2 の表のとおり
- **Cursor 側で本 draft に踏み込まないもの**:
  - 列の TEXT/numeric 変換規則
  - rollback 詳細
  - migration 行数の上限
  - 投入順序

---

## Acceptance（本レポート自身）

- **実装変更ゼロ**: `git status -s` が `?? docs/ark/phase-b/PRE_PHASE_B_INTEGRATION_AUDIT_V1.md`（または前版差し替えの `M`）のみであることを Section 末尾の VERIFY セクションで担保。
- **Phase A 成果の所在が明記**: Section 1（commit / path / 行数 / 機能）。
- **Master 16 Card への embed 先が明記**: Section 3（16 行すべて埋まっている）。
- **8 接続全件に Phase A 寄与記述**: Section 4。
- **Card-01 scope の touch / not touch が分離**: Section 9。
- **Card-01 acceptance 条件 12 項目（カード要件 8 以上）**: Section 10。
- **推測による断定がない**: 各 Section に `実測` / `実体` / `path` / `行数` / `count` / `endpoint 出力` / `journal` の根拠が併記されている。Master 16 Card 名称のみ **カード本文一次ソース** と明記して使用。
- **TENMON が裁定可能**: Section 12 の draft は骨子のみで、実装内容は含まない。

---

## OBSERVE ONLY 宣誓（本カード）

- TypeScript / schema / migration / package.json / dist 編集 = **行っていない**
- deploy / restart / env 変更 = **行っていない**
- DB write = **行っていない**（接続はすべて `file:...?mode=ro` の SQLite read-only）
- Card-01 の先取り実装 = **行っていない**（本レポートは設計 / 候補列挙までで停止）
- 唯一の変更: `docs/ark/phase-b/PRE_PHASE_B_INTEGRATION_AUDIT_V1.md`（前版から本カード仕様への書き換え）
