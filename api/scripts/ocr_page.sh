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
if ! [[ "$PDFPAGE" =~ ^[0-9]+$ ]]; then
  echo "[FAIL] pdfPage must be integer: $PDFPAGE"
  exit 2
fi

command -v tesseract >/dev/null 2>&1 || { echo "[FAIL] tesseract not installed"; exit 1; }
command -v convert   >/dev/null 2>&1 || { echo "[FAIL] imagemagick(convert) not installed"; exit 1; }

IMG=""
if [ "$DOC" = "KHS" ]; then
  IMG="/opt/tenmon-corpus/assets/khs/pages/khs_p$(printf "%04d" "$PDFPAGE").png"
fi
[ -n "$IMG" ] || { echo "[FAIL] unsupported doc=$DOC"; exit 1; }
[ -f "$IMG" ] || { echo "[FAIL] image not found: $IMG"; exit 1; }

TMPDIR="/tmp/tenmon_ocr_${DOC}_${PDFPAGE}_$$"
mkdir -p "$TMPDIR"
PRE_IMG="$TMPDIR/prep.png"
OUT_BASE="$TMPDIR/out"

# tuned winner: neg + thr70 + psm6
convert "$IMG" -colorspace Gray -normalize -negate -threshold 70% "$PRE_IMG"
[ -s "$PRE_IMG" ] || { echo "[FAIL] preprocess output missing: $PRE_IMG"; exit 1; }

tesseract "$PRE_IMG" "$OUT_BASE" -l jpn+eng --psm 6 1>/dev/null
[ -f "${OUT_BASE}.txt" ] || { echo "[FAIL] tesseract output missing: ${OUT_BASE}.txt"; exit 1; }

TEXT_RAW="$(cat "${OUT_BASE}.txt")"
TEXT_NORM="$(printf "%s" "$TEXT_RAW" | tr -d '\r')"
L="${#TEXT_NORM}"
echo "[INFO] OCR len=$L"
if [ "$L" -lt 20 ]; then
  echo "[FAIL] OCR too short len=$L"
  printf "%s\n" "$TEXT_NORM" | sed -n '1,8p' || true
  exit 1
fi

QC_JSON="$(python3 - <<'PY' <<<"$TEXT_NORM"
import json,sys
t=sys.stdin.read()
jp=sum(1 for ch in t if "\u3040"<=ch<="\u30ff" or "\u4e00"<=ch<="\u9fff")
total=max(1,len(t))
print(json.dumps({"schemaVersion":1,"engine":"tesseract","psm":6,"prep":"neg_thr70","jpRate":jp/total,"len":len(t),"empty":len(t)==0}))
PY
)"

# DB save: createdAt is generated in Python (no sqlite datetime('now') to break)
DOC_ENV="$DOC" PDFPAGE_ENV="$PDFPAGE" DB_ENV="$DB" QC_ENV="$QC_JSON" \
python3 - <<'PY' <<<"$TEXT_RAW"
import os,sqlite3,sys,datetime
db=os.environ["DB_ENV"]
doc=os.environ["DOC_ENV"]
pdfPage=int(os.environ["PDFPAGE_ENV"])
qc=os.environ["QC_ENV"]
text_raw=sys.stdin.read()
text_norm=text_raw.replace("\r","")
createdAt=datetime.datetime.utcnow().isoformat(timespec="seconds")+"Z"

con=sqlite3.connect(db)
cur=con.cursor()
cur.execute("""
INSERT INTO kokuzo_ocr_pages(doc,pdfPage,engine,text_raw,text_norm,qc_json,createdAt)
VALUES(?,?,?,?,?,?,?)
ON CONFLICT(doc,pdfPage,engine) DO UPDATE SET
  text_raw=excluded.text_raw,
  text_norm=excluded.text_norm,
  qc_json=excluded.qc_json,
  createdAt=excluded.createdAt
""",(doc,pdfPage,"tesseract",text_raw,text_norm,qc,createdAt))
con.commit()
con.close()
print("[OK] saved kokuzo_ocr_pages doc=%s pdfPage=%s len=%d" % (doc,pdfPage,len(text_norm)))
PY

echo "[PASS] OCR ok len=$L"
