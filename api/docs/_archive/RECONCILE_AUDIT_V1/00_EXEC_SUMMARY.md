## TENMON_FULL_SYSTEM_RECONCILE_AUDIT_V1 — 実行サマリ

- **目的**: TENMON-ARK 全体の route / canon / DB / tools / learning / memory / repair 系を一度すべて棚卸しし、「主系 / 支系 / 残骸 / 未接続」を明示して、今後のリファクタとカード設計の土台とする。
- **対象範囲**:
  - コード: `api/src`, `api/src/routes`, `api/src/chat_parts`, `api/src/scripts`
  - ツール: `api/tools`
  - 知識源: `canon/tenmon_*_canon_v1.json`, `katakamuna_*`, `tenmon_persona_constitution_v1.json`, `tenmon_thought_guide_v1.json` など
  - ランタイム DB: `/opt/tenmon-ark-data/kokuzo.sqlite`
  - systemd: `tenmon-ark-api.service`

### 1. 主な観測結果（route / routeReason 系）

- **実運用の入口はほぼ `chat.ts` 一点集中**  
  - ルート決定は `chat.ts` の巨大な if/return ツリーと、`chat_parts/gates_impl.ts` の gate 処理で行われている。
  - `routeReason` はほぼすべて `decisionFrame.ku.routeReason` として明示され、`synapse_log.routeReason`・`scripture_learning_ledger.routeReason`・`kanagi_growth_ledger.route_reason` にミラーされている（`chat.ts` L2108 以降, L4412 以降）。
- **TENMON 系の主系 routeReason 群**（行番号は `chat.ts` / `gates_impl.ts` の代表例）
  - scripture / canon 軸:
    - `TENMON_SCRIPTURE_CANON_V1`（`chat.ts` L6149 以降で連鎖的に利用、`gates_impl.ts` L181, L616, L832 などで特別扱い）
    - `TENMON_SUBCONCEPT_CANON_V1`（`chat.ts` L6617 以降）
    - `TENMON_CONCEPT_CANON_V1`（`chat.ts` L6731 以降）
    - `KATAKAMUNA_CANON_ROUTE_V1`, `KATAKAMUNA_DETAIL_FASTPATH_V1`（`chat.ts` L5359, L5465 など）
  - one-sound / 言霊軸:
    - `TENMON_KOTODAMA_HISYO_FRONT_V1`（`chat.ts` L1461 コメント / L1636, L1644）
    - `KOTODAMA_ONE_SOUND_GROUNDED_V4`（`chat.ts` L2830, L2857, L2873）
  - 継続・フォローアップ軸:
    - `CONTINUITY_ANCHOR_V1`（`chat.ts` L1947, L8235 以降）
    - `R22_ESSENCE_FOLLOWUP_V1`, `R22_COMPARE_FOLLOWUP_V1`, `R22_NEXTSTEP_FOLLOWUP_V1`（`chat.ts` L8118 以降）
  - self / feeling 軸:
    - `R22_SELFAWARE_ARK_V1`, `R22_SELFAWARE_TENMON_V1`, `R22_SELFAWARE_CONSCIOUSNESS_V1`（`chat.ts` L1013, L8348）
    - `FEELING_SELF_STATE_V1`, `IMPRESSION_ARK_V1`, `IMPRESSION_TENMON_V1`（`chat.ts` L7970 付近および VP レポート `CONVERSATION_QUALITY_VPS_ANALYSIS_V1.md` L18, L116）
  - LLM トップ軸:
    - `NATURAL_GENERAL_LLM_TOP`, `DEF_LLM_TOP`, `N1_GREETING_LLM_TOP`（`chat.ts` L5178, L7698 以降）
- **routeReason は DB にもフルミラーされている**
  - `synapse_log`（`.schema` より `routeReason TEXT NOT NULL`。`chat.ts` L4412 で insert）
  - `scripture_learning_ledger`（`.schema` より `routeReason TEXT NOT NULL`。`gates_impl.ts` / scripture 周辺から書き込み）
  - `kanagi_growth_ledger`（`.schema` より `route_reason TEXT`。`buildKanagiGrowthLedgerEntryFromKu` → `insertKanagiGrowthLedgerEntry` 経由で利用）

→ **主系 route は「canon / scripture / concept / one-sound / continuity / feeling / LLM-top」の7クラスタで事実上形成されている。**

### 2. 知識層（canon / concept / scripture / thoughtGuide / persona）

- `canon` ディレクトリには以下の v1 系が実在（`/opt/tenmon-ark-repo/canon`）:
  - `tenmon_concept_canon_v1.json`
  - `tenmon_subconcept_canon_v1.json`
  - `tenmon_scripture_canon_v1.json`
  - `tenmon_notion_canon_v1.json`
  - `tenmon_thought_guide_v1.json`
  - `tenmon_persona_constitution_v1.json`
  - `tenmon_intent_kernel_v1.json`
  - `tenmon_intention_constitution_v1.json`
  - `tenmon_self_constitution_v1.json`
  - `katakamuna_sourcepack_manifest_v1.json`, `katakamuna_runtime_schema_v2.json`, `katakamuna_lineage.json`
- `chat.ts` では:
  - 概念 canon: `TENMON_CONCEPT_CANON_V1` ブロック（L6726 付近のコメント）で `tenmon_concept_canon_v1.json` へのアクセス経路が張られている。
  - scripture canon: `TENMON_SCRIPTURE_CANON_V1` ブロック群（L6149 以降、複数の centerKey / sourceRouteReason 書き込み）で `tenmon_scripture_canon_v1.json` と `tenmon_thought_guide_v1.json` / `tenmon_notion_canon_v1.json` を接続。
  - person / intention: `TENMON_CONSTITUTION_TEXT` と `TENMON_PERSONA` を system prompt に組み込む箇所（`chat.ts` L176, L5221, L11596）。

→ **canon 層は scripture / subconcept / concept / persona / thoughtGuide / notion がすべて v1 として存在し、「TENMON_*_CANON_V1」route 群から明示的に参照されている。**

### 3. メモリ・心・kanagi 系

- **threadCore / threadCenter**
  - `thread_center_memory` テーブルが実在（`.schema` より `thread_id, center_type, center_key, center_reason, source_route_reason, ...`）。
  - `threadCoreStore.ts`:
    - `loadThreadCore`（L58–86）で `thread_center_memory` の最新1件を読み、`ThreadCore`（centerKey, centerLabel, lastResponseContract など）を構成。
    - `saveThreadCore`（L92–153）で `center_key` / `center_reason` / `source_route_reason` を upsert。
  - `chat.ts`:
    - `loadThreadCore` 呼び出しと `__threadCore` の初期化（L906–910）。
    - `saveThreadCore` を各 preempt route（support, explicit, essence/compare followup, abstract frame など）から呼んでいる（例: `R22_ESSENCE_FOLLOWUP_V1` L8125–8126, `CONTINUITY_ANCHOR_V1` L8246–8247）。
- **heart / intention / kanagi**
  - `synapse_log` テーブルに `heartJson`・`metaJson` があり、`chat.ts` L4412 以降で insert。
  - `kanagi_growth_ledger` テーブルに `route_reason`, `self_phase`, `intent_phase`, `heart_*`, `stability_score`, `drift_risk` 等のカラムがあり、`buildKanagiGrowthLedgerEntryFromKu` / `insertKanagiGrowthLedgerEntry` で書き込み（`chat.ts` インポート L91）。
  - `conversation_log`, `session_memory`, `training_*` 等のテーブルも `.tables` に存在し、学習／再学習の土台として残っているが、本監査ではルート上の利用部位のみを対象とする。

→ **メモリは「thread_center_memory（中心）」と「synapse_log / scripture_learning_ledger / kanagi_growth_ledger（経路・成長）」の2層で保持されている。**

### 4. learning / ledger 系

- DB `.schema` より:
  - `scripture_learning_ledger`:
    - `routeReason`, `scriptureKey`, `subconceptKey`, `conceptKey`, `thoughtGuideKey`, `personaConstitutionKey` を保持。
    - これは scripture canon 経由での「学び/理解」のログライン。
  - `synapse_log`:
    - すべての route 経路で書かれる「シナプス」ログ。`chat.ts` L4412 以降で insert、`routeReason` と `lawTraceJson`, `heartJson` を保持。
  - `kanagi_growth_ledger`:
    - kanagi 用の「成長／ドリフト監視」ログ。`route_reason`, `self_phase`, `intent_phase`, `stability_score`, `drift_risk` 等を保持。

→ **learning/ledger は `scripture_learning_ledger`（聖典学習）・`synapse_log`（全般 route ログ）・`kanagi_growth_ledger`（成長軸）が主系。**

### 5. tools / scripts / reports / CARD_*

- `api/tools`:
  - `tenmon_full_internal_circuit_report_v1.py`（全 internal circuit report）
  - `tenmon_applylog_pulse_kanagi4.py`（applylog / kanagi 関連）
  - `khs_*` 系の law/term ingest・cleanse ツール群
  - `nas_pdf_pages_ingest_v1.py` など、ドキュメントインポート系
- `api/src/scripts`:
  - `card_DB_REALITY_CHECK_AND_SEED_V1.ts`（DB reality 観測専用カード）
- ルート配下のレポート/カード:
  - `FINAL_REPORT_V1/*`, `WORLD_CLASS_ANALYSIS_V2/*`（既存の総合レポート）
  - `CONVERSATION_QUALITY_VPS_ANALYSIS_V1.md`, `CARD_RESPONSE_FRAME_LIBRARY_V1.md`, `CARD_LONGFORM_1000_STRUCTURE_V1.md` など、設計・挙動のメタ仕様。

→ **tools と CARD 系は「DB / law / scripture ingest」「applylog / kanagi」「オフライン audit / report」で支えている。**

### 6. 粗い分類（主系 / 支系 / 残骸 / 未接続） — 詳細は 06/07 で確定

- **主系（本 audit 時点で実戦投入されている軸）**
  - `chat.ts` + `chat_parts/gates_impl.ts` を通る route 群:
    - `TENMON_SCRIPTURE_CANON_V1`, `TENMON_SUBCONCEPT_CANON_V1`, `TENMON_CONCEPT_CANON_V1`, `KATAKAMUNA_CANON_ROUTE_V1`
    - `TENMON_KOTODAMA_HISYO_FRONT_V1`, `KOTODAMA_ONE_SOUND_GROUNDED_V4`
    - `R22_*` followup 群, `CONTINUITY_ANCHOR_V1`
    - `FEELING_SELF_STATE_V1`, `IMPRESSION_ARK_V1`, `IMPRESSION_TENMON_V1`
    - `NATURAL_GENERAL_LLM_TOP`, `DEF_LLM_TOP`, greeting 系
  - DB:
    - `thread_center_memory`, `scripture_learning_ledger`, `synapse_log`, `kanagi_growth_ledger`
  - canon:
    - `tenmon_*_canon_v1.json` 群, `katakamuna_*`, `tenmon_persona_constitution_v1.json`, `tenmon_thought_guide_v1.json`
- **支系**
  - law ingest / cleanse / terms / applylog / training 系ツール群（`api/tools/khs_*`, `tenmon_applylog_pulse_kanagi4.py` など）。
  - `koshikiConsole.ts` とその周辺 UI 系 route。
- **残骸 / 未接続（候補）**
  - `khs_*` テーブル群のうち、現行 route から参照されていないもの（詳細は 04〜05 で明示）。
  - 過去バージョンの `.bak` canon ファイルや、一度も import されていない helpers。

※ ここでは憶測を避け、**「コード中から参照が確認できたものだけを主系/支系に分類」**し、それ以外は暫定「残骸/未接続候補」として後続の章で列挙する。

### 7. このレポート群で決めること

最終的に、`06_MAINLINE_CLASSIFICATION.md` / `07_NEXT_REFACTOR_ORDER.md` で次を明示する。

- **主系は何か**: どの route / canon / DB / tools が「TENMON-ARK 本体」として維持されるべきか。
- **支系は何か**: どの ingest / training / console / report 系が「補助線」として残すのか。
- **残骸は何か**: どのファイル・テーブル・route が現在の入口から到達せず、歴史的遺物になっているか。
- **未接続は何か**: 設計上存在するが、まだ入口や canon から接続されていない部品。
- **次に削るべきもの**: 「残骸/未接続」のうち、まず封印・削除候補に上げるべきもの。
- **次に主系へ戻すべきもの**: 例えば `KOTODAMA_ONE_SOUND_GROUNDED_*` のように、データはあるが入口競合で眠っている系。
- **次の実装カード 3 枚**:  
  - route 競合解消・入口統合
  - DB / ledger / canon の再配線
  - 観測ツール強化（full-circuit report / applylog / growth ledger の再活用）

以降の各ファイルでは、**行番号・ファイル名・テーブル schema** を根拠として、憶測なしでマッピングを行う。

