// 観測円 → 応答文変換エンジン
// KanagiTrace + PersonaState → 観測文（内部）
// UIへは“会話形”に整えて返す（内容改変ではなく表現変換）
//
// NOTE: build安定を最優先にするため、このファイルは自己完結（外部importなし）で成立させる。
// stylePolisher統合は別PDCAで行う。

import type { KanagiTrace } from "../types/trace.js";
import type { PersonaState } from "../../persona/personaState.js";

// PersonaState の公開部分のみ使用（_inertia等は除外）
type PublicPersonaState = Omit<PersonaState, "_inertia" | "_thinkingAxis" | "_kanagiPhase">;

export type ComposePolishOpts = {
  mode?: string;
  wantsDetail?: boolean;
  userMessage?: string;
  threadId?: string;
};

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
 * PersonaState に応じた語り口調整（最小）
 */
function adjustToneByPersona(text: string, persona: PublicPersonaState): string {
  switch (persona.mode) {
    case "calm":
      return text.length > 80 ? text.substring(0, 80) + "……" : text;
    case "thinking":
      return text.replace(/。/g, "。\n");
    case "silent":
      return text.length > 20 ? "……" : text;
    default:
      return text;
  }
}

/**
 * 観測円から応答文を生成（内部向け・ログ寄り）
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

/**
 * ログ語彙 → 自然文 置換（会話表面用）
 */
const LOG_TERM_REPLACEMENTS: Record<string, string> = {
  "正中・保留・圧縮": "いまは答えをまとめている途中です",
  "凝縮・内集・一点化": "いまは一点に集中している状態です",
  "貫通・方向性": "いまは行動へ向かう状態です",
  "循環・拮抗": "いまはバランスを取っている状態です",
  "未解決：": "",
  "矛盾（保持中）：": "",
  "観測中": "考えています",
  "正中": "中心",
  "内集": "内側に集まる",
  "外発": "外側に広がる",
  "凝縮": "凝り固まる",
  "圧縮": "圧し縮まる",
  "発酵中": "熟成中",
};

function replaceLogTerms(text: string): string {
  let result = text;
  const sortedTerms = Object.keys(LOG_TERM_REPLACEMENTS).sort((a, b) => b.length - a.length);
  for (const term of sortedTerms) {
    const replacement = LOG_TERM_REPLACEMENTS[term];
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "g"), replacement);
  }
  return result;
}

function normalizePunctuation(s: string): string {
  return s
    .replace(/\n+\s*\n+/g, "\n\n")
    .replace(/\n。\n/g, "。\n")
    .replace(/。\n{3,}/g, "。\n\n")
    .trim();
}

function endsWithQuestion(s: string): boolean {
  return /[？?]\s*$/.test(s) || /(ですか|でしょうか|ますか)\s*$/.test(s);
}

/**
 * 会話形応答を生成（UI向け）
 * - 内部構造は崩さず、返答テキストだけ会話に寄せる
 * - 最後は必ず「次の一手」を問う
 */
export function composeConversationalResponse(
  trace: KanagiTrace,
  persona: PublicPersonaState,
  userMessage: string = "",
  polishOpts?: ComposePolishOpts
): string {
  const raw = composeResponse(trace, persona);
  let t = replaceLogTerms(raw);

  // 箇条書きを自然文に寄せる（先頭 "- " を除去）
  t = t.replace(/^\-\s*/gm, "");

  t = normalizePunctuation(t);

  // 行数を抑える（骨格は残す）
  const lines = t.split("\n").filter((x: string) => x.trim().length > 0);
  if (lines.length > 7) t = lines.slice(0, 7).join("\n");

  // 末尾を問いで閉じる
  if (!endsWithQuestion(t)) {
    const isConsult = /不安|動けない|どうすれば|困って|迷って/i.test(userMessage);
    t += isConsult
      ? "\n\nいま一番ひっかかっている点は、どこですか？"
      : "\n\n次の一手は、どこから始めましょうか？";
  }

  return t;
}
