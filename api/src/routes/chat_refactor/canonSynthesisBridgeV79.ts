/**
 * CHAT_SAFE_REFACTOR_PATCH79_CANON_SYNTHESIS_BRIDGE_V1
 * 言霊秘書・いろは・カタカムナ・断捨離を同一人格判断で束ねる最小橋（本質→位置づけ→原典→次軸を自然文に圧縮）。
 */

const CANON_SYNTHESIS_BRIDGE_V79 =
  "同じ判断で読むと、言霊秘書は音の本義を担い、いろはは五十音秩序の配列を担い、カタカムナは図象と音の照合軸を担い、断捨離は要・不要と手放しの裁定を担います。いずれも通俗説法へ滑らず、原典へ戻す一本筋の上で位置づけられます。次に一段入るなら、いまの問いに直撃する一軸だけを選ぶと混線しにくいです。";

export function wantsCanonSynthesisBridgeV79(rawMessage: string): boolean {
  const m = String(rawMessage ?? "").trim();
  if (!m || m.length > 560) return false;
  if (/言[霊灵靈]秘書|言靈秘書/u.test(m)) return true;
  if (/いろは/u.test(m) && /(言[霊灵靈]|言霊法則|言靈法則)/u.test(m)) return true;
  if (/カタカムナ/u.test(m)) return true;
  if (/断捨離/u.test(m) && /(判断|構造|として|説明)/u.test(m)) return true;
  if (/言葉/u.test(m) && /言[霊灵靈]/u.test(m) && /真言/u.test(m)) return true;
  return false;
}

export function canonSynthesisBridgeAppendV79(): string {
  return CANON_SYNTHESIS_BRIDGE_V79;
}

export function shouldAppendCanonSynthesisV79(input: {
  rawMessage: string;
  response: string;
  mode: string;
  routeReason: string;
}): boolean {
  const mode = String(input.mode ?? "");
  if (mode === "GROUNDED") return false;
  const raw = String(input.rawMessage ?? "");
  if (/#詳細|doc\s*=|pdfPage\s*=/i.test(raw)) return false;
  if (!wantsCanonSynthesisBridgeV79(raw)) return false;

  const rr = String(input.routeReason ?? "").trim();
  if (
    rr === "TRUTH_GATE_RETURN_V2" ||
    rr === "DEF_FASTPATH_VERIFIED_V1" ||
    rr === "DEF_FASTPATH_PROPOSED_V1" ||
    /^(FASTPATH_|DET_PASSPHRASE|N1_GREETING|NATURAL_FALLBACK|SMOKE|RELEASE_PREEMPT)/i.test(rr)
  ) {
    return false;
  }

  const r = String(input.response ?? "").trim();
  if (r.length < 24 || r.length > 5200) return false;

  // 既に同型の束ね橋・四層が揃っていれば重ねない
  if (/同じ判断で読むと/u.test(r)) return false;
  if (
    /言[霊灵靈]秘書.*本義|言霊秘書.*音/u.test(r) &&
    /いろは.*秩序/u.test(r) &&
    /カタカムナ.*照合/u.test(r) &&
    /断捨離.*裁定/u.test(r) &&
    /原典/u.test(r)
  ) {
    return false;
  }

  return true;
}
