/**
 * TENMON_USER_INTENT_DEEPREAD_OBSERVE_ONLY_CURSOR_AUTO_V1
 * 観測専用スキーマ（会話表面・routeReason・task には未使用）
 */

export type UserIntentDeepreadAmbiguityLevelV1 = "low" | "mid" | "high";

export type UserIntentDeepreadClarificationFocusV1 =
  | "goal"
  | "constraint"
  | "success"
  | "risk"
  | null;

export type UserIntentDeepreadV1 = {
  schema: "TENMON_USER_INTENT_DEEPREAD_V1";
  surfaceIntent: string | null;
  essentialGoal: string | null;
  constraints: string[];
  successCriteria: string[];
  ambiguityLevel: UserIntentDeepreadAmbiguityLevelV1;
  needsClarification: boolean;
  clarificationFocus: UserIntentDeepreadClarificationFocusV1;
};
