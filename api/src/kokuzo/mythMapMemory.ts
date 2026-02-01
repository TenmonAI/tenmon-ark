// api/src/kokuzo/mythMapMemory.ts
// Phase35: mythMapEdges を threadId 単位で保持（決定論 / インメモリ）

export type MythMapEdge = {
  from: string;
  to: string;
  evidenceIds: string[];
};

const mem = new Map<string, { edges: MythMapEdge[]; updatedAt: number }>();

export function setMythMapEdges(threadId: string, edges: MythMapEdge[]): void {
  if (!threadId) return;
  mem.set(threadId, { edges: Array.isArray(edges) ? edges : [], updatedAt: Date.now() });
}

export function getMythMapEdges(threadId: string): MythMapEdge[] | null {
  if (!threadId) return null;
  const v = mem.get(threadId);
  return v ? v.edges : null;
}
