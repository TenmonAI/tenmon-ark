export function evaluateTenmon(text: string) {

  let score = 0

  if (text.includes("【天聞の所見】")) score++
  if (text.length < 250) score++
  if (!/一般論|科学では|多くの文化/.test(text)) score++
  if (/[？?]/.test(text)) score++

  return score >= 3
}
