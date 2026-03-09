# [CARD] R1_COMPOSER_INSERT_PLAN_V1 — 設計書

## OBSERVE

### 出口分類（観測済み）

- **A_REPLY（主流）**  
  `return reply(payload)` で返す経路。`reply` 内部で payload を加工したあと、最終的に `res.json(__tenmonGeneralGateResultMaybe({ response, ... }))` を呼んでいる（2558 行付近）。つまり「思考→payload→reply→gate→res.json」の順で一箇所に集約されている。

- **B_GATE（整流済み）**  
  多数の `return res.json(__tenmonGeneralGateResultMaybe({ ... }))` が散在。gate を通してから res.json に渡しているが、呼び出し箇所は多数。

- **C_RAW（残り 4 本）**  
  gate も reply も通さず `return res.json({ ... })` で返している箇所。
  1. **約 1007 行** — TRUTH_GATE 経路の `return res.json(payload);`（reply 定義より前のため reply 不可）
  2. **約 3655 行** — TRUTH_WEIGHT_ROUTE_V1（`__truthWeight > 0.6` 時の固定文）
  3. **約 5304 行** — conversationEngine 直返し（conv.text をそのまま response に）
  4. **約 5447 行** — DANSHARI_STEP1_MENU_V1（断捨離メニュー固定文）

### 共通出口候補（1〜2 箇所）

1. **res.json オーバーライドの「最後」**  
   - 場所: `(res as any).json = (obj) => { ... }` の末尾、`return __origJson(obj);` の直前（約 1854 行の内側／またはトップの約 486 行の直前）。  
   - 性質: **物理的に全ての応答が通過する**。reply / gate / raw のどれから来ても、最終的に `res.json(x)` が呼ばれればここで obj が送信直前に触れる。

2. **reply の末尾（論理的な主流の単一点）**  
   - 場所: `reply` 内で `res.json(__tenmonGeneralGateResultMaybe({ ... }))` を呼ぶ直前（約 2558 行）。  
   - 性質: reply 経路だけの単一点。gate 直呼び・raw 4 本はここを通らない。

---

## OPTIONS

### A. reply(...) を唯一出口にする

- **内容**: すべての応答を `return reply(payload)` に寄せる。raw 4 本も「payload を組み立てて reply(payload)」に変更。
- **利点**: 応答整形（enforceTenmon, ku 付与など）が reply 一箇所で完結する。呼び出し側は「payload を渡すだけ」で揃う。
- **危険点**: 現在 1007 行は reply 定義より前にあるため、reply を前方に移動するか、1007 だけ別扱い（gate のみ通過など）が必要。reply が依存するスコープ（threadId, timestamp, __heart, __llmStatus 等）が多く、定義位置の移動は影響が大きい。

### B. __tenmonGeneralGateResultMaybe(...) を唯一出口にする

- **内容**: すべての応答を「payload 相当オブジェクトを __tenmonGeneralGateResultMaybe に渡してから res.json」に統一。reply 内も「gate を通す」一点に寄せる（現状もほぼそうなっている）。
- **利点**: gate が「正規形への正規化」の単一点になる。raw 4 本を gate で包むだけでよく、reply の位置は変えなくてよい。
- **危険点**: 「思考→応答文」の変換（composer）をどこに置くかは別設計。gate は形の正規化に使う想定で、本文生成ロジックを入れると責務が膨らむ。

### C. responseComposer(...) を新設し、reply / gate の「内側」に置く

- **内容**: 新関数 `responseComposer(payloadOrObj): object` を用意し、  
  - reply の末尾: `res.json(__tenmonGeneralGateResultMaybe(responseComposer(payload)))`  
  - res.json オーバーライドの最後: `const out = responseComposer(obj); return __origJson(out);`  
  のように「送信直前に必ず composer を通す」ようにする。
- **利点**: 「思考回路→最終応答」の変換を responseComposer に集約できる。reply/gate はそのままにしつつ、物理出口（res.json オーバーライド）で全経路を一括で通せる。raw 4 本も res.json に渡る時点で composer を通る。
- **危険点**: composer の入力形が reply 経路と gate/raw 経路で違う可能性がある。payload vs 既に gate を通した obj の差を吸収する契約が必要。既存の HEART_RESPONSE_BRIDGE 等と役割が重ならないようにする必要がある。

---

## RECOMMEND

**方式 C（responseComposer を新設し、reply/gate の内側＝送信直前の 1 点に挿入）を推奨する。**

- 既存の「reply を唯一出口にする」大移動（A）はスコープ依存が重くリスクが大きい。
- 「gate を唯一出口にする」（B）は raw 4 本を包むだけでよいが、composer をどこに置くかが曖昧になりやすい。
- C なら、**物理的に全ての応答が通過する res.json オーバーライドの末尾 1 箇所**に `responseComposer` を挟むだけで、「思考→最終応答」を単一点に寄せられる。raw 4 本はこのカードでは触れず、既に res.json を呼ぶため、オーバーライド経由で自動的に composer を通す形にできる。
- まずは responseComposer を「恒等に近い」（obj をそのまま返す）で実装し、段階的に「思考・phase・ku を見て response を整形する」ロジックを移していくのが安全。

---

## NEXT_PATCH_SCOPE

- **触るファイル**: `api/src/routes/chat.ts` のみ（composer 実装を別ファイルに分ける場合は `api/src/routes/chat_parts/` に 1 ファイル追加）。
- **挿入位置**: `return __origJson(obj);` の直前に `const obj = responseComposer(obj);` 相当を 1 箇所（内側 wrapper 約 1854 行付近）。必要ならトップ wrapper（約 486 行付近）にも同じ 1 行を入れる。
- **最小 diff**: `responseComposer` は `(o: any) => o` で定義し、上記 1〜2 行を追加するだけ。既存の response / decisionFrame / timestamp / threadId は変更しない。
- **raw 4 本**: このカードでは変更しない。次のカードで必要なら gate で包むか、composer 経由で形を揃えるかを検討する。
