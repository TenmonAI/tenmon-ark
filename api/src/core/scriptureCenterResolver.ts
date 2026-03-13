export type ScriptureCenterResolved = {
  shortKey: string | null;
  label: string | null;
};

const CENTER_KEY_TO_SHORT: Record<string, string> = {
  "KHSL:LAW:KHSU:41c0bff9cfb8:p0:qcb9cdda1f01d": "kotodama_hisho",
};

const SHORT_TO_LABEL: Record<string, string> = {
  kotodama_hisho: "言霊秘書",
  iroha_kotodama_kai: "いろは言霊解",
  katakamuna_kotodama_kai: "カタカムナ言霊解",
  hokekyo: "法華経",
  kotodama: "言霊",
};

export function resolveScriptureCenter(input: string | null | undefined): ScriptureCenterResolved {
  const raw = String(input || "").trim();
  if (!raw) return { shortKey: null, label: null };

  const shortKey =
    CENTER_KEY_TO_SHORT[raw] ??
    (raw in SHORT_TO_LABEL ? raw : null);

  const label =
    (shortKey ? SHORT_TO_LABEL[shortKey] : null) ??
    SHORT_TO_LABEL[raw] ??
    raw;

  return { shortKey, label };
}
