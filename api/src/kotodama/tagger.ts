// api/src/kotodama/tagger.ts
// 言霊秘書の本文から IKI/SHIHO/KAMI/HOSHI を決定論でタグ付け

export type KotodamaTag = "IKI" | "SHIHO" | "KAMI" | "HOSHI";

/**
 * テキストから IKI/SHIHO/KAMI/HOSHI タグを抽出（決定論）
 * 
 * 最小のタグ付け規則:
 * - IKI：イキ|ィキ|日月|陰陽
 * - SHIHO：シホ|水火
 * - KAMI：カミ|火水
 * - HOSHI：ホシ|星
 * - "水火/火水" は広いので、シホ/カミ/ホシ表記優先で、無い時だけ水火・火水を付ける
 */
export function extractKotodamaTags(text: string): KotodamaTag[] {
  const t = String(text || "");
  if (!t || t.trim().length === 0) {
    return [];
  }

  const tags: KotodamaTag[] = [];
  const found = new Set<KotodamaTag>();

  // 優先順位1: 明示的な表記を検出（シホ/カミ/ホシ表記優先）
  // シホ（シホ|しほ）
  if (/(?:シホ|しほ)/i.test(t)) {
    found.add("SHIHO");
  }
  // カミ（カミ|かみ）
  if (/(?:カミ|かみ)/i.test(t)) {
    found.add("KAMI");
  }
  // ホシ（ホシ|ほし|星）
  if (/(?:ホシ|ほし|星)/i.test(t)) {
    found.add("HOSHI");
  }
  // イキ（イキ|いき|ィキ|日月|陰陽）
  if (/(?:イキ|いき|ィキ|日月|陰陽)/i.test(t)) {
    found.add("IKI");
  }

  // 優先順位2: 明示的な表記がない場合、単独の「火水」「水火」から推測
  // ただし、既に明示的な表記があればスキップ（両方付けない）
  if (found.size === 0) {
    // 「水火」の出現を確認（SHIHO）
    if (/(?:水火)/.test(t)) {
      found.add("SHIHO");
    }
    // 「火水」の出現を確認（KAMI）
    if (/(?:火水)/.test(t)) {
      found.add("KAMI");
    }
  }

  // 配列に変換（順序: IKI > SHIHO > KAMI > HOSHI）
  const order: KotodamaTag[] = ["IKI", "SHIHO", "KAMI", "HOSHI"];
  for (const tag of order) {
    if (found.has(tag)) {
      tags.push(tag);
    }
  }

  return tags;
}
