# 01_FINAL_ARCHITECTURE_DECODE — 完成版 構造完全解剖

**根拠**: ULTIMATE 01_FULL_ARCHITECTURE_DECODE、FULL_CONSTRUCTION_AUDIT の key_file_sizes / chat_summary / module metrics、FULL_ARCH_SUMMARY。憶測禁止。

---

## 全体構造の完全解剖

- **入口**: POST /api/chat（契約聖域。削除・改名・意味変更禁止。）
- **裁定核**: tenmonBrainstem（api/src/core/tenmonBrainstem.ts, 260 行）+ chat.ts 直列の route 分岐。decisionFrame.ku は object 固定、decisionFrame.llm は null 固定。
- **思考核**: knowledgeBinder（api/src/core/knowledgeBinder.ts, 304 行）。根拠束生成。continuity_hits=63, canon_hits=68（module metrics）。
- **表現核**: responseProjector（api/src/projection/responseProjector.ts, 162 行）。返答骨格整形。continuity_hits=5, canon_hits=7。
- **継続・記憶**: threadCoreStore（api/src/core/threadCoreStore.ts, 153 行）、bookContinuationMemory（api/src/core/bookContinuationMemory.ts, 158 行）。threadCoreStore は continuity_hits=43。DB は「no such table」のため実蓄積は未確認。
- **正典・写像**: notionCanon（84 行）、scriptureLineageEngine（77 行）、sourceGraph（90 行）、kotodamaOneSoundLawIndex（295 行）、abstractFrameEngine（134 行）。canon JSON 群は存在。

---

## 三位一体（裁定核 / 思考核 / 表現核）の現状

| 核 | 現状 | ファイル |
|----|------|----------|
| 裁定核 | chat.ts に入口 routing と最終表現責務が集中。brainstem は define/analysis 等の routeClass を返すが、routeReason の多数分岐は chat.ts 内に直列で存在。 | chat.ts, tenmonBrainstem.ts |
| 思考核 | binder は存在し canon/continuity を参照。ただし DB 実体が無いため KHS 由来の束は空の可能性。 | knowledgeBinder.ts |
| 表現核 | projector は存在。固定文・one-question clamp が効く。canon の一句が本文に貫通する経路は限定的。 | responseProjector.ts |

---

## 責務整理（chat.ts / gates_impl / brainstem / binder / projector / threadCoreStore / bookContinuationMemory）

| モジュール | 責務 | 肥大/未接続 |
|------------|------|-------------|
| chat.ts | 入口 routing、多数の routeReason 分岐、preempt 返却、binder/projector 呼び出し、threadCore 保存、BOOK_PLACEHOLDER 返却。 | **肥大**: 12,934 行。入口と最終表現が同居。責務再分離の必要性あり。 |
| gates_impl.ts | 軽量事実質問・日付・曜日・時刻、generic fallback 除去、routeClass fallback 等。 | 1,698 行。chat から呼ばれる。 |
| tenmonBrainstem | 最終人格表現の中核。define/analysis/support/fallback 等の routeClass。 | 260 行。chat 直列。 |
| knowledgeBinder | 根拠束生成。routeReason に応じた canon/notion 参照。 | 304 行。DB 実体無しだと KHS 束は空になり得る。 |
| responseProjector | 返答骨格整形。route に応じた末尾整形。 | 162 行。 |
| threadCoreStore | 継続人格核の読み書き。 | 153 行。DB「no such table」のため永続化未確認。 |
| bookContinuationMemory | book 専用継続。 | 158 行。BOOK_PLACEHOLDER_V1 は placeholder 返却のみで本文未生成。 |

---

## どこが肥大し、どこが未接続か

- **肥大**: chat.ts（12,934 行、327 routeReason、115 placeholder）。一音 V1/V2/V4、DEF_FASTPATH、BOOK_PLACEHOLDER、R22_* 等の分岐がすべて chat.ts に直列。
- **未接続**: (1) DB テーブルが「no such table」のため、thread_center / book_continuation / khs / kokuzo の write/read が別 DB または未適用の可能性。(2) thought guide / sourceThoughtCore は priority route presence で NO（chat_summary）。(3) binder→projector の「正典一句」が response に必ず含まれる経路は限定的。

---

## 薄い orchestrator 化の必要性

- **裁定**: 01_FULL_ARCHITECTURE_DECODE の責務再定義のとおり、chat.ts を「薄い orchestrator」にし、route ごとの本文生成をモジュールに委譲するのは中長期の目標。直近では「既通過主権を壊さない」ため、一音統合・follow-up 深化・DB reality を優先し、大規模リファクタは P4 以降とする。

---

## ADR で封印すべき境界

- /api/chat, /api/audit は契約聖域。削除・改名・意味変更禁止。追加のみ可。
- decisionFrame.ku は object 固定。decisionFrame.llm は null 固定。
- KHS を唯一の言灵中枢とし、外部体系は写像層。Runtime LLM を前提にした中枢定義禁止。
- dist 直編集禁止。最小 diff / 1 変更 = 1 検証。acceptance PASS 以外は封印禁止。

**次の1枚**: [02_FINAL_RESPONSE_INTELLIGENCE_REPORT.md](./02_FINAL_RESPONSE_INTELLIGENCE_REPORT.md)
