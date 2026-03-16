/**
 * CARD_SOURCE_GRAPH_V1: routeReason ごとの sourcePack / routeClass / thoughtGuide / notionRoute を静的定義に寄せる
 */

export type SourceGraphNode = {
  routeReason: string;
  routeClass: string;
  sourcePack: string;
  defaultCenterKey?: string | null;
  defaultCenterLabel?: string | null;
  thoughtGuideKey?: "kotodama" | "katakamuna" | "scripture" | null;
  notionRoute?: string | null;
  binderMode: "define" | "continuity" | "analysis" | "support" | "general";
};

const SOURCE_GRAPH: SourceGraphNode[] = [
  { routeReason: "DEF_FASTPATH_VERIFIED_V1", routeClass: "define", sourcePack: "seiten", defaultCenterKey: "kotodama", defaultCenterLabel: "言霊", thoughtGuideKey: "kotodama", notionRoute: "DEF_FASTPATH_VERIFIED_V1", binderMode: "define" },
  { routeReason: "DEF_FASTPATH_PROPOSED_V1", routeClass: "define", sourcePack: "seiten", defaultCenterKey: "kotodama", defaultCenterLabel: "言霊", thoughtGuideKey: "kotodama", notionRoute: "DEF_FASTPATH_PROPOSED_V1", binderMode: "define" },
  { routeReason: "R22_ESSENCE_FOLLOWUP_V1", routeClass: "continuity", sourcePack: "seiten", thoughtGuideKey: "kotodama", notionRoute: "R22_ESSENCE_FOLLOWUP_V1", binderMode: "continuity" },
  { routeReason: "R22_COMPARE_FOLLOWUP_V1", routeClass: "analysis", sourcePack: "natural_analysis", notionRoute: "R22_COMPARE_FOLLOWUP_V1", binderMode: "analysis" },
  { routeReason: "R22_FUTURE_OUTLOOK_V1", routeClass: "analysis", sourcePack: "natural_analysis", binderMode: "analysis" },
  { routeReason: "R22_ESSENCE_ASK_V1", routeClass: "analysis", sourcePack: "natural_analysis", binderMode: "analysis" },
  { routeReason: "R22_COMPARE_ASK_V1", routeClass: "analysis", sourcePack: "natural_analysis", binderMode: "analysis" },
  { routeReason: "EXPLICIT_CHAR_PREEMPT_V1", routeClass: "analysis", sourcePack: "explicit", binderMode: "analysis" },
  { routeReason: "TENMON_SCRIPTURE_CANON_V1", routeClass: "continuity", sourcePack: "scripture", thoughtGuideKey: "scripture", notionRoute: "TENMON_SCRIPTURE_CANON_V1", binderMode: "continuity" },
  { routeReason: "SUPPORT_UI_INPUT_V1", routeClass: "support", sourcePack: "support", binderMode: "support" },
];

const MAP_BY_ROUTE = new Map<string, SourceGraphNode>(SOURCE_GRAPH.map((n) => [n.routeReason, n]));

export function getSourceGraphNode(routeReason: string): SourceGraphNode | null {
  const rr = String(routeReason || "").trim();
  return MAP_BY_ROUTE.get(rr) ?? null;
}

export function resolveSourceGraphDefaults(
  routeReason: string,
  _centerKey?: string | null
): {
  routeClass: string | null;
  sourcePack: string | null;
  thoughtGuideKey: string | null;
  notionRoute: string | null;
} {
  const node = getSourceGraphNode(routeReason);
  if (node)
    return {
      routeClass: node.routeClass,
      sourcePack: node.sourcePack,
      thoughtGuideKey: node.thoughtGuideKey ?? null,
      notionRoute: node.notionRoute ?? routeReason,
    };
  return { routeClass: null, sourcePack: null, thoughtGuideKey: null, notionRoute: null };
}
