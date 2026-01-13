// src/kotodama/renderDetail.ts
import { EvidencePack } from "../kanagi/types/corePlan.js";

export function renderDetailFromEvidence(pack: EvidencePack | null): string {
  if (!pack || !pack.hits?.length) return "（資料不足：この質問に紐づく引用候補が見つかりませんでした）";
  const items = pack.hits.slice(0, 6).map(h => {
    const p = h.page != null ? `P${String(h.page).padStart(4, "0")}` : "P????";
    return `- ${h.doc.toUpperCase()} ${p} ${h.sourceId}\n  引用: ${h.quote}`;
  });
  return items.join("\n");
}


