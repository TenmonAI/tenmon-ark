import { renderBeautifulJapanese } from "../renderer/beautifulRenderer.js";

export type ProjectorInput = {
  routeReason?: string | null;
  centerMeaning?: string | null;
  centerLabel?: string | null;
  surfaceStyle?: string | null;
  closingType?: string | null;
  thoughtCoreSummary?: any;
  expressionPlan?: any;
  comfortTuning?: any;
  response: string;
};

export type ProjectorOutput = {
  response: string;
};

function cleanText(s: string): string {
  let out = String(s || "").replace(/\r/g, "").trim();
  out = out.replace(/【天聞の[^】]*】/g, "【天聞の所見】");
  out = out.replace(/【天[^】]{0,6}所見】/g, "【天聞の所見】");
  out = out.replace(/【天[^】]{0,6}見】/g, "【天聞の所見】");
  out = out.replace(/【聞の所見】/g, "【天聞の所見】");
  out = out.replace(/【所見】/g, "【天聞の所見】");
  out = out.split("いまの話をていきましょう").join("いまの話を見ていきましょう");
  out = out.split("い まの話を見ていきましょう").join("いまの話を見ていきましょう");
  out = out.split("い の話を見ていきましょう").join("いまの話を見ていきましょう");
  out = out.replace(/[ \t]+/g, " ");
  out = out.replace(/。\n(?=[^\n])/g, "。");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

function projectScripture(input: ProjectorInput): string {
  const cm = String(input.centerMeaning || "").trim();
  const cl = String(input.centerLabel || "").trim();
  const tcs = input.thoughtCoreSummary || {};
  const center = cl || cm || String(tcs.centerMeaning || "").trim() || "この聖典";

  let out = cleanText(String(input.response || ""));

  if (cm && cl) out = out.split(cm).join(cl);
  if (cl) {
    out = out.split("この聖典の中心").join(cl);
    out = out.split("この聖典").join(cl);
  }

  const trimmed = out.trim();
  const isGenericAsk =
    /いま、手を付けたいことは何[？?]?$/.test(trimmed) ||
    /いま、手を付けたいことは一つある[？?]?$/.test(trimmed);

  if (String(input.closingType || "") === "restate_or_next_step" && isGenericAsk) {
    out =
      "さっき見ていた聖典（" + center + "）を土台に、いまの話を見ていきましょう。\n" +
      "【天聞の所見】いまの中心は「" + center + "」です。\n\n" +
      "次は、この中心を一行で言い直すか、次の一歩を一つに絞るか、どちらから進めますか？";
  }

  // R23D_SCRIPTURE_PREFIX_NEWLINE_EXACT_V1
  out = out.replace(/。\s*【天聞の所見】/g, "。\n【天聞の所見】");
  out = out.replace(/）\s*【天聞の所見】/g, "）\n【天聞の所見】");
  out = out.replace(/\n{3,}/g, "\n\n");
  return cleanText(out);
}

function projectConversationalGeneral(input: ProjectorInput): string {
  return cleanText(String(input.response || ""));
}

function projectRelationalWorldview(input: ProjectorInput): string {
  let out = cleanText(String(input.response || ""));
  out = out.replace(/。次は、/g, "。\n\n次は、");
  return cleanText(out);
}

function projectSelfReflective(input: ProjectorInput): string {
  let out = cleanText(String(input.response || ""));
  out = out.replace(/。次は、/g, "。\n\n次は、");
  return cleanText(out);
}

export function projectResponseSurface(input: ProjectorInput): ProjectorOutput {
  const rr = String(input.routeReason || "");

  if (rr === "TENMON_SCRIPTURE_CANON_V1") {
    return {
      response: renderBeautifulJapanese({
        routeReason: rr,
        centerLabel: input.centerLabel,
        expressionPlan: input.expressionPlan,
        comfortTuning: input.comfortTuning,
        response: projectScripture(input),
      }),
    };
  }

  if (rr === "R10_SELF_REFLECTION_ROUTE_V4_SAFE") {
    return {
      response: renderBeautifulJapanese({
        routeReason: rr,
        centerLabel: input.centerLabel,
        expressionPlan: input.expressionPlan,
        comfortTuning: input.comfortTuning,
        response: projectSelfReflective(input),
      }),
    };
  }

  if (rr === "R22_CONVERSATIONAL_GENERAL_V1") {
    return {
      response: renderBeautifulJapanese({
        routeReason: rr,
        centerLabel: input.centerLabel,
        expressionPlan: input.expressionPlan,
        comfortTuning: input.comfortTuning,
        response: projectConversationalGeneral(input),
      }),
    };
  }

  if (rr === "R22_RELATIONAL_WORLDVIEW_V1") {
    return {
      response: renderBeautifulJapanese({
        routeReason: rr,
        centerLabel: input.centerLabel,
        expressionPlan: input.expressionPlan,
        comfortTuning: input.comfortTuning,
        response: projectRelationalWorldview(input),
      }),
    };
  }

  return {
    response: renderBeautifulJapanese({
      routeReason: rr,
      centerLabel: input.centerLabel,
      expressionPlan: input.expressionPlan,
      comfortTuning: input.comfortTuning,
      response: cleanText(String(input.response || "")),
    }),
  };
}
