/** TENMON_BUILD_GREEN_RESTORE_AFTER_SHELTER_V1 */
export type ConfidenceDisplayV1 = {
  surfacePrefix?: string | null;
  [k: string]: unknown;
};

export function applyConfidencePrefixToSurfaceV1(text: string, cd: ConfidenceDisplayV1): string {
  const p = String(cd?.surfacePrefix ?? "").trim();
  if (!p) return text;
  return `${p}${text}`;
}
