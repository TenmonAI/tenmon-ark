# KOKUZO_OCR_UNIT_SCHEMA_v1.md
# Purpose: OCR結果を「raw/cand/verified」三層で保存し、混入を防ぎつつ収束させる最小スキーマ。

## 0) 三層モデル（固定）
- raw: 抽出器の生出力（改変禁止）
- cand: ルールベース補正の候補（意味補間禁止）
- verified: 監査で確定した出力（正典へ入れてよい）

## 1) OCRUnit（jsonl/DB metaJson用）
```json
{
  "schema": "KOKUZO_OCR_UNIT_V1",
  "ocrUnitId": "KZOCRU.<hash8>",
  "doc": "NAS:PDF:... or NOTION:PAGE:...",
  "pdfPage": 123,
  "locator": {
    "blockType": "paragraph|line|table|caption|note|header|footer",
    "bbox": [0,0,0,0],
    "order": 12
  },
  "inputs": {
    "imageHash": "sha256:...",
    "layoutHash": "sha256:...",
    "extractors": [
      {"name":"poppler_text","version":"v1","paramsHash":"..."},
      {"name":"tesseract","version":"v5","paramsHash":"..."}
    ]
  },
  "texts": {
    "raw": "string",
    "cand": "string",
    "verified": "string"
  },
  "quality": {
    "rawScore": 0.0,
    "candScore": 0.0,
    "verifiedScore": 0.0,
    "garbleRatio": 0.0,
    "unresolvedReasons": []
  },
  "khs_alignment": {
    "termKeyHits": [],
    "ichigenHits": [],
    "notes": []
  },
  "status": "raw|cand|verified|unresolved"
}