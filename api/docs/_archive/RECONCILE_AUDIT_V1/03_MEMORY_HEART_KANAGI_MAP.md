## 03_MEMORY_HEART_KANAGI_MAP — threadCore / heart / kanagi / intention

この章では、**threadCore / threadCenter / heart / kanagi / intention** がどのように保存・再利用されているかを整理する。

### 1. threadCore / threadCenter の構造

- `threadCore` 型（`api/src/core/threadCore.ts`）:

```5:21:/opt/tenmon-ark-repo/api/src/core/threadCore.ts
export type ThreadResponseContract = {
  answerLength?: "short" | "medium" | "long" | null;
  answerMode?: string | null;
  answerFrame?: string | null;
  routeReason?: string | null;
};

export type ThreadCore = {
  threadId: string;
  centerKey: string | null;
  centerLabel: string | null;
  activeEntities: string[];
  openLoops: string[];
  commitments: string[];
  lastResponseContract: ThreadResponseContract | null;
  updatedAt: string;
};
```

- `thread_center_memory` テーブル（`kokuzo.sqlite` `.schema` より）:

```1:15:/opt/tenmon-ark-data/kokuzo.sqlite
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
);
```

- `threadCoreStore.ts` の load/save:
  - `loadThreadCore(threadId)`（L58–86）:
    - `thread_center_memory` から最新1件を取得し、`center_key`, `center_reason`, `source_route_reason`, `updated_at` から `ThreadCore` を構成。
    - `center_reason` JSON を `parseCenterReason`（L25–52）で解析し、`lastResponseContract` / `openLoops` / `commitments` を復元。
  - `saveThreadCore(core)`（L92–153）:
    - 存在する場合は `UPDATE thread_center_memory`（L135–140）、なければ `upsertThreadCenter(...)`（L142–148）。
    - `center_reason` に `lastResponseContract`＋`openLoops`＋`commitments` を JSON で一括保存。

→ **threadCore = in-memory view、thread_center_memory = 永続層**として動いている。

### 2. chat.ts における threadCore 利用パターン

- 初期ロード:
  - `chat.ts` 冒頭（L906–910）：`emptyThreadCore(threadId)` → `loadThreadCore(threadId)` で `__threadCore` を初期化。
  - `res.__TENMON_THREAD_CORE` にもミラーされ、外側からも参照可能。

- 書き込み例:
  - support / explicit / self-aware / follow-up / continuity など、各 preempt route 内で:
    - `const __coreX: ThreadCore = { ...__threadCore, centerKey: ..., centerLabel: ..., lastResponseContract: {..., routeReason: "<ROUTE>"}, updatedAt: new Date().toISOString() };`
    - `saveThreadCore(__coreX).catch(() => {});`
    - `res.__TENMON_THREAD_CORE = __coreX;`
  - 例:
    - `R22_ESSENCE_FOLLOWUP_V1`（L8118–8156）
    - `R22_COMPARE_FOLLOWUP_V1`（L8159–8232）
    - `CONTINUITY_ANCHOR_V1`（L8235–8248）
    - `EXPLICIT_CHAR_PREEMPT_V1` / `FEELING_SELF_STATE_V1` / self-aware 系なども同様パターン。

- abstract center（`ABSTRACT_FRAME_VARIATION_V1`）:
  - `DEF_LLM_TOP` の出口で `buildAbstractFrameV1` の結果を採用し、`centerKey` / `centerLabel` を `ThreadCore` に保存している（L7645–7678）。

→ `chat.ts` は **centerKey / routeReason / lastResponseContract** を threadCore に集約し、  
follow-up や continuity の入口で `loadThreadCore` / `threadCenter` を参照している。

### 3. heart / synapse_log / scripture_learning_ledger

- `synapse_log` テーブル（`.schema` より）:

```1:11:/opt/tenmon-ark-data/kokuzo.sqlite
CREATE TABLE synapse_log (
  synapseId TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  threadId TEXT NOT NULL,
  turnId TEXT NOT NULL,
  routeReason TEXT NOT NULL,
  lawTraceJson TEXT NOT NULL,
  heartJson TEXT NOT NULL,
  inputSig TEXT NOT NULL,
  outputSig TEXT NOT NULL,
  metaJson TEXT NOT NULL
);
```

- `chat.ts` での書き込み:
  - L4412 付近: `INSERT OR IGNORE INTO synapse_log(...) VALUES(?, ?, ..., routeReason, lawTraceJson, heartJson, inputSig, outputSig, metaJson)`
  - routeReason は `decisionFrame.ku.routeReason` をそのまま mirror（L4386–4400）。

- `scripture_learning_ledger` テーブル（`.schema` より）:

```1:16:/opt/tenmon-ark-data/kokuzo.sqlite
CREATE TABLE scripture_learning_ledger (
  id TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  threadId TEXT NOT NULL,
  message TEXT NOT NULL,
  routeReason TEXT NOT NULL,
  scriptureKey TEXT,
  subconceptKey TEXT,
  conceptKey TEXT,
  thoughtGuideKey TEXT,
  personaConstitutionKey TEXT,
  hasEvidence INTEGER NOT NULL DEFAULT 0,
  hasLawTrace INTEGER NOT NULL DEFAULT 0,
  resolvedLevel TEXT NOT NULL,
  unresolvedNote TEXT
);
```

- `scriptureLearningLedger.ts` では、`writeScriptureLearningLedger` 経由で:
  - `routeReason`, `scriptureKey`, `subconceptKey`, `conceptKey`, `thoughtGuideKey`, `personaConstitutionKey` などを記録。

→ **heart / learning / scripture 層は `synapse_log` と `scripture_learning_ledger` に 2 系統で記録されている。**

### 4. kanagi_growth_ledger と intention 軸

- `kanagi_growth_ledger` テーブル（`.schema` より）:

```1:20:/opt/tenmon-ark-data/kokuzo.sqlite
CREATE TABLE kanagi_growth_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  input_text TEXT NOT NULL,
  route_reason TEXT,
  self_phase TEXT,
  intent_phase TEXT,
  heart_source_phase TEXT,
  heart_target_phase TEXT,
  heart_entropy REAL,
  topic_class TEXT,
  concept_mode TEXT,
  concept_alignment TEXT,
  scripture_key TEXT,
  scripture_mode TEXT,
  scripture_alignment TEXT,
  stability_score REAL,
  drift_risk REAL,
  should_persist INTEGER NOT NULL DEFAULT 0,
  should_recombine INTEGER NOT NULL DEFAULT 0,
  unresolved_class TEXT,
  next_growth_axis TEXT,
  note TEXT
);
```

- `chat.ts` のインポート（L91）:
  - `buildKanagiGrowthLedgerEntryFromKu`, `insertKanagiGrowthLedgerEntry` から、`decisionFrame.ku` と `heart` / `intention` を元に成長ログを構築し、`kanagi_growth_ledger` に insert。

- 補助ツール:
  - `api/tools/tenmon_applylog_pulse_kanagi4.py`:
    - applylog / kanagi growth を解析する offline ツール。

→ kanagi 系は **routeReason / self_phase / intent_phase / heart_* を時系列で記録する growth ledger** として機能している。

### 5. intention / thoughtCoreSummary との関係

- `knowledgeBinder.ts` の `thoughtCoreSummaryPatch`（L186–193）:
  - `centerKey`, `routeReason`, `modeHint`, `continuityHint` を含む patch を構築。
  - `applyKnowledgeBinderToKu` 側で `ku.thoughtCoreSummary` に反映される（実装は同ファイル末尾）。

- `gates_impl.ts` の `buildSourceStackFromKuAndSynapse`（L172–245）:

```172:185:/opt/tenmon-ark-repo/api/src/routes/chat_parts/gates_impl.ts
    // scripture layer
    const scriptureKey = String(ku.scriptureKey || syn.sourceScriptureKey || "").trim() || null;
    ...
    // concept / center layer
    const centerKey = String(ku.centerKey || "").trim() || null;
    ...
    // law / notion / thread_center 層を順次 sourceStack に push
```

- `synapseTopPatch`（`knowledgeBinder.ts` L195–215）:
  - `sourceThreadCenter`, `sourceMemoryHint`, `sourceRouteReason`, `sourceRouteClass`, `sourceCenterLabel`, `sourceLedgerHint` を構築。
  - これが `synapse_log.metaJson` 等に入り、後続の分析ツールから意図 / 中心 / ledger 種別を復元可能にしている。

→ **intention / thoughtCore は routeReason+centerKey を元に「どの axis で返したか」を静的に残す仕掛け**になっている。

### 6. 本章での暫定分類

- **主系**
  - `threadCore` / `threadCoreStore.ts` / `thread_center_memory`
  - `synapse_log`（+ `buildSourceStackFromKuAndSynapse`）
  - `scripture_learning_ledger`
  - `kanagi_growth_ledger`（+ `buildKanagiGrowthLedgerEntryFromKu` / `insertKanagiGrowthLedgerEntry`）
  - `knowledgeBinder.ts` / `sourceGraph.ts` / `thoughtGuide.ts` / `notionCanon.ts` / `personaConstitution.ts`

- **支系**
  - `conversation_log`, `session_memory`, `training_*` テーブル群（training / 再学習向けの補助ログ）。
  - `tenmon_applylog_pulse_kanagi4.py` などの offline 分析ツール。

- **残骸 / 未接続候補**
  - DB 上に存在するが、現行コードから参照が見当たらないテーブル（例: `kokuzo_synapses_backup`, 一部の `khs_*` テーブル等）。
    - 本監査ではコード側から直接の参照がないため、「未接続または歴史的残骸の候補」として扱う。

詳細な主系・支系・残骸・未接続の裁定は `06_MAINLINE_CLASSIFICATION.md` にて行う。  
ここでは、**centerKey / routeReason / heart / intention が複数の ledger にどのように流れ込んでいるか**を事実ベースで整理した。 

