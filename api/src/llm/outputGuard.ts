// src/llm/outputGuard.ts
import { CorePlan } from "../kanagi/types/corePlan.js";

const GENERIC_NEWSLIKE = [
  "日本の伝統的な概念",
  "ポジティブな言葉",
  "引き寄せ",
  "スピリチュアル",
  "一般に",
];

const FORBIDDEN_CITATION_MARKERS = [
  "pdfPage:",
  "lawId:",
  "引用:",
  "出典:",
];

function includesAny(text: string, needles: string[]): boolean {
  return needles.some(n => text.includes(n));
}

export function guardSurfaceText(args: {
  llmText: string;
  plan: CorePlan;
}): { ok: boolean; safeText: string; reason?: string } {
  const { llmText, plan } = args;

  // strict domain：一般論テンプレを落とす
  if (plan.strictness === "strict" && includesAny(llmText, GENERIC_NEWSLIKE)) {
    return { ok: false, safeText: "", reason: "generic-template" };
  }

  // 引用系はLLMに出させない（detailはコード生成）
  if (includesAny(llmText, FORBIDDEN_CITATION_MARKERS)) {
    return { ok: false, safeText: "", reason: "citation-marker" };
  }

  return { ok: true, safeText: llmText };
}

