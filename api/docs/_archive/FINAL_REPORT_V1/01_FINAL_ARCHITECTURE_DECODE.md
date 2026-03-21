# 01_FINAL_ARCHITECTURE_DECODE — 完成版 全体構造デコード

**根拠**: リポジトリ実体（ファイルパス・行数）/ 確定観測。憶測禁止。

---

## 全体構造の完全解剖

```
POST /api/chat (契約聖域・削除・改名・意味変更禁止)
  │
  ├─ body: message, threadId, ...
  ├─ loadThreadCore(threadId)     → threadCoreStore.ts
  ├─ tenmonBrainstem(message, threadCore, explicitLengthRequested, bodyProfile) → tenmonBrainstem.ts
  │     → routeClass, answerLength, answerMode, answerFrame, forbiddenMoves, explicitLengthRequested
  │
  ├─ chat.ts 内の直列 preempt 連鎖（上から下の順で最初に match した return で終了）:
  │     support → explicit → book placeholder → feeling/impression → … 
  │     → __oneSoundPayloadB (DEF_FASTPATH 直前) → reply(__oneSoundPayloadB)
  │     → DEF_FASTPATH_VERIFIED_V1 (kokuzo DB 参照 define)
  │     → … → __oneSoundPayloadA (DEF_CONCEPT_UNFIXED 直前) → reply(__oneSoundPayloadA)
  │     → DEF_CONCEPT_UNFIXED_V1
  │     → R22_ESSENCE_ASK_V1 / R22_COMPARE_ASK_V1 (固定 1 文)
  │     → … → NATURAL_GENERAL_LLM_TOP / DEF_LLM_TOP 等
  │
  ├─ gates_impl: __tenmonGeneralGateResultMaybe, buildKnowledgeBinder, applyKnowledgeBinderToKu
  ├─ threadCoreStore: loadThreadCore, saveThreadCore (api/src/core/threadCoreStore.ts, 153 行)
  ├─ threadCenterMemory: upsertThreadCenter, getLatestThreadCenter
  ├─ knowledgeBinder: buildKnowledgeBinder, applyKnowledgeBinderToKu (304 行)
  │     → notionCanon, thoughtGuide, scriptureLineage, bookContinuation 参照
  ├─ sourceGraph: resolveGroundingRule, getSourceGraphNode (90 行)
  └─ responseProjector: (162 行) — 最終 response 整形の一部経路
```

**事実**: api/src/db/index.ts に getDbPath(kind), getDb(kind) が存在。kokuzo 用パスは getDbPathByKind で解決される。DB 実測は /opt/tenmon-ark-repo/kokuzo.sqlite で全テーブル 0 件。

---

## 三位一体（裁定核 / 思考核 / 表現核）の現状

| 核 | 実体（ファイル名・役割） | 状態 |
|----|---------------------------|------|
| **裁定核** | tenmonBrainstem.ts (260 行): message → routeClass, answerLength, answerMode, answerFrame, forbiddenMoves。chat.ts: 上から下の if/return で route 決定。 | 存在。複数 route が並列にあり、順序で優先が決まる。DEF_LLM_TOP / NATURAL_GENERAL_LLM_TOP が残存。 |
| **思考核** | knowledgeBinder.ts (304 行): routeReason 等から sourcePack, notionCanon, thoughtGuideSummary, lineageSummary, bookContinuation を ku に反映。notionCanon.ts (84), scriptureLineageEngine.ts (77), bookContinuationMemory.ts (158) を参照。 | 存在。DB 0 のため lineage/ledger/book の「中身」は空。canon JSON は読まれている。 |
| **表現核** | responseProjector.ts (162 行)。chat.ts 内の __body* 変数群・abstractFrameEngine の固定文・__buildKotodamaOneSoundPayloadV1 の response。 | 存在。多くの経路で固定文。explicit は字数帯テンプレ。 |

---

## 責務整理（ファイル名と行数で固定）

| モジュール | 責務（実装実体から） | 肥大/未接続 |
|------------|----------------------|-------------|
| chat.ts (12,934 行) | ルーティング・preempt・define・explicit・book placeholder・essence/compare ask・judgement・一音複数ブロック・LLM  fallback。 | **肥大**: 1 ファイルに全責務が集中。 |
| gates_impl.ts (1,698 行) | __tenmonGeneralGateResultMaybe, buildKnowledgeBinder の適用、release 時の ku 整形。 | 責務は明確。肥大は中程度。 |
| tenmonBrainstem.ts (260 行) | message から routeClass / answerLength / answerMode / explicitLengthRequested / forbiddenMoves。 | 責務は明確。未肥大。 |
| knowledgeBinder.ts (304 行) | routeReason 等から sourcePack, notionCanon, thoughtGuide, lineage, bookContinuation を ku にマージ。 | 責務は明確。DB 0 により「読む」結果が空の経路あり。 |
| responseProjector.ts (162 行) | 最終 response の整形の一部。 | 経路が限定的。 |
| threadCoreStore.ts (153 行) | loadThreadCore, saveThreadCore。center_reason JSON で contract 保存。 | 責務は明確。thread_center_memory 0 のため「読む」が空。 |
| bookContinuationMemory.ts (158 行) | getBookContinuation, upsertBookContinuation。 | 責務は明確。book_continuation_memory 0 のため未駆動。 |

---

## どこが肥大し、どこが未接続か

- **肥大**: chat.ts が 12,934 行で、ルート判定・preempt・define・explicit・book・essence/compare・judgement・一音（V1/V2/V4 複数ブロック）・LLM 経路をすべて内包している。
- **未接続**: (1) DB 全テーブル 0 件 → saveThreadCore / upsertThreadCenter / writeScriptureLearningLedger / upsertBookContinuation の「書いた結果」が永続化されていないか、別 DB を参照している。(2) thread_center_memory 0 → loadThreadCore で取得する「前の center」が常に空。(3) KHS（khs_laws, khs_units, kokuzo_pages）0 → 言灵中枢の実体が未投入。

---

## 薄い orchestrator 化の必要性

**裁定**: 中長期では、chat.ts を「どの handler に渡すか」だけに縮小し、本文生成・正典参照・記憶の読み書きを core に委譲する薄い orchestrator 化は有効である。ただし今回の最短ボトルネックは「統合・実体・表面」であり、大規模リファクタは acceptance 未達リスクが高い。薄い orchestrator 化は P4 以降のフェーズで、1 カード 1 責務で進める。

**理由**: 既通過主権を壊さない条件の下では、まず DB 実体・一音統合・follow-up 仕様を確定する方が、世界最先端級への最短経路である（00 の主裁定と一致）。

---

## ADR で封印すべき境界

- **契約聖域**: /api/chat, /api/audit の削除・改名・意味変更禁止。追加のみ可。
- **出力形式**: decisionFrame.ku は object 固定。decisionFrame.llm は null 固定。
- **KHS 中枢**: KHS のみが言灵中枢定義領域。外部体系は写像層に限定。doc + pdfPage のない断言は禁止（KHS CORE CONSTITUTION）。
- **Runtime LLM**: LLM を前提にした提案は禁止。既存の DEF_LLM_TOP / NATURAL_GENERAL_LLM_TOP は「残す」が、新規に LLM 依存を増やさない。

**次の1枚**: [02_FINAL_RESPONSE_INTELLIGENCE_REPORT.md](./02_FINAL_RESPONSE_INTELLIGENCE_REPORT.md)
