## 02_KNOWLEDGE_BINDING_MAP — canon / scripture / notion / thoughtGuide の結線

本節では、**canon 群（concept / subconcept / scripture / notion / thoughtGuide / persona）と routeReason の結線**を、実装ベースで整理する。

### 1. canon ファイルの実体

`/opt/tenmon-ark-repo/canon` に存在する主なファイル:

- 概念系:
  - `tenmon_concept_canon_v1.json`
  - `tenmon_subconcept_canon_v1.json`
- 聖典系:
  - `tenmon_scripture_canon_v1.json`
  - `katakamuna_sourcepack_manifest_v1.json`
  - `katakamuna_runtime_schema_v2.json`
  - `katakamuna_lineage.json`
- notion / thought guide / persona:
  - `tenmon_notion_canon_v1.json`
  - `tenmon_thought_guide_v1.json`
  - `tenmon_persona_constitution_v1.json`
  - `tenmon_intent_kernel_v1.json`
  - `tenmon_intention_constitution_v1.json`
  - `tenmon_self_constitution_v1.json`

### 2. knowledgeBinder による束ね方

`api/src/core/knowledgeBinder.ts` より（L1–61）:

```1:15:/opt/tenmon-ark-repo/api/src/core/knowledgeBinder.ts
/**
 * CARD_KNOWLEDGE_BINDER_V1: define / continuity / explicit / future / essence / compare で
 * scriptureCanon / conceptCanon / notionCanon / thoughtGuide / personaConstitution / threadCenter / threadCore / synapseTop を1回で束ねる
 */
...
export type KnowledgeBinderInput = {
  routeReason: string;
  message: string;
  threadId: string;
  ku: Record<string, unknown>;
  threadCore: ThreadCore | null;
  threadCenter: { center_type?: string; center_key?: string | null } | null;
};
```

主な処理フロー:

1. `centerKey` / `centerLabel` の推論（L92–104）
2. `sourceGraph.resolveGroundingRule` による grounding モード決定（L106–108）
3. canon 群の読み出し:
   - `getNotionCanonForRoute(rr, message)`（L117）
   - `getThoughtGuideSummary("kotodama" | "scripture" | "katakamuna")`（L120–127）
   - `getPersonaConstitutionSummary()`（L129–132）
   - `getBookContinuation(threadId)`（L134–137）
   - `buildScriptureLineageSummary({ routeReason, centerKey, scriptureKey })`（L139–144）
4. `binderSummary` と `sourceStackSummary` の構築（L146–184）
5. `thoughtCoreSummaryPatch` / `synapseTopPatch` の生成（L186–215）

→ **knowledgeBinder は、routeReason / centerKey / threadCenter / threadCore をキーに canon 群を束ね、`ku` へ thoughtCoreSummary / synapseTop をパッチする中心ノード。**

### 3. sourceGraph による routeReason → canon マップ

`api/src/core/sourceGraph.ts` の一部（L11–19, L25 など）:

```11:19:/opt/tenmon-ark-repo/api/src/core/sourceGraph.ts
  thoughtGuideKey?: "kotodama" | "katakamuna" | "scripture" | null;
  ...
  { routeReason: "DEF_FASTPATH_VERIFIED_V1", routeClass: "define", sourcePack: "seiten", defaultCenterKey: "kotodama", defaultCenterLabel: "言霊", thoughtGuideKey: "kotodama", notionRoute: "DEF_FASTPATH_VERIFIED_V1", binderMode: "define" },
  { routeReason: "DEF_FASTPATH_PROPOSED_V1", routeClass: "define", sourcePack: "seiten", defaultCenterKey: "kotodama", defaultCenterLabel: "言霊", thoughtGuideKey: "kotodama", notionRoute: "DEF_FASTPATH_PROPOSED_V1", binderMode: "define" },
  { routeReason: "R22_ESSENCE_FOLLOWUP_V1", routeClass: "continuity", sourcePack: "seiten", thoughtGuideKey: "kotodama", notionRoute: "R22_ESSENCE_FOLLOWUP_V1", binderMode: "continuity" },
  { routeReason: "TENMON_SCRIPTURE_CANON_V1", routeClass: "continuity", sourcePack: "scripture", thoughtGuideKey: "scripture", notionRoute: "TENMON_SCRIPTURE_CANON_V1", binderMode: "continuity" },
```

- `sourcePack`: `"seiten" / "scripture" / "support" / "general"` など
- `thoughtGuideKey`: `"kotodama" / "katakamuna" / "scripture" / null`
- `notionRoute`: `tenmon_notion_canon_v1.json` 側から見たルートキー

→ ここから、**以下のような主な結線が静的に定義されている**:

- `DEF_FASTPATH_VERIFIED_V1` / `DEF_FASTPATH_PROPOSED_V1`
  - sourcePack: `seiten`
  - thoughtGuideKey: `"kotodama"` → `tenmon_thought_guide_v1.json` の kotodama セクション
  - notionRoute: 同名
- `R22_ESSENCE_FOLLOWUP_V1`
  - sourcePack: `seiten`
  - thoughtGuideKey: `"kotodama"`
  - notionRoute: `"R22_ESSENCE_FOLLOWUP_V1"`
- `TENMON_SCRIPTURE_CANON_V1`
  - sourcePack: `scripture`
  - thoughtGuideKey: `"scripture"`
  - notionRoute: `"TENMON_SCRIPTURE_CANON_V1"`

### 4. scripture / subconcept / concept canon の接続

`chat.ts` scripture ブロック群（例: L6149–6542）では、以下が確認できる:

- `TENMON_SCRIPTURE_CANON_V1`:
  - `routeReason` を `TENMON_SCRIPTURE_CANON_V1` に固定した `ku` を返す。
  - `upsertThreadCenter` を通して `thread_center_memory` に:
    - `centerType: "scripture"`
    - `centerKey: scriptureKey`（canon 上のキー）
    - `sourceRouteReason: "TENMON_SCRIPTURE_CANON_V1"`
  - `getNotionCanonForRoute("TENMON_SCRIPTURE_CANON_V1", message)` を利用。
  - `getThoughtGuideSummary("scripture")` / `buildScriptureLineageSummary` により、聖典系の thought guide / 系譜へ接続。

- `TENMON_SUBCONCEPT_CANON_V1`:
  - `tenmon_subconcept_canon_v1.json` を読むルートとして実装されている（L6617–6722）。

- `TENMON_CONCEPT_CANON_V1`:
  - `tenmon_concept_canon_v1.json` を読むルート（L6726–6754）。
  - `__conceptKey === "katakamuna"` の場合は `KATAKAMUNA_CANON_ROUTE_V1` へ分岐。

→ 結果として:

- **scripture canon → `TENMON_SCRIPTURE_CANON_V1`**
- **subconcept canon → `TENMON_SUBCONCEPT_CANON_V1`**
- **concept canon → `TENMON_CONCEPT_CANON_V1` or `KATAKAMUNA_CANON_ROUTE_V1`**

という 3 本の主系が、`knowledgeBinder` / `sourceGraph` を通じて `notionCanon` / `thoughtGuide` / `threadCenter` と一体化している。

### 5. notionCanon / thoughtGuide / personaConstitution の利用実態

- **notionCanon**
  - `knowledgeBinder.ts` L117–118 より、`getNotionCanonForRoute(rr, message)` で取得。
  - scripture / concept / follow-up などの routeReason に応じて `tenmon_notion_canon_v1.json` 内のページ群を束ねる。

- **thoughtGuide**
  - `getThoughtGuideSummary("kotodama" | "scripture" | "katakamuna")`（L120–127）:
    - 言霊 fastpath / follow-up (`DEF_FASTPATH_*`, `R22_ESSENCE_FOLLOWUP_V1`) → `"kotodama"`
    - scripture canon (`TENMON_SCRIPTURE_CANON_V1`) → `"scripture"`
    - カタカムナ中心 → `"katakamuna"`

- **personaConstitution**
  - `getPersonaConstitutionSummary()`（L129–132）:
    - `tenmon_persona_constitution_v1.json` から TENMON-ARK の「性格/姿勢」を要約。
    - `binderSummary.hasPersonaConstitution` が true になる route では、personality を含んだ応答制御が可能。

→ canon 層は **sourceGraph → knowledgeBinder → routeReason** というパイプラインで、  
scripture / subconcept / concept / notion / thoughtGuide / personaConstitution を一体として利用している。

### 6. この章での暫定分類

- **主系**
  - `TENMON_SCRIPTURE_CANON_V1` / `TENMON_SUBCONCEPT_CANON_V1` / `TENMON_CONCEPT_CANON_V1` / `KATAKAMUNA_CANON_ROUTE_V1`
  - `DEF_FASTPATH_VERIFIED_V1` / `DEF_FASTPATH_PROPOSED_V1`
  - `R22_ESSENCE_FOLLOWUP_V1`（`sourcePack: "seiten"` / thoughtGuide: `"kotodama"`）
  - `knowledgeBinder.ts`, `sourceGraph.ts`, `thoughtGuide.ts`, `notionCanon.ts`, `personaConstitution.ts`, `scriptureLineageEngine.ts`
  - `tenmon_*_canon_v1.json` / `tenmon_notion_canon_v1.json` / `tenmon_thought_guide_v1.json` / `tenmon_persona_constitution_v1.json`

- **支系**
  - `katakamuna_*` canon（scripture 系の一部として利用されるが、TENMON 全体から見れば特定領域）。

- **残骸 / 未接続候補**
  - `.bak` 付き canon ファイル（例: `tenmon_scripture_canon_v1.json.bak_*`, `tenmon_thought_guide_v1.json.bak_*`）:
    - 現行コードからの直接 import は確認できていないため、「過去版のバックアップ」とみなせる。

詳細な主系/支系/残骸/未接続の最終分類は `06_MAINLINE_CLASSIFICATION.md` で行う。  
本章では、**canon 群と routeReason / knowledgeBinder / sourceGraph の結線が「一本の主系」である**ことだけを事実として抑える。 

