// 観測円 → 応答文変換エンジン
// KanagiTrace + PersonaState → 観測文
// 答えを出さない、矛盾・未解決をそのまま残す

import type { KanagiTrace } from "../types/trace.js";
import type { PersonaState } from "../../persona/personaState.js";

// PersonaState の公開部分のみ使用（_inertia等は除外）
type PublicPersonaState = Omit<PersonaState, "_inertia" | "_thinkingAxis" | "_kanagiPhase">;

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

  // UI_FALLBACK: 返答が「未解…」で止まる時、最低限の次質問を添える
  const looksUnresolved = /未解(決)?/.test(response);
  const looksLogLike = /(内集|外発|正中|圧縮|凝縮|発酵)/.test(response);

  if (looksUnresolved && looksLogLike) {
    // 返答が観測ログ寄りなら、ユーザー入力に"次の問い"を返す
    response +=
      "\n\n——\n次に、どれを進めますか？\n" +
      "1) 目的を1行で（例：学習状況確認／資料の取り込み／会話品質改善）\n" +
      "2) 具体の対象を指定（doc=XXX pdfPage=NN / #search キーワード）\n" +
      "3) いま困っている症状を1つ（例：未解が多い／引用が薄い／応答が硬い）";
  }

  return response;
}

/**
 * ログ語彙を自然文に置換するマップ
 */
const LOG_TERM_REPLACEMENTS: Record<string, string> = {
  "正中・保留・圧縮": "いまは答えをまとめている途中です",
  "凝縮・内集・一点化": "いまは一点に集中している状態です",
  "外発・貫通・方向性": "いまは行動に向かっている状態です",
  "循環・拮抗": "いまはバランスを取っている状態です",
  "正中": "中心",
  "内集": "内側に集まる",
  "外発": "外側に広がる",
  "凝縮": "凝り固まる",
  "圧縮": "圧し縮まる",
  "未解決": "まだ決まっていない点",
  "矛盾（保持中）": "異なる見方があります",
  "観測中": "考えています",
  "発酵中": "熟成中",
};

/**
 * ログ語彙を自然文に置換
 */
function replaceLogTerms(text: string): string {
  let result = text;
  
  // 長い語彙から順に置換（短い語彙に先にマッチさせないため）
  const sortedTerms = Object.keys(LOG_TERM_REPLACEMENTS).sort((a, b) => b.length - a.length);
  
  for (const term of sortedTerms) {
    const replacement = LOG_TERM_REPLACEMENTS[term];
    // 語彙が含まれている場合のみ置換（部分一致を避ける）
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    result = result.replace(regex, replacement);
  }
  
  return result;
}

/**
 * 会話形応答を生成（ログ語彙を自然文に置換）
 * 
 * 仕様:
 * - trace/内部構造は維持（detailPlan/traceは壊さない）
 * - 返答テキストだけ "会話に翻訳"
 * - 禁止語彙（正中/内集/外発/凝縮/圧縮/未解/発酵中 など）が表に出る場合、自然文へ置換
 * - 末尾は必ず「次の一手」を1問で終える
 */
export function composeConversationalResponse(
  trace: KanagiTrace,
  persona: PublicPersonaState,
  userMessage?: string): string {
  // まず通常の composeResponse を呼ぶ（内部構造は維持）
  const rawResponse = composeResponse(trace, persona);
  
  // ログ語彙を自然文に置換
  let conversational = replaceLogTerms(rawResponse);
  
  // 「未解決：」「矛盾（保持中）：」などの見出しを削除
  conversational = conversational.replace(/未解決：\s*/g, "");
  conversational = conversational.replace(/矛盾（保持中）：\s*/g, "");
  conversational = conversational.replace(/観測中\s*/g, "");
  
  // 箇条書きを自然文に変換
  conversational = conversational.replace(/^-\s*/gm, "");
  conversational = conversational.replace(/\n\n\n+/g, "\n\n");
  conversational = conversational.trim();

  // 2〜6行程度にまとめる（長すぎる場合は要約）
  const lines = conversational.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length > 6) {
    // 最初の5行を保持（質問は最後に追加するので、ここでは5行まで）
    conversational = lines.slice(0, 5).join("\n");
  }

  // 末尾が質問で終わっていない場合は質問を追加
  const endsWithQuestion = /[？?]$/.test(conversational) || 
    /(ですか|でしょうか|ますか|か？|か\?)$/.test(conversational);
  
  if (!endsWithQuestion) {
    // 相談系の入力かどうかを判定（userMessage または traceから推測）
    const userMsg = (userMessage || "").trim();
    const isConsultation = /不安|動けない|やることが多すぎ|どうすれば|困って|迷って/i.test(userMsg);
    const hasUnresolved = trace.observationCircle?.unresolved && trace.observationCircle.unresolved.length > 0;
    const hasContradictions = trace.contradictions && trace.contradictions.length > 0;
    
    if (isConsultation || hasUnresolved || hasContradictions) {
      // 未解決や矛盾がある場合は質問を追加
      conversational += "\n\nいま一番困ってるのは何？";
    } else {
      // それ以外は一般的な質問を追加
      conversational += "\n\n次の一手は何にしますか？";
    }
  }
  
  // 空文字の場合は最小限の応答を返す
  if (conversational.trim().length === 0) {
    conversational = "考えています。いま一番困ってるのは何？";
  }
  
  return conversational;
}
