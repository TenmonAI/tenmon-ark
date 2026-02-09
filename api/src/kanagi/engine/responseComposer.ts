// 観測円 → 応答文変換エンジン
// KanagiTrace + PersonaState → 応答文（内部の観測を保持しつつ、UIは会話形へ）

import type { KanagiTrace } from "../types/trace.js";
import type { PersonaState } from "../../persona/personaState.js";
import { stylePolish } from "../../persona/stylePolisher.js";

// PersonaState の公開部分のみ使用（_inertia等は除外）
type PublicPersonaState = Omit<PersonaState, "_inertia" | "_thinkingAxis" | "_kanagiPhase">;

export type ComposePolishOpts = {
  mode?: string;
  wantsDetail?: boolean;
  userMessage?: string;
  threadId?: string;
};

// 形（form）別テンプレート（内部語彙）
function getFormTemplate(form: KanagiTrace["form"]): string {
  switch (form) {
    case "DOT": return "凝縮・内集・一点化";
    case "LINE": return "貫通・方向性";
    case "CIRCLE": return "循環・拮抗";
    case "WELL": return "正中・保留・圧縮";
    default: return "観測中";
  }
}

// 位相（phase）別補助文
function getPhaseNote(phase: KanagiTrace["phase"]): string {
  const notes: string[] = [];
  if (phase.rise) notes.push("昇");
  if (phase.fall) notes.push("降");
  if (phase.open) notes.push("開");
  if (phase.close) notes.push("閉");
  if (phase.center) notes.push("正中");
  return notes.length ? `（${notes.join("・")}）` : "";
}

// PersonaState に応じた語り口調整（内部の間合い）
function adjustToneByPersona(text: string, persona: PublicPersonaState): string {
  switch (persona.mode) {
    case "calm":
      return text.length > 120 ? text.slice(0, 120) + "……" : text;
    case "thinking":
      return text.replace(/。/g, "。\n");
    case "silent":
      return text.length > 20 ? "……" : text;
    default:
      return text;
  }
}

/**
 * 旧来の観測文（硬い語彙を含み得る）
 * ※内部の骨格として残す
 */
export function composeResponse(trace: KanagiTrace, persona: PublicPersonaState): string {
  const baseObservation = trace.observationCircle?.description || "観測中";
  const formNote = getFormTemplate(trace.form);
  const phaseNote = getPhaseNote(trace.phase);

  let response = `${baseObservation} ${formNote}${phaseNote}`;

  if (trace.observationCircle?.unresolved?.length) {
    response += "\n\n未解決：";
    for (const u of trace.observationCircle.unresolved) response += `\n- ${u}`;
  }

  if (trace.contradictions?.length) {
    response += "\n\n矛盾（保持中）：";
    for (const c of trace.contradictions) response += `\n- ${c.thesis} / ${c.antithesis}`;
  }

  return adjustToneByPersona(response, persona);
}

// 内部ログ語彙→自然文（会話面だけ）
const LOG_TERM_REPLACEMENTS: Record<string, string> = {
  "正中・保留・圧縮": "いまは答えをまとめている途中です",
  "凝縮・内集・一点化": "いまは一点に集中している状態です",
  "貫通・方向性": "いまは行動へ向かう状態です",
  "循環・拮抗": "いまはバランスを取っている状態です",
  "正中": "中心",
  "内集": "内側に集まる",
  "外発": "外側に広がる",
  "凝縮": "固まりやすい",
  "圧縮": "ぎゅっと縮まる",
  "観測中": "考えています",
  "発酵中": "熟している途中です",
};

function replaceLogTerms(text: string): string {
  let out = text;
  const terms = Object.keys(LOG_TERM_REPLACEMENTS).sort((a, b) => b.length - a.length);
  for (const term of terms) {
    const rep = LOG_TERM_REPLACEMENTS[term];
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    out = out.replace(re, rep);
  }
  return out;
}

/**
 * UI用：会話形に翻訳した応答文
 * - 末尾は問いで終える
 * - 根拠・引用の改変は stylePolish 側でガード
 */
export function composeConversationalResponse(
  trace: KanagiTrace,
  persona: PublicPersonaState,
  userMessage: string = "",
  polishOpts?: ComposePolishOpts
): string {
  const raw = composeResponse(trace, persona);

  // ログ語彙を自然文へ
  let t = replaceLogTerms(raw)
    .replace(/未解決：\s*/g, "")
    .replace(/矛盾（保持中）：\s*/g, "")
    .replace(/^-\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // 長すぎる時は段落を抑える（骨格は残す）
  const lines = t.split("\n").filter((x: string) => x.trim().length > 0);
  if (lines.length > 7) t = lines.slice(0, 7).join("\n");

  // 末尾を問いで閉じる
  const endsQ = /[？?]\s*$/.test(t) || /(ですか|でしょうか|ますか)\s*$/.test(t);
  if (!endsQ) {
    const isConsult = /不安|動けない|どうすれば|困って|迷って/i.test(userMessage);
    t += isConsult
      ? "\n\nいま一番ひっかかっている点は、どこですか？"
      : "\n\n次の一手は、どこから始めましょうか？";
  }

  // 最終 polish（引用/根拠は壊さない）
  return stylePolish({
    text: t,
    mode: polishOpts?.mode ?? "HYBRID",
    wantsDetail: polishOpts?.wantsDetail ?? false,
    userMessage,
  });
}
