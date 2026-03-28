/** TENMON_BUILD_GREEN_RESTORE_AFTER_SHELTER_V1 */
export type ConversationDiscernmentProjectionBundleV1 = {
  softLead?: string | null;
  [k: string]: unknown;
};

export function buildConversationDiscernmentProjectionBundleV1(
  _ku: Record<string, unknown> | null,
): ConversationDiscernmentProjectionBundleV1 | null {
  return null;
}

export function mergeConversationDiscernmentIntoThoughtCoreV1(
  _ku: Record<string, unknown> | null,
  _bundle: ConversationDiscernmentProjectionBundleV1,
): void {}

export function applyConversationDiscernmentSoftLeadV1(out: string, softLead: string | null | undefined): string {
  if (!softLead) return out;
  return `${softLead}\n\n${out}`;
}
