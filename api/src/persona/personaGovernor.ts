export type KanagiState = "HAKKO" | "NAISHU" | "GAIHATSU" | "HORYU";

export function applyPersonaGovernor(plan: any, ctx: { message: string }) {
  if (!plan || typeof plan !== "object") return plan;

  if (!Array.isArray(plan.chainOrder)) plan.chainOrder = [];
  if (!plan.chainOrder.includes("PERSONA_GOVERNOR")) plan.chainOrder.push("PERSONA_GOVERNOR");

  // already present: do not override
  if (plan.persona && typeof plan.persona === "object") {
    plan.persona.activeModules = Array.isArray(plan.persona.activeModules) ? plan.persona.activeModules.slice(0, 3) : [];
    if (!plan.persona.kanagiState) plan.persona.kanagiState = "HAKKO";
    return plan;
  }

  const msg = ctx.message || "";

  // 超薄い分類（後で高度化）
  const kanagiState: KanagiState =
    /doc=|pdfPage=|#詳細/.test(msg) ? "NAISHU" :
    /カタカムナ|言霊|天津金木|古事記|法華経|般若/.test(msg) ? "GAIHATSU" :
    /相談|会話|できる\?|どのくらい/.test(msg) ? "HAKKO" :
    "HORYU";

  // activeModules: 最大3
  const activeModules: string[] = [];
  if (/言霊|KHS|言霊秘書/.test(msg)) activeModules.push("KOTODAMA");
  if (/いろは|IROHA/.test(msg)) activeModules.push("IROHA");
  if (/カタカムナ|KATAKAMUNA/.test(msg)) activeModules.push("KATAKAMUNA");

  plan.persona = {
    kanagiState,
    activeModules: activeModules.slice(0, 3),
  };

  return plan;
}
