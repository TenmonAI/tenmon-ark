/**
 * TENMON_USER_INTENT_DEEPREAD_OBSERVE_ONLY_CURSOR_AUTO_V1
 * LLM なし・heuristic のみ。断定を避け、downstream は観測のみで利用する。
 */

import type { UserIntentDeepreadV1 } from "./userIntentDeepreadSchema.js";

/** thread_center_memory / threadMeaningMemory 用の抽出（観測オブジェクトが無ければ null） */
export type UserIntentDeepreadThreadMemoryPatchV1 = {
  essentialGoal: string | null;
  successCriteria: readonly string[];
  constraints: readonly string[];
  clarificationFocus: string | null;
};

export function extractUserIntentDeepreadForThreadMemoryPatchV1(
  ku: Record<string, unknown>,
): UserIntentDeepreadThreadMemoryPatchV1 | null {
  const x =
    ku.userIntentDeepreadObserveOnlyV1 ?? ku.userIntentDeepreadV1 ?? ku.userIntentDeepread;
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  if (String((x as { schema?: string }).schema || "") !== "TENMON_USER_INTENT_DEEPREAD_V1") return null;
  const d = x as UserIntentDeepreadV1;
  const eg = d.essentialGoal != null && String(d.essentialGoal).trim() ? String(d.essentialGoal).trim() : null;
  const sc = Array.isArray(d.successCriteria)
    ? d.successCriteria.map((s) => String(s || "").trim()).filter(Boolean)
    : [];
  const co = Array.isArray(d.constraints)
    ? d.constraints.map((s) => String(s || "").trim()).filter(Boolean)
    : [];
  const cf =
    d.clarificationFocus != null && String(d.clarificationFocus).trim()
      ? String(d.clarificationFocus).trim()
      : null;
  return { essentialGoal: eg, successCriteria: sc, constraints: co, clarificationFocus: cf };
}

const RE_SUPPORT =
  /ログイン|課金|請求|プラン|PWA|バグ|届かない|登録|メール|支払い|解約|アカウント|画面|表示がおかしい/u;
const RE_CONSTRAINT_TIME = /今日中|今週|急ぎ|すぐ|時間がない|忙しい|5分|一行/u;
const RE_CONSTRAINT_RESOURCE = /お金|予算|無料|制限|できない環境|会社|職場/u;
const RE_SUCCESS_DONE =
  /わかりました|理解した|整理したい|決めたい|手順|ステップ|確認したい|知りたい|教えて/u;
const RE_GOAL_PRACTICE = /どうすれば|やり方|手順|習慣|続けたい|改善したい/u;
const RE_GOAL_EMOTION = /つらい|辛い|しんどい|不安|怖い|迷い|疲れ/u;
const RE_GOAL_DEFINE = /とは|何ですか|意味|定義/u;
const RE_MULTI_QUESTION = /[？?].*[？?]/u;
const RE_VAGUE = /なんとなく|うまくいかない|よくわからない|どうしたら/u;

function clip(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max).replace(/[、，,]\s*$/u, "") + "…";
}

/**
 * raw メッセージを 4 系＋曖昧さへ分解（observe-only）。
 */
export function userIntentDeepreadObserveOnlyV1(rawMessage: string): UserIntentDeepreadV1 {
  const raw = String(rawMessage ?? "").trim();
  if (!raw) {
    return {
      schema: "TENMON_USER_INTENT_DEEPREAD_V1",
      surfaceIntent: null,
      essentialGoal: null,
      constraints: [],
      successCriteria: [],
      ambiguityLevel: "high",
      needsClarification: true,
      clarificationFocus: "goal",
    };
  }

  const surfaceIntent = clip(raw, 320);

  let essentialGoal: string | null = null;
  if (RE_GOAL_DEFINE.test(raw)) essentialGoal = "語や概念の意味・輪郭を押さえたい（推定）";
  else if (RE_GOAL_PRACTICE.test(raw)) essentialGoal = "行動・手順・続け方を具体化したい（推定）";
  else if (RE_GOAL_EMOTION.test(raw)) essentialGoal = "状態の整理や負担の軽減を図りたい（推定）";
  else if (RE_SUPPORT.test(raw)) essentialGoal = "プロダクト利用上の障害や手続きを解消したい（推定）";
  else if (/続き|前の|さっき|この流れ/u.test(raw)) essentialGoal = "直前の話題を踏まえて前に進めたい（推定）";
  else essentialGoal = "意図の要約は未確定（表層に留める）";

  const constraints: string[] = [];
  if (RE_CONSTRAINT_TIME.test(raw)) constraints.push("時間・緊急度に関する制約の可能性（推定）");
  if (RE_CONSTRAINT_RESOURCE.test(raw)) constraints.push("資源・環境に関する制約の可能性（推定）");
  if (raw.length < 12) constraints.push("入力が短く文脈が乏しい");

  const successCriteria: string[] = [];
  if (RE_SUCCESS_DONE.test(raw)) successCriteria.push("説明・整理・次の一手の提示で十分と感じる状態（推定）");
  if (RE_GOAL_DEFINE.test(raw)) successCriteria.push("用語の説明が一通り得られた状態（推定）");

  let ambiguityLevel: UserIntentDeepreadV1["ambiguityLevel"] = "low";
  if (RE_VAGUE.test(raw) || raw.length < 8) ambiguityLevel = "high";
  else if (RE_MULTI_QUESTION.test(raw) || raw.length > 400 || constraints.length >= 2) ambiguityLevel = "mid";

  let clarificationFocus: UserIntentDeepreadV1["clarificationFocus"] = null;
  if (ambiguityLevel === "high") {
    clarificationFocus = "goal";
  } else if (ambiguityLevel === "mid" && constraints.length === 0 && successCriteria.length === 0) {
    clarificationFocus = "success";
  }

  const needsClarification = ambiguityLevel !== "low" || essentialGoal?.includes("未確定") === true;

  return {
    schema: "TENMON_USER_INTENT_DEEPREAD_V1",
    surfaceIntent,
    essentialGoal,
    constraints,
    successCriteria,
    ambiguityLevel,
    needsClarification,
    clarificationFocus,
  };
}

/** ku に観測専用フィールドを付与（routeReason・応答本文には影響しない） */
export function attachUserIntentDeepreadObserveOnlyToKuV1(
  ku: Record<string, unknown>,
  rawMessage: string,
): void {
  if (!ku || typeof ku !== "object") return;
  const msg = String(rawMessage ?? "").trim();
  if (!msg) return;
  const payload = userIntentDeepreadObserveOnlyV1(msg);
  ku.userIntentDeepreadObserveOnlyV1 = payload;
  ku.userIntentDeepreadV1 = payload;
  ku.userIntentDeepread = payload;
}
