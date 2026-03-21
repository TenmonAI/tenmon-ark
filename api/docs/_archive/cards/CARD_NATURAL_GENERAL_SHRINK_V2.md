# CARD_NATURAL_GENERAL_SHRINK_V2 設計

## 目的

- **NATURAL_GENERAL_LLM_TOP** に落ちる問いを減らす。
- **generic な返答**を減らす。
- **短い / 中くらい / 長い**の会話品質を上げる。

**本ドキュメントは設計と最小導入方針のみ。大きな実装は行わず、次に切るカードを 1〜3 枚に分解する。**

---

## 観点の整理

1. general に落ちている問いの**型**を整理する。
2. 各型について **preempt を増やすか / 既存 route に寄せるか / NATURAL_GENERAL の system 強化で足りるか** を裁定する。
3. 最小 diff で次に切るカードを **1〜3 枚**に分解する。

---

## 1. NATURAL_GENERAL に残っている問いの分類

現状、以下のいずれかで **NATURAL_GENERAL_LLM_TOP** に到達する。

| 分類 | 内容例 | 現状 |
|------|--------|------|
| **future / worldview** | 「これからどうなる」「なぜ〜するのか」「世界観」 | worldview は generalKind で固定文に上書き済み。future/展望は system の __worldviewSharpenLine のみで LLM に流れている。 |
| **feeling follow-up** | 「今の気分」「今の気持ち」 | CARD_FEELING_AND_IMPRESSION_ROUTE_V1 で preempt 済み。ほぼ漏れなし。 |
| **impression follow-up** | 「天聞アークへの感想」「天聞をどう思う」 | 同上で preempt 済み。 |
| **define follow-up** | 「要するに」「要点は」「一言でいうと」「本質は」「もう少し詳しく」 | threadCenter あり時は __isFollowupGeneral で要約・中心・次の一手など deterministic あり。**threadCenter なし**の「要するに/要点は」は LLM に流れている。 |
| **compare / summary / judgement** | 「違いは」「どう違う」「要約して」「〜はどう思う」「良い悪い」 | compare: threadCenter + 言霊秘書なら deterministic。それ以外は LLM。summary: 同上。judgement: 専用 route なしで LLM。 |

**まとめ（NATURAL_GENERAL に残っているもの）**

- **future / 展望系**: パターンは __isFutureOutlook で検知しているが、**preempt はなく LLM に流れている**。generic になりがち。
- **worldview**: 既に generalKind で固定文に差し替え済み（問い返しで一点に寄せる）。追加縮小の優先度は低い。
- **feeling / impression**: 既に preempt で外に出ている。変更不要。
- **define follow-up（要するに/要点/本質）**: threadCenter なしだと **LLM に流れている**。preempt で短文に寄せられる余地あり。
- **compare**: threadCenter ありでは一部 deterministic。**threadCenter なしの「AとBの違い」**は LLM。
- **summary**: 同上。要約だけの問いは LLM。
- **judgement**: 「〜はどう思う」「良い悪い」は **専用 route なし**。system 強化 or 小 preempt の余地あり。

---

## 2. 次に外へ逃がすべき問い（裁定）

| 型 | 裁定 | 理由 |
|----|------|------|
| **future / 展望** | **preempt を 1 本追加** | 既に __isFutureOutlook で検知済み。ここで LLM を呼ばず短文 1 本返すと、generic な「どう見えますか」返しを削れる。 |
| **feeling / impression** | 既存 route のまま（変更なし） | 既に preempt で逃がしている。 |
| **define follow-up（要するに/要点/本質）** | **preempt を 1 本追加** | threadCenter なしでも「要点を聞いている」と一点化する短文で返す。既存 define には乗せず、general 手前の軽い preempt で十分。 |
| **compare / summary** | **既存の follow-up を維持し、必要なら system 強化** | threadCenter ありでは既に deterministic。なしの compare/summary は「中心を一言で」系の短文 preempt を 1 本足すか、Phase2 で検討。 |
| **judgement** | **NATURAL_GENERAL の system 強化で対応** | 「価値判断の問いには、一点の見立てを述べ、質問は 1 つまで」を追記。preempt は作らない。 |

---

## 3. 最小導入順（1〜3 枚のカード）

### カード 1: CARD_NATURAL_GENERAL_SHRINK_V2_FUTURE（最優先）

- **内容**: future/展望系を **preempt** で受け止め、LLM に流さない。
- **条件**: 既存の `__isFutureOutlook` が true のとき（「これから|未来|今後|この先|どうなる|どう見ますか|展望|見通し」）。
- **返答**: 短文 1 本。例: 「【天聞の所見】未来・展望は、いまの一点から見立てる。いま引っかかっている一点を一言で。」
- **routeReason**: 例 `R22_FUTURE_OUTLOOK_V1`（新規）。answerLength: short, answerMode: analysis, answerFrame: one_step。
- **差し込み位置**: NATURAL_GENERAL ブロック内、`__generalOk` かつ LLM を呼ぶ直前（generalKind の計算より前でも可。__isFutureOutlook は既に同ブロック内で使用されているので、その直上で return する分岐を 1 つ追加）。
- **他 route**: support / feeling / impression / continuity / explicit / truth gate / kanagi は触れない。

### カード 2: CARD_NATURAL_GENERAL_SHRINK_V2_ESSENCE（次点）

- **内容**: 「要するに / 要点は / 一言でいうと / 本質は」系で **threadCenter がない**とき、preempt で一点化する。
- **条件**: `!__threadCenterForGeneral` かつ `/(要するに|要点は|一言でいうと|本質は|要は)/u.test(t0)`。
- **返答**: 短文 1 本。例: 「【天聞の所見】要点を聞いています。いまの中心を一言で置いてください。」
- **routeReason**: 例 `R22_ESSENCE_ASK_V1`。answerLength: short, answerMode: analysis, answerFrame: one_step。
- **差し込み位置**: __threadCenterForGeneral を取得したあと、__isFollowupGeneral の処理より前。threadCenter がある場合は従来どおり follow-up 処理へ。

### カード 3: CARD_NATURAL_GENERAL_SHRINK_V2_SYSTEM_JUDGE（任意・低優先）

- **内容**: NATURAL_GENERAL の **system 文**に 1 行追加するだけ。
- **文言例**: 「価値判断（どう思うか・良い悪い）の問いには、一点の見立てを述べ、質問は 1 つまで。」
- **差し込み位置**: __GEN_SYSTEM_CLEAN または GEN_SYSTEM の末尾付近。LLM の振る舞いだけの変更で、route は増やさない。

---

## 4. Acceptance

- [ ] **カード 1（FUTURE）**: 「これからどうなる」「展望は」等で NATURAL_GENERAL_LLM_TOP の LLM が呼ばれず、短文 1 本と R22_FUTURE_OUTLOOK_V1（または同等）が返る。support / feeling / impression / continuity / explicit / truth gate / kanagi の挙動は変わらない。
- [ ] **カード 2（ESSENCE）**: threadCenter なしで「要するに」「要点は」等を送ると、LLM に流れず短文 1 本と R22_ESSENCE_ASK_V1（または同等）が返る。threadCenter ありのときは従来どおり follow-up 処理。
- [ ] **カード 3（SYSTEM_JUDGE）**: 実装した場合、価値判断系の問いで回答が「一点の見立て＋質問 1 つ」に寄りやすい（観測可能ならログで確認）。
- [ ] 既存の generalKind（counsel / worldview / short_moral）による固定文・gate の front 優先（greeting / meta_conversation / present_state / next_step）は変更しない。
- [ ] `npm run build` が成功する。

---

## 5. Rollback

- **カード 1**: 追加した future/展望用の `if (__isFutureOutlook) { return res.json(...); }` ブロックを削除する。__isFutureOutlook の定義は既存のまま（prompt 用）残してよい。
- **カード 2**: 追加した「要するに/要点は」系の `if (!__threadCenterForGeneral && /(要するに|…)/.test(t0)) { return res.json(...); }` を削除する。
- **カード 3**: 追加した system の 1 行を削除する。

---

## 参照

- NATURAL_GENERAL ブロック: chat.ts 約 6817 行〜。
- generalKind: 約 7097 行。__isFutureOutlook: 約 7202 行。__threadCenterForGeneral: 約 7104 行。
- CARD_FEELING_AND_IMPRESSION_ROUTE_V1: 約 7060 行。CARD_SUPPORT_ROUTE_SPLIT_V1: 約 821 行。
- gates_impl.ts: classifyGeneralFrontKind / classifyTenmonIntent（greeting, meta_conversation, present_state, next_step の post-LLM 上書き）。
