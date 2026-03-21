# CARD_EXPLICIT_CHAR_TARGET_RANGE_V1 実装メモ

## 目的

- EXPLICIT_CHAR_PREEMPT_V1 の本文長を、指定文字数帯へ実際に寄せる。
- **500字指定なら 400〜650字**、**1000字指定なら 800〜1200字**を最低目標にする。

---

## 1. 差し込み位置

- **ファイル**: `api/src/routes/chat.ts` のみ。
- **ブロック**: `// CARD_EXPLICIT_CHAR_PRIORITY_FIX_V1` の直後、`if (__explicitChars != null && !isCmd0 && !hasDoc0 && !askedMenu0)` の内側。
- **該当行**: 約 6985〜7016 行付近。コメント `// CARD_EXPLICIT_CHAR_TARGET_RANGE_V1` の下の、`const __bodyFeelingImpression` 〜 `const __body = __explicitChars >= 1200 ...` までのテンプレート定義と選択式。

選択ロジックは変更していない。

- `__explicitChars >= 1200` → 1200 帯（Feeling1200 / Future1200 / Long1200）
- `__explicitChars >= 700` → 1000 帯（Feeling1000 / Future1000 / Long1000）
- `__explicitChars >= 450` → 500 帯（Feeling500 / Future500 / Long500）
- それ以外 → 既存の short / medium / long 等

---

## 2. 最小 diff 要約

- **500字帯（450〜699 の指定）**:  
  `__bodyFeelingImpression500` / `__bodyFutureOutlook500` / `__bodyLong500` の文字列を拡張。  
  - 現在の見立て・天聞への感想・いま使う意味・次の一手（feeling）、現在地・可能性・条件・次の一手（future/long）を厚めに記述。  
  - 実測: 各 400〜412 字で **400〜650 字**を満たす。
- **1000字帯（700〜1199 の指定）**:  
  `__bodyFeelingImpression1000` / `__bodyFutureOutlook1000` / `__bodyLong1000` の文字列を拡張。  
  - 上記に加え、指定字数でまとめる意味・一点と一手・触れたい一点等の文を追加。  
  - 実測: 各 814〜822 字で **800〜1200 字**を満たす。
- **1200字帯（1200 以上の指定）**:  
  `__bodyFeelingImpression1200` / `__bodyFutureOutlook1200` / `__bodyLong1200` の文字列を拡張。  
  - 段落量を増やし、展望・選択の積み重ね・長期の見通し等を追加。
- **routeReason**: `EXPLICIT_CHAR_PREEMPT_V1` のまま。  
- **他 route**: support / define / scripture / truth gate / kanagi / feeling / impression の通常 route は未変更。

---

## 3. Acceptance

- **500字指定時**: 「500文字で」「500字で」等で preempt したとき、`response` の文字数が **400〜650** の範囲にあること。  
  - 確認: `decisionFrame.ku.routeReason === "EXPLICIT_CHAR_PREEMPT_V1"` かつ `decisionFrame.ku.explicitLengthRequested === 500`（または 450〜699）のとき、`response.length` が 400 以上 650 以下。
- **1000字指定時**: 「1000文字で」「1000字で」等で preempt したとき、`response` の文字数が **800〜1200** の範囲にあること。  
  - 確認: `explicitLengthRequested === 1000`（または 700〜1199）のとき、`response.length` が 800 以上 1200 以下。
- **response_length の確認**: 上記の通り `response.length`（文字数）で検証する。  
  - 500 帯: 400 ≤ length ≤ 650  
  - 1000 帯: 800 ≤ length ≤ 1200  
- **routeReason**: 従来どおり `EXPLICIT_CHAR_PREEMPT_V1`。  
- **他 route 不変**: support / define / scripture / truth gate / kanagi / feeling / impression の通常 route は壊れていないこと。

---

## 4. Rollback

- **対象**: `api/src/routes/chat.ts` の EXPLICIT_CHAR ブロック内、`const __bodyFeelingImpression500` 〜 `const __bodyLong1200` の各テンプレート文字列のみ。
- **手順**: 本実装前にバックアップまたは git で保持している「拡張前」のテンプレート文字列に戻す。  
  - 選択式 `const __body = __explicitChars >= 1200 ? ...` は変更していないため、ロールバック時もそのまま。  
  - テンプレートを元の短い文に戻せば、500字帯・1000字帯の最低目標（400〜650 / 800〜1200）は満たさなくなるが、EXPLICIT_CHAR_PREEMPT_V1 の挙動は従来どおりに復帰する。
- **他ファイル**: 変更なしのため、rollback 不要。
