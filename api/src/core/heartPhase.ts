export function computeHeartPhase(
  entropy: number,
  truthWeight: number,
  hasSeed: boolean
): string {
  if (truthWeight > 0.8 && hasSeed) return "CENTER";

  if (entropy < 0.2) return "L-IN";

  if (entropy < 0.4) return "L-OUT";

  if (entropy < 0.7) return "R-IN";

  return "R-OUT";
}
