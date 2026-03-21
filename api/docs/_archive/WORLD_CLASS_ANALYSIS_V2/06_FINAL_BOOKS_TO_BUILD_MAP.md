# 06_FINAL_BOOKS_TO_BUILD_MAP — 完成版 書籍→構築マップ

**根拠**: 基準文書（Ark Equation, BOOKS SUPERPACK, KHS CORE CONSTITUTION, Dev Core, DECISIONS_LOG）と 00–05 の裁定。憶測禁止。

---

## ARCH-CA / API-MASTER / ARCH-EA / SRE / DDIA / KHS 憲法を、どのカードに昇格させるか

| 文書 | 昇格先カード / 接続 |
|------|---------------------|
| **ARCH-CA** | 全カードの前提。契約聖域（/api/chat, /api/audit）、decisionFrame.ku object / llm null 固定。CARD_* では「既通過主権を壊さない」「追加のみ可」として全カードに適用。 |
| **API-MASTER** | CARD_ROUTE_SOVEREIGNTY_CONSOLIDATION_V1。route 一覧・優先順序の文書化、境界の固定。03 の route 固定順を 1 ファイルにまとめる。 |
| **ARCH-EA** | 07_FINAL_REARCHITECT_PLAN / 08_FINAL_CURSOR_ACTION_PROMPT。各カードに acceptance / 封印条件を明示。PASS 以外は封印禁止。 |
| **SRE / DDIA** | CARD_DB_REALITY_CHECK_AND_SEED_V1。DB パス・migration・write 発火の観測。イベント追跡は DB reality 解消後の CARD で扱う。 |
| **KHS CORE CONSTITUTION** | KHS を唯一の言灵中枢とする。doc + pdfPage のない断言は禁止。DB に khs_laws / khs_units / kokuzo_pages が存在し 1 件以上書けることを DB reality カードで確認したのち、書籍知識は丸ごと DB 投入せず理解→判断→カード化→Law/Alg/acceptance へ昇格（BOOKS SUPERPACK）。 |

---

## 「本を読んで終わり」ではなく、Law / Alg / acceptance / ADR / route / schema / event log への昇格

- **Law / Alg**: 正典（canon JSON）と KHS。現状 KHS 実体は「no such table」。昇格は DB reality 解消後、KHS に doc + pdfPage を伴う形で投入するか、既存 canon を Law/Alg として明示参照する ADR から。
- **acceptance**: 各改修カードに 1 つ以上明示。07/08 に記載。
- **ADR**: 契約聖域・decisionFrame 固定・KHS 中枢・Runtime LLM 禁止を 01 に記載し、ADR 文書に昇格するカードを後続で作成可。
- **route**: 03 の主権一覧・固定順を doc 化。CARD_KOTODAMA_ONE_SOUND_ROUTE_UNIFY_V1 で一音を V1 に統合。
- **schema**: kokuzo_schema.sql。変更は migration と acceptance で検証。CARD_DB_REALITY_CHECK_AND_SEED_V1 で対象 DB への適用を確認。
- **event log**: synapse_log はテーブル不在。DB reality 解消後に write 発火を確認するカードで扱う。

---

## DECISIONS_LOG と整合した next_action

- DECISIONS_LOG: ARCH-CA と API-MASTER は adopt 済み。次は昇格カード 3 枚作成。
- **本レポートでの next_action**: (1) **次の1枚**は CARD_KOTODAMA_ONE_SOUND_ROUTE_UNIFY_V1（09 で再掲）。(2) 2 枚目は CARD_DB_REALITY_CHECK_AND_SEED_V1 または CARD_FOLLOWUP_INTELLIGENCE_DEEPEN_V1 のいずれか。(3) 3 枚目は CARD_CANON_SURFACE_PENETRATION_V1 または CARD_ROUTE_SOVEREIGNTY_CONSOLIDATION_V1。07 の P0–P2 と対応。

---

## 1 冊 = 3 カード原則が今の構築にどう効くか

- 書籍知識は「丸ごと DB 投入せず、天聞AI側で理解→判断→カード化→Law/Alg/acceptance へ昇格」（BOOKS SUPERPACK）。1 冊から複数カード（理解・判断・昇格）を出す原則と整合。
- 現状は DB が「no such table」のため、書籍由来データを KHS に昇格する前に、**DB に 1 テーブル存在し 1 件書けること**を CARD_DB_REALITY_CHECK_AND_SEED_V1 で証明する。その後に 1 冊 = 3 カードで昇格する改修を追加。

**次の1枚**: [07_FINAL_REARCHITECT_PLAN.md](./07_FINAL_REARCHITECT_PLAN.md)
