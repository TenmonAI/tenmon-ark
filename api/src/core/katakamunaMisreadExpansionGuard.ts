/** TENMON_BUILD_GREEN_RESTORE_AFTER_SHELTER_V1 */
/** CARD-MC-21: 誤読拡大ガードの短文方針（カタカムナ文脈で注入） */
export function buildKatakamunaMisreadExpansionGuardClauseV1(rawMessage: string, maxChars: number): string {
  const t = String(rawMessage ?? "").trim();
  if (!/(カタカムナ|かたかむな|KATAKAMUNA)/iu.test(t)) return "";
  const body = [
    "【カタカムナ誤読・拡張ガード】",
    "史実口調での断定性拡大を避ける。類比・神秘語・市場スピ語を歴史定説と一括しない。",
    "天聞では言霊秘書・水穂伝・稲荷古伝を root、カタカムナ資料は mapping 先として層を分ける。",
  ].join("\n");
  const cap = Math.max(80, maxChars);
  return body.length > cap ? body.slice(0, cap) : body;
}

export function isKatakamunaRouteForMisreadGuardV1(_rr: string, _raw: string): boolean {
  return false;
}

export function buildKatakamunaMisreadExpansionGuardV1(_raw: string, _out: string): unknown {
  return null;
}

export function applyKatakamunaMisreadGuardToSurfaceV1(
  out: string,
  _g: unknown,
  _rr: string,
  _raw: string,
): string {
  return out;
}
