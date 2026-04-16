export async function polishText(
  llmChat: any,
  text: string
): Promise<string> {

  const prompt = `
次の文章を
TENMON-ARKらしい
静かで美しい日本語に整えてください。
140文字以内。

${text}
`;

  try {
    const r = await llmChat({
      system: "文章整形",
      user: prompt,
      history: []
    });

    return r?.text || text;
  } catch {
    return text;
  }
}
