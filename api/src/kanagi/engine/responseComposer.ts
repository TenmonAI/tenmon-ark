// 観測円 → 応答文変換エンジン
// KanagiTrace + PersonaState → 観測文
// 答えを出さない、矛盾・未解決をそのまま残す

import type { KanagiTrace } from "../types/trace.js";
import type { PersonaState } from "../../persona/personaState.js";

/**
 * 形（form）別テンプレート
 */
function getFormTemplate(form: KanagiTrace["form"]): string {
  switch (form) {
    case "DOT":
      return "凝縮・内集・一点化";
    case "LINE":
      return "貫通・方向性";
    case "CIRCLE":
      return "循環・拮抗";
    case "WELL":
      return "正中・保留・圧縮";
    default:
      return "観測中";
  }
}

/**
 * 位相（phase）別補助文
 */
function getPhaseNote(phase: KanagiTrace["phase"]): string {
  const notes: string[] = [];
  
  if (phase.rise) notes.push("昇");
  if (phase.fall) notes.push("降");
  if (phase.open) notes.push("開");
  if (phase.close) notes.push("閉");
  if (phase.center) notes.push("正中");

  return notes.length > 0 ? `（${notes.join("・")}）` : "";
}

/**
 * PersonaState に応じた語り口調整
 */
function adjustToneByPersona(text: string, persona: PublicPersonaState): string {
  switch (persona.mode) {
    case "calm":
      // 短く静か
      return text.length > 50 ? text.substring(0, 50) + "……" : text;
    case "thinking":
      // 間・余白
      return text.replace(/。/g, "。\n");
    case "engaged":
      // 明瞭
      return text;
    case "silent":
      // 最小 or 問い返し
      return text.length > 20 ? "……" : text;
    default:
      return text;
  }
}

/**
 * 観測円から応答文を生成
 * 
 * 答えを出さない、矛盾・未解決をそのまま残す
 */
export function composeResponse(
  trace: KanagiTrace,
  persona: PublicPersonaState
): string {
  // 観測円の説明を基にする
  const baseObservation = trace.observationCircle?.description || "観測中";

  // 形（form）別テンプレートを適用
  const formNote = getFormTemplate(trace.form);

  // 位相（phase）別補助文を追加
  const phaseNote = getPhaseNote(trace.phase);

  // 基本観測文を構築
  let response = `${baseObservation} ${formNote}${phaseNote}`;

  // 未解決の緊張があれば最後に付記
  if (trace.observationCircle?.unresolved && trace.observationCircle.unresolved.length > 0) {
    response += "\n\n未解決：";
    trace.observationCircle.unresolved.forEach((u) => {
      response += `\n- ${u}`;
    });
  }

  // 矛盾があれば付記（解決しない）
  if (trace.contradictions && trace.contradictions.length > 0) {
    response += "\n\n矛盾（保持中）：";
    trace.contradictions.forEach((c) => {
      response += `\n- ${c.thesis} / ${c.antithesis}`;
    });
  }

  // PersonaState に応じた語り口調整
  response = adjustToneByPersona(response, persona);

  return response;
}

