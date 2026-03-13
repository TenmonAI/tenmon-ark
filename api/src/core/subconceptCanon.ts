type SubconceptItem = {
  conceptKey: string;
  displayName: string;
  aliases: string[];
  short_definition: string;
  standard_definition: string;
  negative_definition: string[];
  next_axes: string[];
  core_axes: string[];
  related_scriptures: string[];
};

const __TENMON_KANA_SUBCONCEPT_ITEMS: SubconceptItem[] = [
  {
    conceptKey: "a_kotodama",
    displayName: "あ の言霊",
    aliases: ["あ の言霊", "あの言霊", "あ の言灵", "あの言灵"],
    short_definition: "『あ』は、開き・はじまり・あらわれの側を示す。",
    standard_definition: "『あ』の言霊は、物事がまだ形を持つ前に立ち上がる開きのはじまりを示す。五十音の先頭として、開示・顕現・呼び出しの側を担う。",
    negative_definition: [],
    next_axes: ["他の母音との対比", "水火との関係を見る"],
    core_axes: ["開き", "顕現", "はじまり"],
    related_scriptures: ["kotodama_hisho"]
  },
  {
    conceptKey: "hi_kotodama",
    displayName: "ひ の言霊",
    aliases: ["ひ の言霊", "ひの言霊", "ひ の言灵", "ひの言灵"],
    short_definition: "『ひ』は、火・光・動きの側を示す。",
    standard_definition: "『ひ』の言霊は、火・光・動きの側を表す。水の側と組み合わさることで、生成と変化のバランスを読む手がかりになる。",
    negative_definition: [],
    next_axes: ["水との対比", "他の子音列との関係"],
    core_axes: ["火", "光", "動き"],
    related_scriptures: ["kotodama_hisho"]
  }
];

export function resolveSubconceptQuery(text: string): SubconceptItem | null {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const norm = raw.replace(/[？?！!。．]/g, " ").trim();

  if (/(^|[ 　])(?:あ|ア)\s*の?\s*言[霊灵靈]/u.test(norm)) {
    return __TENMON_KANA_SUBCONCEPT_ITEMS.find((x) => x.conceptKey === "a_kotodama") ?? null;
  }
  if (/(^|[ 　])(?:ひ|ヒ)\s*の?\s*言[霊灵靈]/u.test(norm)) {
    return __TENMON_KANA_SUBCONCEPT_ITEMS.find((x) => x.conceptKey === "hi_kotodama") ?? null;
  }

  return null;
}

export function buildSubconceptResponse(
  conceptKey: string,
  level: "short" | "standard" = "standard"
): {
  conceptKey: string;
  displayName: string;
  text: string;
  negative_definition: string[];
  next_axes: string[];
} | null {
  const hit = __TENMON_KANA_SUBCONCEPT_ITEMS.find((x) => x.conceptKey === conceptKey);
  if (!hit) return null;

  const text = level === "short" ? hit.short_definition : hit.standard_definition;

  return {
    conceptKey: hit.conceptKey,
    displayName: hit.displayName,
    text,
    negative_definition: hit.negative_definition,
    next_axes: hit.next_axes,
  };
}
