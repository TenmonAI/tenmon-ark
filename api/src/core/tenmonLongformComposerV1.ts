/** TENMON_BUILD_GREEN_RESTORE_AFTER_SHELTER_V1: longform 合成の最小実装（finalize 契約） */
export type TenmonLongformModeV1 = "read" | "proposal" | "analysis" | "reflect" | string;

export const TENMON_LONGFORM_CONTRACT_V1 = "TENMON_LONGFORM_CONTRACT_V1" as const;

export function inferTenmonLongformModeV1(_rawMessage: string, _body: string): TenmonLongformModeV1 {
  return "reflect";
}

export function composeTenmonLongformV1(args: {
  mode: TenmonLongformModeV1;
  body: string;
  centerClaim: string;
  nextAxis: string;
  targetLength: number;
}): { longform: string; mode: TenmonLongformModeV1; centerLockPassed: boolean } {
  void args.centerClaim;
  void args.nextAxis;
  void args.targetLength;
  return { longform: args.body, mode: args.mode, centerLockPassed: true };
}
