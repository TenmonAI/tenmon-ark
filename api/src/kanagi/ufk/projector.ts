import type { AmatsuCell } from "./amatsuCell.js";

export type CandidateLike = {
  snippet?: string | null;
  evidenceIds?: string[] | null;
};

export function projectCandidateToCell(c: CandidateLike): AmatsuCell<string> {
  const snippet = (c?.snippet ?? "").toString();
  const evidenceIds = Array.isArray(c?.evidenceIds) ? c.evidenceIds.filter((x) => typeof x === "string") : [];
  return {
    fire: 0.5,
    water: 0.5,
    content: snippet,
    innerCells: [],
    motionSeq: [],
    meta: { schemaVersion: 1, evidenceIds },
  };
}
