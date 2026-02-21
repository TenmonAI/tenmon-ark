export type HeartState =
  | "exhausted"
  | "confused"
  | "angry"
  | "sad"
  | "neutral";

export type HeartScore = {
  state: HeartState;
  entropy: number; // 0..1 rough
};

const HIT = (t: string, ws: string[]) => ws.some(w => t.includes(w));

export function heartModelV1(userText: string): HeartScore {
  const t = String(userText || "").replace(/\r/g, "").trim();

  // very small deterministic heuristic (no ML)
  const exhausted = ["疲れた", "しんどい", "もう無理", "限界", "眠い", "消えたい", "疲れ", "疲労", "疲弊", "だるい", "何もしたくない", "やる気が出ない"];
  const confused = ["わからない", "どうしたら", "迷う", "混乱", "詰まってる", "正しさって何"];
  const angry = ["ムカつく", "腹立つ", "許せない", "最悪", "うざい", "不快"];
  const sad = ["悲しい", "つらい", "苦しい", "寂しい", "泣きたい"];

  if (HIT(t, exhausted)) return { state: "exhausted", entropy: 0.85 };
  if (HIT(t, angry)) return { state: "angry", entropy: 0.75 };
  if (HIT(t, sad)) return { state: "sad", entropy: 0.70 };
  if (HIT(t, confused)) return { state: "confused", entropy: 0.65 };

  return { state: "neutral", entropy: 0.25 };
}

/**
 * Output-side helper: return a 1-line compassion prefix that does NOT become preachy.
 * Keep it minimal, non-judgmental, not "〜しましょう".
 */
export function compassionPrefixV1(h: HeartScore): string {
  switch (h.state) {
    case "exhausted":
      return "【天聞の所見】疲れが限界に近いサインです。いまは守りに寄せていいです。";
    case "angry":
      return "【天聞の所見】その怒りは境界が侵された反応です。まず守る一点を決めましょう。";
    case "sad":
      return "【天聞の所見】その痛みは大事なものが触れている証です。急がなくていいです。";
    case "confused":
      return "【天聞の所見】情報が散っているだけです。いまの焦点を一語で取ります。";
    default:
      return "";
  }
}
// CARD_H2B_BUDDHA_SYNAPSE_STABILIZE_V1
