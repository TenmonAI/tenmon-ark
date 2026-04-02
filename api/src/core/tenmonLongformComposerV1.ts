export type TenmonLongformModeV1 = "read" | "proposal" | "analysis" | "reflect";

export const TENMON_LONGFORM_CONTRACT_V1 = "TENMON_LONGFORM_CONTRACT_V1" as const;

export function inferTenmonLongformModeV1(rawMessage: string, _body?: string): TenmonLongformModeV1 {
  if (/読む|読解|解読/.test(rawMessage)) return "read";
  if (/提案|計画|構想/.test(rawMessage)) return "proposal";
  if (/分析|解析|構造/.test(rawMessage)) return "analysis";
  return "reflect";
}

export function composeTenmonLongformV1(args: Record<string, unknown>) {
  const body = String(args.body || "");
  const mode = String(args.mode || "reflect");
  const centerClaim = String(args.centerClaim || "");
  const nextAxis = String(args.nextAxis || "");
  const targetLength = Number(args.targetLength || 300);
  const minimumFloor = Math.floor(targetLength * 0.7);
  if (body.length >= targetLength * 0.8) {
    return { longform: body, mode, centerLockPassed: true, minimumFloor, requestedLength: targetLength, effectiveTargetLength: targetLength, actualLength: body.length, charGatePassed: true };
  }
  const parts = [body];
  if (centerClaim) parts.push("中心: " + centerClaim);
  if (nextAxis) parts.push("次軸: " + nextAxis);
  const extended = parts.filter(Boolean).join("\n\n");
  const passed = extended.length >= minimumFloor;
  return { longform: extended, mode, centerLockPassed: passed, minimumFloor, requestedLength: targetLength, effectiveTargetLength: targetLength, actualLength: extended.length, charGatePassed: passed };
}
