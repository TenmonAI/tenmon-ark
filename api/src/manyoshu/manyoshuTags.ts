export function extractManyoshuTags(text: string): string[] {
  const source = text ?? "";
  const tags: string[] = [];

  const rules: Array<{ re: RegExp; tag: string }> = [
    // 季節
    { re: /(春|夏|秋|冬)/, tag: "SEASON" },
    // 恋愛・関係性
    { re: /(恋|戀|思ふ|逢ふ|慕ふ|愛)/, tag: "RELATIONSHIP" },
    // 祈り・祭祀
    { re: /(祈|神|祭|斎|斎み|祝)/, tag: "RITUAL" },
    // 感情
    { re: /(嘆|悲|憂|喜|怒|悦)/, tag: "EMOTION" },
  ];

  for (const { re, tag } of rules) {
    if (re.test(source)) {
      tags.push(tag);
    }
  }

  // 重複排除して常に配列を返す（空配列OK）
  return Array.from(new Set(tags));
}

