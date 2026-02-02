#!/usr/bin/env bash
# VPS内で「言霊秘書PDF」の実在パスを特定するスクリプト

set -euo pipefail

# 標準配置パス（優先順位順）
SEARCH_PATHS=(
  "/opt/tenmon-ark-repo/docs"
  "/opt/tenmon-ark-repo/assets"
  "/opt/tenmon-ark-data/docs"
  "/opt/tenmon-ark-data/assets"
  "/opt/tenmon-ark-live/docs"
  "/opt/tenmon-ark-live/assets"
  "/opt/tenmon-ark-repo"
  "/opt/tenmon-ark-data"
  "/opt/tenmon-ark-live"
  "/home/$(whoami)/docs"
  "$(pwd)/docs"
  "$(pwd)/assets"
)

echo "[FIND] Searching for 言霊秘書 PDF files..."

# find コマンドで検索（複数パターン）
FOUND_FILES=()
for search_path in "${SEARCH_PATHS[@]}"; do
  if [ -d "$search_path" ]; then
    # パターン1: ファイル名に「言霊秘書」を含む
    while IFS= read -r -d '' file; do
      FOUND_FILES+=("$file")
    done < <(find "$search_path" -maxdepth 3 -type f -iname "*言霊秘書*.pdf" -print0 2>/dev/null || true)
    
    # パターン2: ファイル名に「KHS」を含む
    while IFS= read -r -d '' file; do
      if [[ ! " ${FOUND_FILES[@]} " =~ " ${file} " ]]; then
        FOUND_FILES+=("$file")
      fi
    done < <(find "$search_path" -maxdepth 3 -type f -iname "*KHS*.pdf" -print0 2>/dev/null || true)
    
    # パターン3: ファイル名に「kotodama」を含む
    while IFS= read -r -d '' file; do
      if [[ ! " ${FOUND_FILES[@]} " =~ " ${file} " ]]; then
        FOUND_FILES+=("$file")
      fi
    done < <(find "$search_path" -maxdepth 3 -type f -iname "*kotodama*.pdf" -print0 2>/dev/null || true)
  fi
done

# 結果を表示
if [ ${#FOUND_FILES[@]} -eq 0 ]; then
  echo "[WARN] No 言霊秘書 PDF files found in standard locations"
  echo ""
  echo "Standard locations checked:"
  for path in "${SEARCH_PATHS[@]}"; do
    echo "  - $path"
  done
  echo ""
  echo "To manually specify a PDF path, use:"
  echo "  export KHS_PDF_PATH=/path/to/言霊秘書.pdf"
  echo "  bash scripts/ingest_khs_from_pdf.sh"
  exit 1
else
  echo "[PASS] Found ${#FOUND_FILES[@]} PDF file(s):"
  for i in "${!FOUND_FILES[@]}"; do
    file="${FOUND_FILES[$i]}"
    size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "unknown")
    echo "  [$((i+1))] $file (size: $size bytes)"
  done
  
  # 最初のファイルを標準出力に出力（他のスクリプトから利用可能）
  echo "${FOUND_FILES[0]}"
fi
