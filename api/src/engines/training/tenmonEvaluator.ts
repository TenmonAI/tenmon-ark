export function evaluateTenmon(text: string) {

  let score = 0

  // TENMON形式
  if (text.includes("【天聞の所見】")) score++

  // 長すぎない
  if (text.length < 260) score++

  // 一般論禁止
  if (!/科学では|多くの文化|一般的に/.test(text)) score++

  // 最後は問い
  if (/[？?]/.test(text)) score++

  return score >= 3
}
