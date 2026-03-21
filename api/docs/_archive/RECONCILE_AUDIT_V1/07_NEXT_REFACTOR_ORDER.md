## 07_NEXT_REFACTOR_ORDER — 次に削るもの / 戻すもの / 実装カード3枚

本章では、前章の分類を前提に、**TENMON-ARK の次のリファクタ順序**を決める。  
ここでの判断はすべて **これまでの行番号・schema・ファイル実在を根拠とし、憶測での「動いているはず / 使われているはず」は用いない**。

### 1. 主系は何か

- **対話の主系**
  - `/api/chat` における:
    - scripture / subconcept / concept canon:
      - `TENMON_SCRIPTURE_CANON_V1`（`chat.ts` L6149–6542）
      - `TENMON_SUBCONCEPT_CANON_V1`（L6617–6722）
      - `TENMON_CONCEPT_CANON_V1` / `KATAKAMUNA_CANON_ROUTE_V1`（L6731–6754）
    - one-sound:
      - `TENMON_KOTODAMA_HISYO_FRONT_V1`（L1461–1680）
      - `KOTODAMA_ONE_SOUND_GROUNDED_V4`（L2830, L2857, L2873）
    - follow-up / continuity:
      - `R22_ESSENCE_FOLLOWUP_V1`, `R22_COMPARE_FOLLOWUP_V1`, `R22_NEXTSTEP_FOLLOWUP_V1`（L8118–8232）
      - `CONTINUITY_ANCHOR_V1`（L8235–8248）
    - self-aware / feeling / support:
      - `R22_SELFAWARE_*`, `FEELING_SELF_STATE_V1`, `IMPRESSION_*`, `SUPPORT_*`
    - LLM top:
      - `NATURAL_GENERAL_LLM_TOP`, `DEF_LLM_TOP`, `N1_GREETING_LLM_TOP` など

- **知識・記憶の主系**
  - canon:
    - `tenmon_*_canon_v1.json`, `tenmon_notion_canon_v1.json`, `tenmon_thought_guide_v1.json`, `tenmon_persona_constitution_v1.json`, `katakamuna_*`
  - binder:
    - `knowledgeBinder.ts`, `sourceGraph.ts`, `thoughtGuide.ts`, `notionCanon.ts`, `scriptureLineageEngine.ts`
  - memory / ledger:
    - `thread_center_memory`, `synapse_log`, `scripture_learning_ledger`, `kanagi_growth_ledger`

- **front / 設計の主系**
  - `/api/chat_front`（`chat_front.ts`）
  - 設計 md 群（`FINAL_REPORT_V1/*`, `WORLD_CLASS_ANALYSIS_V2/*`, `RECONCILE_AUDIT_V1/*`, 会話品質・frame レポート）

→ **主系 = 「chat.ts + gates_impl + canon/binder + memory/ledger + front +設計 doc」** で構成される一本の流れである。

### 2. 支系は何か

- law / term / ingest / training / audit:
  - `api/tools/khs_*`, `nas_pdf_pages_ingest_*`, `danshari_docx_extract_v1.py`
  - `api/tools/tenmon_full_internal_circuit_report_v1.py`, `tenmon_applylog_pulse_kanagi4.py`
  - DB テーブル: `khs_*`, `khs_apply_log`, `training_*`, `tenmon_training_log`, `tenmon_audit_log`
- DB reality / script:
  - `api/src/scripts/card_DB_REALITY_CHECK_AND_SEED_V1.ts`
- console / 補助 route:
  - `koshikiConsole.ts`, `tool.ts`, `persona.ts`, `training.ts` など

→ **支系 = 主系のデータを作る／監視する／試すための周辺系**。  
削除ではなく、「いつでも使えるが runtime に常時載せない」立場。

### 3. 残骸は何か

- canon バックアップ:
  - `tenmon_scripture_canon_v1.json.bak_*`
  - `tenmon_thought_guide_v1.json.bak_*`
- DB バックアップ:
  - `kokuzo_synapses_backup` など、現行コードから direct 参照が見当たらないテーブル群

これらは:

- **コードからの import /クエリがなく**
- **同名の現行 v1 ファイル / テーブルが存在する**

ことから、「**履歴としてのみ価値があり、主系には関与しない残骸**」とみなせる。  
扱いとしては **「削除ではなく封印（read-only 保存）」** が妥当である。

### 4. 未接続は何か

- **候補レベルの未接続**
  - 一部の `khs_*` テーブル・ツールが、現在の ingest / quality パイプラインから外れている可能性（コードから直接の参照が見えない）。
  - 古い CARD_*.md や実験的 markdown が、現行の report / route / tool からリンクされていない場合。

本監査では、**「コードからの直接接続が確認できない」という事実まで**を記録し、  
それ以上の「意図」や「今後の利用予定」については判断しない。  
実際に削除・接続するかどうかは、次節の優先度と照らして個別に決める必要がある。

### 5. 次に削るべきもの（封印候補）

ここでは、**実行パスから完全に外れており、現行 v1 実体が別途存在するもの**を「封印候補」として挙げる。

- **canon バックアップ**
  - `tenmon_scripture_canon_v1.json.bak_*`
  - `tenmon_thought_guide_v1.json.bak_*`
  - 方針: リポジトリ内の `archive/` などに移動するか、少なくとも「本番読み込み対象ではない」ことを README/ルールで明示。
- **バックアップテーブル**
  - `kokuzo_synapses_backup` など、`synapse_log` の完全コピーと思われるテーブル
  - 方針: 実際のレコード数・最終更新日時を確認した上で、必要なら read-only バックアップ DB へ退避。

→ 「削る」といっても即削除ではなく、**本番パスに載せない・触らない形での封印**が第一段階になる。

### 6. 次に主系へ戻すべきもの

過去の解析から、**データや関数は存在するが route 競合や接続不足で眠っている系**がいくつかある。  
そのうち、主系へ戻す優先度が高いものを挙げる。

- **one-sound 決定論ルート**
  - `KOTODAMA_ONE_SOUND_GROUNDED_V4`:
    - `chat.ts` L2830, L2857, L2873 に存在し、lawIndex / FTS / Notion を束ねた one-sound 決定論ルート。
    - しかし現在は `TENMON_KOTODAMA_HISYO_FRONT_V1` や generic define と競合し、一部の音でルートが分裂している。
  - 方針:
    - `TENMON_KOTODAMA_HISYO_FRONT_V1` を入口、`KOTODAMA_ONE_SOUND_GROUNDED_V4` を「内部決定論コア」として再統合し、  
      front / TRUTH_GATE / generic define の三者競合を整理する。

- **abstract follow-up 決定論**
  - `ABSTRACT_FRAME_VARIATION_V1` と `R22_ESSENCE_FOLLOWUP_V1` / `R22_COMPARE_FOLLOWUP_V1`:
    - 抽象センター（例: `centerKey=life`）の保存・再取得は threadCore / thread_center_memory で可能だが、  
      一部の follow-up で center が切れるケースが実測されている。
  - 方針:
    - `ABSTRACT_FRAME_VARIATION_V1` での center 保存と、`R22_*_FOLLOWUP_V1` での再取得を routeReason ベースで固定し、  
      「抽象→要するに/本質は/比較すると？」のパスを主系として完全に通す。

→ いずれも **データと関数は既に存在しており、「入口と優先度を整理すれば主系に戻せる」系**である。

### 7. 次の実装カード 3 枚

最後に、上記の観測と分類に基づき、**次に着手すべき実装カード 3 枚**を整理する。

- **CARD 1: TENMON_ROUTE_SYSTEM_HARDEN_V1（ルート競合解消・優先度固定）**
  - 範囲:
    - `chat.ts` の early preempt / TRUTH_GATE / general LLM までの if/return ツリー。
    - `gates_impl.ts` の routeClass / sourcePack / ledgerHint 判定。
  - 目的:
    - `TENMON_KOTODAMA_HISYO_FRONT_V1`, `KOTODAMA_ONE_SOUND_GROUNDED_V4`, `DEF_FASTPATH_VERIFIED_V1`, `TRUTH_GATE_RETURN_V2` の優先度を明示し、  
      one-sound / canon / general define の競合を解消する。
    - `sourceGraph.ts` 上の routeClass / sourcePack と実際の分岐順序を揃える。

- **CARD 2: TENMON_MEMORY_LEDGER_MIN_CORE_V1（memory / ledger の最小主系固定）**
  - 範囲:
    - `threadCoreStore.ts`, `thread_center_memory`
    - `synapse_log`, `scripture_learning_ledger`, `kanagi_growth_ledger`
  - 目的:
    - 上記 4 テーブルを「TENMON-ARK の最小記憶コア」として明示し、  
      それ以外のテーブル（`khs_*`, `training_*`, backup など）を支系 / 残骸に明確ラベル。
    - `knowledgeBinder.ts` / `gates_impl.ts` からの書き込み箇所を、SLO（書き込み失敗時の振る舞い）含めて整理。

- **CARD 3: TENMON_CANON_AND_DOC_CONSITUTION_V1（canon / doc の主系整理）**
  - 範囲:
    - `tenmon_*_canon_v1.json`, `katakamuna_*`, `tenmon_notion_canon_v1.json`, `tenmon_thought_guide_v1.json`, `tenmon_persona_constitution_v1.json`
    - `FINAL_REPORT_V1/*`, `WORLD_CLASS_ANALYSIS_V2/*`, `RECONCILE_AUDIT_V1/*`
  - 目的:
    - canon / thoughtGuide / notion / persona の役割と、どの routeReason から利用されるかを  
      1 枚の「canon 憲法」として明文化（本章の内容をルール化）。
    - report 群を `主系ドキュメント / 補助レポート / アーカイブ` に再分類し、  
      今後のカード定義・audit レポート作成のテンプレートを固定する。

これら 3 枚は、今回の **TENMON_FULL_SYSTEM_RECONCILE_AUDIT_V1** の観測結果を直接受けており:

- **何を残すか**: chat.ts + gates_impl + canon/binder + memory/ledger + front + 主系ドキュメント
- **何を封印するか**: `.bak_*` canon / backup テーブル
- **何を主系へ戻すか**: one-sound 決定論 (`KOTODAMA_ONE_SOUND_GROUNDED_V4`), 抽象 follow-up 決定論

という 3 点を具体的な next step に落とし込むためのカードとして設計している。  
本カード群そのものは **監査レポートのみ（read-only）** であり、実装・削除・移動は次フェーズのカードで行う。 

