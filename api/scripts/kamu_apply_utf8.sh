#!/usr/bin/env bash
set -euo pipefail
set +H

DB="${DB:-/opt/tenmon-ark-data/kokuzo.sqlite}"
DOC_SRC="${DOC_SRC:-KHS}"
DOC_DST="${DOC_DST:-KHS_UTF8}"
PDFPAGE="${PDFPAGE:-132}"

# 最新 accepted の rowid を取る（rid列は無いので rowid を使う）
RID="$(sqlite3 "$DB" "SELECT rowid FROM kokuzo_restore_suggestions WHERE doc='${DOC_SRC}' AND pdfPage=${PDFPAGE} AND status='accepted' ORDER BY createdAt DESC LIMIT 1;")"
if [ -z "${RID:-}" ]; then
  echo "[FAIL] no accepted suggestion found (doc=${DOC_SRC} pdfPage=${PDFPAGE})"
  exit 1
fi

SUGG="$(sqlite3 "$DB" "SELECT suggestion FROM kokuzo_restore_suggestions WHERE rowid=${RID};")"
if [ -z "${SUGG:-}" ]; then
  echo "[FAIL] accepted suggestion empty (rowid=${RID})"
  exit 1
fi

sqlite3 "$DB" <<SQL
BEGIN;
INSERT INTO kokuzo_pages(doc,pdfPage,text,createdAt,updatedAt)
VALUES('${DOC_DST}', ${PDFPAGE}, ${SUGG@Q}, datetime('now'), datetime('now'))
ON CONFLICT(doc,pdfPage) DO UPDATE SET
  text=excluded.text,
  updatedAt=datetime('now');
COMMIT;
SQL

echo "[PASS] applied to ${DOC_DST} P${PDFPAGE} from rowid=${RID}"
