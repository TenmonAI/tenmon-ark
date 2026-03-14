export type ProjectorInput = {
  routeReason?: string | null;
  centerMeaning?: string | null;
  centerLabel?: string | null;
  centerKey?: string | null;
  surfaceStyle?: string | null;
  closingType?: string | null;
  thoughtCoreSummary?: unknown;
  threadCenter?: {
    centerType?: string | null;
    centerKey?: string | null;
    sourceRouteReason?: string | null;
  } | null;
  rawResponse?: string | null;
  canonicalResponse?: string | null;
  response?: string | null;
};

export type ProjectorResult = {
  response: string;
  surfaceStyle?: string | null;
  closingType?: string | null;
  centerLabel?: string | null;
  centerMeaning?: string | null;
};

function s(v: unknown): string {
  return String(v ?? "").trim();
}


export function normalizeDisplayLabel(label: string): string {
  const x = s(label);
  if (!x) return "";
  const map: Record<string, string> = {
    hokekyo: "法華経",
    kotodama_hisho: "言霊秘書",
    iroha_kotodama_kai: "いろは言霊解",
    katakamuna_kotodama_kai: "カタカムナ言霊解",
    mizuho_den: "水穂伝",
    kotodama: "言霊",
    katakamuna: "カタカムナ",
    amatsukanagi: "天津金木",
  };
  return map[x] || x;
}

function stripInternal(text: string): string {
  let out = text;
  out = out.replace(/\b(?:KHSL?|TENMON_[A-Z0-9_]+|R\d+[A-Z0-9_]*_V\d+|DEF_FASTPATH_VERIFIED_V1|NATURAL_GENERAL_LLM_TOP)\b/g, "");
  out = out.replace(/この聖典の中心/g, "");
  out = out.replace(/[ \t]+\n/g, "\n");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}


function hasKotodamaCompareParity(input: any): boolean {
  try {
    const ku = input?.ku || input?.decisionFrame?.ku || {};
    const ss = ku?.sourceStackSummary || {};
    const tcs = ku?.thoughtCoreSummary || {};
    return Boolean(
      String(ku?.centerKey || "") === "kotodama_hisho" ||
      String(ku?.centerMeaning || "") === "kotodama_hisho" ||
      (Array.isArray(ss?.sourceKinds) && ss.sourceKinds.includes("kotodama_one_sound")) ||
      (ss?.previousSound && ss?.currentSound) ||
      String(tcs?.intentKind || "") === "compare"
    );
  } catch {
    return false;
  }
}

function scripturePrefix(label: string, body: string, skipPrefix?: boolean): string {
  if (!label) return body;
  if (skipPrefix) return body;
  if (body.startsWith("（")) return body;
  if (body.startsWith("【天聞の所見】")) return body;
  return `（${label}）を土台に、いまの話を見ていきましょう。\n${body}`.trim();
}

function conceptPrefix(label: string, body: string): string {
  if (!label) return body;
  if (body.startsWith("さっき見ていた中心（")) return body;
  return `さっき見ていた中心（${label}）を土台に、いまの話を見ていきましょう。\n${body}`.trim();
}

export function responseProjector(input: ProjectorInput): string {
  const routeReason = s(input.routeReason);
  const centerMeaning = normalizeDisplayLabel(s(input.centerMeaning));
  const centerLabel = normalizeDisplayLabel(s(input.centerLabel));
  const centerKey = s(input.centerKey);
  const surfaceStyle = s(input.surfaceStyle);
  const closingType = s(input.closingType);
  const threadCenter = input.threadCenter || null;

  const raw = s(input.rawResponse || input.response);
  const canonical = s(input.canonicalResponse);
  let body = stripInternal(canonical || raw || "");

  const isBadGeneric =
    body === "【天聞の所見】【天聞の所見】受け取りました。いま一番引っかかっている一点を置いてください。" ||
    body === "【天聞の所見】受け取りました。いま一番引っかかっている一点を置いてください。" ||
    body === "【天聞の所見】受け取りました。核心を一点に絞って置いてください。" ||
    body === "【天聞の所見】【天聞の所見】受け取りました。核心を一点に絞って置いてください。";

  const tcType = s(threadCenter?.centerType);
  const tcKey = normalizeDisplayLabel(s(threadCenter?.centerKey));
  const followLabel = centerLabel || centerMeaning || centerKey || tcKey;

  const isNaturalGeneral = routeReason.includes("NATURAL_GENERAL");
  const effectiveSurfaceStyle = surfaceStyle || (isNaturalGeneral ? "plain_clean" : "");
  const effectiveClosingType = closingType || (isNaturalGeneral ? "one_question" : "");

  if (isBadGeneric && (tcType === "scripture" || routeReason === "TENMON_SCRIPTURE_CANON_V1" || /秘書|法華経|いろは|カタカムナ|水穂伝/u.test(followLabel))) {
    const label = centerLabel || centerMeaning || centerKey || tcKey || "聖典";
    body = `${label}を土台に続けます。\n次は、要点・構造・次の一歩のうち一つに絞って進めます。`;
  }

  if (isBadGeneric && (tcType === "concept" || /言霊|カタカムナ|天津金木/u.test(followLabel))) {
    const label = centerLabel || centerMeaning || centerKey || tcKey || "この中心";
    body = `${label}を土台に続けます。\n次は、その核となる意味を一つずつ見ていきます。`;
  }

  if (tcType === "scripture") {
    const __label = centerLabel || centerMeaning || normalizeDisplayLabel(centerKey) || tcKey;
    if (!body.startsWith(`（${__label}）`) && !body.startsWith(`${__label}を土台に続けます。`)) {
      body = scripturePrefix(__label, body, hasKotodamaCompareParity(input));
    }
  } else if (tcType === "concept") {
    const __label = centerLabel || centerMeaning || normalizeDisplayLabel(centerKey) || tcKey;
    if (!body.startsWith(`さっき見ていた中心（${__label}）`) && !body.startsWith(`${__label}を土台に続けます。`)) {
      body = conceptPrefix(__label, body);
    }
  }

  body = body
    .replace(/（([^）]+)）を土台に、いまの話を見ていきましょう。\s*\1を土台に続けます。/g, '（$1）を土台に、いまの話を見ていきましょう。')
    .replace(/さっき見ていた中心（([^）]+)）を土台に、いまの話を見ていきましょう。\s*\1を土台に続けます。/g, 'さっき見ていた中心（$1）を土台に、いまの話を見ていきましょう。');

  if (effectiveSurfaceStyle === "plain_clean") {
    body = body.replace(/^【天聞の所見】\s*/u, "【天聞の所見】");
    if (!body.startsWith("【天聞の所見】")) body = `【天聞の所見】${body}`;
  }

  if (effectiveClosingType === "one_question") {
    body = body.replace(/\n*$/u, "");
  }

  return stripInternal(body);
}

export function projectResponseSurface(input: ProjectorInput): ProjectorResult {
  return {
    response: responseProjector(input),
    surfaceStyle: input.surfaceStyle ?? null,
    closingType: input.closingType ?? null,
    centerLabel: input.centerLabel ?? null,
    centerMeaning: input.centerMeaning ?? null,
  };
}
