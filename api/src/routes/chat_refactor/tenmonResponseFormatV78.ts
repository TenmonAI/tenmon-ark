/**
 * CHAT_SAFE_REFACTOR_PATCH78_TENMON_RESPONSE_FORMAT_ENGINE_V1
 * D/ΔS骨格（差分）→ 裁定（正中）→ ONE_STEP（次の一手一つ）を自然文で本文へ折り畳む（ku/route は不変）。
 */

const FORMAT_APPEND_V78 =
  "進め方の骨格は、差分でいまを置き、正中で裁定し、水火の勢いを保ったまま次の一手だけを選ぶことです。";

/** 定義・研究・世界観・比較・長文指定など、骨格提示の効果が高い入力 */
export function wantsTenmonResponseFormatEngineV78(rawMessage: string): boolean {
  const m = String(rawMessage ?? "").trim();
  if (!m || m.length > 720) return false;
  if (/\d{3,5}\s*文字/u.test(m)) return true;
  if (/主流LLM|比較して|違いを|との違い/u.test(m)) return true;
  if (/天聞(?:AI|アーク)/u.test(m) && /(とは|構造|意識|心|魂核|設計|思考回路)/u.test(m)) return true;
  if (/言[霊灵靈]|ことだま/u.test(m) && /(とは|意味|何か|教えて)/u.test(m)) return true;
  if (/断捨離/u.test(m) && /(判断|構造|説明|として)/u.test(m)) return true;
  if (/(AI|エーアイ)/u.test(m) && /進化/u.test(m)) return true;
  return false;
}

export function tenmonResponseFormatAppendV78(): string {
  return FORMAT_APPEND_V78;
}

export function shouldAppendTenmonFormatV78(input: {
  rawMessage: string;
  response: string;
  mode: string;
  routeReason: string;
}): boolean {
  const mode = String(input.mode ?? "");
  if (mode === "GROUNDED") return false;
  const raw = String(input.rawMessage ?? "");
  if (/#詳細|doc\s*=|pdfPage\s*=/i.test(raw)) return false;
  if (!wantsTenmonResponseFormatEngineV78(raw)) return false;

  const rr = String(input.routeReason ?? "").trim();
  if (
    /^(FASTPATH_|DET_PASSPHRASE|N1_GREETING|NATURAL_FALLBACK|SMOKE|RELEASE_PREEMPT)/i.test(rr) ||
    rr === "TRUTH_GATE_RETURN_V2" ||
    rr === "DEF_FASTPATH_VERIFIED_V1" ||
    rr === "DEF_FASTPATH_PROPOSED_V1" ||
    rr === "KATAKAMUNA_CANON_ROUTE_V1"
  ) {
    return false;
  }

  const r = String(input.response ?? "").trim();
  if (r.length < 20 || r.length > 5000) return false;

  // 既に同系の骨格・一手が明示されていれば重ねない
  if (
    /進め方の骨格は|正中で裁定|次の一手だけを選ぶ|ONE_STEP|D・ΔS|Ω\s*=/u.test(r) ||
    (/差分/u.test(r) && /裁定/u.test(r) && /一手/u.test(r))
  ) {
    return false;
  }

  return true;
}
