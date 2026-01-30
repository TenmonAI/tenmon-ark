import { buildDialecticPrompt } from "./dialecticPrompt.js";

/**
 * 矛盾生成結果
 */
export type DialecticResult = {
  thesis: string;
  antithesis: string;
  tension: number;
};

/**
 * ⚠️ この関数は「矛盾生成のみ」
 * 躰・制約・正中を一切参照してはならない
 */
// [SAFETY] Runtime LLM usage is strictly prohibited in TENMON-ARK.
// decisionFrame.llm must always be null. This function MUST NOT call any LLM.
export async function generateContradiction(
  input: string
): Promise<DialecticResult | null> {
  void input;
  return null;
}

/**
 * ダミー（実装時は差し替え）
 */
async function callLLM(_: {
  system: string;
  user: string;
}): Promise<string> {
  return JSON.stringify({
    thesis: "これは前進すべきだ",
    antithesis: "これは立ち止まるべきだ",
    tension: 7,
  });
}

