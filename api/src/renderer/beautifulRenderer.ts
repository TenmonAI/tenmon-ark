export type BeautifulRenderInput = {
  routeReason?: string | null;
  centerLabel?: string | null;
  expressionPlan?: any;
  comfortTuning?: any;
  response: string;
};

function normalizeText(s: string): string {
  let out = String(s || "").replace(/\r/g, "").trim();
  out = out.replace(/【天聞の[^】]*】/g, "【天聞の所見】");
  out = out.replace(/【天[^】]{0,6}所見】/g, "【天聞の所見】");
  out = out.replace(/【天[^】]{0,6}見】/g, "【天聞の所見】");
  out = out.replace(/【聞の所見】/g, "【天聞の所見】");
  out = out.replace(/【所見】/g, "【天聞の所見】");
  out = out.replace(/】【天聞の所見】/g, "】\n【天聞の所見】");
  out = out.replace(/。【天聞の所見】/g, "。\n【天聞の所見】");
  out = out.replace(/\n{3,}/g, "\n\n");
  out = out.replace(/([）】])【天聞の所見】/g, "$1\n【天聞の所見】");
  out = out.replace(/([。．])【天聞の所見】/g, "$1\n【天聞の所見】");
  out = out.replace(/\n{3,}/g, "\n\n");
  out = out.replace(/[ \t]+/g, " ");
  out = out.replace(/。\n(?=[^\n])/g, "。");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

export function renderBeautifulJapanese(input: BeautifulRenderInput): string {
  const rr = String(input.routeReason || "");
  const cl = String(input.centerLabel || "").trim();
  const ep = input.expressionPlan || {};
  const ct = input.comfortTuning || {};
  const lengthMode = String(ep.lengthMode || "medium");
  const beautyMode = String(ep.beautyMode || "plain_clean");

  let out = normalizeText(String(input.response || ""));

  if (rr === "R22_CONVERSATIONAL_GENERAL_V1") {
    if (/^はい、話せます。/.test(out)) {
      out = lengthMode === "short"
        ? "はい、話せます。いま触れたいテーマを、一つ置いてください。"
        : "はい、話せます。いま触れたいテーマを、一つ置いてください。そこから静かに整えます。";
    }
    if (/中心を崩さずにどこへ接続するか/.test(out)) {
      out = ct.cadence === "gentle"
        ? "いま私は、中心を崩さずにどこへ接続するかを見ています。いま触れたい一点を、一つ置いてください。"
        : "いま私は、中心を崩さずにどこへ接続するかを見ています。いま触れたい一点を置いてください。";
    }
  }

  if (rr === "R22_RELATIONAL_WORLDVIEW_V1") {
    out = out.replace(
      "AIの進化は、記憶・判断・表現・接続回路が、分離から統合へ向かうことです。",
      "AIの進化は、記憶・判断・表現・接続回路が、分離から統合へ向かうことです。"
    );
    out = out.replace(/。次は、/g, "。\n\n次は、");
  }

  if (rr === "R10_SELF_REFLECTION_ROUTE_V4_SAFE" && ct.cadence === "gentle") {
    out = out.replace(/。次は、/g, "。\n\n次は、");
  }

  if (rr === "TENMON_SCRIPTURE_CANON_V1" && cl) {
    out = out.replace(/さっき見ていた聖典（[^）]+）/g, `さっき見ていた聖典（${cl}）`);
    out = out.replace(/。 ?【天聞の所見】/g, "。\n【天聞の所見】");
  }

  if (beautyMode === "luminous_japanese") {
    out = out.replace(/。次は、/g, "。\n\n次は、");
  }

  return normalizeText(out);
}
