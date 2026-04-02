export type TenmonOperableSealChecks = {
  source_registry_ok: boolean;
  memory_units_ok: boolean;
  memory_projection_ok: boolean;
  persona_binding_ok: boolean;
  thread_persona_ok: boolean;
  autonomy_running: boolean;
};

export type TenmonSealDecisionV1 = {
  operable_sealed: boolean;
  reason_codes: string[];
  checks: TenmonOperableSealChecks;
};

export function buildTenmonSealDecisionV1(checks: TenmonOperableSealChecks): TenmonSealDecisionV1 {
  const reason_codes: string[] = [];
  for (const [key, ok] of Object.entries(checks)) {
    reason_codes.push(ok ? key : key.replace(/_ok$/, "_fail").replace(/_running$/, "_stopped"));
  }
  return {
    operable_sealed: Object.values(checks).every(Boolean),
    reason_codes,
    checks,
  };
}
