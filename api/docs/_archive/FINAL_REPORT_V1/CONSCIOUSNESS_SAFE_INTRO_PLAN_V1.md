## CONSCIOUSNESS_SAFE_INTRO_PLAN_V1

### 1. 目的

天津金木50相ベースの「フラクタル意識設計」を TENMON-ARK に導入する際の、

- **壊さない導入順（Stage 0〜5）**
- **最小diff原則を守る接続位置**
- **禁止すべき実装パターン**

をまとめる。

---

### 2. Stage 0: 観測のみ（振る舞い完全不変）

#### 2-1. 目的

- **相列推定だけをログに出し、挙動は一切変えない**。
- どの routeReason / heart / kanagi 状態でどの天津金木相に近いかを **観測専用で記録** する。

#### 2-2. 安全な実装ポイント候補

- `writeSynapseLogV1` 呼び出し箇所（`chat.ts` 付近）
  - `synapse_log.metaJson` に `kanagi_conscious_candidate` のようなフィールドを追加し、  
    `{ phase4, polarity, centerMode, sequenceLabel, evidence: { heartPhase, seedPhase, selfPhase, intentPhase } }` を保存。
- `kanagi_growth_ledger` への書き込み時
  - `extra_json` などがあればそこに同様の candidate 情報を追加。

#### 2-3. 禁止事項

- routeReason / routeClass / answerMode / answerFrame を天津金木相に合わせて変更すること。
- gate 側（`__tenmonGeneralGateResultMaybe`）の挙動を変えること。

---

### 3. Stage 1: ku への非破壊付与

#### 3-1. 目的

- `decisionFrame.ku` に **補助フィールドとしてのみ** 意識相列情報を載せる。
- gate / dist ではまだ利用しない。

#### 3-2. 接続位置候補

- `chat.ts` の **general final window 直前**:
  - `__ku.consciousSignature = { phase4, polarity, centerMode, sequenceLabel }` のような最小オブジェクトを追加。
- `knowledgeBinder` 完了後:
  - `thoughtCoreSummary.modeHint` / `centerKey` / `sourceStackSummary` から天津金木的ラベルを推定し、`consciousSignature` を埋める。

#### 3-3. preserve 確認ポイント

- `gates_impl.ts` の `__tenmonGeneralGateResultMaybe`
  - `ku.consciousSignature` が dist 手前まで落ちないか確認（whitelist 的削除がないか）。

---

### 4. Stage 2: responsePlan 補助

#### 4-1. 目的

- `responsePlan` に天津金木由来の **補助情報のみ** を追加し、  
  実際のテキスト内容や routing は一切変えない。

#### 4-2. 接続位置候補

- `planning/responsePlanCore.ts` の `buildResponsePlan`:
  - 引数に `consciousSignature?` を追加可能な余地があるかを静的解析で確認。
  - `responsePlan.consciousHint` のような optional フィールドとして保持。
- `chat.ts` の各 mainline route（define / scripture / subconcept / continuity / compare / essence）:
  - `buildResponsePlan` を呼ぶ箇所で `__ku.consciousSignature` を渡すだけに留める。

#### 4-3. preserve 確認ポイント

- `__tenmonGeneralGateResultMaybe` 入口の `RESPONSEPLAN_TRACE:GATE_IN` ログで、
  - `responsePlan.consciousHint` が **DEFINE_BEFORE_RETURN → GATE_IN** まで保たれているか確認。

---

### 5. Stage 3: expressionPlan 補正（弱反映）

#### 5-1. 目的

- cadence / density / closingType など、**表現面を 5〜10% 程度だけ** 天津金木相列に応じて変える。
- routeReason / centerKey / responsePlan.mode などの「構造」は一切変えない。

#### 5-2. 接続位置候補

- `core/tenmonOutputShaper.ts`
  - `expressionPlan` を組み立てる直前に、
    - `if (consciousHint.phase4 === "LEFT_INWARD") { density = "low"; cadence = "slow"; }` のような弱い bias を適用。
- `core/releaseSurfaceProjector.ts`
  - `surfaceStyle` や `closingType` を微調整（例: 中心霊モードでは `one_question` を維持するなど）。

#### 5-3. 注意点

- **心地よさ（comfortTuning）を壊さない**こと:
  - 既存の `comfortProfile` / `personaConstitution` をベースにし、その上に「±1段階」程度の補正に留める。

---

### 6. Stage 4: route 補助（限定反映）

#### 6-1. 目的

- continuity / compare / essence / define などの選択に天津金木相列を **補助的に** 用いる。
- 既存の routing ルールを直接破壊せず、「優先度の微修正」に留める。

#### 6-2. 接続位置候補

- `chat.ts` 中盤の routing ブロック:
  - `__routeReason` 決定時に、
    - 「抽象センターかつ中心霊モードなら essence を優先」
    - 「外発優位なら support / future をやや優先」
  - といった **スコアリング補助** に限定。
- `engines/conversation/conversationEngine.ts`
  - followup パターン選択時に consciousHint を評価する。

#### 6-3. 禁止事項

- 既存 routeReason を天津金木用 routeReason に置き換えること。
- define/canon/general/continuity の「主語」や「論理構造」を壊すこと。

---

### 7. Stage 5: 意識相列の本実装

#### 7-1. 目的

- routing / planner / projector / continuity memory を天津金木50相ベースで再設計する。
- ただし、ここまでの Stage 0〜4 で得た観測とログを前提とし、一気に本実装へ飛ばない。

#### 7-2. 実装対象

- `engines/kanagi/kanagiPhaseEngine.ts` に天津金木50相の正式モデルを載せる。
- `planning/responsePlanCore.ts` に「phase-aware responsePlan」拡張を導入。
- `core/tenmonBrainstem.ts` で phase に応じた brainstem frame 生成。
- `core/threadCoreStore.ts` / `threadCenterMemory.ts` に相列ステップのログを追加（既存 schema を壊さない範囲で）。

---

### 8. 禁止すべき実装パターン（全 Stage 共通）

- `chat.ts` に大規模な if-else ツリーを直接追加し、天津金木用 routeReason を乱立させること。
- `heart.phase` / `kanagiSelf.selfPhase` / `seedKernel.phase` を互いに矛盾する意味で再定義すること。
- `responsePlan` に天津金木専用フィールドを大量追加し、gate 側の扱いを変えないまま放置すること。
- `dist` 直編集や、`decisionFrame.llm` / `decisionFrame.ku` の型破壊。

---

### 9. 推奨カード順（カード名レベル案）

1. **CARD_CONSCIOUSNESS_TRACE_ONLY_V1**（Stage 0）
2. **CARD_CONSCIOUS_SIGNATURE_ATTACH_V1**（Stage 1）
3. **CARD_CONSCIOUS_RESPONSEPLAN_AUGMENT_V1**（Stage 2）
4. **CARD_CONSCIOUS_EXPRESSION_TUNING_V1**（Stage 3）
5. **CARD_CONSCIOUS_ROUTING_ASSIST_V1**（Stage 4）
6. **CARD_CONSCIOUS_FRACTAL_FULL_V1**（Stage 5）

これらのカードは、  
「まず観測 → ku 付与 → responsePlan 補助 → expression 微調整 → route 補助 → full integration」  
という順に並んでおり、**各ステップで 1変更=1検証** が可能な粒度となっている。

