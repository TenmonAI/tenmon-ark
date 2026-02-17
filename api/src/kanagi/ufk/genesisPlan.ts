export const GENESIS_PLAN_V1 = [
  "MARU_CHON",
  "AWAJI",
  "A_ROW",
  "WA_ROW",
  "IYO_AXIS",
  "TSUKUSHI_ENGINE",
] as const;

export type GenesisStep = (typeof GENESIS_PLAN_V1)[number];

export function buildGenesisPlan(): GenesisStep[] {
  return [...GENESIS_PLAN_V1];
}
