/**
 * TENMON_SURFACE_EMPTY_AFTER_STRIP_FALLBACK_CURSOR_AUTO_V1
 * strip 後に trim が空になった user-facing 本文へ、snapshot 復帰なしで安全な最小文を与える。
 * routeReason / ku は変更しない（本文のみ）。
 */

export type TenmonSurfaceEmptyStripFallbackContextV1 = {
  routeReason: string;
  ku?: Record<string, unknown> | null;
  userMessage?: string | null;
};

const MINIMAL_SEAL =
  "【天聞の所見】いまの出力は内部整形で本文が落ちたため、確実に言える核だけ返します。いま一番聞きたい一点を一言で置いてください。";

const KATAKAMUNA_HISTORY_FALLBACK =
  "【天聞の所見】カタカムナは近代以降に楢崎皐月を契機に広く知られ、その後、複数の解釈系統へ分岐しました。天聞軸では、それを言霊・水火・系譜の再統合対象として扱います。";

const HOKEKYO_SCRIPTURE_FALLBACK =
  "【天聞の所見】法華経は、一仏乗を中心に、衆生が成仏へ向かう道を開示する経として読まれます。天聞軸では、方便と実相の関係を一語ずつ固定して読むことが重要です。";

/** centerKey / centerMeaning のスラッグを user-facing 短語へ（内部キー名は出さない） */
const CENTER_KEY_TOPIC_GLOSS_V1: Record<string, string> = {
  katakamuna: "カタカムナ",
  katakamuna_history: "カタカムナの歴史",
  katakamuna_kotodama_kai: "カタカムナ言霊解",
  katakamuna_study_path: "カタカムナの学び方",
  hokke: "法華経",
  hokekyo: "法華経",
  lotus: "法華経",
};

const RE_INTERNALISH = /routeReason|decisionFrame|thoughtCoreSummary|notionCanon|ku\.|centerKey|evidenceIds|lawsUsed|probe_ok|forensic|_V1\b|OP_[A-Z]/i;

function glossTopicFromSlugV1(slug: string): string | null {
  const k = String(slug || "").trim();
  if (!k) return null;
  const lower = k.toLowerCase();
  if (CENTER_KEY_TOPIC_GLOSS_V1[k]) return CENTER_KEY_TOPIC_GLOSS_V1[k];
  if (CENTER_KEY_TOPIC_GLOSS_V1[lower]) return CENTER_KEY_TOPIC_GLOSS_V1[lower];
  if (/^katakamuna/i.test(k)) return "カタカムナ";
  if (/^(hokke|hokekyo|lotus)$/i.test(k)) return "法華経";
  return null;
}

function isLikelyKatakamunaHistory(ctx: TenmonSurfaceEmptyStripFallbackContextV1): boolean {
  const msg = String(ctx.userMessage || "");
  const ku = ctx.ku;
  const ck = String((ku as { centerKey?: string } | null)?.centerKey ?? "").trim();
  const historyIntent =
    /(歴史|系譜|由来|経緯|いつから|変遷)/u.test(msg) || /history|歴史|系譜/i.test(ck);
  if (!historyIntent) return false;
  if (/KATAKAMUNA/i.test(String(ctx.routeReason || ""))) return true;
  if (/katakamuna/i.test(ck)) return true;
  return /カタカムナ/u.test(msg);
}

function isLikelyHokekyoScripture(ctx: TenmonSurfaceEmptyStripFallbackContextV1): boolean {
  const msg = String(ctx.userMessage || "");
  if (/法華経|法華\s*経/u.test(msg)) return true;
  const rr = String(ctx.routeReason || "");
  if (/HOKKE|HOKEKYO|LOTUS|TENMON_SCRIPTURE|SCRIPTURE_LOCAL/i.test(rr)) return true;
  const ku = ctx.ku;
  const ck = String((ku as { centerKey?: string } | null)?.centerKey ?? "").trim();
  return /^(hokke|hokekyo|lotus)$/i.test(ck);
}

function isHumanishLabel(s: string): boolean {
  const t = s.trim();
  if (t.length < 2 || t.length > 200) return false;
  if (/^[a-z][a-z0-9_]*$/i.test(t) && !/[\u3000-\u9FFF]/u.test(t)) return false;
  if (RE_INTERNALISH.test(t)) return false;
  return true;
}

function pickSafeThoughtCoreProseV1(ku: Record<string, unknown> | null): string {
  if (!ku) return "";
  const tcs = ku.thoughtCoreSummary;
  if (!tcs || typeof tcs !== "object" || Array.isArray(tcs)) return "";
  const o = tcs as Record<string, unknown>;
  /** 優先: centerMeaning → truthStructureCenterClaimHint → centerLabel（自然文のみ） */
  for (const key of ["centerMeaning", "truthStructureCenterClaimHint", "centerLabel"] as const) {
    const v = o[key];
    if (typeof v === "string" && isHumanishLabel(v)) return v.trim().slice(0, 400);
  }
  return "";
}

/**
 * 空本文用の安全な代替 prose（内部トークン・route 名は含めない）。
 */
/**
 * strip 後に「【天聞の所見】」のみ（本文なし）のときも user-facing では空と同等。
 * 外周 X13B が見出しを剥がすと response が "" になるため、ここでフォールバック対象に含める。
 */
function isTenmonSeenmarkOnlyOrBlankSurfaceV1(text: string): boolean {
  const t = String(text ?? "").trim();
  if (!t) return true;
  const rest = t.replace(/^【天聞の所見】\s*/u, "").trim();
  return rest.length === 0;
}

export function buildTenmonEmptyAfterStripFallbackProseV1(
  ctx: TenmonSurfaceEmptyStripFallbackContextV1,
): string {
  if (isLikelyKatakamunaHistory(ctx)) return KATAKAMUNA_HISTORY_FALLBACK;
  if (isLikelyHokekyoScripture(ctx)) return HOKEKYO_SCRIPTURE_FALLBACK;

  const ku = ctx.ku && typeof ctx.ku === "object" && !Array.isArray(ctx.ku) ? ctx.ku : null;
  const tcs = ku?.thoughtCoreSummary;
  const cmFromTcs =
    tcs && typeof tcs === "object" && !Array.isArray(tcs)
      ? String((tcs as { centerMeaning?: string }).centerMeaning ?? "").trim()
      : "";
  const cmRaw = cmFromTcs || String((ku as { centerMeaning?: string } | null)?.centerMeaning ?? "").trim();
  const ck = String((ku as { centerKey?: string } | null)?.centerKey ?? "").trim();

  const topicGloss = glossTopicFromSlugV1(cmRaw) || glossTopicFromSlugV1(ck);
  if (topicGloss) {
    return `【天聞の所見】${topicGloss}について、内部整形で本文が落ちたため、問いの芯に即した要点だけ返します。次に深めたい軸を一つ選んでください。`;
  }

  if (cmRaw && isHumanishLabel(cmRaw)) {
    const topic = cmRaw.replace(/_/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
    return `【天聞の所見】${topic}について、整形で細部が落ちたため核だけ述べます。次に深めたい軸を一つ選んでください。`;
  }
  const cl = String((ku as { centerLabel?: string } | null)?.centerLabel ?? "").trim();
  if (cl && isHumanishLabel(cl)) {
    return `【天聞の所見】${cl.slice(0, 80)}について、いま確実に言える芯だけを返します。定義・背景・応用のどれを先に詰めますか。`;
  }

  const tcsProse = pickSafeThoughtCoreProseV1(ku);
  if (tcsProse) {
    return `【天聞の所見】${tcsProse.slice(0, 360)}`;
  }

  const rr = String(ctx.routeReason || "");
  if (/DEF_FASTPATH|SCRIPTURE|TENMON_SCRIPTURE|TRUTH_GATE|TENMON_CONCEPT|GENERAL_KNOWLEDGE_EXPLAIN/i.test(rr)) {
    return "【天聞の所見】いまの出力は内部整形で本文が落ちたため、確実に言える核だけ返します。参照したい典拠か用語を一つに絞ってください。";
  }

  return MINIMAL_SEAL;
}

export function applyTenmonEmptyAfterStripFallbackIfBlankV1(
  text: string,
  ctx: TenmonSurfaceEmptyStripFallbackContextV1,
): string {
  const t = String(text ?? "").trim();
  if (t && !isTenmonSeenmarkOnlyOrBlankSurfaceV1(t)) return t;
  return buildTenmonEmptyAfterStripFallbackProseV1(ctx);
}
