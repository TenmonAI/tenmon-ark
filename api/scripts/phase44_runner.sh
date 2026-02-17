#!/usr/bin/env bash
set -euo pipefail
set +H

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
THREAD_ID="${THREAD_ID:-phase44-smoke}"
DOC="${DOC:-PHASE44}"
TEST_PDF="/tmp/up_phase44.pdf"

python3 - <<'PY'
text="hello phase44"
parts=[]; offsets=[]
def w(b): parts.append(b)
def mark(): offsets.append(sum(len(p) for p in parts))
w(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
mark(); w(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
mark(); w(b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")
mark(); w(b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n")
stream=f"BT /F1 16 Tf 40 120 Td ({text}) Tj ET\n".encode("utf-8")
mark(); w(b"4 0 obj\n<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"endstream\nendobj\n")
mark(); w(b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")
xref_pos=sum(len(p) for p in parts)
w(b"xref\n0 6\n"); w(b"0000000000 65535 f \n")
for off in offsets: w(f"{off:010d} 00000 n \n".encode("ascii"))
w(b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n")
w(str(xref_pos).encode("ascii")+b"\n%%EOF\n")
open("/tmp/up_phase44.pdf","wb").write(b"".join(parts))
print("wrote /tmp/up_phase44.pdf")
PY

# upload
UP="$(curl -fsS --retry 3 --retry-all-errors --max-time 30 \
  -X POST "${BASE_URL}/api/upload" -F "file=@${TEST_PDF}")"
SAVED="$(echo "$UP" | jq -r '.savedPath // empty')"
SHA="$(echo "$UP" | jq -r '.sha256 // empty')"
test -n "$SAVED" || { echo "[FAIL] upload missing savedPath"; echo "$UP"; exit 1; }

# ingest/request: expects ingestId
REQ="$(curl -sS --retry 3 --retry-all-errors --max-time 30 \
  -X POST "${BASE_URL}/api/ingest/request" \
  -H "Content-Type: application/json" \
  -d "{\"threadId\":\"${THREAD_ID}\",\"doc\":\"${DOC}\",\"source\":\"upload\",\"savedPath\":\"${SAVED}\",\"sha256\":\"${SHA}\"}")"

if ! echo "$REQ" | jq -e '.ok==true and (.ingestId|type)=="string"' >/dev/null 2>&1; then
  echo "[FAIL] ingest/request response:"
  echo "$REQ"
  exit 1
fi
INGEST_ID="$(echo "$REQ" | jq -r '.ingestId')"

# ingest/confirm: use ingestId (NOT requestId)
CONF="$(curl -sS --retry 3 --retry-all-errors --max-time 60 \
  -X POST "${BASE_URL}/api/ingest/confirm" \
  -H "Content-Type: application/json" \
  -d "{\"threadId\":\"${THREAD_ID}\",\"ingestId\":\"${INGEST_ID}\",\"confirm\":true}")"

if ! echo "$CONF" | jq -e '.ok==true' >/dev/null 2>&1; then
  echo "[FAIL] ingest/confirm response:"
  echo "$CONF"
  exit 1
fi

echo "[PASS] Phase44 runner"
