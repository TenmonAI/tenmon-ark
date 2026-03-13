export type SacredDecision = {
  isSacred: boolean;
  domain?: "kotodama" | "katakamuna" | "scripture" | "general";
  routeReason: string;
  centerHint?: string | null;
};

function s(v: unknown): string {
  return String(v ?? "").trim();
}

export function sacredClassifier(input: { message: string; threadId?: string | null }): SacredDecision {
  const msg = s(input.message);

  if (/(言霊秘書|法華経|いろは言霊解|カタカムナ言霊解|水穂伝)/u.test(msg)) {
    return {
      isSacred: true,
      domain: "scripture",
      routeReason: "FRONT_SACRED_SCRIPTURE_V1",
      centerHint: msg,
    };
  }

  if (/(言灵|言霊|ことだま|五十音|一言法則|言霊一言)/u.test(msg)) {
    return {
      isSacred: true,
      domain: "kotodama",
      routeReason: "FRONT_SACRED_KOTODAMA_V1",
      centerHint: "言霊",
    };
  }

  if (/(カタカムナ|天津金木|布斗麻邇|フトマニ|水火|イキ)/u.test(msg)) {
    return {
      isSacred: true,
      domain: "katakamuna",
      routeReason: "FRONT_SACRED_KATAKAMUNA_V1",
      centerHint: "カタカムナ",
    };
  }

  return {
    isSacred: false,
    domain: "general",
    routeReason: "FRONT_CHAT_GPT_ROUTE_V1",
    centerHint: null,
  };
}
