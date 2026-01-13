// src/persona/composeNatural.ts
import { CorePlan } from "../kanagi/types/corePlan.js";

export function composeNaturalFromPlan(plan: CorePlan): string {
  if (plan.answerType === "needsEvidence") {
    const rec = plan.recommendedEvidence?.map(r => `- ${r.doc}: ${r.reason}`).join("\n") ?? "";
    return [
      "資料に照らして正確に答えるため、参照箇所が必要です。",
      plan.nextQuestion ?? "参照したい資料とページを教えてください。",
      rec ? "\n候補:\n" + rec : "",
    ].filter(Boolean).join("\n");
  }

  // direct：2〜6行で固定
  const lines: string[] = [];
  lines.push("結論から言うと、まず「定義（核）」を固定し、次に「躰（構造）」と「用（働き）」で分解して見抜きます。");
  for (const c of plan.claims.slice(0, 2)) lines.push("・" + c.text);
  // 1つだけ問い返す（必要なときだけ）
  if (plan.nextQuestion) lines.push(plan.nextQuestion);
  lines.push("いかがでしょうか。");
  return lines.join("\n");
}

