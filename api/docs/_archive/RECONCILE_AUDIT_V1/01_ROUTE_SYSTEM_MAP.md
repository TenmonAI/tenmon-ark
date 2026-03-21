## 01_ROUTE_SYSTEM_MAP — route / routeReason 全体図

本節では、実装上確認できる **route / routeReason** と入口ファイルの対応を整理する。  
（行番号は `api/src/routes` 配下のファイルに対するもの。）

### 1. 入口レイヤー

- **`chat.ts`** — `/api/chat` の中核
  - support / self-aware / feeling / judgement / one-sound / scripture / concept / abstract / general LLM までを一枚でハンドリング。
  - 代表的な早期分岐:
    - support 系: L861–897（`SUPPORT_UI_INPUT_V1`, `SUPPORT_AUTH_ACCESS_V1`, `SUPPORT_PRODUCT_USAGE_V1`）
    - self-aware 系: L1008–1030（`R22_SELFAWARE_ARK_V1`, `R22_SELFAWARE_TENMON_V1`, `R22_SELFAWARE_CONSCIOUSNESS_V1`）
    - feeling / impression 系: L7970 付近（`FEELING_SELF_STATE_V1`, `IMPRESSION_ARK_V1`, `IMPRESSION_TENMON_V1`）
    - scripture / concept canon 系: L6149–6542（`TENMON_SCRIPTURE_CANON_V1`）、L6617–6722（`TENMON_SUBCONCEPT_CANON_V1`）、L6731–6754（`TENMON_CONCEPT_CANON_V1` / `KATAKAMUNA_CANON_ROUTE_V1`）
    - one-sound front: L1461–1680（`TENMON_KOTODAMA_HISYO_FRONT_V1`）
    - TRUTH_GATE / KHSL: L2070 付近（`TRUTH_GATE_RETURN_V2` ほか law 系）
    - 抽象フレーム: L7360–7479, L7645–7678（`ABSTRACT_FRAME_VARIATION_V1`）
    - follow-up / continuity: L8118–8233（`R22_ESSENCE_FOLLOWUP_V1`, `R22_COMPARE_FOLLOWUP_V1`, `R22_NEXTSTEP_FOLLOWUP_V1`, `CONTINUITY_ANCHOR_V1`）
    - LLM general: L7698–7617, L7681–7697（`NATURAL_GENERAL_LLM_TOP`, `DEF_LLM_TOP`, `N1_GREETING_LLM_TOP` 等）

- **`chat_parts/gates_impl.ts`** — gate / release / logging / persistence
  - TRUTH_GATE, RELEASE_PREEMPT, session メモリ永続化、`synapse_log` 書き込みなどを担当。
  - 代表的な routeReason 参照:
    - `TENMON_SCRIPTURE_CANON_V1` 特扱い: L181–182, L616, L832–841, L899–909, L929, L1416 など。
    - session メモリ永続化: L974–1000（`__TENMON_PERSIST_DONE` ガード付き）。

- **`chat_front.ts`** — `/api/chat_front`（フロント専用）
  - L9–28: `sacredClassifier` / `sacredContextBuilder` を利用し、sacred / front 文脈を生成。
  - L29–58: `ku.routeReason` に `sacredContext.routeReason` または `FRONT_CHAT_GPT_ROUTE_V1` を設定し、`thoughtCoreSummary` 相当の情報を付与。
  - L60–71: `upsertThreadCenter` で front 系の中心を `thread_center_memory` に保存。

- **その他 route**
  - `memory.ts`, `tenmon.ts`, `kokuzo.ts`, `law.ts`, `reader.ts`, `writer*.ts`, `train.ts`, `persona.ts`, `approval.ts`, `kanagi.ts`, `training.ts` など:
    - いずれも API endpoint を提供するが、TENMON-ARK の対話 `routeReason` 決定はほぼ `chat.ts` と `gates_impl.ts` に集中している。

### 2. routeReason 一覧（静的定義ベース）

以下は `chat.ts` / `gates_impl.ts` / `sourceGraph.ts` で実際に確認できる routeReason の代表例である（完全列挙は `grep "routeReason"` 参照）。

- **support 系**
  - `SUPPORT_UI_INPUT_V1`（`chat.ts` L871–877, L976–997）
  - `SUPPORT_AUTH_ACCESS_V1`
  - `SUPPORT_PRODUCT_USAGE_V1`

- **self-aware / 自己定義系**
  - `R22_SELFAWARE_ARK_V1`（`chat.ts` L1013, L8348）
  - `R22_SELFAWARE_TENMON_V1`
  - `R22_SELFAWARE_CONSCIOUSNESS_V1`

- **feeling / impression 系**
  - `FEELING_SELF_STATE_V1`, `IMPRESSION_ARK_V1`, `IMPRESSION_TENMON_V1`
    - `CONVERSATION_QUALITY_VPS_ANALYSIS_V1.md` L18, L116 にも仕様記述。

- **one-sound / 言霊系**
  - `TENMON_KOTODAMA_HISYO_FRONT_V1`（front 入口・scripture FTS 接続）
  - `KOTODAMA_ONE_SOUND_GROUNDED_V4`（以前の one-sound 直帰ルート）

- **scripture / concept canon 系**
  - `TENMON_SCRIPTURE_CANON_V1`（最も多く出現する canon route）
  - `TENMON_SUBCONCEPT_CANON_V1`
  - `TENMON_CONCEPT_CANON_V1`
  - `KATAKAMUNA_CANON_ROUTE_V1`
  - `KATAKAMUNA_DETAIL_FASTPATH_V1`

- **follow-up / continuity 系**
  - `R22_ESSENCE_FOLLOWUP_V1`
  - `R22_COMPARE_FOLLOWUP_V1`
  - `R22_NEXTSTEP_FOLLOWUP_V1`
  - `CONTINUITY_ANCHOR_V1`

- **general knowledge / placeholder 系**
  - `DEF_FASTPATH_VERIFIED_V1`
  - `DEF_PROPOSED_FALLBACK_V1`
  - `R11_GENERAL_KNOWLEDGE_ROUTE_PLACEHOLDER_V1`
  - `R11_GENERAL_RELATION_ROUTE_PLACEHOLDER_V1`
  - `R17_GENERAL_FACTUAL_SHADOW_ROUTE_V1`

- **TRUTH_GATE / law 系**
  - `TRUTH_GATE_RETURN_V2`
  - `KHS_DEF_VERIFIED_HIT`

- **LLM top / fallback 系**
  - `NATURAL_GENERAL_LLM_TOP`
  - `DEF_LLM_TOP`
  - `N1_GREETING_LLM_TOP`
  - `N1_GREETING_TENMON_CANON_V1`
  - `NATURAL_FALLBACK`
  - `LLM1_NO_KEYS`, `LLM1_FORCE_TOP`

- **release / strict compare 系**
  - `RELEASE_PREEMPT_FREE_SAVECHECK_V1`
  - `RELEASE_PREEMPT_STRICT_COMPARE_BEFORE_TRUTH_V1`
  - `RELEASE_PREEMPT_HYBRID_DANSHARI_BEFORE_TRUTH_V1`
  - `DET_PASSPHRASE_TOP`

### 3. 入口分岐図（chat.ts / gates_impl / chat_front の関係）

#### 3.1 `/api/chat` のフロー（高レベル）

1. **前処理・観測**
   - threadId, message 正規化（`chat.ts` 冒頭）。
   - `__TENMON_THREAD_CORE` のロード（`loadThreadCore` → `threadCoreStore.ts`）。
   - brainstem 決定（`tenmonBrainstem`）と explicit / support などの early preempt。

2. **前段 preempt**
   - support 系（`SUPPORT_*`）
   - self-aware 系（`R22_SELFAWARE_*`）
   - feeling / impression 系
   - scripture local resolver / one-sound front (`TENMON_KOTODAMA_HISYO_FRONT_V1`)

3. **TRUTH_GATE / canon 層**
   - `TRUTH_GATE_RETURN_V2` 付近で law / scripture / concept ルートを決定。
   - `TENMON_SCRIPTURE_CANON_V1` / `TENMON_SUBCONCEPT_CANON_V1` / `TENMON_CONCEPT_CANON_V1` / `KATAKAMUNA_CANON_ROUTE_V1` へ展開。

4. **抽象 / follow-up / continuity 層**
   - 抽象フレーム (`ABSTRACT_FRAME_VARIATION_V1`)
   - essence / compare / next-step follow-up (`R22_*_FOLLOWUP_V1`) と `CONTINUITY_ANCHOR_V1`

5. **LLM general 層**
   - `NATURAL_GENERAL_LLM_TOP` / `DEF_LLM_TOP` / `NATURAL_FALLBACK`

6. **出口での gate 処理**
   - `chat_parts/gates_impl.ts` による:
     - `synapse_log` への書き込み（`routeReason` / `lawTraceJson` / `heartJson` / `metaJson`）
     - session_memory への保存
     - release/policy に応じたレスポンス整形

#### 3.2 `/api/chat_front` のフロー

- 入口: `chat_front.ts` L9–28
  - `sacredClassifier` → `sacredContextBuilder` → `frontConversationRenderer`。
- 生成される `ku`:

```29:55:/opt/tenmon-ark-repo/api/src/routes/chat_front.ts
  const ku: any = {
      routeReason: String(sacredContext.routeReason || "FRONT_CHAT_GPT_ROUTE_V1"),
      centerMeaning: String(sacredContext.centerKey || "front_conversation"),
      centerLabel: String(sacredContext.centerLabel || "前面会話"),
      centerKey: String(sacredContext.centerKey || "front_conversation"),
      scriptureKey: sacredContext.scriptureKey || null,
      ...
      thoughtCoreSummary: {
        centerKey: String(sacredContext.centerKey || "front_conversation"),
        centerMeaning: String(sacredContext.centerKey || "front_conversation"),
        routeReason: String(sacredContext.routeReason || "FRONT_CHAT_GPT_ROUTE_V1"),
        modeHint: sacredContext.isSacred ? "sacred_front" : "front",
        continuityHint: threadId,
      },
      responsePlan: {
        routeReason: String(sacredContext.routeReason || "FRONT_CHAT_GPT_ROUTE_V1"),
        ...
      },
    };
```

- `upsertThreadCenter` により front 系 center が `thread_center_memory` に保存される（L60–71）。
- `/api/chat_front` は `chat.ts` のルート分岐とは独立だが、**threadCenter / threadCore を通じて continuity レイヤーと接続可能な設計**になっている。

### 4. gates_impl / knowledgeBinder / sourceGraph の役割

- **`gates_impl.ts`**
  - TRUTH_GATE や RELEASE_PREEMPT のロジックを持ち、`routeReason` と `ku` の内容を評価して:
    - scripture / concept / law / notion / thread_center を `sourceStack` としてまとめる（L172–245）。
    - release-likeな route の payload を薄くする（`__thinReleasePayloadV2`）。
    - session_memory / synapse_log / writer 系への書き込みを集約。

- **`knowledgeBinder.ts`**
  - コメント L2–3 にある通り、**scriptureCanon / conceptCanon / notionCanon / thoughtGuide / personaConstitution / threadCenter / threadCore / synapseTop を 1 回で束ねる**モジュール。
  - `buildKnowledgeBinder` は:
    - `centerKey` / `centerLabel` を `ku`, `threadCenter`, `threadCore` から推論。
    - `sourceGraph.resolveGroundingRule` により grounding の優先度を決定。
    - `getNotionCanonForRoute` / `getThoughtGuideSummary` / `getPersonaConstitutionSummary` / `getBookContinuation` を呼び出して, canon 群と continuity を束ねる。
    - `thoughtCoreSummaryPatch` と `synapseTopPatch` を返し、`ku.thoughtCoreSummary` / `ku.synapseTop` 等に適用される。

- **`sourceGraph.ts`**
  - コメント L2: **「routeReason ごとの sourcePack / routeClass / thoughtGuide / notionRoute を静的定義に寄せる」**。
  - 例:

```17:19:/opt/tenmon-ark-repo/api/src/core/sourceGraph.ts
  { routeReason: "DEF_FASTPATH_VERIFIED_V1", routeClass: "define", sourcePack: "seiten", defaultCenterKey: "kotodama", defaultCenterLabel: "言霊", thoughtGuideKey: "kotodama", notionRoute: "DEF_FASTPATH_VERIFIED_V1", binderMode: "define" },
  { routeReason: "DEF_FASTPATH_PROPOSED_V1", routeClass: "define", sourcePack: "seiten", defaultCenterKey: "kotodama", defaultCenterLabel: "言霊", thoughtGuideKey: "kotodama", notionRoute: "DEF_FASTPATH_PROPOSED_V1", binderMode: "define" },
  { routeReason: "R22_ESSENCE_FOLLOWUP_V1", routeClass: "continuity", sourcePack: "seiten", thoughtGuideKey: "kotodama", notionRoute: "R22_ESSENCE_FOLLOWUP_V1", binderMode: "continuity" },
  { routeReason: "TENMON_SCRIPTURE_CANON_V1", routeClass: "continuity", sourcePack: "scripture", thoughtGuideKey: "scripture", notionRoute: "TENMON_SCRIPTURE_CANON_V1", binderMode: "continuity" },
```

→ `sourceGraph` は **routeReason → sourcePack / thoughtGuideKey / notionRoute** の静的マップとして、主系 route の「立場」を決めている。

---

このファイルでは、route / routeReason と 3 つの入口 (`chat.ts`, `gates_impl.ts`, `chat_front.ts`) の関係を俯瞰した。  
次の `02_KNOWLEDGE_BINDING_MAP.md` では、canon / scripture / notion / thoughtGuide / personaConstitution と `knowledgeBinder` / `sourceGraph` の接続をより詳細に図示する。 

