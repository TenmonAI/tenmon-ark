import { createHash } from "node:crypto";

export function generateSeed(lawTrace: any): { seedId: string; lawKeys: string[]; entropy: number; phase: string } | null {
  if (!Array.isArray(lawTrace)) return null;

  const lawKeys = lawTrace.map((x: any) => x?.lawKey).filter(Boolean);

  const seedId = createHash("sha1")
    .update(lawKeys.join("|"))
    .digest("hex")
    .slice(0, 24);

  return {
    seedId,
    lawKeys,
    entropy: 0.25,
    phase: "CENTER",
  };
}
