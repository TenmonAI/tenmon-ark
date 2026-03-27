import type { SanskritRootEngineOutputV1 } from "./sanskritRootEngineV1.js";
import type { TenmonGodnameMapperOutputV1 } from "./tenmonGodnameMapperV1.js";
import type { SanskritAlignmentJudgeOutputV1 } from "./sanskritAlignmentJudgeV1.js";

function safe(v: unknown): string {
  const t = String(v ?? "").trim();
  return t.length > 0 ? t : "unknown";
}

export function buildSanskritDeepreadSurfaceV1(args: {
  word: string;
  strict: SanskritRootEngineOutputV1;
  mapping: TenmonGodnameMapperOutputV1;
  alignment: SanskritAlignmentJudgeOutputV1;
}): string {
  const top = args.strict.sanskrit_candidates_ranked[0];
  const rootText = top ? `${top.candidate} (${top.status}; score=${top.score.toFixed(3)})` : "unknown";
  const directMeaning = safe(args.strict.strict_etymology);
  const tradition = args.alignment.tradition_evidence.length
    ? args.alignment.tradition_evidence.join(" | ")
    : "unknown";
  const mapping = safe(args.mapping.tenmon_mapping);
  const judgement = `${args.alignment.final_judgement} (strict_conf=${args.strict.strict_confidence.toFixed(
    3,
  )}; mapping_conf=${args.mapping.mapping_confidence.toFixed(3)})`;
  const uncertainty = args.alignment.uncertain_points.length
    ? args.alignment.uncertain_points.join(" | ")
    : "unknown";

  return [
    `[WORD] ${safe(args.word)}`,
    `[ROOT] ${rootText}`,
    `[DIRECT MEANING] ${directMeaning}`,
    `[TRADITION EVIDENCE] ${tradition}`,
    `[TENMON MAPPING] ${mapping}`,
    `[FINAL JUDGEMENT] ${judgement}`,
    `[UNCERTAINTY] ${uncertainty}`,
  ].join("\n");
}

