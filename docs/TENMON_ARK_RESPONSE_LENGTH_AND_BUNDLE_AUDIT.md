# TENMON-ARK 応答長・構成・資料束の裁定レイヤー 観測レポート（修正なし）

**目的**: 短文/中位/長文の決定箇所、構成決定、根拠束の合流点、天聞AI前面人格直前の最終関数を特定し、answerLength/answerMode/answerFrame の差し込み候補を整理する。  
**方針**: 修正は行わず、観測と列挙のみ。

---

# 1. 現在の応答長決定に関与する箇所

| 種別 | ファイル・箇所 | 内容 |
|------|----------------|------|
| **システムプロンプト内の文字数指示** | chat.ts 約 6716–6726 行 | `GEN_SYSTEM`: 「2〜4行、140〜260字目安」 |
| | chat.ts 約 6810–6824 行 | `__GEN_SYSTEM_CLEAN`: 「2〜4文、80〜180文字」 |
| | chat.ts 約 1690–1704 行 | TRUTH_STYLE 経路: 「140〜220字、2〜4行」 |
| | chat.ts 約 6460 行 | 言霊整文: 「2〜4行、180文字以内」 |
| **事後カット** | api/src/engines/persona/tenmonCoreEngine.ts 41–43 行 | `enforceTenmonPersona`: `t.length > 350` で `t.slice(0, 350)` |
| **固定短文（ルート別）** | chat_parts/gates_impl.ts 約 609–674 行 | 前面 4 類型（greeting / meta_conversation / present_state / next_step）および軽量事実（date/weekday/time）で専用短文を返し、LLM を経由しない |
| | chat.ts 約 8832–8855 行 | DET_NATURAL_SHORT_JA_V1: 短文相談時は固定テンプレ（「一点質問」等） |
| | chat.ts 約 8912–8920 行 | DET_LOW_SIGNAL_V2: ping/test 等は固定 1 文 |
| | safeGeneralRoute.ts | 汎用フォールバックは固定 1 文 |

**まとめ**: 「短文／中位／長文」を表す単一の answerLength 変数や列挙型はない。ルートごとにシステムプロンプトの文言や固定文で「目安字数」が分散しており、事後処理では `enforceTenmonPersona` の 350 字カットのみが共通で効いている。

---

# 2. 現在の本文構成決定に関与する箇所

| 種別 | ファイル・箇所 | 内容 |
|------|----------------|------|
| **計画レイヤー** | api/src/planning/responsePlanCore.ts | `buildResponsePlan`: `responseKind`（statement / statement_plus_question / instruction）、`mode`（greeting / canon / general）、`semanticBody` を返す。本文そのものは作らない。 |
| **Kanagi 経路** | api/src/kanagi/engine/responseComposer.ts | `composeResponse`: KanagiTrace + PersonaState → 観測文。`composeConversationalResponse`: それを会話形に変換。form（DOT/LINE/CIRCLE/WELL）や phase で文言が変わる。 |
| **LLM 経路** | chat.ts 各所 | システムプロンプトに「2〜4行」「質問は1つ」等の構成指示が直書き。専用の「answerFrame」レイヤーはない。 |
| **事後整形** | api/src/core/responseComposer.ts | `responseComposer`: 表面の整流・テール文付与・meaningFrame 算出。構成の「枠」を決める専用 API はない。 |

**まとめ**: 長文時の「構成」は、プロンプト文言と responsePlan の responseKind/mode に分散している。構成を表す answerFrame に相当する一元化されたレイヤーはない。

---

# 3. 根拠束（Notion / KOKUZO / threadCenter / thoughtGuide / personaConstitution）の合流点

| 役割 | 取得元 | 合流の仕方 |
|------|--------|------------|
| **thoughtGuide** | `getThoughtGuideSummary("katakamuna" \| "scripture" \| "kotodama")` (core/thoughtGuide.js) | chat.ts の各ルート内で、__ku や LLM 用コンテキスト用オブジェクトに `thoughtGuideSummary` として渡す。 |
| **Notion** | `getNotionCanonForRoute(routeReason, message)` (core/notionCanon.js) | 同様に `notionCanon` として __ku 等に渡す。 |
| **personaConstitution** | `getPersonaConstitutionSummary()` (core/personaConstitution.js) | `personaConstitutionSummary` として __ku 等に渡す。 |
| **threadCenter** | `getLatestThreadCenter(threadId)` (core/threadCenterMemory.js) / ルート内で組み立てた `sourceThreadCenter` | __ku の `sourceThreadCenter` や `threadCenter`、またはプロンプト用変数（例: `__threadCenterForGeneral`）として使用。 |
| **KOKUZO** | kokuzo/search.js, recall.js, lawCandidates 等 | ルートごとに検索・recall 結果を lawTrace / evidenceIds / candidates 等として __ku や payload に載せる。 |

**合流点**: **単一の「束ね関数」は存在しない。** すべて **chat.ts 内の複数ブランチ** で、ルートごとに上記を呼び出し、そのルート用の `__ku`（decisionFrame.ku）やプロンプト用変数に詰めている。  
代表例: chat.ts 約 4465–4485 行（KATAKAMUNA_CANON 経路で thoughtGuideSummary / personaConstitutionSummary / notionCanon を __ku に設定）、約 5467–5476 行（scripture 経路で同様＋sourceThreadCenter）、約 8597–8605 行（言霊定義経路）。

**責任の所在**: 根拠束の「どの組み合わせをどのルートで使うか」は **chat.ts に集中** している。gates_impl は gate 通過後の response の短文置き換え等で、束の組み立ては行っていない。

---

# 4. 天聞AI前面人格へ入る直前の最終関数

| 経路 | 直前の関数・処理 | ファイル |
|------|------------------|----------|
| **多くの LLM 応答** | `enforceTenmon(payload.response)` で【天聞の所見】を付与 | chat.ts 約 2027 行、engines/persona/tenmonCore.js |
| **人格・語尾・長さの整形** | `enforceTenmonPersona(text)`：一般論除去・語尾統一・350 字カット・【天聞の所見】付与 | api/src/engines/persona/tenmonCoreEngine.ts |
| **一部ルート** | `responseComposer(input)`：表面整流・テール・meaningFrame | api/src/core/responseComposer.ts |
| **Kanagi 経路** | `composeConversationalResponse(trace, personaState, userMessage)` | api/src/kanagi/engine/responseComposer.ts（chat.ts 約 9863 行） |
| **TRUTH_GATE 経路** | `__cleanLlmFrame` ＋ `llmChat` 二段（GPT 下書き → Gemini 整文）の結果を finalText として返却 | chat.ts 約 1725–1744 行 |

**「天聞AI前面人格へ入る直前」として共通して意識しやすいのは**  
- **enforceTenmon**（プレフィックス付与のみ）  
- **enforceTenmonPersona**（語尾・禁止表現・長さまで含む整形）  
の 2 つ。どれが使われるかはルートにより異なり、Kanagi だけ composeConversationalResponse が最終に近い。

---

# 5. answerLength / answerMode / answerFrame を差し込む最適候補

| パラメータ | 差し込み候補 | 理由 |
|------------|--------------|------|
| **answerLength** | (A) chat.ts 内で、既存の `GEN_SYSTEM` / `__GEN_SYSTEM_CLEAN` / TRUTH_STYLE 等の **system 文字列を組み立てている直前** で、answerLength に応じた「短文／中位／長文」の指示を 1 文追加する。(B) または **enforceTenmonPersona** の 350 の閾値を、answerLength に応じて変える（または無効化）。 | 現状、長さはプロンプトと事後カットの 2 箇所で決まっているため、この 2 つを制御するのが最小。 |
| **answerMode** | (A) **buildResponsePlan** の入力に answerMode を追加し、responseKind / mode の既定値を変える。(B) または chat.ts の **ルート分岐の手前**（req.body や thread から answerMode を読み、どの system や gate を使うか）で使う。 | 計画とルート選択の両方に効かせられる。 |
| **answerFrame** | (A) **buildResponsePlan** の出力（または別の型）に `frame: "statement_only" \| "statement_plus_question" \| "instruction"` 等を追加し、**system プロンプト組み立て** で「質問は 0 個／1 個」「構成は〇〇」と参照する。(B) または **responseComposer（core）** の入力に frame を渡し、テールや質問の有無を制御する。 | 現状「質問1つ」等がプロンプトに直書きなので、frame を 1 箇所で定義し、プロンプトと responseComposer の両方から参照する形が扱いやすい。 |

**最適な「1 箇所」でまとめて差し込むなら**:  
- **chat.ts** の **router.post("/chat", ...)** の比較的早い段階で、req.body や thread から answerLength / answerMode / answerFrame を読み、  
  - 既存の **buildResponsePlan** や **system 文字列組み立て** に渡す  
  - 必要なら **enforceTenmonPersona** に length 上限を渡す  
という形が、既存の分散を変えずにパラメータだけ増やしやすい。

---

# 6. 最小 diff で導入するなら触るべきファイル（3 つ以内）

| 順 | ファイル | 役割 |
|----|----------|------|
| 1 | **api/src/routes/chat.ts** | answerLength / answerMode / answerFrame を req または thread から取得し、既存の system 組み立て・buildResponsePlan 呼び出し・enforceTenmonPersona 呼び出しに渡す。ルート共通の「裁定レイヤー」をここに 1 段追加するイメージ。 |
| 2 | **api/src/planning/responsePlanCore.ts** | buildResponsePlan の入力に answerMode / answerFrame（または frame）を追加し、responseKind や mode の既定値・解釈を変える。必要なら ResponsePlan 型に frame を追加。 |
| 3 | **api/src/engines/persona/tenmonCoreEngine.ts** | enforceTenmonPersona の 350 字固定を、オプション引数（例: maxLength）で上書きできるようにする。chat.ts から answerLength に応じた値を渡す。 |

**注**: 根拠束の組み立ては chat.ts のまま触れず、「応答の長さ・モード・枠」だけ 3 ファイルで受け口を用意する形にすると、diff を小さくできる。

---

# 7. 結論（修正はまだしない）

- **応答長**: 短文／中位／長文は、**chat.ts 内のシステムプロンプト文言** と **enforceTenmonPersona の 350 字カット** および **ルート別の固定短文** で分散して決まっている。answerLength を導入するなら、これらを「1 パラメータで切り替える」ようにするのがよい。
- **構成**: 計画は **responsePlanCore.buildResponsePlan**、本文構成は **プロンプトの指示** と **responseComposer（core）** に分散。answerFrame を導入するなら、buildResponsePlan とプロンプト組み立ての両方から参照する形がよい。
- **根拠束**: Notion / KOKUZO / threadCenter / thoughtGuide / personaConstitution は、**chat.ts の複数ブランチ** でルートごとに取得され __ku 等に詰められている。**責任は chat.ts に集中** しており、単一の「束ね関数」はない。
- **天聞前面直前**: **enforceTenmon** と **enforceTenmonPersona** が、多くの経路で最後に効く人格・表面レイヤー。Kanagi 経路のみ **composeConversationalResponse** が最終に近い。
- **answerLength / answerMode / answerFrame** を最小 diff で入れるなら、**chat.ts** でパラメータを受け取り、**responsePlanCore** と **tenmonCoreEngine** に渡す 3 ファイルが候補。  
**今回の観測では修正は行っていない。**
