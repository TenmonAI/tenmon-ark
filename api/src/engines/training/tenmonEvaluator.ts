export function evaluateTenmon(text: string) {

  const errors: string[] = []

  if (!text.includes("【天聞の所見】")) {
    errors.push("missing header")
  }

  if (text.length > 320) {
    errors.push("too long")
  }

  if (/一般的|人それぞれ|統計|研究/.test(text)) {
    errors.push("general theory escape")
  }

  return {
    pass: errors.length === 0,
    errors
  }
}
