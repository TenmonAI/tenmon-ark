export type ReleaseMode = "STRICT" | "HYBRID" | "FREE";
export type ReleaseSourcePolicy = "CANON" | "SUMMARY" | "LIGHT";
export type ReleaseTruthGate = "HARD" | "MEDIUM" | "LIGHT";

export interface ReleasePolicyInput {
  input?: string | null;
  routeReason?: string | null;
  topicClass?: string | null;
  centerKey?: string | null;
  centerLabel?: string | null;
}

export interface ReleasePolicy {
  mode: ReleaseMode;
  sourcePolicy: ReleaseSourcePolicy;
  truthGate: ReleaseTruthGate;
  why: string;
}

const STRICT_PATTERNS = [
  /言霊/u,
  /言灵/u,
  /カタカムナ/u,
  /言霊秘書/u,
  /いろは言霊解/u,
  /古事記/u,
  /法華経/u,
  /空海/u,
  /真言/u,
  /大日如来/u,
  /楢崎/u,
  /宇野/u,
  /第一次情報/u,
  /原典/u,
];

const HYBRID_PATTERNS = [
  /どう生き/u,
  /人生/u,
  /思想/u,
  /考え方/u,
  /世界観/u,
  /文明/u,
  /断捨離/u,
  /相談/u,
  /整理したい/u,
  /意味/u,
  /なぜ/u,
  /本質/u,
];

function hit(list: RegExp[], text: string): boolean {
  return list.some((re) => re.test(text));
}

export function decideReleasePolicy(input: ReleasePolicyInput): ReleasePolicy {
  const text = [
    input.input || "",
    input.routeReason || "",
    input.topicClass || "",
    input.centerKey || "",
    input.centerLabel || "",
  ].join("\n");

  if (hit(STRICT_PATTERNS, text)) {
    return {
      mode: "STRICT",
      sourcePolicy: "CANON",
      truthGate: "HARD",
      why: "strict_keyword_or_route",
    };
  }

  if (hit(HYBRID_PATTERNS, text)) {
    return {
      mode: "HYBRID",
      sourcePolicy: "SUMMARY",
      truthGate: "MEDIUM",
      why: "hybrid_keyword_or_route",
    };
  }

  return {
    mode: "FREE",
    sourcePolicy: "LIGHT",
    truthGate: "LIGHT",
    why: "default_free",
  };
}
