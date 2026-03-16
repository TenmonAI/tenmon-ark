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

  if (centerKey === "katakamuna" || scriptureKey === "katakamuna_kotodama_kai") {
    return {
      lineageKey: "katakamuna",
      family: "scripture",
      rootLabel: "カタカムナ",
      currentKey: centerKey || scriptureKey || "katakamuna",
      currentLabel: centerLabel || "カタカムナ",
      links: [
        { key: "katakamuna", label: "カタカムナ", role: "root" },
        { key: "katakamuna_kotodama_kai", label: "カタカムナ言霊解", role: "canon" },
        { key: centerKey || scriptureKey || "katakamuna", label: centerLabel || "カタカムナ", role: "current" },
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
