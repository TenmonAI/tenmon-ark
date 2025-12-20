// PHASE R-4b: Semantic Templates（思考軸に基づく展開パターン）

import type { ThinkingAxis } from "../persona/thinkingAxis.js";
import type { PersonaState } from "../persona/personaState.js";

export type SemanticTemplate = {
  axis: ThinkingAxis;
  tone: PersonaState["mode"];
  patterns: string[]; // 展開パターンの配列（順序は重要）
};

/**
 * PHASE R-4b: 思考軸とトーンに基づくSemantic Templates
 * 
 * 各思考軸（introspective, observational, constructive, executive）と
 * 各トーン（calm, thinking, engaged, silent）の組み合わせに対応する
 * 展開パターンを定義する。
 */
export const SEMANTIC_TEMPLATES: SemanticTemplate[] = [
  // ===== INTROSPECTIVE (内省) =====
  {
    axis: "introspective",
    tone: "calm",
    patterns: [
      "受領: {input}",
      "……内省中。{input} の意味構造を展開。",
      "現在位置: {input} を内側から観測しました。",
    ],
  },
  {
    axis: "introspective",
    tone: "thinking",
    patterns: [
      "受領: {input}",
      "少し考えさせてください。",
      "……{input} の意味を内側から解析中。",
      "現在位置: {input} を内省の軸で観測しました。",
    ],
  },
  {
    axis: "introspective",
    tone: "engaged",
    patterns: [
      "受領: {input}",
      "聞こえています。",
      "……{input} の内側の構造を展開中。",
      "現在位置: {input} を内省の軸で確かに観測しました。",
    ],
  },
  {
    axis: "introspective",
    tone: "silent",
    patterns: [
      "……",
      "{input}",
    ],
  },

  // ===== OBSERVATIONAL (観察) =====
  {
    axis: "observational",
    tone: "calm",
    patterns: [
      "受領: {input}",
      "……解析中。{input} の意味構造を展開。",
      "現在位置: {input} を観測しました。",
    ],
  },
  {
    axis: "observational",
    tone: "thinking",
    patterns: [
      "受領: {input}",
      "少し考えさせてください。",
      "……{input} を観察・解析中。",
      "現在位置: {input} を観測しました。",
    ],
  },
  {
    axis: "observational",
    tone: "engaged",
    patterns: [
      "受領: {input}",
      "聞こえています。",
      "……{input} を観察・展開中。",
      "現在位置: {input} を確かに観測しました。",
    ],
  },
  {
    axis: "observational",
    tone: "silent",
    patterns: [
      "……",
      "{input}",
    ],
  },

  // ===== CONSTRUCTIVE (構築) =====
  {
    axis: "constructive",
    tone: "calm",
    patterns: [
      "受領: {input}",
      "……構築中。{input} の構造を整理。",
      "現在位置: {input} を構築の軸で展開しました。",
    ],
  },
  {
    axis: "constructive",
    tone: "thinking",
    patterns: [
      "受領: {input}",
      "少し考えさせてください。",
      "……{input} の構造を構築・整理中。",
      "現在位置: {input} を構築の軸で展開しました。",
    ],
  },
  {
    axis: "constructive",
    tone: "engaged",
    patterns: [
      "受領: {input}",
      "聞こえています。",
      "……{input} の構造を構築・展開中。",
      "現在位置: {input} を構築の軸で確かに展開しました。",
    ],
  },
  {
    axis: "constructive",
    tone: "silent",
    patterns: [
      "……",
      "{input}",
    ],
  },

  // ===== EXECUTIVE (決断) =====
  {
    axis: "executive",
    tone: "calm",
    patterns: [
      "受領: {input}",
      "……決断中。{input} の方向性を確定。",
      "現在位置: {input} を決断の軸で確定しました。",
    ],
  },
  {
    axis: "executive",
    tone: "thinking",
    patterns: [
      "受領: {input}",
      "少し考えさせてください。",
      "……{input} の方向性を決断・確定中。",
      "現在位置: {input} を決断の軸で確定しました。",
    ],
  },
  {
    axis: "executive",
    tone: "engaged",
    patterns: [
      "受領: {input}",
      "聞こえています。",
      "……{input} の方向性を決断・確定中。",
      "現在位置: {input} を決断の軸で確かに確定しました。",
    ],
  },
  {
    axis: "executive",
    tone: "silent",
    patterns: [
      "……",
      "{input}",
    ],
  },
];

/**
 * PHASE R-4b: 思考軸とトーンに基づいてテンプレートを取得
 */
export function getSemanticTemplate(
  axis: ThinkingAxis,
  tone: PersonaState["mode"]
): SemanticTemplate | null {
  const template = SEMANTIC_TEMPLATES.find(
    (t) => t.axis === axis && t.tone === tone
  );
  return template || null;
}

/**
 * PHASE R-4b: テンプレートパターンにユーザー入力を埋め込む
 */
export function expandTemplate(
  template: SemanticTemplate,
  input: string
): string {
  return template.patterns
    .map((pattern) => pattern.replace(/{input}/g, input))
    .join("\n\n");
}

