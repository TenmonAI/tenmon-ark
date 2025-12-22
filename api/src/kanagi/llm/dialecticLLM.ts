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
export async function generateContradiction(
  input: string
): Promise<DialecticResult | null> {

  // === LLM呼び出し（例） ===
  // ※ ここは既存の OpenAI / Gemini ラッパーに合わせて差し替え
  const responseText = await callLLM({
    system: "You are a contradiction generator.",
    user: buildDialecticPrompt(input),
  });

  try {
    const json = JSON.parse(responseText);

    if (
      typeof json.thesis === "string" &&
      typeof json.antithesis === "string" &&
      typeof json.tension === "number"
    ) {
      return {
        thesis: json.thesis,
        antithesis: json.antithesis,
        tension: Math.max(1, Math.min(10, json.tension)),
      };
    }
  } catch {
    console.error("[KANAGI-LLM] Invalid contradiction JSON");
  }

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

