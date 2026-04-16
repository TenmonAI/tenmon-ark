#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${TENMON_TEST_ENV_FILE:-/etc/tenmon/llm_test.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[TENMON-TEST-ENV] missing env file: $ENV_FILE" >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

if [[ "$#" -eq 0 ]]; then
  echo "[TENMON-TEST-ENV] no command provided" >&2
  exit 1
fi

exec "$@"
