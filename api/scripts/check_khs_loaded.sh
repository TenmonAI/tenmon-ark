#!/usr/bin/env bash
# kokuzo_pages の doc="KHS" 件数と、pdfPage=32 の text 長さを表示するスクリプト

set -euo pipefail

DATA_DIR="${TENMON_DATA_DIR:-/opt/tenmon-ark-data}"
KOKUZO_DB="$DATA_DIR/kokuzo.sqlite"

if [ ! -f "$KOKUZO_DB" ]; then
  echo "[FAIL] kokuzo.sqlite not found at $KOKUZO_DB"
  exit 1
fi

echo "[CHECK] kokuzo_pages doc='KHS' count"
KHS_COUNT="$(sqlite3 "$KOKUZO_DB" "SELECT COUNT(*) FROM kokuzo_pages WHERE doc='KHS';" 2>/dev/null || echo "0")"
echo "KHS pages count: $KHS_COUNT"

if [ "$KHS_COUNT" = "0" ]; then
  echo "[WARN] No KHS pages found"
else
  echo "[PASS] KHS pages found: $KHS_COUNT"
fi

echo ""
echo "[CHECK] pdfPage=32 text length"
PAGE32_LENGTH="$(sqlite3 "$KOKUZO_DB" "SELECT length(text) FROM kokuzo_pages WHERE doc='KHS' AND pdfPage=32;" 2>/dev/null || echo "0")"
if [ "$PAGE32_LENGTH" = "0" ] || [ -z "$PAGE32_LENGTH" ]; then
  echo "[WARN] pdfPage=32 not found or empty"
else
  echo "pdfPage=32 text length: $PAGE32_LENGTH chars"
  echo "[PASS] pdfPage=32 exists"
fi

echo ""
echo "[INFO] Sample pages (first 5):"
sqlite3 "$KOKUZO_DB" "SELECT pdfPage, length(text) as text_len FROM kokuzo_pages WHERE doc='KHS' ORDER BY pdfPage ASC LIMIT 5;" 2>/dev/null || echo "No data"
