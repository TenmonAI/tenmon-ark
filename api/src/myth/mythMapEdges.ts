// api/src/myth/mythMapEdges.ts
// Phase34: 同型写像エッジ（最小・決定論）

export type MythMapEdge = {
  from: string;
  to: string;
  evidenceIds: string[];
};

export function buildMythMapEdges(args: {
  fourLayerTags: string[];   // IKi/SHIHO/KAMI/HOSHI
  kojikiTags: string[];      // KOJIKI:...
  evidenceIds: string[];     // doc+pdfPage など（あれば）
}): MythMapEdge[] {
  const fromTags = Array.isArray(args.fourLayerTags) ? args.fourLayerTags : [];
  const toTags = Array.isArray(args.kojikiTags) ? args.kojikiTags : [];
  const ev = Array.isArray(args.evidenceIds) ? args.evidenceIds : [];

  const edges: MythMapEdge[] = [];
  for (const f of fromTags) {
    for (const t of toTags) {
      edges.push({ from: f, to: t, evidenceIds: ev });
    }
  }
  return edges;
}
