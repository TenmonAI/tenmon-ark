export function irohaInterpret(word: string) {

  const map: Record<string, string> = {

    "イ": "命・息",
    "ロ": "凝固",
    "ハ": "放出",
    "ニ": "分化",
    "ホ": "中心",
    "ヘ": "膨張",
    "ト": "結合",

    "チ": "血",
    "リ": "濁水",
    "ヌ": "横糸",
    "ル": "濁流",
    "ヲ": "縦糸",

    "ヨ": "与合",
    "タ": "霊",
    "レ": "濁",
    "ソ": "水火",
    "ツ": "続",
    "ネ": "根",
    "ナ": "凝"
  }

  return map[word] ?? null
}
