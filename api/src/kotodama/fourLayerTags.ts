// Phase32: 四層タグ抽出（IKi/SHIHO/KAMI/HOSHI）決定論実装

/**
 * テキストから四層タグを抽出（決定論、正規表現ベース）
 */
export function extractFourLayerTags(text: string): string[] {
  if (!text || typeof text !== "string") {
    return [];
  }
  
  const tags: string[] = [];
  const normalized = text.toLowerCase();
  
  // 四層タグのパターン（決定論マッチ）
  if (/\b(?:いき|イキ|iki|IKi)\b/i.test(text)) {
    tags.push("IKi");
  }
  if (/\b(?:しほ|シホ|shih[oō]|SHIHO)\b/i.test(text)) {
    tags.push("SHIHO");
  }
  if (/\b(?:かみ|カミ|kami|KAMI)\b/i.test(text)) {
    tags.push("KAMI");
  }
  if (/\b(?:ほし|ホシ|hosh[iī]|HOSHI)\b/i.test(text)) {
    tags.push("HOSHI");
  }
  
  return tags;
}
