/** TENMON_BUILD_GREEN_RESTORE_AFTER_SHELTER_V1 */
export type AnswerProfileLayerV1 = {
  profileFrame?: string | null;
  [k: string]: unknown;
};

export function applyAnswerProfilePostComposeV1(text: string, profileFrame: string | null): string {
  void profileFrame;
  return String(text ?? "");
}
