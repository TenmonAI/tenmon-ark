/** TENMON_BUILD_GREEN_RESTORE_AFTER_SHELTER_V1 */
export type TenmonMultipassAnsweringV1 = {
  schema: "TENMON_MULTIPASS_ANSWERING_V1";
  evidence_pass: { evidenceRefs: string[]; lawTraceBinder: unknown[] };
  uncertaintyFlags: string[];
  compose_pass: Record<string, unknown>;
  style_pass: Record<string, unknown>;
};

export function buildTenmonMultipassAnsweringV1(_args: Record<string, unknown>): TenmonMultipassAnsweringV1 {
  void _args;
  return {
    schema: "TENMON_MULTIPASS_ANSWERING_V1",
    evidence_pass: { evidenceRefs: [], lawTraceBinder: [] },
    uncertaintyFlags: [],
    compose_pass: {},
    style_pass: {},
  };
}

export function mergeKuLawTraceWithBinderV1(lawTrace: unknown, ltBinder: unknown[]): unknown[] {
  const lt = Array.isArray(lawTrace) ? [...lawTrace] : [];
  return [...lt, ...ltBinder];
}
