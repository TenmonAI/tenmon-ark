export type BreathPhase = "INHALE" | "CONDENSE" | "EXHALE";
export interface BreathStep { phase: BreathPhase; note: string; }

/** K3: debug only, deterministic, never throws */
export function computeBreathCycle(_input: string): BreathStep[] {
  return [
    { phase: "INHALE", note: "collect" },
    { phase: "CONDENSE", note: "focus" },
    { phase: "EXHALE", note: "release" },
  ];
}
