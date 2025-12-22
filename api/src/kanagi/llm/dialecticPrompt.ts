/**
 * LLM 用・天津金木 矛盾生成プロンプト
 * ❌ 結論禁止
 * ❌ 統合禁止
 * ❌ 助言禁止
 */
export function buildDialecticPrompt(input: string): string {
  return `
あなたは「矛盾生成器」です。

以下の現象に対して、
【正】と【反】の立場を、できるだけ強く・極端に・対立させて提示してください。

【重要な禁止事項】
- 統合しない
- 解決しない
- 結論を出さない
- 助言しない
- どちらが正しいかを判断しない

【出力形式（厳守）】
JSONのみを出力してください。

{
  "thesis": "...",
  "antithesis": "...",
  "tension": 1〜10の整数
}

【現象】
${input}
`.trim();
}

