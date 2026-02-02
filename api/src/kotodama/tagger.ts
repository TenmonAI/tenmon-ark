// api/src/kotodama/tagger.ts
// 言霊秘書の本文から IKI/SHIHO/KAMI/HOSHI を決定論でタグ付け

export type KotodamaTag = "IKI" | "SHIHO" | "KAMI" | "HOSHI";

/**
 * テキストから IKI/SHIHO/KAMI/HOSHI タグを抽出（決定論）
 * 
 * 優先ルール:
 * - カミ/ホシ/シホ/イキ表記を優先
 * - 単独の「火水」「水火」だけで両方付けない（優先順位: カミ > ホシ > シホ > イキ）
 */
export function extractKotodamaTags(text: string): KotodamaTag[] {
  const t = String(text || "");
  if (!t || t.trim().length === 0) {
    return [];
  }

  const tags: KotodamaTag[] = [];
  const found = new Set<KotodamaTag>();

  // 優先順位1: カミ/ホシ/シホ/イキ の明示的な表記を検出
  // カミ（神/上/紙/髪など、文脈依存だが「カミ」表記を優先）
  if (/(?:カミ|かみ|神|上)(?:[^\n。]*水火|水火[^\n。]*|法則)/i.test(t)) {
    found.add("KAMI");
  }
  // ホシ（星/干しなど、文脈依存だが「ホシ」表記を優先）
  if (/(?:ホシ|ほし|星|干し)(?:[^\n。]*水火|水火[^\n。]*|法則)/i.test(t)) {
    found.add("HOSHI");
  }
  // シホ（四方/死法など、文脈依存だが「シホ」表記を優先）
  if (/(?:シホ|しほ|四方|死法)(?:[^\n。]*水火|水火[^\n。]*|法則)/i.test(t)) {
    found.add("SHIHO");
  }
  // イキ（息/生きなど、文脈依存だが「イキ」表記を優先）
  if (/(?:イキ|いき|息|生き)(?:[^\n。]*水火|水火[^\n。]*|法則)/i.test(t)) {
    found.add("IKI");
  }

  // 優先順位2: 明示的な表記がない場合、単独の「火水」「水火」から推測
  // ただし、既に明示的な表記があればスキップ（両方付けない）
  if (found.size === 0) {
    // 「火水」または「水火」の出現を確認
    const hasSuiKa = /(?:火水|水火)/.test(t);
    
    if (hasSuiKa) {
      // 文脈から推測（簡易版: 出現位置や周辺文字列から判断）
      // デフォルト: カミ（最も一般的）
      found.add("KAMI");
      
      // 追加の文脈チェック（例: 「星」が近くにあれば HOSHI も追加）
      // ただし、単独の「火水」「水火」だけで両方付けない（優先順位: カミ > ホシ > シホ > イキ）
      // ここではカミのみを返す（優先ルールに従う）
    }
  }

  // 配列に変換（順序: KAMI > HOSHI > SHIHO > IKI）
  const order: KotodamaTag[] = ["KAMI", "HOSHI", "SHIHO", "IKI"];
  for (const tag of order) {
    if (found.has(tag)) {
      tags.push(tag);
    }
  }

  return tags;
}
