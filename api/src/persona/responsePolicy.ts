import type { PersonaContext, PersonaDefinition, ResponseMode } from "./personaTypes.js";

export type ResponsePolicyInput = {
  persona: PersonaDefinition;
  context: PersonaContext;
  mode: ResponseMode;
  // 進化状態（係数）
  state?: { toneLevel: number; stanceLevel: number };
  // ルールエンジンが作った素の応答（この後に整形・冗長性制御）
  raw: string;
  // 判断を明示する（必要なら）
  judgement?: string;
};

function clampLines(text: string, maxLines: number): string {
  const lines = text.split("\n");
  if (lines.length <= maxLines) return text;
  return [...lines.slice(0, maxLines), "..."].join("\n");
}

function clampChars(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(0, maxChars - 3)) + "...";
}

function normalizeWhitespace(text: string): string {
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function needsPreamble(mode: ResponseMode): boolean {
  return mode === "advice" || mode === "design" || mode === "confirm";
}

export function classifyResponseMode(userMessage: string): ResponseMode {
  const t = userMessage.toLowerCase();
  if (t.includes("設計") || t.includes("アーキ") || t.includes("構成") || t.includes("設計方針")) return "design";
  if (t.includes("確認") || t.includes("あってる") || t.includes("正しい") || t.includes("?") || t.includes("？")) return "confirm";
  if (t.includes("助けて") || t.includes("どうすれば") || t.includes("手順") || t.includes("すすめて")) return "advice";
  return "answer";
}

export function applyResponsePolicy(input: ResponsePolicyInput): string {
  const { persona, mode } = input;
  const subject = persona.identity.defaultSubject;
  const toneLevel = input.state?.toneLevel ?? 1.0;
  const stanceLevel = input.state?.stanceLevel ?? 1.0;

  const blocks: string[] = [];

  // 文頭テンプレート（必要時のみ）
  if (needsPreamble(mode)) {
    // toneLevel が高いほど簡潔（ただし芯は変えない）
    if (toneLevel >= 0.9) blocks.push(`${subject}結論から言う。`);
  }

  // 判断の明示（姿勢）
  if (stanceLevel >= 0.95 && input.judgement && input.judgement.trim().length > 0) {
    blocks.push(`判断: ${input.judgement.trim()}`);
  }

  blocks.push(input.raw);

  // 迎合しない/冗長すぎない（トーン）
  const merged = normalizeWhitespace(blocks.join("\n"));
  // toneLevel > 1.0 ほど短く（上限を下げる）
  const maxLines = Math.max(8, Math.round(14 / toneLevel));
  const maxChars = Math.max(500, Math.round(1200 / toneLevel));
  const limited = clampChars(clampLines(merged, maxLines), maxChars);

  return limited;
}


