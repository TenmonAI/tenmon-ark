# SPEC_KHS_AUTO_GENERATOR_v1.1_PATCH.md
# 目的：A1（NAS PDF）完走後に、そのままB（Unit/Law正規化）へ入れるための最小追補（ΔZ↓/Π↑）
# 注意：本PATCHは「生成器仕様の矛盾（NOTION限定 vs NAS投入）」を解消するだけ。思想の追加はしない。

## 0) 適用対象
- 既存仕様：SPEC_KHS_AUTO_GENERATOR_v1.md / v1.1.md
- 既存Batch：KHS_BATCH_DEFINITION_v1.tsv（BATCH02/BATCH03/GLOBAL 等）

## 1) 変更点（最小diff）
### 1.1 sourceRefの許容形式を「NOTION限定」→「NOTION|NAS」へ拡張
【旧（禁止が強すぎる）】
- 中枢（KHS）へ入れてよい根拠は `doc=NOTION:PAGE:<pageId> pdfPage=<number>` のみ

【新（現状のA1=NAS PDF ingestと整合）】
- 中枢（KHS）へ入れてよい根拠は次のどちらかのみ：
  1) `doc=NOTION:PAGE:<pageId> pdfPage=<number>`
  2) `doc=NAS:PDF:<name>:<hash> pdfPage=<number>`

制約（不変）：
- pdfPage は必ず数値（? / null / 欠落 / 非数値は禁止）
- doc は上の2形式以外を中枢に混入させない
- 未確定根拠は中枢へ入れず、UNRESOLVEDへ隔離する（後述）

※これにより、A1（NAS PDF 455ページ）完走後、そのままBのUnit/Law生成で根拠として採用できる。

### 1.2 入力列名の揺れ対策：khs_pages_norm / khs_links_norm を「必須」に格上げ
背景：
- 実DBの列名は `content_text` / `text` / `title` など揺れる。
- 仕様を壊さず再現性を確保するため、生成器は `*_norm` ビューのみ参照する。

【必須ビュー（構築班が用意）】
- `khs_pages_norm`
  - doc TEXT NOT NULL
  - title TEXT NOT NULL DEFAULT ''
  - content_text TEXT NOT NULL DEFAULT ''
  - pdfPage INTEGER
  - domain TEXT
  - collection TEXT
  - updated_at TEXT

- `khs_links_norm`（推奨）
  - from_doc TEXT NOT NULL
  - to_doc TEXT NOT NULL

以後のすべての selector_sql / 生成器SQLは `khs_pages_norm` / `khs_links_norm` を参照すること。

### 1.3 UNRESOLVED隔離の出力を正式化（中枢4成果物へ混入させない）
中枢（4成果物）は STRICT を維持：
- `doc` が NOTION|NAS 以外 → 中枢禁止
- `pdfPage` が数値でない → 中枢禁止
- termKey未確定 / truth_axis逸脱 → 中枢禁止

隔離先（任意だが強く推奨）：
- `EVIDENCE_UNITS_KHS_UNRESOLVED_v1.jsonl`

UNRESOLVEDの必須キー（最小）：
{
  "unitId": "...",
  "type": "GATE",
  "quote": "...",
  "sourceRef": "...(docは存在してよいがpdfPage未確定ならそのまま)",
  "why_unresolved": ["pdfPage_missing|termKey_missing|axis_unknown|doc_format_invalid|structure_ambiguous"],
  "needs_evidence": true
}

## 2) Batch定義への追補（任意：最小）
### 2.1 BATCHのdoc対象を `khs_pages_norm` に合わせる
- selector_sql は `kokuzo_pages` 直参照を避け、`khs_pages_norm` 参照に寄せる。
- ただし、既存TSVを壊さずに運用するなら、構築班が `khs_pages_norm` を `kokuzo_pages` の上に作ればよい（SQLは別紙）。

## 3) 監査条件（不変）
- truth_axis は固定10軸のみ（追加禁止）
- “解釈を増やさない / 条件節を落とさない”
- relations は「関係宣言Unit（MAP/LAW）」根拠がある場合のみ（推測生成禁止）
- water_fire_vector は固定トークン（自由作文禁止）かつ根拠がある時のみ

## 4) 推奨の格納場所（運用）
- repo: `api/docs/khs/SPEC_KHS_AUTO_GENERATOR_v1.1_PATCH.md`
- data: `/opt/tenmon-ark-data/constitution/` へ同内容コピー＋hash封印（任意）