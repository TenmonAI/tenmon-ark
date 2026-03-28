/** TENMON_BUILD_GREEN_RESTORE_AFTER_SHELTER_V1 */
export function resolveTenmonPersonaConstitutionRuntimeV1(): Record<string, unknown> {
  return {};
}

export function buildPersonaDriftGuardV1(
  _message: string,
  _persona: Record<string, unknown>,
): { forbiddenDriftDetected: boolean; preferredTerm: string | null } {
  return { forbiddenDriftDetected: false, preferredTerm: null };
}
