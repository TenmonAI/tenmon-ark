export type KanagiPhase = "SENSE" | "NAME" | "ONE_STEP" | "NEXT_DOOR";

export function detectKanagiPhase(threadHistory: any[]): KanagiPhase {

  let ucount = 0;

  for (const row of threadHistory) {
    if (row?.role === "user") ucount++;
  }

  const phase = ucount % 4;

  if (phase === 0) return "SENSE";
  if (phase === 1) return "NAME";
  if (phase === 2) return "ONE_STEP";
  return "NEXT_DOOR";
}
