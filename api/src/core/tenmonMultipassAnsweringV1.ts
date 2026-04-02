export interface TenmonMultipassAnsweringV1 {
  schema: "TENMON_MULTIPASS_ANSWERING_V1";
  composePass: string;
  stylePass: string;
  densityPass: string;
  centerLock: string;
  evidenceRequired: boolean;
  uncertaintyFlags: string[];
  compose_pass: Record<string, unknown>;
  style_pass: Record<string, unknown>;
  evidence_pass: { lawTraceBinder: unknown[]; evidenceRefs: string[] };
}

export function buildTenmonMultipassAnsweringV1(args: Record<string, unknown>): TenmonMultipassAnsweringV1 {
  const routeReason = String(args.routeReason || "");
  const centerKey = String(args.centerKey || "");
  const stylePass = centerKey.includes("KUKAI") ? "kukai_formal"
    : centerKey.includes("HOKEKYO") ? "hokekyo_structured"
    : centerKey.includes("kotodama") ? "kotodama_layered"
    : "natural_tenmon";
  const composePass = routeReason.includes("SCRIPTURE") ? "scripture_grounded" : "tenmon_grounded";
  return {
    schema: "TENMON_MULTIPASS_ANSWERING_V1",
    composePass, stylePass, densityPass: "standard",
    centerLock: centerKey, evidenceRequired: true,
    uncertaintyFlags: [],
    compose_pass: { ok: false, stage: "init", summary: `compose:${composePass}` },
    style_pass: { ok: false, stage: "init", summary: `style:${stylePass}` },
    evidence_pass: { lawTraceBinder: [], evidenceRefs: [] },
  };
}

export function mergeKuLawTraceWithBinderV1(
  existing: unknown,
  binder: unknown[]
): unknown {
  if (!Array.isArray(existing)) return binder;
  return [...(existing as unknown[]), ...binder];
}
