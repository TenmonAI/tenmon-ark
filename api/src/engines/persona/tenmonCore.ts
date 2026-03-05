export function enforceTenmon(text: string) {

  if (!text.includes("【天聞の所見】")) {

    return `
【天聞の所見】

${text}
`
  }

  return text
}
