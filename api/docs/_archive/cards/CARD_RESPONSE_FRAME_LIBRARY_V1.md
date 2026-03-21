# CARD_RESPONSE_FRAME_LIBRARY_V1 設計

## 目的

- **短い / 中くらい / 長い** を、天聞AIらしい返答フォーマットとして固定する。
- 文字数だけでなく、**内容品質**を上げる。
- **同義反復を減らし**、会話として自然にする。

**本ドキュメントは設計と最小導入方針のみ。コードの大きな書き換えは行わない。**

---

## 対象 route

- support
- define
- feeling / impression
- natural general
- explicit char
- continuity

---

## 1. frame 一覧

既存の `AnswerLength`（short / medium / long）と `AnswerFrame`（one_step / statement_plus_one_question 等）を活かし、**返答の役割・文字数帯・構成**を固定する。

| frame | 役割 | 文字数帯 | 構成 | answerLength | answerFrame の典型 |
|-------|------|----------|------|--------------|--------------------|
| **short** | 受け止め＋一手 or 一问 | 〜約 220 字 | 1〜2 文。見立て or 受け止め＋着地（質問 or 一手の提示）。 | short | one_step |
| **medium** | 見立て＋根拠＋着地 | 約 220〜450 字 | 見立て（中心を先に）→ 簡潔な理由 or 背景 → 着地（次の一手 or 一问）。同義反復なし。 | medium | statement_plus_one_question |
| **long** | 見立て＋展開＋着地 | 約 400〜1000 字 | 見立て → 展開（理由・背景・意味を 2〜3 段）→ 着地（次の一手 or 一点、質問は最大 1 つ）。CARD_LONGFORM_1000_STRUCTURE_V1 と整合。 | long | one_step または statement_plus_one_question |

**ルール（全 frame 共通）**

- ラベル見出しは付けない。
- 文体は自然会話寄り。
- 「一点」「次の一手」等の過剰反復を避け、言い換え（中心・一手・触れたいところ等）を分散する。

---

## 2. route ごとの既定割当

各 route が返すときの **既定の answerLength / answerMode / answerFrame** と、対応する **frame** を固定する。

| route（routeReason または種別） | 既定 answerLength | 既定 answerMode | 既定 answerFrame | 対応 frame |
|--------------------------------|--------------------|------------------|------------------|------------|
| **support**（SUPPORT_UI_INPUT_V1 等） | short | support | one_step | short |
| **define**（定義・説明系） | medium | define | statement_plus_one_question | medium |
| **feeling / impression**（FEELING_SELF_STATE_V1, IMPRESSION_ARK_V1, IMPRESSION_TENMON_V1） | short | analysis | one_step | short |
| **natural general**（NATURAL_GENERAL_LLM_TOP） | body または __bodyProfile に依存。long 時は 400〜1000 字で long frame。 | analysis / worldview 等 | statement_plus_one_question 等 | short / medium / long のいずれか |
| **explicit char**（EXPLICIT_CHAR_PREEMPT_V1） | __tier（short / medium / long） | analysis | one_step | short / medium / long（指定字数帯に応じる） |
| **continuity**（CONTINUITY_ANCHOR_V1） | short | analysis | one_step | short |

**補足**

- natural general は、既存の __bodyProfile / answerLength を優先し、long のときは CARD_LONGFORM_1000_STRUCTURE_V1 の着地ルールを適用する前提。
- explicit char は、既存の __tier（220 以下→short、450 以下→medium、それ以上→long）に合わせて frame を割り当てる。

---

## 3. 最小導入順

コードは大きく書き換えず、**設計と参照だけ**を追加する前提。

### Phase 0: 設計確定（本ドキュメント）

- frame 一覧と route ごとの既定割当を確定する。
- 既存の answerLength / answerMode / answerFrame の使用箇所は変えず、**既定値の参照表**として CARD_RESPONSE_FRAME_LIBRARY_V1 を参照できるようにする。

### Phase 1: 参照表の追加（chat.ts 内の最小）

- **オプション A**: chat.ts の先頭付近または定数ブロックに、**routeReason → 既定 answerLength / answerMode / answerFrame** のマップ（オブジェクトまたはコメント表）を 1 つ追加する。既存の return 時の ku にはまだ差し込まない。
- **オプション B**: 既存の各 route の return で既に設定している answerLength / answerMode / answerFrame が、本設計の「route ごとの既定割当」と一致しているかを確認し、不一致があれば **既定割当に合わせて最小修正**する（例: 1 行変更）。

### Phase 2: long フレームの品質（既存カードとの整合）

- CARD_LONGFORM_1000_STRUCTURE_V1 および CARD_EXPLICIT_CHAR_TARGET_RANGE_V1 が、本設計の **long frame**（見立て＋展開＋着地、400〜1000 字、質問は最大 1 つ）と整合していることを確認する。必要ならコメントで「CARD_RESPONSE_FRAME_LIBRARY_V1 の long frame に準拠」と明記する。

### Phase 3: テンプレートの段階的整理（任意）

- support / define / feeling / impression / continuity の **固定文**が、本設計の short（受け止め＋一手 or 一问）に沿っているかを確認し、沿っていない箇所だけ最小修正する。新規ファイルは作らず chat.ts 内のテンプレート文字列のみ。

---

## 4. Acceptance

- **frame 一覧**: short / medium / long の 3 段階が定義され、役割・文字数帯・構成が明文化されている。
- **route ごとの既定割当**: support, define, feeling/impression, natural general, explicit char, continuity について、既定の answerLength / answerMode / answerFrame が一覧で分かる。
- **既存挙動**: 本カードは「設計と最小導入方針」のため、既存の routeReason・response・他 route の動作は Phase 1 で変更しないか、Phase 1 で既定割当に合わせる最小変更のみ。
- **answerLength / answerMode / answerFrame**: 既存の ku への設定を活かし、本設計の割当と矛盾しないこと。
- **long フレーム**: 1000 字までの long が、見立て・展開・着地および「質問は最大 1 つ」と整合していること（既存 CARD_LONGFORM_1000_STRUCTURE_V1 で担保する前提）。

---

## 5. Rollback

- **Phase 0 のみ**: 本ドキュメントを削除または「未採用」にすればよい。コード変更なし。
- **Phase 1 で参照表または 1 行修正を入れた場合**: 追加したマップ（またはコメント表）を削除し、修正した 1 行を元の値に戻す。
- **Phase 2**: コメント追加のみの場合は、そのコメントを削除する。
- **Phase 3**: テンプレート文字列を元に戻す。他ファイルは触っていないため、rollback 不要。

---

## 6. 1000 字までの long フレーム（補足）

- **構成**: 見立て（今回の中心を最初に置く）→ 展開（理由・背景・意味を 2〜3 段、同義反復なし）→ 着地（次の一手 or 次に見る一点、質問は最大 1 つ）。
- **文字数**: 400〜1000 字を目安。explicit char の 1000 字指定時は 800〜1200 字（CARD_EXPLICIT_CHAR_TARGET_RANGE_V1 に合わせる）。
- **既存との関係**: CARD_LONGFORM_1000_STRUCTURE_V1 の「着地で最後の質問の後を打ち切り」および EXPLICIT_CHAR の 500/1000 帯テンプレートの 3 段構成が、本 long frame の具体化とする。
