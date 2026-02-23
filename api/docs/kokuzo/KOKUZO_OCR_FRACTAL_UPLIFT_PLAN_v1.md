# KOKUZO_OCR_FRACTAL_UPLIFT_PLAN_v1.md
# Purpose: 虚空蔵サーバーの構文メモリOSを応用し、PDF文字化け/崩れ/図象を“収束型OCR”として改善する。
# Principle: 1回で当てない。候補を保持し、監査で昇格し、Seedとして再利用して精度を上げる。
# Non-negotiables: 推測を正典に入れない / 根拠鎖を保持 / UNRESOLVED隔離 / 1変更=1検証

## 0) OCR向上の定義（この計画のゴール）
- “それっぽい復元”ではなく、
  1) 原画像（ページ）に対する再現性（同じ入力→同じ出力）
  2) 読み取り品質が監査可能（どこが不確か、なぜ直した）
  3) 修正が再利用可能（次回同型ページに効く）
を満たすこと。

## 1) Kokūzōレイヤーへの写像（L0〜L6）
### L0: Physical Storage
- PDF原本・ページ画像（png/tiff）・切り出し領域（roi）をそのまま保存（CAS推奨）
- “入力の不変”を保証する：hashで同定

### L1: Object Store
- 1ページをKZChunkとして扱う：
  - doc, pdfPage, imageHash, layoutHash
- “どの抽出器/どの設定で読んだか”もメタとして保存

### L2: Semantic Kernel
- OCR結果は “SemanticUnit（行/段落/図キャプション）” へ分割
- 各Unitに quality / confidence / unresolvedReason を付与
- kotodamaSignature / kanagi_phase は「後段の整合判定」に使える（任意）

### L3: Fractal Compression（OCR Seed）
- OCRの改善を生む“種”は、文章内容ではなく **版面と誤りパターン**：
  - layout profile（縦/横、段組、行間、ルビ、注、欄外）
  - confusion set（誤り頻出置換：例「一八0」「︱0」等）
  - dictionary anchors（KHS termKey / 五十音キー / 固有の頻出語）
- seed化することで、次のページで“同じ誤り”を自動修正できる

### L4: Quantum Cache
- 最近/頻出のlayoutHashとconfusion seedをhotにする
- “その場で強い辞書”が効く（KHS文脈では特に）

### L5: Guardian / Policy
- 改変は“正典”へ直接反映しない
- 常に：
  - raw（抽出そのまま）
  - cand（補正候補）
  - verified（根拠で確定）
の3層で管理し、混入を遮断する

### L6: API / Agent Integration
- /ingest_pdf_pages（ページ画像化＋raw抽出）
- /ocr_candidates（候補生成）
- /ocr_verify（監査→昇格）
- /ocr_seed_update（seed化して再利用）

## 2) 収束型OCRパイプライン（必須）
### Stage A: Multi-Extractor（複数抽出器の併用）
同一ページから複数のrawを生成し、候補として保持：
- A1: PDF text extraction（poppler等）
- A2: OCR（tesseract等）
- A3: layout-aware OCR（将来：PaddleOCR等）
- A4: image preprocess（2値化/傾き補正/ノイズ除去/拡大）

※ここでは「どれが正しいか」は決めない。候補を貯める。

### Stage B: Candidate Synthesis（候補統合）
- raw_A/B/C を統合して “candText” を作る
- ただし **意味補間は禁止**：
  - ルールは置換と正規化のみ（confusion set）
  - 辞書整合（KHS termKey/50音）で一致する方を優先

### Stage C: Verify（監査→昇格）
- verifiedに上げる条件：
  - layout的に自然（行の崩れが減る）
  - 辞書整合が上がる（KHS語彙、termKey一致率）
  - contradictionが減る（同ページ内の表記揺れが減る）
- 上げられない箇所は UNRESOLVED として残す（観測要求）

### Stage D: Seed Update（再利用）
- verified化で確定した置換パターン/版面パターンを seed として保存
- 次ページのcand生成で seed を適用（hot cache）

## 3) 図象（図・表・縦書き）の認識向上（現実的な解）
図象は “画像理解” を直接やらず、まずは **構造を分解**する：
- layout segmentation（段・欄・表・注・図番号）
- 表は grid 推定（行列に落とす）
- 図は caption とラベル（ア/イ/ロ…）を優先抽出
- その後、必要な箇所だけOCR（roi）

## 4) 監査スコア（Ark Equationで読む）
OCRでも Ark Equation を適用できる：
- Π（追跡）：doc/pdfPage/hash/Extractor設定が揃っているか
- ΔZ（濁り）：文字化け率、未確定率、矛盾率
- Φ（価値）：KHS辞書整合、引用可能性、Unit化の成功
- I_A（安定）：同一ページで再実行して同じ結果に収束するか

## 5) 成功定義
- rawとcandとverifiedが揃い、verifiedのみが正典へ入る
- UNRESOLVEDが可視化され、後で潰せる
- seedが増えるほど、同型ページの精度が上がる