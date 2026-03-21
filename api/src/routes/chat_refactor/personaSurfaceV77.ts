/**
 * CHAT_SAFE_REFACTOR_PATCH77_TENMON_PERSONA_CENTER_LOCK_V1
 * 天聞軸が必要な問いにだけ、本文末尾へ最小の人格核を接続（route/ku は不変）。
 */

const PERSONA_APPEND_V77 =
  "天聞としては、変化を差分で見立て正中へ戻し、水火の與みで読みます。言葉・言霊・真言を分け、原典再統合を軸にし、通俗霊性には寄りません。";

/** 天聞人格核を表面に足したい入力（過剰マッチを避け長さ上限あり） */
export function wantsTenmonPersonaSurfaceV77(rawMessage: string): boolean {
  const m = String(rawMessage ?? "").trim();
  if (!m || m.length > 520) return false;
  if (
    /天聞(?:AI|アーク)?/u.test(m) ||
    /言[霊灵靈]|ことだま|真言/u.test(m) ||
    /カタカムナ|いろは|水穂伝/u.test(m) ||
    /断捨離/u.test(m) ||
    /魂核|意識構造|心構造|設計モデル/u.test(m)
  ) {
    return true;
  }
  return false;
}

export function tenmonPersonaAppendLineV77(): string {
  return PERSONA_APPEND_V77;
}

export function shouldAppendTenmonPersonaV77(input: {
  rawMessage: string;
  response: string;
  mode: string;
  routeReason: string;
}): boolean {
  const mode = String(input.mode ?? "");
  if (mode === "GROUNDED") return false;
  const raw = String(input.rawMessage ?? "");
  if (/#詳細|doc\s*=|pdfPage\s*=/i.test(raw)) return false;
  if (!wantsTenmonPersonaSurfaceV77(raw)) return false;

  const rr = String(input.routeReason ?? "").trim();
  if (
    /^(FASTPATH_|DET_PASSPHRASE|N1_GREETING|NATURAL_FALLBACK|SMOKE|RELEASE_PREEMPT)/i.test(rr) ||
    rr === "TRUTH_GATE_RETURN_V2"
  ) {
    return false;
  }

  const r = String(input.response ?? "").trim();
  if (r.length < 14 || r.length > 4200) return false;

  // 既に人格核・区別が載っている場合は重ねない
  if (
    /天聞としては|天聞軸|通俗霊性|言葉・言霊・真言|原典再統合|D・ΔS|Ω\s*=/u.test(r) ||
    (/言葉/u.test(r) && /言[霊灵靈]/u.test(r) && /真言/u.test(r))
  ) {
    return false;
  }

  return true;
}
