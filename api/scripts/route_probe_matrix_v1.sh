#!/usr/bin/env bash
# route / health / audit の軽量プローブ（runtime_matrix は Python 側で実施）
set -u
set +e

OUT_DIR="${1:?usage: route_probe_matrix_v1.sh OUT_DIR}"
BASE="${CHAT_TS_PROBE_BASE_URL:-http://127.0.0.1:3000}"
mkdir -p "$OUT_DIR"

curl -fsS --max-time 10 "${BASE}/health" -o "$OUT_DIR/health.json" 2>"$OUT_DIR/health.err" || echo "{\"ok\":false}" >"$OUT_DIR/health.json"
curl -fsS --max-time 12 "${BASE}/api/audit" -o "$OUT_DIR/audit.json" 2>"$OUT_DIR/audit.err" || echo "{\"ok\":false}" >"$OUT_DIR/audit.json"

# 追加: ルート生存確認（GET）
for path in "/health" "/api/audit"; do
  safe=$(echo "$path" | tr '/' '_')
  curl -fsS --max-time 8 "${BASE}${path}" -o "$OUT_DIR/get_probe${safe}.txt" 2>/dev/null || true
done

echo "[route_probe_matrix_v1] wrote $OUT_DIR"
exit 0
