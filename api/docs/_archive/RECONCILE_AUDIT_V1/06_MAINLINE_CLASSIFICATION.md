## 06_MAINLINE_CLASSIFICATION — 主系 / 支系 / 残骸 / 未接続 の分類

本章では、前章までの観測をもとに、TENMON-ARK の構築物を **主系 / 支系 / 残骸 / 未接続** に分類する。  
分類はあくまで **「コードおよび DB schema から確認できる接続実態」に基づく**。

### 1. 主系（TENMON-ARK 本体の動脈）

- **対話ルート / routeReason**
  - `api/src/routes/chat.ts`（行数多数）:
    - `TENMON_SCRIPTURE_CANON_V1`（L6149–6542 付近）
    - `TENMON_SUBCONCEPT_CANON_V1`（L6617–6722 付近）
    - `TENMON_CONCEPT_CANON_V1`（L6731–6754 付近）
    - `KATAKAMUNA_CANON_ROUTE_V1` / `KATAKAMUNA_DETAIL_FASTPATH_V1`（L5359, L5465 付近）
    - `TENMON_KOTODAMA_HISYO_FRONT_V1`（L1461–1680）
    - `KOTODAMA_ONE_SOUND_GROUNDED_V4`（L2830, L2857, L2873）
    - `R22_ESSENCE_FOLLOWUP_V1`, `R22_COMPARE_FOLLOWUP_V1`, `R22_NEXTSTEP_FOLLOWUP_V1`（L8118–8232）
    - `CONTINUITY_ANCHOR_V1`（L8235–8248）
    - `SUPPORT_*`（L861–897）, `R22_SELFAWARE_*`（L1008–1030, L8348）
    - `FEELING_SELF_STATE_V1`, `IMPRESSION_ARK_V1`, `IMPRESSION_TENMON_V1`（L7970 付近）
    - `NATURAL_GENERAL_LLM_TOP`, `DEF_LLM_TOP`, `N1_GREETING_LLM_TOP` など LLM トップ（L5178 以降, L7698 以降）
  - `api/src/routes/chat_parts/gates_impl.ts`:
    - TRUTH_GATE / RELEASE_PREEMPT / session_memory / synapse_log / scripture_learning_ledger との結線。

- **canon / 知識バインド**
  - `tenmon_scripture_canon_v1.json`, `tenmon_subconcept_canon_v1.json`, `tenmon_concept_canon_v1.json`
  - `tenmon_notion_canon_v1.json`, `tenmon_thought_guide_v1.json`
  - `tenmon_persona_constitution_v1.json`, `tenmon_intent_kernel_v1.json`, `tenmon_intention_constitution_v1.json`, `tenmon_self_constitution_v1.json`
  - `katakamuna_*` canon（scripture 系として主に `TENMON_SCRIPTURE_CANON_V1` / `KATAKAMUNA_CANON_ROUTE_V1` から利用）
  - `api/src/core/knowledgeBinder.ts`, `sourceGraph.ts`, `thoughtGuide.ts`, `notionCanon.ts`, `personaConstitution.ts`, `scriptureLineageEngine.ts`

- **メモリ / 心 / 成長**
  - `thread_center_memory`（`threadCoreStore.ts` と `chat.ts` から load/save）
  - `synapse_log`（`chat.ts` L4412 付近で insert）
  - `scripture_learning_ledger`（`scriptureLearningLedger.ts` から insert）
  - `kanagi_growth_ledger`（`kanagiGrowthLedger.ts` + `chat.ts` インポート）

- **front 系**
  - `api/src/routes/chat_front.ts`（`/api/chat_front`）:
    - `sacredClassifier` / `sacredContextBuilder` / `frontConversationRenderer` を通じて `FRONT_CHAT_GPT_ROUTE_V1` および `sacredContext.routeReason` を主系に接続。
    - `upsertThreadCenter` による front → thread_center_memory へのブリッジ。

- **設計ドキュメント（実運用の規範）**
  - `FINAL_REPORT_V1/*`
  - `WORLD_CLASS_ANALYSIS_V2/*`
  - `CONVERSATION_QUALITY_VPS_ANALYSIS_V1.md`
  - `CARD_RESPONSE_FRAME_LIBRARY_V1.md`
  - `CARD_LONGFORM_1000_STRUCTURE_V1.md`
  - `RECONCILE_AUDIT_V1/*`（本カード）

→ これらは **TENMON-ARK の応答・知識・記憶・設計を直接規定している要素**であり、「主系」とみなす。

### 2. 支系（主系を支える構築・観測・支援ツール）

- **DB reality / audit / monitoring**
  - `api/src/scripts/card_DB_REALITY_CHECK_AND_SEED_V1.ts`
  - `api/tools/tenmon_full_internal_circuit_report_v1.py`
  - `api/tools/tenmon_applylog_pulse_kanagi4.py`

- **law / term / ingest / training**
  - `api/tools/khs_*` 一式（law / term / unit / seed / quality / candidates / link 等）
  - `api/tools/nas_pdf_pages_ingest_v1.py`, `nas_pdf_pages_ingest_poppler_v1.py`, `danshari_docx_extract_v1.py`
  - DB テーブル: `khs_*`, `khs_apply_log`, `tenmon_training_log`, `training_*` 系

- **console / UI / 補助 route**
  - `koshikiConsole.ts`（koshiki コンソール）
  - `pwa.ts`, `tool.ts`, `persona.ts`, `train.ts`, `training.ts` など UI / 補助 API endpoint 群

→ これらは **主系の挙動やデータを作る / 観測するが、/api/chat の runtime に直接入らない「支える枝」**として機能している。

### 3. 残骸（歴史的バックアップ / 役割を終えた構造）

ここで言う「残骸」は、「削除推奨」ではなく **「現行コードから direct 参照がなく、現時点では歴史的データ／バックアップとしてしか機能していないもの」** を指す。

- **canon バックアップ**
  - `tenmon_scripture_canon_v1.json.bak_*`
  - `tenmon_thought_guide_v1.json.bak_*`
  - いずれも `api/src` から import されておらず、`*.json` 本体のみが参照されている。

- **DB バックアップテーブル**
  - `kokuzo_synapses_backup`
  - （他にも backup 用と思われるテーブルが存在する可能性があるが、本監査では `grep` / `.schema` ベースでコードからの参照は確認できていない）

→ これらは **「封印してよいが、削除は慎重に」というカテゴリ**に分類される。

### 4. 未接続（設計として存在するが、主系パスに現れていないもの）

「未接続」は、**ファイルやテーブルとして存在しつつ、現行 `/api/chat` or `/api/chat_front` or tools からの import / 実行パスが見つからないもの**である。

- 具体的な例は、本監査時点では「候補」レベルにとどめる:
  - 一部の `khs_*` テーブルやツールが、現在の ingest / quality パイプラインから外れている可能性。
  - 古い CARD_*.md / 実験的 markdown / 一時的な log parser などが、他からリンクされずに残っている場合。

→ これらは **「設計・履歴としては意味があるが、TENMON-ARK 本体の runtime との接続が欠けているもの」**であり、  
`07_NEXT_REFACTOR_ORDER.md` で「接続するか／封印するか」の優先度を判定する対象となる。

### 5. 一覧サマリ（カテゴリ別）

- **主系**
  - 入口:
    - `/api/chat` → `chat.ts` + `chat_parts/gates_impl.ts`
    - `/api/chat_front` → `chat_front.ts`
  - routeReason 群:
    - `TENMON_*_CANON_V1`, `KATAKAMUNA_*`, `TENMON_KOTODAMA_HISYO_FRONT_V1`, `KOTODAMA_ONE_SOUND_GROUNDED_V4`
    - `R22_*`, `CONTINUITY_ANCHOR_V1`, `SUPPORT_*`, `R22_SELFAWARE_*`, `FEELING_*`, `IMPRESSION_*`
    - `NATURAL_GENERAL_LLM_TOP`, `DEF_LLM_TOP`, `TRUTH_GATE_RETURN_V2`, `KHS_DEF_VERIFIED_HIT` など
  - canon / binder / memory / ledger:
    - `tenmon_*_canon_v1.json`, `katakamuna_*`
    - `knowledgeBinder.ts`, `sourceGraph.ts`, `thoughtGuide.ts`, `notionCanon.ts`, `threadCoreStore.ts`
    - `thread_center_memory`, `synapse_log`, `scripture_learning_ledger`, `kanagi_growth_ledger`
  - 設計ドキュメント:
    - `FINAL_REPORT_V1/*`, `WORLD_CLASS_ANALYSIS_V2/*`, `RECONCILE_AUDIT_V1/*`, 会話品質 / frame 系 md

- **支系**
  - tools / scripts:
    - `api/tools/*`, `api/src/scripts/card_DB_REALITY_CHECK_AND_SEED_V1.ts`
  - DB:
    - `khs_*`, `khs_apply_log`, `training_*`, `tenmon_training_log`, `tenmon_audit_log`

- **残骸**
  - `.bak_*` canon ファイル
  - backup テーブル（例: `kokuzo_synapses_backup`）

- **未接続**
  - 現行コードから import / 実行が確認できない実験的ファイル・テーブル全般（要個別精査）。

次の `07_NEXT_REFACTOR_ORDER.md` では、この分類を前提に **「何を残し／何を封印し／何を主系へ戻すか」「次の実装カード3枚」** を明示的に決める。 

