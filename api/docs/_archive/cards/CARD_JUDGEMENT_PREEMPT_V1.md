# CARD_JUDGEMENT_PREEMPT_V1 設計

## 目的

- **judgement 系**のうち、短文で即答できる問いを NATURAL_GENERAL_LLM_TOP から外す。
- 「良い？悪い？」「どう思う？」の **generic 化**を減らす。

**本ドキュメントは設計と最小導入方針のみ。対象は chat.ts のみ。新規ファイルは作らない。**

---

## 前提

- CARD_JUDGEMENT_COMPARE_ROUTE_V1_JUDGE_SYSTEM により、__GEN_SYSTEM_CLEAN に「価値判断の問い（どう思うか・良い悪い）には、まず一点の見立てを述べ、質問は1つまで。」が既に追加済み。
- 感想系「天聞をどう思う」「アークをどう思う」は CARD_FEELING_AND_IMPRESSION_ROUTE_V1 で preempt 済み。本カードでは触れない。

---

## 1. preempt で切るべき judgement の条件

| 条件 | 内容 |
|------|------|
| **文長** | 極短（例: `t0.length <= 20`）に限定し、「〇〇についてどう思う？」のような主題付きは LLM に流す。 |
| **パターン** | `/(^|\\s)(良い\?|悪い\?|どう思う\?|どう思いますか\?)(\\s|$)/u` または、先頭一致で `(/^(良い|悪い|どう思う|どう思いますか)[？?]?$/u` に近い形。 |
| **除外** | 感想・印象と被らないようにする。`/(天聞|アーク)(を|に)(は)?どう思う|感想/u` が含まれる場合は **preempt しない**（既存 IMPRESSION / FEELING に任せる）。 |
| **threadCenter** | 未使用でよい。threadCenter ありでも「良い？」だけの問いなら preempt 可。逆に「中心についてどう思う？」は文が長いので preempt しない方針でもよい。 |

**返答文案（例）**

- 良い・悪い系: 「【天聞の所見】良い悪いの一点を、いまの文脈で絞ると答えが締まります。どれについての良し悪しですか、一言で。」
- どう思う系: 「【天聞の所見】いまの一点を置くと、見立てが返ります。何について思うか、一言で。」

**routeReason**: `R22_JUDGEMENT_PREEMPT_V1`  
**answer profile**: answerLength: "short", answerMode: "analysis", answerFrame: "one_step"

**差し込み位置**: __threadCenterForGeneral 取得後、既存の general 用 preempt（essence / compare / future 等）の近く。feeling / impression の **後**（感想は既存 preempt で処理済みのため）。

---

## 2. system 強化で十分な judgement の条件

| 条件 | 内容 |
|------|------|
| **主題付き・文が長い** | 「〇〇についてどう思う？」「〇〇と△△どちらが良い？」等は、既存の __GEN_SYSTEM_CLEAN の「価値判断の問いには、まず一点の見立てを述べ、質問は1つまで。」で LLM に任せる。preempt しない。 |
| **曖昧だが文が長い** | 20 字超の judgement っぽい文は、preempt 対象にしない。 |

---

## 3. routeReason

| 経路 | routeReason |
|------|-------------|
| 新 preempt（短文 judgement のみ） | `R22_JUDGEMENT_PREEMPT_V1` |
| それ以外の judgement | 従来どおり `NATURAL_GENERAL_LLM_TOP`（system 強化のみ）。 |

---

## 4. 最小導入順

### カード 1 枚: CARD_JUDGEMENT_PREEMPT_V1

- **発火条件（案）**: 以下をすべて満たすときだけ preempt する。
  - `!(天聞|アーク)(を|に)(は)?どう思う|(への)?感想/u.test(t0)`（感想・印象は除外）
  - `t0.length <= 20`
  - `/(良い|悪い|どう思う|どう思いますか)[？?]?\s*$/u.test(t0.trim())` または、先頭から判定して「良い？」「悪い？」「どう思う？」「どう思いますか？」のいずれかとみなせる短い文。
- **返答**: 上記「返答文案」のとおり。良い・悪い系とどう思う系で 1 文ずつ切り替えてもよいし、共通 1 文でもよい（例: 「一点を置くと答えが締まります。何についての良し悪し／思うか、一言で。」）。
- **差し込み**: R22_ESSENCE_ASK_V1 / R22_COMPARE_ASK_V1 の近く、または R22_COMPARE_FOLLOWUP_V1 の後。feeling / impression preempt より後であればよい。

**オプション（Phase2）**: 「良い？悪い？」のみ先に preempt（1 文）→ 様子見のあと「どう思う？」だけの短い文を追加、など 2 段階に分けてもよい。

---

## 5. Acceptance

- [ ] 極短い「良い？」「悪い？」「どう思う？」「どう思いますか？」で、NATURAL_GENERAL_LLM_TOP の LLM が呼ばれず、短文 1 本と `routeReason: "R22_JUDGEMENT_PREEMPT_V1"` が返る。
- [ ] 「天聞をどう思う」「アークへの感想」等は従来どおり feeling / impression preempt に乗り、本 preempt は発火しない。
- [ ] 「〇〇についてどう思う？」（文長 20 字超など）は preempt せず、従来どおり LLM ＋ 価値判断の system 1 行で処理される。
- [ ] support / define / feeling / impression / continuity / explicit / future / essence / compare / truth gate / kanagi の挙動は変わらない。
- [ ] `npm run build` が成功する。

---

## 6. Rollback

- **削除**: 追加した `if ( judgement 条件 ) { return res.json(..., routeReason: "R22_JUDGEMENT_PREEMPT_V1"); }` ブロックを削除する。
- **復元後**: 短文 judgement も従来どおり NATURAL_GENERAL_LLM_TOP に流れ、__GEN_SYSTEM_CLEAN の価値判断 1 行のみで扱う。

---

## 参照

- __GEN_SYSTEM_CLEAN の価値判断 1 行: chat.ts 約 7321 行（CARD_JUDGEMENT_COMPARE_ROUTE_V1_JUDGE_SYSTEM）。
- CARD_FEELING_AND_IMPRESSION_ROUTE_V1: 約 7060 行。感想・印象はここで preempt。
- R22_ESSENCE_ASK_V1 / R22_COMPARE_ASK_V1: 約 7196 / 7222 行付近。
