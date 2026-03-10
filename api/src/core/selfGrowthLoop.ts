import fs from "node:fs";

export type GrowthType =
  | "scripture_deepen"
  | "subconcept_add"
  | "thought_guide_expand"
  | "persona_refine";

export type GrowthQueueItem = {
  sourceMessage: string;
  candidateType: GrowthType;
  proposedTarget: string;
  priority: "high" | "medium" | "low";
  rationale: string;
  nextCard: string;
};

function parseGapReport(reportPath: string): string {
  return fs.readFileSync(reportPath, "utf-8");
}

export function buildSelfGrowthQueue(
  reportPath = "/opt/tenmon-ark-repo/docs/canon_gap_report_v1.md"
): GrowthQueueItem[] {
  const text = parseGapReport(reportPath);
  const out: GrowthQueueItem[] = [];

  if (text.includes("言霊とは何ですか？")) {
    out.push({
      sourceMessage: "言霊とは何ですか？",
      candidateType: "scripture_deepen",
      proposedTarget: "言霊秘書 / いろは / 水火伝の横断深化",
      priority: "high",
      rationale: "verified 済みだが、横断読解でさらに深くできる",
      nextCard: "R10_KOTODAMA_CROSS_SCRIPTURE_DEEPEN_V1",
    });
  }

  if (text.includes("カタカムナとは何ですか？")) {
    out.push({
      sourceMessage: "カタカムナとは何ですか？",
      candidateType: "scripture_deepen",
      proposedTarget: "カタカムナ言灵解 93ページの grounded 反映",
      priority: "high",
      rationale: "concept 止まり。全文投入済みなので grounded 強化できる",
      nextCard: "R10_KATAKAMUNA_GROUNDED_RESPONSE_V1",
    });
  }

  if (text.includes("この件をどう整理すればいい？")) {
    out.push({
      sourceMessage: "この件をどう整理すればいい？",
      candidateType: "persona_refine",
      proposedTarget: "support / organize の人格運用強化",
      priority: "medium",
      rationale: "general 止まり。断捨離 style と人格憲法を深く反映できる",
      nextCard: "R10_SUPPORT_PERSONA_REFINEMENT_V1",
    });
  }

  return out;
}

export function writeSelfGrowthQueue(
  outPath = "/opt/tenmon-ark-repo/docs/self_growth_queue_v1.md"
): string {
  const items = buildSelfGrowthQueue();
  const lines: string[] = [];
  lines.push("# SELF GROWTH QUEUE V1");
  lines.push("");
  lines.push(`- generated_at_utc: ${new Date().toISOString()}`);
  lines.push("");

  if (!items.length) {
    lines.push("- none");
  } else {
    for (const it of items) {
      lines.push(`## ${it.sourceMessage}`);
      lines.push("");
      lines.push(`- candidateType: ${it.candidateType}`);
      lines.push(`- proposedTarget: ${it.proposedTarget}`);
      lines.push(`- priority: ${it.priority}`);
      lines.push(`- rationale: ${it.rationale}`);
      lines.push(`- nextCard: ${it.nextCard}`);
      lines.push("");
    }
  }

  fs.writeFileSync(outPath, lines.join("\n"), "utf-8");
  return outPath;
}
