#!/usr/bin/env bash
set -euo pipefail
set +H

DOC="${1:-}"
PDFPAGE="${2:-}"
DB="${DB:-/opt/tenmon-ark-data/kokuzo.sqlite}"

if [ -z "$DOC" ] || [ -z "$PDFPAGE" ]; then
  echo "usage: scripts/ocr_page.sh <doc> <pdfPage>"
  exit 2
fi

command -v tesseract >/dev/null 2>&1 || {
  echo "[FAIL] tesseract not installed. Install it first (apt-get install -y tesseract-ocr)."
  exit 1
}

# ここは“画像入力”が必要。現状のingestパイプラインに合わせて後続カードで実装するため、
# KG5は器と保存経路を固める：今は placeholder で1行入れて循環確認。
TEXT_RAW="(KG5 placeholder: OCR pipeline wiring pending)"
TEXT_NORM="$TEXT_RAW"
QC_JSON='{"schemaVersion":1,"engine":"tesseract","note":"placeholder"}'

sqlite3 "$DB" <<SQL
BEGIN;
INSERT INTO kokuzo_ocr_pages(doc,pdfPage,engine,text_raw,text_norm,qc_json,createdAt)
VALUES('${DOC}', ${PDFPAGE}, 'tesseract', ${TEXT_RAW@Q}, ${TEXT_NORM@Q}, ${QC_JSON@Q}, datetime('now'))
ON CONFLICT(doc,pdfPage,engine) DO UPDATE SET
  text_raw=excluded.text_raw,
  text_norm=excluded.text_norm,
  qc_json=excluded.qc_json,
  createdAt=datetime('now');
COMMIT;
SQL

echo "[PASS] saved kokuzo_ocr_pages doc=${DOC} pdfPage=${PDFPAGE} engine=tesseract"
