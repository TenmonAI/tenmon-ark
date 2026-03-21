# CARD_JUDGEMENT_COMPARE_ROUTE_V1 設計

## 目的

- **compare / judgement 系**を NATURAL_GENERAL_LLM_TOP から外す。
- 「違いは？」「どう違う？」「何が違う？」「比較して」「どう思う？」で **generic になりにくく**する。

**本ドキュメントは設計と最小導入方針のみ。大きな実装は行わず、1〜3 枚のカードに分ける。**

---

## 設計条件

- 対象は **chat.ts のみ**。新規ファイルは作らない。
- 既存 support / define / feeling / impression / continuity / explicit / future / essence（R22_FUTURE_OUTLOOK_V1, R22_ESSENCE_ASK_V1, R22_ESSENCE_FOLLOWUP_V1）を壊さない。
- 最小 diff。
- 1〜3 枚のカードに分ける。

---

## 1. compare / judgement の分類

| 分類 | 条件 | 現状 |
|------|------|------|
| **compare follow-up** | __threadCenterForGeneral != null かつ「違いは\|どう違う\|何が違う」 | 言霊秘書＋直近2音が取れれば buildKotodamaCompareResponse で deterministic。それ以外は __isFollowupGeneral 内の __isCenterAskGen / __isDetailAskGen 等 or 最後の else で「（中心）を土台に、いまの話を見ていきましょう。…」の儀式文 or LLM に流れる。 |
| **compare without threadCenter** | !__threadCenterForGeneral かつ「違いは\|どう違う\|何が違う\|比較して」 | そのまま NATURAL_GENERAL の LLM に流れ、generic な比較返しになりがち。 |
| **judgement ask** | 「どう思う？」「良い？」「悪い？」「どう思いますか」等 | 専用 route なし。classifyTenmonIntent に judgement はなく、NATURAL_GENERAL の LLM に流れる。 |

**補足**

- gates_impl の classifyTenmonIntent は "compare" を返すが、**preempt では使っていない**（post-LLM の thoughtCoreSummary 用）。
- compare follow-up で言霊秘書以外の center（例: katakamuna, concept）や、言霊秘書でも直近2音が無い場合は、現状はフォールバック or LLM。

---

## 2. preempt で切るべきもの

| 対象 | 内容 | routeReason 例 |
|------|------|----------------|
| **compare without threadCenter** | LLM を呼ばず短文で「比較の軸を一点に絞る」よう促す。 | R22_COMPARE_ASK_V1 |
| **compare follow-up（threadCenter あり）で、言霊秘書2音の grounded がない場合** | 儀式文「（中心）を土台に、いまの話を見ていきましょう」を出さず、比較用の一手に寄せる短文を返す。言霊秘書＋2音で buildKotodamaCompareResponse が効く経路は**既存のまま**触れない。 | R22_COMPARE_FOLLOWUP_V1 |

- **差し込み**: いずれも __threadCenterForGeneral を取得した後。compare without は R22_ESSENCE_ASK_V1 と同様に「!__threadCenterForGeneral && パターン」で return。compare follow-up は、continuity / essence follow-up の後、__isFollowupGeneral の**中**で kotodama compare を試す**前**に、「threadCenter あり && compare パターン」で分岐して、言霊秘書2音があるかどうかは見ずに「比較用短文」で return するか、あるいは「言霊秘書2音で __twoSounds が取れたときだけ既存の buildKotodamaCompareResponse」とし、それ以外の compare follow-up で新 preempt に流す（設計どちらでも可。最小 diff なら「言霊秘書2音の処理はそのまま、それ以外の compare follow-up でだけ新 preempt」が安全）。

---

## 3. system 強化で足りるもの

| 対象 | 内容 |
|------|------|
| **judgement ask** | NATURAL_GENERAL の system（__GEN_SYSTEM_CLEAN または GEN_SYSTEM 付近）に **1 行**追加。「価値判断（どう思うか・良い悪い）の問いには、一点の見立てを述べ、質問は 1 つまで。」preempt は作らず、LLM の振る舞いだけ整える。CARD_NATURAL_GENERAL_SHRINK_V2 のカード 3（SYSTEM_JUDGE）と同一方針。 |

---

## 4. 最小導入順（1〜3 枚のカード）

### カード 1: CARD_JUDGEMENT_COMPARE_ROUTE_V1_COMPARE_NO_CENTER（最優先）

- **内容**: **compare without threadCenter** を preempt で受け止める。
- **条件**: `!__threadCenterForGeneral` かつ `/(違いは|どう違う|何が違う|比較して)/u.test(t0)`。
- **返答**: 短文 1 本。例:「【天聞の所見】比較の問いです。いま比べたい A と B を一言ずつ置くと、答えが締まります。」
- **routeReason**: `R22_COMPARE_ASK_V1`。answerLength: short, answerMode: analysis, answerFrame: one_step。
- **差し込み位置**: R22_ESSENCE_ASK_V1 のブロックの直後（または同ブロックの直前に「compare だけ」の if を足す）。__threadCenterForGeneral 取得後・既存 follow-up の前にするなら、ESSENCE と並列で「!__threadCenterForGeneral && compare パターン」を追加。

### カード 2: CARD_JUDGEMENT_COMPARE_ROUTE_V1_COMPARE_FOLLOWUP（次点）

- **内容**: **compare follow-up（threadCenter あり）** のうち、言霊秘書2音の grounded が**ない**場合に、短文 preempt で返す。儀式文を出さない。
- **条件**: `__threadCenterForGeneral != null` かつ `/(違いは|どう違う|何が違う)/u.test(t0)`。言霊秘書＋直近2音で buildKotodamaCompareResponse が使える経路は既存どおり（preempt で上書きしない）。
- **実装方針**: __isFollowupGeneral が true のブロックの**先頭**で、「compare パターン && threadCenter あり」のとき、言霊秘書かつ getLastTwoKotodamaSoundsFromHistory で2音取れるか試す。取れ**ない**場合だけ、新 preempt（R22_COMPARE_FOLLOWUP_V1）で return。取れる場合は従来どおり buildKotodamaCompareResponse。
- **返答**: 例「【天聞の所見】（中心ラベル）で比べるなら、軸を一つに絞ると深まります。いま違いを見たい二つを一言ずつ置いてください。」
- **routeReason**: `R22_COMPARE_FOLLOWUP_V1`。answerLength: short, answerMode: analysis, answerFrame: one_step。

### カード 3: CARD_JUDGEMENT_COMPARE_ROUTE_V1_JUDGE_SYSTEM（任意）

- **内容**: **judgement** 用に NATURAL_GENERAL の system に 1 行追加するだけ。
- **文言**: 「価値判断（どう思うか・良い悪い）の問いには、一点の見立てを述べ、質問は 1 つまで。」
- **差し込み位置**: __GEN_SYSTEM_CLEAN または __worldviewSharpenLine 付近の文字列に 1 行 concat。route は増やさない。

---

## 5. Acceptance

- [ ] **カード 1**: threadCenter なしで「違いは」「どう違う」「何が違う」「比較して」を送ると、NATURAL_GENERAL_LLM_TOP の LLM が呼ばれず、短文 1 本と R22_COMPARE_ASK_V1 が返る。support / define / feeling / impression / continuity / explicit / future / essence の挙動は変わらない。
- [ ] **カード 2**: threadCenter ありで「違いは？」等を送ったとき、言霊秘書＋2音で grounded が効く場合は従来どおり buildKotodamaCompareResponse。それ以外の compare follow-up では R22_COMPARE_FOLLOWUP_V1 の短文が返り、「（中心）を土台に、いまの話を見ていきましょう」の儀式文は出ない。
- [ ] **カード 3**: 実装した場合、価値判断系の問いで「一点の見立て＋質問 1 つ」に寄りやすい（観測可能ならログで確認）。
- [ ] 既存の continuity / essence follow-up / 言霊一音継続 / support / define / explicit / truth gate / kanagi は壊れていない。
- [ ] `npm run build` が成功する。

---

## 6. Rollback

- **カード 1**: 追加した「!__threadCenterForGeneral && compare パターン」の `if (...) { return res.json(...); }` ブロックを削除する。
- **カード 2**: 追加した compare follow-up 用の preempt（言霊秘書2音がない場合の return）を削除する。言霊秘書2音の既存処理はそのまま残す。
- **カード 3**: 追加した system の 1 行を削除する。

---

## 参照

- __isCompareFollowup: chat.ts 約 7118 行。__isFollowupGeneral: 約 7119 行。
- 言霊秘書 compare: 約 7363–7372 行（__isCompareAsk && __isKotodamaHishoGen, getLastTwoKotodamaSoundsFromHistory, buildKotodamaCompareResponse）。
- R22_ESSENCE_ASK_V1: 約 7162 行付近。R22_ESSENCE_FOLLOWUP_V1: 約 7127 行付近。
- gates_impl.ts: classifyTenmonIntent "compare"（118–120 行）。
