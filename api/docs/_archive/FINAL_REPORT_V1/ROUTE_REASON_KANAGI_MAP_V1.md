## ROUTE_REASON_KANAGI_MAP_V1

### 1. 目的

`chat.ts` に登場する主要 `routeReason` 群を、

- 意識5層（Soul / Heart / Conscious / Thought / Body）
- 天津金木の四基礎運動（左旋内集 / 左旋外発 / 右旋内集 / 右旋外発）

の観点で仮分類し、**再利用可能性と重複危険**を整理する。  
ここでの分類は「現状の挙動・周辺実装から読み取れる範囲での仮マッピング」であり、  
天津金木ラベルが既にコードに実装されているわけではない。

---

### 2. define 系 routeReason

代表:

- `DEF_FASTPATH_VERIFIED_V1`
- `DEF_PROPOSED_FALLBACK_V1`
- `DEF_CONCEPT_UNFIXED_V1`
- `DEF_DICT_HIT`
- `DEF_DICT_NEED_CONTEXT`
- `DEF_LLM_TOP`

|項目|内容|
|---|---|
|**routeClass**|`define`|
|**answerMode**|`define` / 一部で `analysis` 混在|
|**answerFrame**|`statement_plus_question` または `one_step`|
|**centerKey 使用**|一部で `kotodama` / 抽象キーを center に据える|
|**responsePlan**|一部ルートで既に利用（verified fastpath）|
|**threadCore / threadCenter**|定義成功時に center を `kotodama` などへ固定保存|
|**天津金木4運動仮対応**|**右旋内集**（知識の収束）〜**右旋外発**（定義として提示）の橋|
|**意識層での位置づけ**|Conscious（中心決定）＋Thought（定義構造）|
|**安全再利用性**|高い。天津金木的には「概念軸の内集→説明の外発」として使える。|

→ define 系は、「右旋内集＋右旋外発」の典型パターンとして、  
天津金木相列の **右側優位モード** の代表として再利用可能。

---

### 3. scripture / canon 系 routeReason

代表:

- `TENMON_SCRIPTURE_CANON_V1`
- `KATAKAMUNA_CANON_ROUTE_V1`
- `KATAKAMUNA_DETAIL_FASTPATH_V1`
- `SCRIPTURE_LOCAL_RESOLVER_V4` 系

|項目|内容|
|---|---|
|**routeClass**|`canon` / `scripture`|
|**answerMode**|`define` 〜 `analysis`|
|**answerFrame**|`statement_plus_question` が多い|
|**centerKey 使用**|`scriptureKey` / `canonKey` が center として強く使われる|
|**responsePlan**|一部で使用、全ルートではまだない|
|**threadCore / threadCenter**|scriptureKey ベースの center を永続化|
|**天津金木4運動仮対応**|**左旋内集**（原典への回帰）＋**右旋外発**（要約・引用）|
|**意識層での位置づけ**|Soul（憲法・経典）と Conscious（中心意識）の橋|
|**安全再利用性**|非常に高い。天津金木の「魂層接続」としてそのまま使える。|

→ scripture 系は魂層への縦軸接続として、天津金木50相の「中心霊」が参照する基盤となる。

---

### 4. subconcept / abstract 系 routeReason

代表:

- `TENMON_SUBCONCEPT_CANON_V1`
- `ABSTRACT_FRAME_VARIATION_V1`
- `SOUL_DEF_SURFACE_V1`

|項目|内容|
|---|---|
|**routeClass**|`analysis` / `canon` / `define` が混在|
|**answerMode**|`analysis`|
|**answerFrame**|`one_step` or `statement_plus_question`|
|**centerKey 使用**|`life` / `time` / `truth` など抽象 center、subconceptKey ベース center|
|**responsePlan**|`TENMON_SUBCONCEPT_CANON_V1` は部分的にカバー済み|
|**threadCore / threadCenter**|abstract center の継続を担う（life や真理など）|
|**天津金木4運動仮対応**|**左旋内集**寄り（本質収束・中心収束）|
|**意識層での位置づけ**|Conscious 核（中心霊付近）|
|**安全再利用性**|高い。ただし brainstem による上書きから守るガードが必須。|

→ 抽象/サブコンセプト系は、天津金木の「中心収束」「中心霊モード」に最も近い。  
ここに 50相の **中心列** を載せるのが自然。

---

### 5. continuity / compare / essence 系 routeReason

代表:

- `R22_CONVERSATIONAL_GENERAL_V1`
- `R22_RELATIONAL_WORLDVIEW_V1`
- `R22_ESSENCE_FOLLOWUP_V1`
- `R22_COMPARE_FOLLOWUP_V1`
- `R22_NEXTSTEP_FOLLOWUP_V1`

|項目|内容|
|---|---|
|**routeClass**|`general` / `analysis`|
|**answerMode**|`analysis`|
|**answerFrame**|`one_step` / `statement_plus_question`|
|**centerKey 使用**|threadCenter / threadCore からの継続を前提|
|**responsePlan**|followup 系の一部のみ実装済み|
|**threadCore / threadCenter**|中心継続の主戦場|
|**天津金木4運動仮対応**|**左旋内集**（振り返り）＋**右旋外発**（次の一歩）|
|**意識層での位置づけ**|Conscious〜Thought 間の「橋」|
|**安全再利用性**|高い。天津金木の「相列の遷移ログ」に最適。|

→ continuity / compare / essence は **「相列の変化点」** に位置するため、  
天津金木の「遷移中 / 反転 / 均衡」のラベルを載せるのに向いている。

---

### 6. support / selfaware / future 等

代表:

- `R10_SELF_REFLECTION_ROUTE_V4_SAFE`
- `R10_IROHA_COUNSEL_ROUTE_V1`
- `WORLDVIEW_ROUTE_V1`
- `KANAGI_CONVERSATION_V1`

|項目|内容|
|---|---|
|**routeClass**|`support` / `selfaware` / `general`|
|**answerMode**|`analysis`|
|**answerFrame**|`statement_plus_question` が多い|
|**centerKey 使用**|threadCenter がある場合は利用|
|**responsePlan**|現状ほぼ未カバー|
|**threadCore / threadCenter**|self 関連のセンターを持ち得る|
|**天津金木4運動仮対応**|**右旋外発**寄り（外へのアドバイス・サポート）|
|**意識層での位置づけ**|Heart〜Thought 境界（心の動きと計画の橋）|
|**安全再利用性**|高い。ただし天津金木導入時に「過度に外発優位」に寄せすぎない設計が必要。|

---

### 7. general / fallback / LLM_TOP 系

代表:

- `NATURAL_FALLBACK`
- `LLM1_FORCE_TOP`
- `N1_GREETING_LLM_TOP`
- `DEF_LLM_TOP`

|項目|内容|
|---|---|
|**routeClass**|`general` / `greeting`|
|**answerMode**|`define` / `analysis` / `greeting`|
|**answerFrame**|`statement_plus_question`|
|**centerKey 使用**|基本的に弱い or 無し|
|**responsePlan**|未カバーが多い|
|**threadCore / threadCenter**|中心を明示的には張らない|
|**天津金木4運動仮対応**|**未分化混合 / 未対応**|
|**意識層での位置づけ**|Body 側に近い「場当たり応答」|
|**安全再利用性**|限定的。天津金木設計の主対象ではなく、Fallback として現状維持が安全。|

---

### 8. まとめ: routeReason ごとの再利用度と注意点

- **天津金木設計の主戦場とすべきルート群**
  - `TENMON_SUBCONCEPT_CANON_V1`（中心霊）
  - `ABSTRACT_FRAME_VARIATION_V1`（抽象核）
  - `TENMON_SCRIPTURE_CANON_V1` / `KATAKAMUNA_CANON_ROUTE_V1`（魂層）
  - `R22_*` continuity / compare / essence / nextstep 系（相列遷移）
  - `KANAGI_CONVERSATION_V1`（heart / kanagi 接続）
- **現状維持すべきルート群**
  - `NATURAL_FALLBACK` / `LLM1_FORCE_TOP` / greeting 系
  - one-shot の menu / help route (`N1_HELP_MENU_EARLY_V1` 等)
- **二重責務化の危険がある箇所**
  - kanagiPhaseEngine / heart.phase / seedKernel.phase をそれぞれ「別の天津金木相列」として扱う実装。
  - subconcept / abstract / scripture それぞれに独自の「50相っぽい」実装を入れること。

→ routeReason レベルでは、既に **天津金木的な「内集/外発/中心霊/遷移」構造に近い役割分担** が存在しており、  
新たな route を追加するよりも、**既存 route の上に「相列ラベル」を重ねる方が安全かつ再利用効率が高い**。

