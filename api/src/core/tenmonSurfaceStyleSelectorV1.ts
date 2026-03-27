import type { TenmonLongformModeV1 } from "./tenmonLongformComposerV1.js";

export type TenmonSurfaceStyleV1 =
  | "plain_clean"
  | "scripture_centered"
  | "proposal_formal"
  | "social_post"
  | "forensic_report"
  | "concise_verdict"
  | "deep_exegesis";

export type TenmonSurfaceStyleSelectionV1 = {
  style: TenmonSurfaceStyleV1;
  closingType: "one_question" | "one_step" | "silent_close";
  rationale: string;
};

export function selectTenmonSurfaceStyleV1(args: {
  routeReason: string;
  rawMessage: string;
  mode: TenmonLongformModeV1;
  targetLength?: number;
}): TenmonSurfaceStyleSelectionV1 {
  const rr = String(args.routeReason || "").trim();
  const msg = String(args.rawMessage || "");
  const target = Number(args.targetLength || 0);

  if (/SCRIPTURE|TRUTH_GATE|KATAKAMUNA|TENMON_SCRIPTURE_CANON/u.test(rr) || args.mode === "read") {
    return {
      style: target >= 2000 ? "deep_exegesis" : "scripture_centered",
      closingType: "one_step",
      rationale: "scripture_or_reading",
    };
  }
  if (args.mode === "proposal" || /(提案|計画|施策|ロードマップ)/u.test(msg)) {
    return { style: "proposal_formal", closingType: "one_step", rationale: "proposal_mode" };
  }
  if (/(報告|監査|証跡|forensic|log|trace)/iu.test(msg)) {
    return { style: "forensic_report", closingType: "silent_close", rationale: "forensic_message" };
  }
  if (/(SNS|投稿|ポスト|Xで|短く)/u.test(msg)) {
    return { style: "social_post", closingType: "one_question", rationale: "social_message" };
  }
  if (target > 0 && target <= 900) {
    return { style: "concise_verdict", closingType: "one_step", rationale: "short_target" };
  }
  return { style: "plain_clean", closingType: "one_question", rationale: "default" };
}
