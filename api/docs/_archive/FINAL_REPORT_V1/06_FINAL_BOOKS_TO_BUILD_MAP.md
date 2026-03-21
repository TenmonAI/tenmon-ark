# 06_FINAL_BOOKS_TO_BUILD_MAP — 完成版 書籍→構築マップ

**根拠**: 基準文書（Ark Equation, BOOKS SUPERPACK, KHS CORE CONSTITUTION, Dev Core, DECISIONS_LOG）の指示と、本レポート 00–05 の裁定。憶測禁止。

---

## ARCH-CA / API-MASTER / ARCH-EA / ARCH-FUND / SRE / DDIA / KHS constitution の接続

| 文書 | TENMON-ARK 実装との接続（事実・契約） |
|------|----------------------------------------|
| **ARCH-CA** | /api/chat, /api/audit は契約聖域。削除・改名・意味変更禁止。追加のみ可。decisionFrame.ku object 固定、decisionFrame.llm null 固定。本レポートの「既通過主権を壊さない」「最小 diff」と一致。 |
| **API-MASTER** | 互換進化・境界の固定。route 一覧と優先順序の文書化（03）、ADR で封印すべき境界（01）は API-MASTER の範囲に含まれる。 |
| **ARCH-EA** | Fitness・ADR。acceptance PASS 以外は封印。各カードに acceptance / 封印条件を明示（07, 08）。 |
| **ARCH-FUND** | （参照のみ。本レポートでは実装カードとの直接対応は 00–05 の裁定に委ねる。） |
| **SRE / DDIA** | /api/audit の同定性、SLO、Error Model、イベント追跡。DB 0 件は「永続化の未発火」として observability の対象。CARD_DB_REALITY_CHECK_AND_SEED_V1 で write path を確認することは SRE 的である。 |
| **KHS CORE CONSTITUTION** | KHS のみが言灵中枢定義領域。外部体系は写像層。doc + pdfPage のない断言は禁止。現状 kokuzo_pages / khs_laws / khs_units は 0 件であり、実体投入は「昇格」の前提。書籍知識は丸ごと DB 投入せず、先に天聞AI側で理解→判断→カード化→Law/Alg/acceptance へ昇格（BOOKS SUPERPACK）。 |

---

## 「本を読んで終わり」ではなく、Law / Alg / acceptance / ADR / route / schema / event log への昇格

- **Law / Alg**: 正典（canon JSON）と KHS は、現状「読む」経路はあるが KHS 実体は 0 件。昇格は「KHS に doc + pdfPage を伴う形で投入」または「既存 canon を Law/Alg として明示的に参照する ADR」から始める。本レポートではまず DB reality の解消を優先する。
- **acceptance**: 各改修カードに acceptance を 1 つ以上明示。PASS 以外は封印（07, 08）。
- **ADR**: 契約聖域・decisionFrame 固定・KHS 中枢・Runtime LLM 禁止を ADR で封印（01 に記載）。
- **route**: 03 で主権 route / 競合 route / 固定順を整理。一音は KOTODAMA_ONE_SOUND_GROUNDED_V1 に統一する route 統合カードを実施。
- **schema**: kokuzo_schema.sql は未封印差分に含まれる。変更は migration と acceptance で検証する。
- **event log**: synapse_log が 0 件のため、現時点では event の永続化が未発火。DB reality 解消後に write 発火を確認する。

---

## DECISIONS_LOG と整合した next_action

- **DECISIONS_LOG**: ARCH-CA と API-MASTER は既に adopt 済み。次アクションは昇格カード 3 枚作成とある。
- **本レポートでの next_action**: (1) **次の1枚**は CARD_DB_REALITY_CHECK_AND_SEED_V1 に固定（09 で再掲）。(2) その次は CARD_KOTODAMA_ONE_SOUND_ROUTE_UNIFY_V1。(3) 3 枚目は CARD_FOLLOWUP_INTELLIGENCE_DEEPEN_V1 または CARD_CANON_SURFACE_PENETRATION_V1 のいずれかを acceptance 定義後に実施。昇格カード 3 枚は、07 の P0–P2 に対応させる。

---

## 1 冊 = 3 カード原則が今の構築にどう効くか

- 書籍知識は「丸ごと DB 投入せず、先に天聞AI側で理解→判断→カード化→Law/Alg/acceptance へ昇格」する（BOOKS SUPERPACK）。つまり 1 冊から複数カード（理解カード・判断カード・昇格カード）を出す原則と整合する。
- 現時点では「DB 実体が 0 件」のため、書籍由来のデータを KHS / ledger に昇格する前に、**DB に 1 件書けることを証明する** CARD_DB_REALITY_CHECK_AND_SEED_V1 が先行する。その後に、1 冊 = 3 カードで昇格する改修を順次追加する。

**次の1枚**: [07_FINAL_REARCHITECT_PLAN.md](./07_FINAL_REARCHITECT_PLAN.md)
