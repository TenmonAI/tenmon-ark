// 観測円 → 応答文変換エンジン
// KanagiTrace + PersonaState → 観測文（内部）
// UIへは「会話形」に翻訳して出す（内容改変ではなく表現変換）

import type { KanagiTrace } from "../types/trace.js";
import type { PersonaState } from "../../persona/personaState.js";
// PersonaState の公開部分のみ使用（_inertia等は除外）
type PublicPersonaState = Omit<PersonaState, "_inertia" | "_thinkingAxis" | "_kanagiPhase">;

/**
 * 形（form）別テンプレート（内部ラベル）
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
 * 位相（phase）別補助文（内部ラベル）
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
 * PersonaState に応じた語り口調整（内部）
 */
function adjustToneByPersona(text: string, persona: PublicPersonaState): string {
  switch (persona.mode) {
    case "calm":
      return text.length > 80 ? text.substring(0, 80) + "……" : text;
    case "thinking":
      return text.replace(/。/g, "。\n");
    case "engaged":
      return text;
    case "silent":
      return text.length > 20 ? "……" : text;
    default:
      return text;
  }
}

/**
 * 観測円から「内部用の骨格テキスト」を生成（※ここでは polish しない）
 * - 答えを出さない（未解・矛盾を保持）
 * - 内部の trace/plan と一致する“骨格”として残す
 */
export function composeResponse(trace: KanagiTrace, persona: PublicPersonaState): string {
  const baseObservation = trace.observationCircle?.description || "観測中";
  const formNote = getFormTemplate(trace.form);
  const phaseNote = getPhaseNote(trace.phase);

  let response = `${baseObservation} ${formNote}${phaseNote}`;

  if (trace.observationCircle?.unresolved && trace.observationCircle.unresolved.length > 0) {
    response += "\n\n未解決：";
    for (const u of trace.observationCircle.unresolved) response += `\n- ${u}`;
  }

  if (trace.contradictions && trace.contradictions.length > 0) {
    response += "\n\n矛盾（保持中）：";
    for (const c of trace.contradictions) response += `\n- ${c.thesis} / ${c.antithesis}`;
  }

  response = adjustToneByPersona(response, persona);
  return response;
}

/**
 * ログ語彙を自然文へ（表現だけ変換・意味は変えない）
 */
/**
 * UI向け：会話形応答を生成（最後に stylePolish を1回だけ）
 * - trace/detailPlan は壊さない（テキストだけ翻訳）
 * - 末尾は「次の一手」を一問で終える
 */
/**
 * 会話形応答（返答テキストだけ翻訳）
 * - GROUNDED/詳細/根拠サインがある場合：composeResponseをそのまま返す
 * - それ以外：ログ語彙を自然文へ置換し、最後は問い1つで閉じる
 */
export function composeConversationalResponse(
  trace: KanagiTrace,
  persona: PublicPersonaState,
  userMessage: string,
  polishOpts?: ComposePolishOpts
): string {
  const raw = composeResponse(trace, persona);

  let t = replaceLogTerms(raw)
    .replace(/未解決：\s*/g, "")
    .replace(/矛盾（保持中）：\s*/g, "")
    .replace(/^-\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // 長すぎる時は段落を抑える（骨格は残す）
  const lines = t.split("\n").filter((x) => x.trim().length > 0);
  if (lines.length > 7) t = lines.slice(0, 7).join("\n");

  // 末尾を問いで閉じる
  const endsQ = /[？?]\s*$/.test(t) || /(ですか|でしょうか|ますか)\s*$/.test(t);
  if (!endsQ) {
    const isConsult = /不安|動けない|どうすれば|困って|迷って/i.test(userMessage);
    t += isConsult ? "\n\nいま一番ひっかかっている点は、どこですか？" : "\n\n次の一手は、どこから始めましょうか？";
  }

  // ここで1回だけ polish（引用/根拠は壊さない）
  return stylePolish({
    text: t,
    mode: polishOpts?.mode ?? "HYBRID",
    wantsDetail: polishOpts?.wantsDetail ?? false,
    userMessage,
  });
}
