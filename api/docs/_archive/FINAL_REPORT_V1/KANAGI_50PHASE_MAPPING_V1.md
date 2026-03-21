## KANAGI_50PHASE_MAPPING_V1

### 1. 目的

天津金木50相（四基礎運動＋極性＋中心霊＋相列）と、

- heart / kanagiSelf / kanagiPhase
- seedKernel / fractalSeed
- thoughtCoreSummary / threadCore / threadCenter
- responsePlan / answerMode / answerFrame

との「対応可能性」を整理する。  
本ドキュメントでは **実装は行わず**、あくまで **再利用候補と安全な接続点** を記述する。

---

### 2. 四基礎運動との対応候補

四基礎運動:

- 左旋内集
- 左旋外発
- 右旋内集
- 右旋外発

#### 2-1. heart 関連

- **既存フィールド**
  - `heart.phase`: `gates_impl.ts` および `chat.ts` 内の heart 正規化で使用。
  - `heart.userVector`: ユーザ側の志向性ベクトル（内向/外向・保守/変化など）を表す。
  - `heart.entropy`: 心の揺らぎ・ノイズ量。
- **対応可能性**
  - `heart.phase` は既に「内集/外発/中立」的な値を取り得る設計になっており、  
    - **内集 vs 外発** 軸は `phase` と `userVector` の組み合わせから推定可能。
    - **左旋 vs 右旋** 軸は、`routeReason` / `modeHint` / `kanagiSelf.intentPhase` と組み合わせることで表現可能。
  - → 心層における「左旋内集〜右旋外発」の第1近似として利用できる。

#### 2-2. kanagiSelf / kanagiPhase 関連

- **既存フィールド**
  - `kanagiSelf.selfPhase`
  - `kanagiSelf.intentPhase`
  - `kanagi_growth_ledger.self_phase`, `intent_phase`
  - `kanagi_growth_ledger.heart_source_phase`, `heart_target_phase`
- **対応可能性**
  - selfPhase / intentPhase の組合せにより、
    - 「自己の内向きな集約」= 左旋内集 相当
    - 「自己意図の外向きな表現」= 右旋外発 相当
  - といった **長期傾向** を表現可能。

#### 2-3. seedKernel / fractalSeed 関連

- **既存フィールド**
  - `seedKernel.phase`
  - `fractalSeed` 内の `phase` / `seedType`。
- **対応可能性**
  - 質問ごとの「思考開始モード」を、
    - `seedKernel.phase=INWARD` → 内集系
    - `seedKernel.phase=OUTWARD` → 外発系
  - と解釈し、heart/kanagi と組み合わせれば **四基礎運動の瞬間的な位置** を表し得る。

---

### 3. 極性（通常相 / 陰陽反転相）との対応候補

- **既存情報源**
  - `heart.entropy` / `heart.tension`（高いほど「反転リスク」）
  - `kanagi_growth_ledger.drift_risk`
  - `kanagi_growth_ledger.stability_score`
- **解釈**
  - `stability_score` が高く `drift_risk` が低い → **通常相** に近い。
  - `drift_risk` が高く、`entropy` も高い → **陰陽反転相** に入りかけている。
- **導入候補**
  - 「通常相 or 反転相」は新フィールドを増やさずとも、
    - `ku.consciousSignature.polarity` のような補助フィールドで `NORMAL / INVERT_RISK` を載せれば足りる。

---

### 4. 中心霊との対応候補

中心霊:

- 完全内集（ヤイ / ィ）
- 完全外発（ヤエ / ェ）

#### 4-1. 既存の「中心」フィールド

- `threadCore.centerKey` / `centerLabel` / `centerMeaning`
- `thread_center_memory.center_key` / `center_label` / `center_type`
- `thoughtCoreSummary.centerKey` / `centerLabelRecent`
- `routeReason` 系:
  - `ABSTRACT_FRAME_VARIATION_V1`（人生 / 命 / 時間 / 真理）
  - `TENMON_SCRIPTURE_CANON_V1`（scriptureKey が中心）
  - `TENMON_SUBCONCEPT_CANON_V1`（conceptKey + subconceptKey）

#### 4-2. 対応可能性

- **完全内集**:
  - `center_type="abstract"` かつ、`heart.phase` が内集寄りで `answerMode="analysis"` の場合など。
- **完全外発**:
  - `center_type="scripture"` or `"canon"` かつ、`answerFrame="statement_plus_question"` / `closingType="one_question"` のような「外への問いかけ」が強い状態。

→ これらから、「今このスレッドは中心霊的かどうか」を `consciousSignature.centerMode` のようなラベルとして付与可能。

---

### 5. 相列としての意識との対応候補

#### 5-1. 参照する既存ログ

- `synapse_log.lawTraceJson`
- `synapse_log.heartJson`
- `scripture_learning_ledger.resolvedLevel`
- `kanagi_growth_ledger.next_growth_axis`, `self_phase`, `intent_phase`
- `thread_center_memory` の時系列（center_key の推移）

#### 5-2. 相列状態ラベル候補

天津金木的なラベル:

- 内集優位
- 外発優位
- 左優位
- 右優位
- 均衡
- 反転
- 遷移中
- 中心霊モードに近い
- 未対応

**現状の推定（＝対応可能性）**

- **内集優位**
  - 継続して `ABSTRACT_FRAME_VARIATION_V1` / introspection 系 routeReason が選ばれているスレッド。
  - `heart.userVector.introspection` が高く `entropy` が低いパターン。
- **外発優位**
  - `support` / `future` / `task` 系 routeReason が連続するスレッド。
  - `heart.userVector.action` が高く、`closingType="one_question"` で終わることが多い場合。
- **左/右優位**
  - 左右は現実装ではフィールドとして直接は持っていないが、  
    `compare` / `essence` / `selfaware` が多いスレッドは「内面照合（左）」、  
    `support` / `future` / `worldview` が多いスレッドは「外界志向（右）」に対応しやすい。
- **均衡**
  - `scripture` と `define/general` と `continuity` が均等に現れ、`drift_risk` が低いスレッド。
- **反転 / 遷移中**
  - 直近で `drift_risk` が急上昇し、heart.phase / answerMode / answerFrame が大きく変化したとき。
- **中心霊モード**
  - `centerKey` が `life` / `truth` / `time` など抽象核のまま長く維持されているスレッド。

※ 上記は **「今あるデータからこの種別を推定し得る」ことを示すものであり、  
現実装が既に天津金木ラベルを持っているわけではない**。

---

### 6. 既存相との重複・競合リスク

- `kanagiPhase` と 天津金木50相を **別々の phase 系として二重に実装** すると、  
  selfPhase / intentPhase / consciousPhase が分断され、growth ledger の解釈が困難になる。
- `heart.phase` / `seedKernel.phase` / `kanagiSelf.selfPhase` がそれぞれ別の意味を持ち始めると、  
  gate / binder / brainstem が参照する phase の意味が分裂する。

→ **結論**:

- 天津金木50相は **新しい phase 列を増やす** のではなく、
  - 既存の `heart.phase` / `seedKernel.phase` / `kanagiSelf.selfPhase` / `intentPhase`
  - `threadCore.centerKey` / `thoughtCoreSummary.modeHint`
  を天津金木観点で **再ラベルする解釈層** として扱うのが安全である。

---

### 7. 安全な接続点の候補

1. **Stage 0: 観測**
   - `writeSynapseLogV1` 呼び出し時に、  
     `metaJson.tenmon_conscious_candidate` のようなキーで「相列推定結果」を JSON 追記（既存フィールド不変）。
2. **Stage 1: ku 付与**
   - `decisionFrame.ku.consciousSignature` に `{ phase4, polarity, centerMode, sequenceLabel }` を追加。
   - gate ではまだ参照しない。
3. **Stage 2: responsePlan 補助**
   - `buildResponsePlan` 呼び出し時に `consciousSignature` を渡し、`responsePlan.consciousHint` として保持（返答変化なし）。
4. **Stage 3 以降**
   - `tenmonBrainstem` / `tenmonOutputShaper` / `conversationEngine` で consciousHint を弱く参照。

これにより、天津金木50相は **既存 phase / heart / kanagi / threadCore の上に「ラベル」として載るだけ** になり、  
既存ロジックと矛盾しない形で統合可能である。

