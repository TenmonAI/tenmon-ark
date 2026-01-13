// /opt/tenmon-ark/api/src/persona/outputGuard.ts
// Output Guard（ネットテンプレ検知）

/**
 * 禁止テンプレ語（一般説明テンプレが混ざったらNG）
 */
const FORBIDDEN_TEMPLATES = [
  /日本の伝統的(?:な|に)/,
  /古来より(?:信じられ|伝えられ)/,
  /ポジティブな言葉で/,
  /前向きに/,
  /明るく/,
  /温かみのある/,
  /(?:深い|深く)(?:意味|意義|価値)/,
  /(?:大切|重要)(?:な|に)考え/,
  /(?:豊か|豊富)(?:な|に)(?:文化|歴史)/,
  /(?:素晴らしい|素敵な|素朴な)(?:概念|考え|文化)/,
  /(?:昔から|古くから|伝統的に)(?:伝わって|続いて)/,
  /(?:日本人|日本)(?:の|が)(?:大切|重視)(?:に|して)/,
  /(?:心|精神)(?:の|が)(?:豊か|豊富)/,
  /(?:言葉|言語)(?:の|が)(?:持つ|持っている)(?:力|パワー)/,
];

/**
 * LLM出力に禁止テンプレ語が含まれているかチェック
 */
export function containsForbiddenTemplate(text: string): boolean {
  const normalized = text.trim();
  
  for (const pattern of FORBIDDEN_TEMPLATES) {
    if (pattern.test(normalized)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 禁止テンプレ語を検出した場合のフォールバック
 */
export function getFallbackTemplate(topic: string, truthAxes: string[]): string {
  if (truthAxes.length > 0) {
    return `資料より${topic}について確認。真理軸（${truthAxes.join("、")}）に照らして、資料準拠の結論を導出。`;
  }
  return `資料より${topic}について確認。資料準拠の結論を導出。`;
}


