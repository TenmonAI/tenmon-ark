# CARD_LONGFORM_1000_STRUCTURE_V1 実装メモ

## 目的

- 400〜1000字帯の返答を、天聞AIとして**見立て・展開・着地**の3段構成に整える。
- ただ長いだけでなく、内容のまとめ方を整え、同義反復を減らす。
- EXPLICIT_CHAR_PREEMPT_V1 と NATURAL_GENERAL_LLM_TOP の long 応答に効かせる。

---

## 1. 差し込み位置

- **ファイル**: `api/src/routes/chat.ts` のみ。
- **A. ヘルパー**: `__tenmonClampOneQ` の直後（約 4506 行付近）。`__longform1000Structure(raw)` を追加。400〜1000字のとき着地「質問は最大1つ」とするため、最後の ？/?: までで打ち切る。
- **B. reply() 内**: `FALLBACK_TENMON_VOICE` の try 内、既存の「受け取っています。そのまま続けてください」置換の直後。`routeReason === "NATURAL_GENERAL_LLM_TOP"` かつ `answerLength === "long"` かつ `response` が 400〜1000 字のとき、`__longform1000Structure` を適用。
- **C. EXPLICIT_CHAR テンプレート**: `// CARD_EXPLICIT_CHAR_TARGET_RANGE_V1` の下、`__bodyFeelingImpression500` / `__bodyFutureOutlook500` / `__bodyLong500` および `__bodyFeelingImpression1000` / `__bodyFutureOutlook1000` / `__bodyLong1000` の6本を、見立て→展開→着地の3段・同義反復削減・「一点」「次の一手」の繰り返し削減で書き換え。

---

## 2. 最小 diff 要約

- **見立て・展開・着地の定義**
  - 見立て: 今回の中心を最初に置く。
  - 展開: 理由・背景・意味を2〜3段で展開。同じ文意の反復は禁止。
  - 着地: 次の一手 or 次に見る一点。質問は最大1つ。ラベル見出しは出さない。

- **__longform1000Structure**
  - 引数が 400〜1000 字のとき、最後の 「？」 または 「?」 までで切り、それ以降を捨てる。それ以外はそのまま返す。

- **reply()**
  - `decisionFrame.ku.routeReason === "NATURAL_GENERAL_LLM_TOP"` かつ `answerLength === "long"` かつ `response.length` が 400〜1000 のとき、`response` を `__longform1000Structure(response)` に差し替え。

- **EXPLICIT_CHAR 500/1000 帯**
  - 6テンプレートを上記3段構成にし、「一点」「次の一手」の過剰な繰り返しをやめ、「中心」「一手」「触れたいところ」「掘りたいところ」などに分散。文体は自然会話のまま。

- **routeReason**: 既存のまま（EXPLICIT_CHAR_PREEMPT_V1 / NATURAL_GENERAL_LLM_TOP 等）。support / define / scripture / truth gate / kanagi は変更なし。

---

## 3. Acceptance

- **EXPLICIT_CHAR 500/1000 帯**: 返却本文が「見立て（中心を先に）→ 展開（理由・背景・意味、同義反復なし）→ 着地（次の一手 or 一点、質問は1つまで）」の流れになっていること。「一点」「次の一手」の連続反復が目立って減っていること。
- **NATURAL_GENERAL_LLM_TOP + answerLength=long**: 400〜1000 字の応答で、着地が複数質問になっている場合は、最後の1問までで打ち切られていること（`__longform1000Structure` 適用後）。
- **routeReason**: 既存を維持していること。
- **他 route**: support / define / scripture / truth gate / kanagi の挙動が変わっていないこと。
- **文体**: 自然会話寄りのままであること。ラベル見出しは付与していないこと。

---

## 4. Rollback

- **A. ヘルパー**: `__longform1000Structure` の定義ブロック（`const __longform1000Structure = ...` から閉じ括弧まで）を削除する。
- **B. reply()**: 「CARD_LONGFORM_1000_STRUCTURE_V1」のコメントと、その直下の `if (payload && __route === "NATURAL_GENERAL_LLM_TOP" ... __longform1000Structure(__r)` のブロックを削除する。
- **C. EXPLICIT_CHAR テンプレート**: `__bodyFeelingImpression500` / `__bodyFutureOutlook500` / `__bodyLong500` および `__bodyFeelingImpression1000` / `__bodyFutureOutlook1000` / `__bodyLong1000` の6本を、CARD_EXPLICIT_CHAR_TARGET_RANGE_V1 実装時（または本カード実装前）の文字列に戻す。
- 他ファイルは触っていないため、rollback 不要。
