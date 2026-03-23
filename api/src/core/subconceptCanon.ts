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
  },
  {
    conceptKey: "utahi_kotodama",
    displayName: "ウタヒ",
    aliases: ["ウタヒ", "うたひ", "カタカムナウタヒ", "カタカムナ・ウタヒ"],
    short_definition:
      "ウタヒは、カタカムナ系の読みにおいて「歌・響き・音列の位相」を束ねる語で、単一の現代語訳に還元しにくい専門用語です。",
    standard_definition:
      "ウタヒは、カタカムナ言霊解の文脈で用いられる語で、音列・図象・水火の読みと結びつく「響きの束」を指すことが多いです。現代語一語へ直訳すると意味が抜けるため、まずは『音としての配列と、その背後の生成秩序をどう読むか』が中心になります。五十音一言法則やカタカムナウタヒの問いとセットで扱われます。",
    negative_definition: ["占いの断定語に還元しない", "単なる歌詞解釈だけに固定しない"],
    next_axes: ["五十音一言法則との関係", "カタカムナ図象・水火のどちらから当てるか"],
    core_axes: ["響き", "音列", "生成秩序"],
    related_scriptures: ["katakamuna_kotodama_kai", "kotodama_hisho"]
  },
  {
    conceptKey: "gojuon_ichion",
    displayName: "五十音一言法則",
    aliases: ["五十音一言法則"],
    short_definition:
      "五十音の各音を一つの働きとして切り出し、意味・作用を読む見方です。天聞軸では言霊秘書やイロハ言霊解と接続して、開き・変化・収束を音単位で追います。",
    standard_definition:
      "五十音一言法則は、五十音の各音を独立した作用単位として読み、音義・水火・図象と重ねて言葉の立ち上がりを追う手順です。天聞軸では、言霊秘書の一言法則・イロハ言霊解・カタカムナ言霊解のいずれを土台にするかで読みの密度が変わります。断定ではなく、参照束を明示して進めるのが安全です。",
    negative_definition: ["一音だけで全体を占わない", "現代語訳一語に還元しない"],
    next_axes: ["イロハ言霊解との対応", "水火のどちらから当てるか"],
    core_axes: ["音単位", "作用", "読み手順"],
    related_scriptures: ["kotodama_hisho", "iroha_kotodama_kai"]
  }
];

/** TENMON_CONVERSATION_DEFINE_CANON_PACK_B_V1: 「とは／って何」等の定義意図（下位概念 canon ゲート用） */
export function isSubconceptDefinitionIntentV1(raw: string): boolean {
  const t = String(raw ?? "").replace(/\s+/gu, " ").trim();
  if (!t) return false;
  return (
    /とは\s*([何なに]|なん|ですか|でしょうか)?\s*[？?!！。]*$/u.test(t) ||
    /って\s*(何|なに|なん)(ですか|でしょうか)?\s*[？?!！。]*$/u.test(t) ||
    /^.{1,48}\s*とは\s*[？?]\s*$/u.test(t)
  );
}

export function resolveSubconceptQuery(text: string): SubconceptItem | null {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const norm = raw.replace(/[？?！!。．]/g, " ").trim();

  if (
    /(^|[ 　])(?:あ|ア)\s*の?\s*言[霊灵靈]/u.test(norm) ||
    /言霊の(?:あ|ア)(?:\s|とは|って|の|は|[？?]|$)/u.test(norm)
  ) {
    return __TENMON_KANA_SUBCONCEPT_ITEMS.find((x) => x.conceptKey === "a_kotodama") ?? null;
  }
  if (/(^|[ 　])(?:ひ|ヒ)\s*の?\s*言[霊灵靈]/u.test(norm)) {
    return __TENMON_KANA_SUBCONCEPT_ITEMS.find((x) => x.conceptKey === "hi_kotodama") ?? null;
  }

  if (/(ウタヒ|うたひ|カタカムナウタヒ|カタカムナ・ウタヒ)/u.test(norm)) {
    return __TENMON_KANA_SUBCONCEPT_ITEMS.find((x) => x.conceptKey === "utahi_kotodama") ?? null;
  }

  if (/五十音一言法則/u.test(norm)) {
    return __TENMON_KANA_SUBCONCEPT_ITEMS.find((x) => x.conceptKey === "gojuon_ichion") ?? null;
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
