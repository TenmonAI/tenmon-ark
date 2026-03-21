## CONSCIOUSNESS_ASSET_INVENTORY_V1

### 1. 目的

TENMON-ARK に既に実装済みの「意識・心・魂・体・思考」に関連する資産を棚卸しし、

- **ファイル**
- **関数名 / 構造名**
- **役割**
- **入力 / 出力**
- **副作用**
- **依存先 / 呼び出し元**
- **routeReason / routeClass / answerMode / answerFrame / responsePlan / threadCore との関係**
- **実装済み / 半実装 / 未接続**

を明示する。

---

### 2. routes 層

#### 2-1. `routes/chat.ts`

- **役割**:  
  全チャットリクエストのフロントコントローラ。route 判定・decisionFrame 構築・threadCore 読み書き・brainstem / binder / projector 呼び出し・最終 JSON 返却までを一枚で担う。
- **主な入力**:
  - HTTP `req.body`（message / threadId / provider / options 等）
  - DB からの `threadCore` / `threadCenter` / scripture / canon 解決結果
  - 各 engine / core からの結果
- **主な出力**:
  - `res.json({ message, routeReason, routeClass, decisionFrame: { ku, ... }, ... })`
  - `synapse_log`, `thread_center_memory`, `kanagi_growth_ledger` などへの副作用的書き込み（各 helper 経由）
- **副作用**:
  - `threadCoreStore.saveThreadCore` 呼び出し
  - `threadCenterMemory.upsertThreadCenter` 呼び出し
  - `writeSynapseLogV1` 呼び出し
  - scripture / canon / notion / subconcept の DB / JSON 読み
- **依存先**:
  - `core/threadCoreStore.ts`, `core/threadCenterMemory.ts`
  - `core/knowledgeBinder.ts`
  - `core/tenmonBrainstem.ts`
  - `core/tenmonOutputShaper.ts`, `core/releaseSurfaceProjector.ts`
  - `planning/responsePlanCore.ts`
  - `engines/persona/tenmonCoreEngine.ts`
  - `engines/kanagi/*`, `engines/conversation/*`
- **routeReason / routeClass 関連**:
  - ほぼ全ての `routeReason` はここで決定 or 上書きされる。
  - `routeClass` (`define` / `canon` / `general` / `continuity` / `compare` / `essence` / `support` / `selfaware` / `scripture` / `analysis` など) もここで貼り付けられる。
- **threadCore / responsePlan 関連**:
  - `ThreadCore` 読み込み → route → `ThreadCore` 更新 → 保存、という典型パターンを複数ルートに持つ。
  - 一部ルートで `buildResponsePlan(...)` を呼び出し、`__ku.responsePlan` をセット。
  - まだ responsePlan 未カバーの routeReason も多く、「意識フラクタルの思考層」は部分実装状態。
- **実装状態**:  
  - **実装済み（mainline）**: define / scripture / subconcept / one-sound / abstract / continuity / compare / essence / followup 系。
  - **半実装**: responsePlan カバレッジ・heartSurface 連携・kanagiPhase 連携。
  - **未接続**: 天津金木50相そのもの（名称としては未登場）。

---

### 3. core 層

#### 3-1. `core/threadCore.ts`

- **役割**:  
  1 スレッドにおける中心情報（centerKey, centerLabel, activeEntities, lastResponseContract 等）の型定義。
- **入力**: 各 route からの中心情報。
- **出力**: `ThreadCore` オブジェクト。
- **副作用**: なし（純粋型定義）。
- **関係**:
  - Soul/Conscious 層の境界に位置する「意識の中心ログ」。
  - `lastResponseContract` に answerLength / answerMode / answerFrame / routeReason が記録され、**意識相列の履歴**として利用可能。
- **実装状態**: 実装済み・メインライン。

#### 3-2. `core/threadCoreStore.ts`

- **役割**:  
  `thread_center_memory` テーブルとの IO（load/save）。
- **主な関数**:
  - `loadThreadCore(threadId: string)`
  - `saveThreadCore(core: ThreadCore)`
- **入力**:
  - threadId, ThreadCore。
- **出力**:
  - DB から復元された ThreadCore。
- **副作用**:
  - `thread_center_memory` の `INSERT OR UPDATE`。
  - centerKey / routeReason / center_type を COALESCE しつつ更新。
- **関係**:
  - Conscious 層の「中心霊」を DB に落とす役目。
  - 天津金木の相列を ThreadCore に載せる場合の **永続ログ層**。
- **実装状態**: 実装済み・mainline。  
  抽象センター継続 (`centerKey=life` 等) の修正で最近強化済み。

#### 3-3. `core/threadCenterMemory.ts`

- **役割**:  
  Thread の「中心ラベルのみ」を軽量に扱うためのヘルパ。
- **関数**:
  - `getLatestThreadCenter(threadId)`
  - `upsertThreadCenter(center)`
- **関係**:
  - Conscious 層のサマリ（`center_key`, `center_label`, `center_type`）。
  - followup intelligence / subconcept route の中心判定に利用。

#### 3-4. `core/knowledgeBinder.ts`

- **役割**:  
  ルート・canon・scripture・notion・threadCore・heart 等を束ね、`thoughtCoreSummary` / `synapseTopPatch` / `sourcePackSummary` を構成する **思考層の中核**。
- **入力**:
  - `routeReason`, `message`, `threadId`, `ku`, `threadCore`, `threadCenter`
  - canon / concept / scripture / notion DB / JSON 群
- **出力**:
  - `binderSummary`（center, modeHint, sourceStackSummary 等）
  - `synapseTopPatch`（sourcePack, thoughtGuideKey 等）
- **副作用**:
  - `ku.synapseTop` への patch 適用。
  - `ku.thoughtCoreSummary` 付与。
- **関係**:
  - Conscious 層（thoughtCoreSummary）と Thought 層（sourceStack, groundingSelector）の橋渡し。
  - 天津金木50相の **「相列認識」ロジックを追加する最有力ポイント** の一つ（ただし本カードでは実装禁止）。

#### 3-5. `core/tenmonBrainstem.ts`

- **役割**:  
  routeClass / answerLength / answerMode / answerFrame など、**返答の基本骨格（brainstem frame）** を決める。
- **入力**:
  - `routeReason`
  - `threadCore` / `heart` / `synapseTop` / `providerPlan` など。
- **出力**:
  - `brainstemFrame`（answerFrame, answerMode, routeClass, comfortTuning など）。
- **副作用**: なし（frame オブジェクト生成）。
- **関係**:
  - Thought 層と Body 層の境界。
  - 天津金木相列を **answerFrame / closingType / cadence** に反映させる場合の中継点。

#### 3-6. `core/tenmonOutputShaper.ts` / `core/releaseSurfaceProjector.ts`

- **役割**:  
  brainstemFrame + responsePlan + heart + comfortTuning をもとに、実際の出力テキストのトーン・長さ・構造を調整する。
- **入力**:
  - `brainstemFrame`
  - `ku.responsePlan`
  - `heart`, `synapseTop`, `providerPlan`
- **出力**:
  - `expressionPlan`, `surfaceStyle`, 最終 `message`。
- **副作用**: なし（レスポンス構築）。
- **関係**:
  - Body 層のコア実装。

---

### 4. engines 層

#### 4-1. `engines/kanagi/kanagiEngine.ts`

- **役割**:  
  `kanagi_growth_ledger` と `heart`・self 状態を用いて、成長ログ・selfPhase / intentPhase を管理する。
- **入力**:
  - threadId, heart, routeReason, lawTrace, personaState 等。
- **出力**:
  - `kanagiSelf`（selfPhase, intentPhase, stability_score, drift_risk 等）
- **副作用**:
  - `kanagi_growth_ledger` INSERT。
- **関係**:
  - Heart 層（stability / driftRisk）と Soul 層（self の長期変化）の橋渡し。
  - 天津金木50相の「長期相列ログ」として再利用可能。

#### 4-2. `engines/kanagi/kanagiPhaseEngine.ts` / `kanagiPhase.ts`

- **役割**:  
  kanagi の phase モデル定義と遷移ロジック。
- **入力/出力**:
  - `kanagiSelf`, `heart`, growth ledger など。
- **関係**:
  - 既に **phase ベース**のモデルになっており、天津金木50相の **位相マップ層に近い**。
  - ただし天津金木の 4 基礎運動・中心霊などとはまだ直接結線されていない。

#### 4-3. `engines/persona/tenmonCoreEngine.ts`

- **役割**:  
  personaConstitution / intention / thoughtGuide / scriptural constraints を束ねて、TENMON の「核人格」の振る舞いを決める。
- **関係**:
  - Soul 層（不変憲法）と Thought 層（発話方針）の橋渡し。

#### 4-4. `engines/conversation/conversationEngine.ts` / `polishEngine.ts` / `danshariStyle.ts`

- **役割**:  
  会話の構造・polish・断捨離スタイルなど、Body 層側の高級表現ロジック。
- **関係**:
  - 天津金木の相列を反映させる **Stage 3（expressionPlan 補正）で再利用すべき層**。

#### 4-5. `engines/seed/*` / `synapse/fractalSeed.ts`

- **役割**:  
  思考の初期シード生成（fractalSeed, seedCluster, seedKernel 等）。
- **入力/出力**:
  - routeReason / heart / persona / lawTrace などから seed を生成。
- **関係**:
  - Conscious 層〜Thought 層の「初期相列」、天津金木の内集/外発の初動としてマッピング可能。

---

### 5. planning 層

#### 5-1. `planning/responsePlanCore.ts`

- **役割**:  
  `buildResponsePlan` により、routeReason / mode / responseKind / answerFrame など **思考計画の骨格** を生成する。
- **入力**:
  - `routeReason`, `centerKey`, `centerLabel`, `scriptureKey`, `mode`, `responseKind`, `answerFrame` など。
- **出力**:
  - `responsePlan` オブジェクト。
- **副作用**: なし（純粋組み立て）。
- **関係**:
  - Thought 層の中核。「天津金木相列を responsePlan にどう反映するか」を設計するためのメイン窓口。
- **実装状態**:
  - 関数自体は実装済み。
  - 全 route で均一に使われておらず、define / continuity / compare / scripture など一部が未カバー。

---

### 6. synapse / db 層

#### 6-1. `synapse/fractalSeed.ts`

- **役割**:  
  lawTrace / scripture / persona / heart から「フラクタルな思考シード」を生成する。
- **関係**:
  - 相列としての意識の **始点**。
  - 天津金木50相における「初期左旋/右旋判定」の素材。

#### 6-2. `db/kokuzo_schema.sql`

- **関連テーブル**:
  - `thread_center_memory`（Conscious）
  - `synapse_log`（Thought〜Body への経路ログ + heartJson）
  - `scripture_learning_ledger`（scripture 深度ログ）
  - `kanagi_growth_ledger`（Heart〜Soul 成長ログ）
- **関係**:
  - 天津金木の **観測ログ層** としてそのまま利用可能。  
    新テーブルを増やす前に、metaJson / extra フィールドへ相列推定結果を載せるのが最小diff。

---

### 7. gate 層

#### 7-1. `routes/chat_parts/gates_impl.ts`

- **役割**:  
  `__tenmonGeneralGateResultMaybe` で payload を最終整形し、LLM / RELEASE / DIST 向けに gate する。
- **入力**:
  - `payload.decisionFrame.ku`
  - `rawMessage`, `message`, `heart`, `providerPlan` 等。
- **出力**:
  - gate 済み payload（dist に近い最終形）。
- **副作用**:
  - 一部 routeReason の上書き。
  - heart.phase / arkTargetPhase の補正。
- **関係**:
  - ku に新フィールドを足す際に **drop されるかどうかを確認すべき最終関門**。
  - 現状、`ku.responsePlan` は preserve されている。

---

### 8. 実装済み / 半実装 / 未接続 まとめ

- **実装済み（mainline）**
  - threadCore / threadCenter / knowledgeBinder / tenmonBrainstem / responsePlanCore / tenmonOutputShaper / gates_impl / kanagiEngine / synapse_log / kanagi_growth_ledger。
- **半実装**
  - responsePlan の全ルートカバー。
  - heart.phase と kanagiPhase の統合ロジック。
  - subconcept / abstract / continuity / compare での center 継続表現。
- **未接続（天津金木50相観点）**
  - 4 基礎運動を明示的に表すフィールド。
  - 中心霊としての「ヤイ/ヤエ」などの明示表現。
  - 50相の個別ラベル（phase 名）を持つ型。

これらの棚卸しより、天津金木50相の導入は **「新構造を別に建てる」のではなく、既存の phase / heart / kanagi / thoughtCoreSummary / responsePlan / expressionPlan に対する **解釈層と log 層** の追加で十分であることが確認できる。

