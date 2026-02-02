#!/usr/bin/env bash
# /opt/tenmon-corpus/db/khs_pages.jsonl（または khs_text.jsonl）を
# /opt/tenmon-ark-data/kokuzo.sqlite の kokuzo_pages に投入するスクリプト

set -euo pipefail

CORPUS_DIR="${TENMON_CORPUS_DIR:-/opt/tenmon-corpus}"
DATA_DIR="${TENMON_DATA_DIR:-/opt/tenmon-ark-data}"
KOKUZO_DB="$DATA_DIR/kokuzo.sqlite"
DOC_NAME="KHS"

# jsonl ファイルのパス（優先順位: khs_pages.jsonl > khs_text.jsonl）
JSONL_FILE="${1:-}"
if [ -z "$JSONL_FILE" ]; then
  if [ -f "$CORPUS_DIR/db/khs_pages.jsonl" ]; then
    JSONL_FILE="$CORPUS_DIR/db/khs_pages.jsonl"
  elif [ -f "$CORPUS_DIR/db/khs_text.jsonl" ]; then
    JSONL_FILE="$CORPUS_DIR/db/khs_text.jsonl"
  else
    echo "[FAIL] jsonl file not found. Please specify:"
    echo "  export TENMON_CORPUS_DIR=/opt/tenmon-corpus"
    echo "  bash scripts/ingest_khs_from_corpus.sh"
    echo ""
    echo "Or specify file path:"
    echo "  bash scripts/ingest_khs_from_corpus.sh /path/to/khs_pages.jsonl"
    exit 1
  fi
fi

if [ ! -f "$JSONL_FILE" ]; then
  echo "[FAIL] jsonl file not found: $JSONL_FILE"
  exit 1
fi

echo "[INGEST] jsonl file: $JSONL_FILE"

if [ ! -f "$KOKUZO_DB" ]; then
  echo "[FAIL] kokuzo.sqlite not found at $KOKUZO_DB"
  exit 1
fi

# Node.js で投入（既存の upsertPage 関数を使用）
SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
NODE_SCRIPT="$SCRIPT_DIR/ingest_khs_from_corpus.mjs"

# Node.js スクリプトを実行
if ! command -v node >/dev/null 2>&1; then
  echo "[FAIL] node not found. Please install Node.js"
  exit 1
fi

echo "[INGEST] Ingesting from $JSONL_FILE to $KOKUZO_DB"

node "$NODE_SCRIPT" "$JSONL_FILE" "$KOKUZO_DB" "$DOC_NAME"

echo "[DONE] KHS pages ingested successfully"
