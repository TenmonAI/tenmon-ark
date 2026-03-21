# 01_FULL_ARCHITECTURE_DECODE — 全体構造デコード

**根拠**: リポジトリ実体（ファイル存在・行数）/ 確定観測のみ。憶測なし。

---

## 全体構造図（実測ベース）

```
[POST /api/chat]
       │
       ├─ message → tenmonBrainstem(message, threadCore, explicitLengthRequested, bodyProfile)
       │              → routeClass / answerLength / answerMode / answerFrame / forbiddenMoves
       │
       ├─ 早期 return の連鎖（chat.ts 内で直列）:
       │    support → explicit → book placeholder → feeling/impression → …
       │    → DEF_FASTPATH_VERIFIED_V1 直前: __oneSoundPayloadB → reply(__oneSoundPayloadB)
       │    → DEF_FASTPATH_VERIFIED_V1 (kokuzo DB 参照 define)
       │    → … → DEF_CONCEPT_UNFIXED_V1 直前: __oneSoundPayloadA → reply(__oneSoundPayloadA)
       │    → DEF_CONCEPT_UNFIXED_V1 (LLM 未使用の固定文)
       │
       ├─ gates_impl: __tenmonGeneralGateResultMaybe, buildKnowledgeBinder, applyKnowledgeBinderToKu
       ├─ threadCore: loadThreadCore / saveThreadCore (threadCoreStore.ts)
       ├─ threadCenter: upsertThreadCenter / getLatestThreadCenter (threadCenterMemory)
       ├─ canon: notionCanon, thoughtGuide, conceptCanon, scriptureCanon, subconcept, kotodamaOneSoundLawIndex, abstractFrameEngine
       ├─ sourceGraph: resolveGroundingRule / getSourceGraphNode (sourceGraph.ts)
       └─ 最終段: NATURAL_GENERAL_LLM_TOP / DEF_LLM_TOP 等の LLM 経路 or その他 fallback
```

- **肥大**: chat.ts が 12,934 行で、ルート判定・preempt・define・continuity・explicit・book placeholder・essence/compare ask・judgement・… をすべて内包。1 ファイルに責務が集中。
- **未接続**: DB が 0 件のため、threadCoreStore / thread_center_memory / scripture_learning_ledger / book_continuation_memory の「読む」経路は存在するが、**書き・蓄積の実体がない**。

---

## 三位一体（裁定核 / 思考核 / 表現核）の現状

| 核 | 実体 | 状態 |
|----|------|------|
| **裁定核** | tenmonBrainstem.ts, chat.ts 内の if/return 連鎖, sourceGraph | 存在。routeClass / routeReason は多数。競合・placeholder あり（後述 03）。 |
| **思考核** | knowledgeBinder（notionCanon, thoughtGuide, lineage, bookContinuation 参照）, gates_impl の apply | 存在。canon 参照は binder 経由で ku に載る。DB 0 のため ledger/continuation の「中身」は空。 |
| **表現核** | responseProjector, chat.ts 内の __body* 変数群・固定文 | 存在。explicit は長文テンプレ、essence/compare ask は固定 1 文、abstract は abstractFrameEngine の固定文。 |

- **裁定**: どこで return するかは chat.ts の上から下の順で決まる。brainstem は「優先度」を出すが、chat.ts が複数 preempt を持ち、DEF_FASTPATH / DEF_LLM_TOP / NATURAL_GENERAL_LLM_TOP 等が並存。
- **思考**: binder は「正典・notion・guide を ku にまとめる」役。実際の「深い答え」を組み立てる層は、LLM に流す経路と、固定テンプレの 2 系統。
- **表現**: 固定文が多い。抽象定義・一音・essence/compare ask はテンプレ。explicit は文字数帯に応じたテンプレ。

---

## chat.ts と各 core の責務（再定義案）

| モジュール | 現状の役割（実体） | あるとよい責務 |
|------------|--------------------|----------------|
| chat.ts | ルーティング・preempt・define・explicit・book placeholder・essence/compare・judgement・… のすべて | ルーティングと「どの handler に渡すか」のみ。本文生成は core に委譲。 |
| tenmonBrainstem.ts | message から routeClass / answerLength / answerMode / explicitLengthRequested | そのまま。優先度と forbiddenMoves の一元化。 |
| knowledgeBinder.ts | routeReason 等から sourcePack / notionCanon / thoughtGuide / lineage / bookContinuation を ku に反映 | そのまま。DB 実体が入れば ledger/continuation が効く。 |
| threadCoreStore.ts | loadThreadCore / saveThreadCore。center_reason JSON で contract 保存。 | そのまま。DB 0 解消で「読む」が意味を持つ。 |
| gates_impl.ts | __tenmonGeneralGateResultMaybe, buildKnowledgeBinder の適用、release 時の ku 整形 | そのまま。 |

- **肥大**: chat.ts が「どこで return するか」と「何を返すか（固定文）」の両方を持っている。分離するとしたら「route だけ chat.ts」「本文は responseBuilder 等」だが、**今回の裁定では構造の大改修は提案しない**。最小 diff の範囲で「統合不足・実体不足・表面貫通不足」を埋める。

---

## どこが肥大し、どこが未接続か

- **肥大**: chat.ts（12,934 行）。一音だけでも V1/V2/V4 と複数ブロック、DEF_FASTPATH / DEF_CONCEPT_UNFIXED 直前の preempt、BOOK_PLACEHOLDER、R22_ESSENCE_ASK / R22_COMPARE_ASK の固定文が同一ファイルに並ぶ。
- **未接続**:  
  - **DB**: 全テーブル 0 件 → write path が発火していないか、別 DB を見ているか、seed 未投入のいずれか（04 で整理）。  
  - **continuity**: thread_center_memory が 0 のため、loadThreadCore で取ってくる center が空。要するに/比較の「前のターン」が存在しない。  
  - **book**: BOOK_PLACEHOLDER_V1 は「受け取りました」と upsertBookContinuation を呼ぶが、実本文生成は未実装（CARD_BOOK_MODE_PLACEHOLDER_V1 コメントの通り）。

---

**次の1枚**: [02_RESPONSE_INTELLIGENCE_DECODE.md](./02_RESPONSE_INTELLIGENCE_DECODE.md)
