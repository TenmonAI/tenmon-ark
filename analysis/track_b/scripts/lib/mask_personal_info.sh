#!/usr/bin/env bash
# ============================================================
# mask_personal_info.sh — 個人情報マスク共通関数
# TENMON_ARK_FULL_SYSTEM_ANALYSIS_V1 / Track B
# ============================================================
# 使い方: source lib/mask_personal_info.sh
# 前提: ANALYSIS_SALT 環境変数が設定されていること

set -euo pipefail

# --- Salt 検証 ---
validate_salt() {
  if [[ -z "${ANALYSIS_SALT:-}" ]]; then
    echo "ERROR: ANALYSIS_SALT is not set." >&2
    echo "  export ANALYSIS_SALT=\$(openssl rand -hex 32)" >&2
    exit 1
  fi
  if [[ ${#ANALYSIS_SALT} -lt 16 ]]; then
    echo "ERROR: ANALYSIS_SALT is too short (min 16 chars)." >&2
    exit 1
  fi
}

# --- ユーザーID ハッシュ化 ---
# 引数: $1 = 生のユーザーID
# 出力: SHA256ハッシュの先頭16文字
hash_user_id() {
  local raw_id="${1:-}"
  if [[ -z "$raw_id" ]]; then
    echo "[EMPTY_ID]"
    return
  fi
  echo -n "${raw_id}${ANALYSIS_SALT}" | sha256sum | cut -c1-16
}

# --- メールアドレスマスク ---
mask_email() {
  sed -E 's/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/[REDACTED_EMAIL]/g'
}

# --- 氏名マスク (日本語名) ---
mask_japanese_name() {
  # 2〜5文字の漢字連続をマスク (姓名として)
  sed -E 's/[一-龥]{2,5}/[REDACTED_NAME]/g'
}

# --- 電話番号マスク ---
mask_phone() {
  sed -E 's/0[0-9]{1,4}-?[0-9]{1,4}-?[0-9]{3,4}/[REDACTED_PHONE]/g'
}

# --- 出生日時マスク (年のみ残す) ---
# 1990-03-15 → 1990-xx-xx
mask_birthdate() {
  sed -E 's/([12][09][0-9]{2})-[0-9]{2}-[0-9]{2}/\1-xx-xx/g'
}

# --- 住所・出生地マスク ---
mask_location() {
  sed -E 's/(都|道|府|県|市|区|町|村|郡)[^\t\n,;"}]*/[REDACTED_LOCATION]/g'
}

# --- テキスト本文の長さのみ記録 ---
# 引数: $1 = テキスト
# 出力: "[XXX chars]"
text_length_only() {
  local text="${1:-}"
  local len=${#text}
  echo "[${len} chars]"
}

# --- 環境変数値のマスク ---
# 引数: $1 = 変数名, $2 = 変数値
# 出力: "VAR_NAME=[SET, length=XX]" or "VAR_NAME=[NOT_SET]"
mask_env_value() {
  local name="${1:-}"
  local value="${2:-}"
  if [[ -z "$value" ]]; then
    echo "${name}=[NOT_SET]"
  else
    echo "${name}=[SET, length=${#value}]"
  fi
}

# --- パイプライン用: 全マスク適用 ---
apply_all_masks() {
  mask_email | mask_phone | mask_birthdate | mask_location
}

echo "[mask_personal_info.sh] Loaded successfully." >&2
