export type ScriptureLineageLink = {
  key: string;
  label: string;
  role: "root" | "canon" | "bridge" | "current";
};

export type ScriptureLineageSummary = {
  lineageKey: string;
  family: "seiten" | "scripture" | "explicit" | "natural_analysis" | "general";
  rootLabel: string | null;
  currentKey: string | null;
  currentLabel: string | null;
  links: ScriptureLineageLink[];
  /** Notion 等の資料束は参照枠。史実断定と象徴読解の混線を禁ずる（会話 OS 親カード契約） */
  disciplineNote?: string;
};

function normalizeKey(v: unknown): string {
  return String(v ?? "").trim();
}

export function buildScriptureLineageSummary(input: {
  routeReason: string;
  centerKey?: string | null;
  centerLabel?: string | null;
  scriptureKey?: string | null;
}): ScriptureLineageSummary | null {
  const rr = normalizeKey(input.routeReason);
  const centerKey = normalizeKey(input.centerKey);
  const centerLabel = normalizeKey(input.centerLabel);
  const scriptureKey = normalizeKey(input.scriptureKey);

  if (centerKey === "kotodama" || rr === "DEF_FASTPATH_VERIFIED_V1" || rr === "DEF_FASTPATH_PROPOSED_V1") {
    return {
      lineageKey: "kotodama",
      family: "seiten",
      rootLabel: "言霊",
      currentKey: centerKey || "kotodama",
      currentLabel: centerLabel || "言霊",
      links: [
        { key: "kotodama", label: "言霊", role: "root" },
        { key: "kotodama_hisho", label: "言霊秘書", role: "canon" },
        { key: "iroha_kotodama_kai", label: "いろは言霊解", role: "bridge" },
        { key: "kotodama", label: centerLabel || "言霊", role: "current" },
      ],
    };
  }

  if (
    centerKey === "katakamuna" ||
    scriptureKey === "katakamuna_kotodama_kai" ||
    rr === "KATAKAMUNA_CANON_ROUTE_V1"
  ) {
    const ck = centerKey || scriptureKey || "katakamuna";
    const cl = centerLabel || "カタカムナ";
    return {
      lineageKey: "katakamuna",
      family: "scripture",
      rootLabel: "カタカムナ",
      currentKey: ck,
      currentLabel: cl,
      disciplineNote:
        "Notionの系譜ページは参照枠であり単独では史実断定の根拠としない。歴史記述（history）と象徴・法則読解（symbolic）は混線させない。",
      links: [
        { key: "katakamuna_mainstream_v1", label: "本流（系譜・成立文脈・楢崎以降）", role: "root" },
        { key: "katakamuna_notion_textbook_v1", label: "教科書化（Notion系譜・資料束・参照索引）", role: "canon" },
        { key: "katakamuna_application_v1", label: "応用化（相似象学・学会誌本流・実践）", role: "bridge" },
        { key: "katakamuna_reintegration_v1", label: "再統合軸（水火・言霊・天聞）", role: "current" },
      ],
    };
  }

  if (scriptureKey) {
    return {
      lineageKey: scriptureKey,
      family: "scripture",
      rootLabel: centerLabel || scriptureKey,
      currentKey: scriptureKey,
      currentLabel: centerLabel || scriptureKey,
      links: [
        { key: scriptureKey, label: centerLabel || scriptureKey, role: "root" },
        { key: scriptureKey, label: centerLabel || scriptureKey, role: "current" },
      ],
    };
  }

  return null;
}
