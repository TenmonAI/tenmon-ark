export function extractDanshariTags(text: string): string[] {
  const source = text ?? "";
  const tags: string[] = [];

  const rules: Array<{ re: RegExp; tag: string }> = [
    // 手放し・解放
    { re: /(執着|手放す|手ばなす|捨てる|断つ)/, tag: "RELEASE" },
    // 習慣・パターン
    { re: /(習慣|クセ|癖|パターン)/, tag: "HABIT" },
    // 決断・選択
    { re: /(決断|選ぶ|取捨|優先|決める)/, tag: "DECISION" },
    // 空間・片付け
    { re: /(片付け|片づけ|整理|整頓|空間|スペース)/, tag: "SPACE" },
  ];

  for (const { re, tag } of rules) {
    if (re.test(source)) {
      tags.push(tag);
    }
  }

  // 重複排除して常に配列を返す（空配列OK）
  return Array.from(new Set(tags));
}

