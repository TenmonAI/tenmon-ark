## 04_LEARNING_LEDGER_MAP — scripture_learning_ledger / synapse_log / growth ledger / applylog

この章では、TENMON-ARK の「学習・適用」系テーブルと、その実際の接続・利用状況を整理する。

### 1. scripture_learning_ledger

- **テーブル schema**（`kokuzo.sqlite` より）:

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
CREATE INDEX idx_scripture_learning_ledger_thread
  ON scripture_learning_ledger(threadId, createdAt);
```

- **書き込みコード**（`api/src/core/scriptureLearningLedger.ts` からの抜粋）:
  - `writeScriptureLearningLedger(entry)` が `INSERT OR IGNORE` でレコードを追加（L32 付近）。
  - `entry.routeReason` / `entry.scriptureKey` / `entry.subconceptKey` / `entry.conceptKey` / `entry.thoughtGuideKey` / `entry.personaConstitutionKey` などを使用。

- **典型的な利用ルート**
  - `TENMON_SCRIPTURE_CANON_V1` / `TENMON_SUBCONCEPT_CANON_V1` / `TENMON_CONCEPT_CANON_V1` 経由で、  
    scripture / subconcept / concept canon を用いた応答が発生した際に呼び出される。

→ **scripture_learning_ledger は「聖典ベースの学習ログ」であり、canon 層と routeReason を結ぶ learning 軸の主系。**

### 2. synapse_log

- **テーブル schema**:

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
CREATE INDEX idx_synapse_log_createdAt ON synapse_log(createdAt);
CREATE INDEX idx_synapse_log_threadId ON synapse_log(threadId);
CREATE INDEX idx_synapse_log_inputSig ON synapse_log(inputSig);
```

- **書き込みコード**（`chat.ts` L4412 付近）:
  - `INSERT OR IGNORE INTO synapse_log(...)` を実行。
  - routeReason は `decisionFrame.ku.routeReason` を mirror（L4386–4400）。
  - `lawTraceJson`, `heartJson`, `metaJson` には:
    - lawTrace（KHSL law / unitId など）
    - heart（感情・状態）
    - sourceStack / thoughtCoreSummary / binderSummary 由来のメタ情報
    が JSON で格納される。

→ **synapse_log は「すべての route 経路に対する単位ログ」であり、routeReason ベース解析の中核テーブル。**

### 3. kanagi_growth_ledger

- **テーブル schema**:

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
CREATE INDEX idx_kanagi_growth_ledger_created_at
  ON kanagi_growth_ledger(created_at);
CREATE INDEX idx_kanagi_growth_ledger_route_reason
  ON kanagi_growth_ledger(route_reason);
```

- **書き込みコード**
  - `api/src/core/kanagiGrowthLedger.ts`（存在を前提。`chat.ts` から `buildKanagiGrowthLedgerEntryFromKu`, `insertKanagiGrowthLedgerEntry` を import）。
  - `decisionFrame.ku` と heart/intention を元に:
    - `route_reason`, `self_phase`, `intent_phase`, `heart_*`, `stability_score`, `drift_risk` などを計算し、`kanagi_growth_ledger` に insert。

- **関連ツール**
  - `api/tools/tenmon_applylog_pulse_kanagi4.py`:
    - applylog と kanagi growth を読み、安定性や drift を可視化するための offline ツールとして存在。

→ **kanagi_growth_ledger は「対話の成長/ドリフト監視」のための支系だが、routeReason や heart/intention を強く参照するため、主系との接点が多い。**

### 4. khs_apply_log / training 系

- **テーブル群（`.tables` より）**
  - `khs_apply_log`
  - `training_messages`, `training_rules`, `training_sessions`, `training_freezes`, `tenmon_training_log` など。

- **コード上の利用**
  - `api/tools/tenmon_applylog_pulse_kanagi4.py` および `khs_*` ツール群で:
    - law / term / unit の適用状況や quality を集計。
  - 本体の `/api/chat` ルートからは、直接参照するコードは限定的または存在しない（現時点での grep では route 側 direct 参照は確認できず）。

→ **khs_apply_log / training_* は主に「学習パイプライン用ログ」であり、TENMON-ARK 本体の runtime ルートからは「支系 / 周辺システム」として接続されている。**

### 5. applylog / tools 群

- `api/tools` ディレクトリの主なファイル:
  - law / term 系: `khs_laws_seed_v1.py`, `khs_laws_classify_v1.py`, `khs_laws_link_terms_v1.py`, `khs_units_ingest_v1.py`, `khs_units_cleanse_v1.py`, `khs_terms_seed_v1.py`, `khs_term_candidates_v1.py`, `khs_term_candidates_filter_v1.py` など。
  - ドキュメント ingest 系: `nas_pdf_pages_ingest_v1.py`, `nas_pdf_pages_ingest_poppler_v1.py`, `danshari_docx_extract_v1.py`。
  - audit / report 系: `tenmon_full_internal_circuit_report_v1.py`, `tenmon_applylog_pulse_kanagi4.py`。

→ これらのツールは、**学習・構築・audit のための「支系」**として機能し、runtime `/api/chat` の直接の挙動には影響しない（実行しない限りコードパスに入らない）。

### 6. 本章での暫定分類

- **主系**
  - `scripture_learning_ledger` とその writer（`scriptureLearningLedger.ts`）
  - `synapse_log` と `chat.ts` 内の insert
  - `kanagi_growth_ledger` と `kanagiGrowthLedger.ts`（成長・安定性観測として主系と密接）

- **支系**
  - `khs_apply_log`, `tenmon_training_log`, `training_*` テーブル群
  - `api/tools` の law / ingest / applylog / audit ツール群

- **残骸 / 未接続候補**
  - DB 上には `kokuzo_synapses_backup` などのバックアップ用途のテーブルも存在するが、現行コードからの direct 参照は確認できていない。
    - 本監査では「バックアップまたは歴史的残骸の候補」としてマークし、`06_MAINLINE_CLASSIFICATION.md` で扱う。

この章では、TENMON-ARK の learning / ledger 系が **3 本の柱（scripture_learning_ledger / synapse_log / kanagi_growth_ledger）**で構成されていることを確認した。  
次の章では、tools / scripts / report / CARD_* を含めた「構築物全体の一覧」と、主系/支系/残骸/未接続への分類を進める。 

