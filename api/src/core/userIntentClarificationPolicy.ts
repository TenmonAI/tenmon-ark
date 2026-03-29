/**
 * TENMON_USER_INTENT_CLARIFICATION_SURFACE_CURSOR_AUTO_V1
 * User Intent Deepread / thread meaning を参照し、必要時のみ 1 問だけ自然文で確認する。
 * routeReason は変更しない（呼び出し側の projector のみ本文末尾を調整）。
 */

import type { UserIntentDeepreadV1 } from "./userIntentDeepreadSchema.js";

/** projector の routeKind と同値（循環 import 回避のためここで定義） */
export type UserIntentClarificationProjectorRouteKindV1 = "general_natural" | "define_fastpath" | "minimal_strip_only";

export type UserIntentClarificationFocusV1 = "goal" | "constraint" | "success" | "risk";

export type UserIntentClarificationDecisionV1 = {
  shouldAsk: boolean;
  focus: UserIntentClarificationFocusV1 | null;
  question: string | null;
};

export type UserIntentClarificationPolicyInputV1 = {
  routeKind: UserIntentClarificationProjectorRouteKindV1;
  routeReason: string | null | undefined;
  answerMode: string | null | undefined;
  userIntentDeepread: UserIntentDeepreadV1 | null | undefined;
  threadEssentialGoal?: string | null;
  threadConstraints?: readonly string[] | null | undefined;
  threadSuccessCriteria?: readonly string[] | null | undefined;
  /** projector 内で、推測注記などが付いた後の本文（冗長・多問チェック用） */
  proseForRedundancyCheck: string;
  speculativeGuardActive?: boolean;
};

const QUESTION_BY_FOCUS: Record<UserIntentClarificationFocusV1, string> = {
  goal: "いま一番押さえたいのは、事象を整えること自体より、相手や状況にうまく伝わることですか。",
  constraint: "急ぎの度合いと、絶対に避けたい失敗だけ、先に一つずつ固定しますか。",
  success: "どの状態までいけば「ここまでで十分」と見なすか、先に一言で合わせますか。",
  risk: "この件でいちばん避けたいのは、誤解・遅延・関係の悪化のどれに近いですか。",
};

/** 表層に出すのは主に一般 NATURAL 主線のみ（preempt / DEF / 正典系は除外） */
const ALLOW_ROUTE_REASON = new Set<string>(["NATURAL_GENERAL_LLM_TOP", "NATURAL_GENERAL_LLM_TOP_V1"]);

const RE_ACTION_OR_TASK =
  /してほしい|してください|やって|対応|手配|実行|進め|決めて|直して|修正|実装|書いて|作成|提出|連絡|依頼/u;

const RE_SUPPORT_PRACTICAL =
  /ログイン|課金|請求|プラン|PWA|バグ|届かない|登録|メール|支払い|解約|アカウント|画面|表示がおかしい/u;

function normArr(a: readonly string[] | null | undefined): string[] {
  if (!Array.isArray(a)) return [];
  return a.map((s) => String(s || "").trim()).filter(Boolean);
}

function weakEssentialGoal(eg: string | null | undefined): boolean {
  const t = String(eg ?? "").trim();
  if (!t) return true;
  if (/未確定|表層に留める/u.test(t)) return true;
  return t.length < 10;
}

function threadIntentWellCovered(p: UserIntentClarificationPolicyInputV1): boolean {
  const teg = String(p.threadEssentialGoal ?? "").trim();
  const tc = normArr(p.threadConstraints);
  const ts = normArr(p.threadSuccessCriteria);
  if (!teg || weakEssentialGoal(teg)) return false;
  if (tc.length > 0 && ts.length > 0) return true;
  if (tc.length >= 2 || ts.length >= 2) return true;
  return false;
}

function normalizeFocus(f: UserIntentDeepreadV1["clarificationFocus"]): UserIntentClarificationFocusV1 {
  if (f === "goal" || f === "constraint" || f === "success" || f === "risk") return f;
  return "goal";
}

function surfaceLooksActionOriented(d: UserIntentDeepreadV1): boolean {
  const si = String(d.surfaceIntent ?? "");
  return RE_ACTION_OR_TASK.test(si) || RE_SUPPORT_PRACTICAL.test(si);
}

function shouldConsiderAsk(d: UserIntentDeepreadV1): boolean {
  if (!d.needsClarification) return false;
  if (d.ambiguityLevel === "high") return true;
  if (weakEssentialGoal(d.essentialGoal) && (surfaceLooksActionOriented(d) || RE_SUPPORT_PRACTICAL.test(d.surfaceIntent ?? ""))) {
    return true;
  }
  const nc = normArr(d.constraints);
  const ns = normArr(d.successCriteria);
  if (nc.length === 0 && ns.length === 0 && surfaceLooksActionOriented(d)) return true;
  return false;
}

function lastNonEmptyLine(text: string): string {
  const lines = String(text || "")
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length ? lines[lines.length - 1]! : "";
}

/** 末尾がすでに疑問形なら、追記で二重に聞かない */
function proseAlreadyEndsWithQuestion(text: string): boolean {
  return /[？?]\s*$/u.test(lastNonEmptyLine(text));
}

function tooManyQuestionsAlready(text: string): boolean {
  const t = String(text || "");
  const n = (t.match(/[？?]/g) || []).length;
  return n >= 2;
}

function hasSpeculativeTailConflict(text: string): boolean {
  const t = String(text || "");
  if (/\n\n（[^）]{12,}）\s*$/u.test(t)) return true;
  if (/推測にとどま|断定を避け|不確実性/u.test(t) && /[？?]/u.test(t)) return true;
  return false;
}

/**
 * clarification を付けるかどうかだけを判定し、1 問文を返す。
 */
export function decideUserIntentClarificationV1(
  input: UserIntentClarificationPolicyInputV1,
): UserIntentClarificationDecisionV1 {
  const empty: UserIntentClarificationDecisionV1 = { shouldAsk: false, focus: null, question: null };

  if (input.routeKind !== "general_natural") return empty;

  const rrRaw = String(input.routeReason ?? "").trim();
  /** general 主線で routeReason が未設定のときは NATURAL とみなす（projector は general_natural のみ） */
  const rr = rrRaw || "NATURAL_GENERAL_LLM_TOP_V1";
  if (!ALLOW_ROUTE_REASON.has(rr)) return empty;

  const am = String(input.answerMode ?? "").trim().toLowerCase();
  if (am === "define") return empty;

  const d = input.userIntentDeepread;
  if (!d || d.schema !== "TENMON_USER_INTENT_DEEPREAD_V1") return empty;

  if (threadIntentWellCovered(input)) return empty;

  if (!shouldConsiderAsk(d)) return empty;

  const prose = String(input.proseForRedundancyCheck ?? "");
  if (proseAlreadyEndsWithQuestion(prose)) return empty;
  if (tooManyQuestionsAlready(prose)) return empty;
  if (input.speculativeGuardActive && hasSpeculativeTailConflict(prose)) return empty;

  const focus = normalizeFocus(d.clarificationFocus);
  const question = QUESTION_BY_FOCUS[focus];
  return { shouldAsk: true, focus, question };
}
