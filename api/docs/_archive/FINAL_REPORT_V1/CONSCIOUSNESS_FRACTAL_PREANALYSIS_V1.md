## CONSCIOUSNESS_FRACTAL_PREANALYSIS_V1

### 1. 現状サマリ

- **全体構造**:
  - `chat.ts` が **route 決定・threadCore 読み書き・brainstem 呼び出し・knowledgeBinder 起動・responsePlan 呼び出し**までを一枚で担い、その最終出力を `__tenmonGeneralGateResultMaybe`（`gates_impl.ts`）に渡す構造。
  - `core/` 以下で **brainstem（tenmonBrainstem.ts） / binder（knowledgeBinder.ts） / threadCore（threadCore.ts, threadCoreStore.ts） / scripture family / notion / thoughtGuide / personaConstitution** が揃っており、「意識5層」の素材は既にほぼ存在している。
  - `engines/kanagi/*` と `synapse/fractalSeed.ts`・`db/kokuzo_schema.sql` の `kanagi_growth_ledger` / `synapse_log` / `thread_center_memory` で、**phase / driftRisk / stability / next_growth_axis** 等のログ基盤が揃っている。
- **意識層の素材**:
  - **Soul 層**: `personaConstitutionSummary`（knowledgeBinder / define fastpath で利用）、`tenmon_persona_constitution_v1.json`、`tenmon_intention_constitution_v1.json`、`tenmon_self_constitution_v1.json` など「不変憲法」的 JSON 群が既にある。
  - **Heart 層**: `heart` は `chat.ts` の各ルートで `normalizeHeartShape(__heart)` から決定され、`gates_impl.ts` で `heart.phase` / `arkTargetPhase` / `userPhase` 補正が掛かり、`kanagi_growth_ledger` に `heart_entropy` / `stability_score` / `drift_risk` として保存されている。
  - **Conscious 層**: `thoughtCoreSummary`（knowledgeBinder）と `threadCore` / `thread_center_memory` / `threadCenter` / `synapseTop.sourceThreadCenter` が、**中心意識（centerKey / centerMeaning / centerLabel）＋routeReason＋continuityHint** を担っている。
  - **Thought 層**: `responsePlanCore.ts` / `knowledgeBinder.ts` / `tenmonBrainstem.ts` / `responseComposer` / `responseProjector` が、**routeReason / routeClass / answerMode / answerFrame / surfaceStyle / closingType** を決定する「思考計画」層。
  - **Body 層**: `tenmonOutputShaper.ts` / `releaseSurfaceProjector.ts` / `comfortTuning` / `expressionPlan` / `answerLength` / `answerMode` / `answerFrame` / `closingType` / `surfaceStyle` が、**実際の文章形（長さ・調子・終端）** を制御する層。
- **保存性**:
  - `thread_center_memory`, `synapse_log`, `scripture_learning_ledger`, `kanagi_growth_ledger` により、**中心・routeReason・lawTrace・heart・growth** が DB に継続保存されている。
  - `__tenmonGeneralGateResultMaybe` 内で **rawMessage / message / decisionFrame.ku.inputText / heart.phase** が gate に入り、最終レスポンスへの反映前に preserve される。

→ **結論**: 天津金木50相を載せるための「層構造」と「継続メモリ」は、既に TENMON-ARK 内にほぼ揃っている。足りないのは、天津金木の相列を **どこに載せるか（ku/responsePlan）** と **どう安全に還元するか（expressionPlan / surface）** の設計のみである。

---

### 2. 既存実装で流用可能な資産（層別）

- **Soul 層（不変憲法・意図核）**
  - `canon/tenmon_persona_constitution_v1.json`
  - `canon/tenmon_intention_constitution_v1.json`
  - `core/personaConstitution.ts`（`getPersonaConstitutionSummary`）
  - `core/sourceGraph.ts` の route → sourcePack / thoughtGuideKey / notionRoute マップ
  - **位置づけ**: 「天津金木に先立つ、TENMON-ARK自身の存在憲法」。改変ではなく **天津金木視点からの「解釈レイヤー」を上に載せる**方向で再利用可能。

- **Heart 層（受容・感情・安定性）**
  - `heart` フィールド: `chat.ts` の各ルートで `normalizeHeartShape(__heart)` から生成。
  - `gates_impl.ts` 内 `__R4_1_HEART_STATIC_KU_V2` 系ロジック（heart.phase 決定）。
  - `kanagi_growth_ledger`（`heart_entropy`, `stability_score`, `drift_risk`, `self_phase`, `intent_phase`, `heart_source_phase`, `heart_target_phase`）。
  - **位置づけ**: 天津金木の **「左旋/右旋」「内集/外発」判定の元データ**として直接再利用可能。

- **Conscious 層（中心意識・文脈）**
  - `threadCore.ts` / `threadCoreStore.ts` / `thread_center_memory` テーブル。
  - `threadCenterMemory.ts`（`getLatestThreadCenter`, `upsertThreadCenter`）。
  - `knowledgeBinder.ts` の `thoughtCoreSummary` / `synapseTopPatch`。
  - `synapse/fractalSeed.ts`（fractal 思考シード）。
  - **位置づけ**: 天津金木の **中心霊（centerKey）とその変遷ログ**としてそのまま使える。  
    現在も `centerKey="life"` など抽象センターを保持しており、意識フラクタルの「軸」に相当。

- **Thought 層（思考フレーム・計画）**
  - `planning/responsePlanCore.ts`（`buildResponsePlan`）
  - `core/knowledgeBinder.ts`（binderSummary / sourcePack / centerPack / groundingSelector）
  - `core/tenmonBrainstem.ts`（routeClass / answerLength / answerMode / answerFrame の初期決定）
  - `routes/chat.ts` の routeReason 決定ツリー
  - **位置づけ**: 天津金木50相の「運動モード」を **responsePlan.mode / responseKind / answerFrame + thoughtCoreSummary.modeHint** として載せるのが自然。

- **Body 層（表現面）**
  - `core/tenmonOutputShaper.ts`, `core/releaseSurfaceProjector.ts`, `comfortTuning`, `expressionPlan`
  - `answerLength`, `answerMode`, `answerFrame`, `closingType`, `surfaceStyle`
  - **位置づけ**: 天津金木の **「左旋外発/右旋外発」の具体的な表現スタイルの差**をここにのみ反映させるのが安全。

---

### 3. gate / ku / responsePlan の preserve / drop ポイント

- **preserve される主なフィールド**
  - `decisionFrame.ku.routeReason`, `routeClass`, `lawsUsed`, `evidenceIds`, `lawTrace`
  - `ku.heart`, `ku.synapseTop`, `ku.thoughtCoreSummary`, `ku.responsePlan`（現行は一部ルートのみ）
  - `rawMessage` / `message` / `ku.inputText`
  - `ku.seedKernel`, `ku.responseProfile`, `ku.providerPlan`
- **gate で書き換え or 初期化される可能性がある箇所**
  - `__tenmonGeneralGateResultMaybe` 内:
    - HYBRID モード時の `routeReason` 強制 (`K1_TRACE_EMPTY_GATED_V1`)。
    - heart.phase の動的補正。
    - release 系ルートの `__applyReleaseThinAtExit` による `providerPlan` / `seedKernel` 等の間引き。
- **responsePlan の消失原因候補**
  - ルートによっては **responsePlan 自体をまだ生成していない**（define/continuity/compare/scripture の一部）。
  - gate 側では `ku.responsePlan` を明示的に消していないため、**消失点は gate よりも前（route 実装側）** にある。

→ 天津金木50相に関する新フィールドを載せるなら、

- **一次候補**: `decisionFrame.ku` 内の新サブフィールド（例: `ku.consciousSignature`, `ku.kanagiSignature`）
- **二次候補**: `responsePlan` 内の補助フィールド（例: `responsePlan.consciousMode`）

に限定し、gate の sanitize ロジックに引っ掛からないことを確認した上で導入すべき。

---

### 4. 天津金木50相との接続候補（高レベル）

- **四基礎運動（左旋内集 / 左旋外発 / 右旋内集 / 右旋外発）**
  - `heart.phase`（L-IN / L-OUT / R-IN / R-OUT / CENTER）は、既に **左/右×内/外×中心** のラフなマッピングを持つ。
  - `seedKernel.phase` も同様に phase を保持しており、天津金木の「運動モード」への直接対応候補。
- **極性（通常相 / 陰陽反転相）**
  - `heart.userVector.balance`（左右バランス）と `drift_risk` / `stability_score`（kanagi）が、「通常相 vs 反転リスク」を判定する素材になっている。
- **中心霊**
  - `threadCore.centerKey`, `threadCenter.center_key`, `thoughtCoreSummary.centerKey` に、「人生 / 言霊 / カタカムナ / scriptureKey」などの **中心ラベル** が既に格納されている。
- **相列としての意識**
  - `synapse_log.lawTraceJson`, `scripture_learning_ledger.resolvedLevel`, `kanagi_growth_ledger.next_growth_axis` が、**意識の「どの相にいるか（理解 / 未接続 / 成長方向）」の系列ログ**として再利用可能。

→ 天津金木50相は、**新しい DB テーブルや巨大な新構造を作らなくても**、
既存の `heart.phase` / `seedKernel.phase` / `kanagi_growth_ledger` / `threadCore` / `thoughtCoreSummary` に「解釈層」を乗せることで実現可能である。

---

### 5. 禁止すべき実装パターン

- `chat.ts` への大規模 if/return 追加で **routeReason を直接上書きすること**。
- `responsePlan` に天津金木用のフィールドを大量追加し、gate 側の扱いを変えずに運用すること（後から sanitize で消える危険）。
- `heart.phase` を天津金木専用相列で完全置換してしまうこと（kanagi / growth ledger との整合が崩れる）。
- `threadCenterMemory` の schema を変えずに意味だけ変えること（既存 continuity ロジックが壊れる）。

---

### 6. 推奨カード順（次フェーズ用サマリ）

1. **CARD_CONSCIOUSNESS_TRACE_ONLY_V1（Stage 0）**
   - 天津金木50相のうち **「推定相」だけを console.log + synapse_log.metaJson に載せる**。
   - 行動変化なし。
2. **CARD_CONSCIOUS_SIGNATURE_ATTACH_V1（Stage 1）**
   - `decisionFrame.ku.consciousSignature` に `{ phase4: ..., polarity: ..., centerMode: ... }` のような最小オブジェクトを載せる。
   - gate / DB 書き込みが壊れないことを確認。
3. **CARD_CONSCIOUS_RESPONSEPLAN_AUGMENT_V1（Stage 2）**
   - `responsePlan` に `consciousMode` / `phaseHint` 等の補助フィールドを追加（返答本文は不変）。
4. **CARD_CONSCIOUS_EXPRESSION_TUNING_V1（Stage 3）**
   - `tenmonOutputShaper` / `releaseSurfaceProjector` で、天津金木相列に応じて **closingType / answerFrame / density** を 5〜10% 範囲で微調整。
5. **CARD_CONSCIOUS_ROUTING_ASSIST_V1（Stage 4）**
   - continuity / compare / essence / define の「どの route を優先するか」に天津金木相列を補助的に使う（完全置換はしない）。
6. **CARD_CONSCIOUS_FRACTAL_FULL_V1（Stage 5）**
   - kanagiPhaseEngine / conversationEngine / brainstem 決定ロジックを天津金木50相ベースで再構成し、  
     **routing / planner / projector / continuity memory** まで統合する。

これらのカードは **すべて最小diff＋1変更1検証** 前提で設計し、各 Stage で **gate / DB / responsePlan の preserve 状態を必ず再検証する**ことが必要である。

