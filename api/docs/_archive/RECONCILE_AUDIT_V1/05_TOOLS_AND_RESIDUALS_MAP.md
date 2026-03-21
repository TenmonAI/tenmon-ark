## 05_TOOLS_AND_RESIDUALS_MAP — tools / scripts / reports / CARD_* / 残骸候補

この章では、コード本体以外の **tools / scripts / report / CARD_* / canon バックアップ** を一覧化し、現時点での接続状況を整理する。

### 1. api/tools 一覧と役割

`/opt/tenmon-ark-repo/api/tools` に存在するファイル（Glob 結果）:

- audit / report 系:
  - `tenmon_full_internal_circuit_report_v1.py`
  - `tenmon_applylog_pulse_kanagi4.py`
- law / term / unit ingest & cleanse 系:
  - `khs_laws_seed_v1.py`
  - `khs_laws_classify_v1.py`
  - `khs_laws_link_terms_v1.py`
  - `khs_units_ingest_v1.py`
  - `khs_units_cleanse_v1.py`
  - `khs_terms_seed_v1.py`
  - `khs_term_candidates_v1.py`
  - `khs_term_candidates_filter_v1.py`
- ドキュメント ingest:
  - `nas_pdf_pages_ingest_v1.py`
  - `nas_pdf_pages_ingest_poppler_v1.py`
  - `danshari_docx_extract_v1.py`

**接続状況（コードベース）**

- これらツールは、`api/src` 内から import されておらず、CLI / 手動実行前提のスクリプト。
- 役割は以下のように推定できるが、ここでは「ファイル名＋ schema から読める範囲」に留める:
  - `tenmon_full_internal_circuit_report_v1.py`: 内部配線をレポートする audit script。
  - `tenmon_applylog_pulse_kanagi4.py`: applylog / kanagi growth ledger を解析する offline ツール。
  - `khs_*` 系: law / term / unit / page / seed を DB に流し込むための構築パイプライン。

→ **現行 `/api/chat` の runtime パスからは直接呼ばれない「支系 / 構築・運用用ツール」として存在している。**

### 2. api/src/scripts

`/opt/tenmon-ark-repo/api/src/scripts`:

- `card_DB_REALITY_CHECK_AND_SEED_V1.ts`
  - 目的: `kokuzo.sqlite` の runtime path / schema / テーブル有無 / row count を観測するカード。
  - `getDb`, `getDbPath` を利用し、`PRAGMA database_list`, `SELECT COUNT(*)` 等を発行する。
  - アプリ本体から直接 import はされず、**「観測専用スクリプト」として手動実行する設計**。

→ **DB reality / seed 状況の確認に使う「主系に近い支系」スクリプト。**

### 3. routes 配下の report / CARD_* / meta ファイル

`/opt/tenmon-ark-repo/api/src/routes` には、TypeScript ルート以外に以下の markdown 群が存在する。

- 総合レポート:
  - `FINAL_REPORT_V1/00_FINAL_EXEC_SUMMARY.md` 〜 `09_FINAL_DECISION.md`
  - `WORLD_CLASS_ANALYSIS_V2/00_FINAL_EXEC_SUMMARY.md` 〜 `09_FINAL_DECISION.md`
- 会話品質 / response frame:
  - `CONVERSATION_QUALITY_VPS_ANALYSIS_V1.md`
  - `CARD_RESPONSE_FRAME_LIBRARY_V1.md`
  - `CARD_LONGFORM_1000_STRUCTURE_V1.md`
- 本監査用:
  - `RECONCILE_AUDIT_V1/00_EXEC_SUMMARY.md` 〜（本カードで新規作成中）

**接続状況**

- これらの markdown は runtime から直接読まれていない（少なくとも `import` / `fs.readFile` などは確認できない）。
- ただし:
  - routeReason 一覧 / route sovereignty / DB reality / world-class ギャップ / re-architect plan / cursor action prompt などの仕様において、  
    「設計の source of truth」として人間開発者向けに機能している。

→ **コードには直接接続されていないが、設計・運用の「ドキュメント主系」として扱う価値がある。**

### 4. canon バックアップファイル

`/opt/tenmon-ark-repo/canon` には、以下のような `.bak_*` ファイルが存在する:

- `tenmon_scripture_canon_v1.json.bak_20260313T015125Z`
- `tenmon_scripture_canon_v1.json.bak_KATAKAMUNA_GUIDE_CANON_DEEPEN_V1_20260314T012349Z`
- `tenmon_thought_guide_v1.json.bak_KATAKAMUNA_GUIDE_CANON_DEEPEN_V1_20260314T012349Z`

**接続状況**

- `api/src` からの import は、現行ファイル（`.json` 本体）のみで、`.bak_*` へは direct 参照が見当たらない。
- よって、**過去バージョンのバックアップとしての「残骸に近いが、有用な履歴」** と判断できる（削除ではなく封印対象）。

### 5. khs_* / training_* テーブル群

`.tables` 出力から、以下のような多数のテーブルが存在する:

- `khs_*` 系:
  - `khs_laws`, `khs_units`, `khs_terms`, `khs_pages_norm`, `khs_concepts`, `khs_edges`, `khs_links_norm`, `khs_seed_clusters`, `khs_seeds_det_v1`, `khs_quality_flags`, `khs_verifier_log`, `khs_apply_log`, など。
- training / テンモン専用:
  - `tenmon_audit_log`, `tenmon_training_log`
  - `training_messages`, `training_rules`, `training_sessions`, `training_freezes`, `training_freezes`

**接続状況**

- law / term / unit ingest / quality / applylog 用に設計されていると読み取れるが、  
  `/api/chat` や `chat_parts` からの direct 参照は限定的または存在しない。
- 代わりに、`api/tools/khs_*` や  audit ツールから参照されている。

→ **これらは「学習・構築パイプラインの支系 / backend」であり、TENMON-ARK runtime の主系からは 1 段離れている。**

### 6. 残骸 / 未接続候補の例

本監査時点で、以下は「コード側から direct 参照が見当たらない」ため、**残骸 / 未接続候補**としてマークする（削除推奨ではなく、状態のラベル付けのみ）。

- DB テーブル:
  - `kokuzo_synapses_backup`（バックアップ用途と思われる）
  - 一部の `khs_*` テーブル（現行ツールから参照しない古い世代があれば）
- ファイル:
  - `.bak_*` 付きの canon ファイル（前述）。
  - 古いカード定義や実験的 markdown で、現行 report / route / tool からリンクされていないものがあれば（本レポートでは個別ファイル名まで掘らず「候補」として留める）。

### 7. 本章での暫定分類

- **主系**
  - `card_DB_REALITY_CHECK_AND_SEED_V1.ts`（DB reality 観測）
  - `tenmon_full_internal_circuit_report_v1.py`（全体回路 audit）
  - `FINAL_REPORT_V1/*`, `WORLD_CLASS_ANALYSIS_V2/*`, `RECONCILE_AUDIT_V1/*`（設計ドキュメントとしての主系）

- **支系**
  - `api/tools` の law / ingest / applylog ツール群
  - `tenmon_applylog_pulse_kanagi4.py`（kanagi / applylog 分析）
  - `khs_*` / `training_*` テーブル群

- **残骸**
  - `.bak_*` canon ファイル（コードから参照されないバックアップ）
  - `kokuzo_synapses_backup` のようなバックアップテーブル

- **未接続**
  - 現行ルート・ツール・レポートから import /実行されていない、単独で置かれた実験的ファイルがあれば、  
    `06_MAINLINE_CLASSIFICATION.md` で列挙対象とする（本章では「潜在的未接続」としてラベルのみ付与）。

次の `06_MAINLINE_CLASSIFICATION.md` では、ここまでの route / canon / memory / ledger / tools の観測をもとに、  
TENMON-ARK 全体を **主系 / 支系 / 残骸 / 未接続** に明示的に振り分ける。 

