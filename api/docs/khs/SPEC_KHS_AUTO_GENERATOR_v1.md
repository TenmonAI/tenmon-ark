# SPEC_KHS_AUTO_GENERATOR_v1.md
# Purpose: kokuzo.sqlite 内の KHS正典（NOTION/NAS）から、監査可能なKHS中枢生成物を自動生成する仕様（v1）。
# Design goals: Π↑（追跡）/ ΔZ↓（混入遮断）/ I_A↑（再現）/ Φ↑（裁定価値）
# Non-negotiables: 推測禁止 / verifiedのみ中枢 / UNRESOLVED隔離 / doc/pdfPage実在 / 1変更=1検証

## 0. 絶対法（NON-NEGOTIABLES）
1) **KHS（言灵秘書）以外の理論・語源・ニューエイジ解釈を混入しない。**
2) 中枢（KHS）へ入れてよい根拠は、次のどちらかのみ（pdfPageは数値必須）：
   - `doc=NOTION:PAGE:<pageId> pdfPage=<number>`
   - `doc=NAS:PDF:<name>:<hash> pdfPage=<number>`
   ※ `? / null / 欠落 / 非数値` は中枢禁止。UNRESOLVEDへ隔離。
3) truth_axis は固定10軸のみ（追加禁止）：
   - cycle / polarity / center / breath / carami / order / correspondence / manifestation / purification / governance
4) Unitは「1主張=1Unit」。
   - 解釈を増やさない
   - 条件節（ただし/場合/例外）を落とさない
5) relations（関係）は推測生成禁止。
   - 関係宣言Unit（MAP/LAW）に根拠がある場合のみ付与。
6) water_fire_vector は自由作文禁止（固定トークンのみ）。根拠がある場合のみ確定。

---

## 1. 入力（Input Contract）

### 1.1 対象DB
- 入力DB: `kokuzo.sqlite`

### 1.2 正規化ビュー（列名揺れ耐性：必須）
構築班は実列名が何であれ、以下を満たすビュー（または一時テーブル）を作る。

- `khs_pages_norm`（必須）
  - doc TEXT
  - title TEXT
  - content_text TEXT
  - pdfPage INTEGER
  - domain TEXT（無ければNULL）
  - collection TEXT（無ければNULL）
  - updated_at TEXT（無ければNULL）

- `khs_links_norm`（推奨）
  - from_doc TEXT
  - to_doc TEXT

以後の抽出は `*_norm` を参照する（＝壊れない）。

---

## 2. Batch入力（PageDoc抽出規則）
- 解析班納品 `KHS_BATCH_DEFINITION_v1.tsv` の selector_sql により、
  構築班が pageDoc リスト（doc）を生成する。
- 推奨運用：
  - `selector_sql_expand` を採用（リンク閉包が取れる）
  - 結果集合は **ソートして固定化**（再現性）

---

## 3. 出力（Outputs：KHS中枢4成果物）
※未確定根拠（pdfPage欠落等）は中枢へ入れない。必要ならUNRESOLVEDへ隔離。

### 3.1 EVIDENCE_UNITS_KHS_FULL_v1.jsonl
- 1行=1 JSON object
- 空行禁止 / JSON以外混入禁止
- 必須キー（例）：

```json
{
  "unitId": "KHS.<doc8>.<anchor>.<termKey>.<type>.<seq2>",
  "term": "KHS本文に現れた語",
  "termKey": "glossaryのtermKeyと一致",
  "type": "DEF|LAW|PROC|RULE|MAP|EX|QUOTE|GATE",
  "quote": "80〜400字。原文を壊さない",
  "paraphrase": "構造保持の言い換え（意訳禁止、条件節保持）",
  "sourceRef": "doc=... pdfPage=<number>",
  "tags": {
    "truth_axis": ["cycle|polarity|center|breath|carami|order|correspondence|manifestation|purification|governance"],
    "role_hint": ["definition|action|style|risk|evidence"],
    "kanagi_phase": ["SENSE|NAME|ONE_STEP|NEXT_DOOR"],
    "domain": ["KHS"],
    "confidence": "primary|secondary",
    "language": "ja",
    "needs_evidence": false
  }
}