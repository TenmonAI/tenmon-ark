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

/**
 * heartModelV1 — 決定論的な感情検出（ML不使用）
 *
 * V1.1変更点:
 * - 活用形対応: 「しんどい→しんどくて/しんどかった」等の活用形を正規表現で検出
 * - 語彙追加: 「空っぽ」「相談できない」「誰にも言えない」「居場所がない」等
 * - 複合表現対応: 一人称 + 否定形の組み合わせ検出
 */
export function heartModelV1(userText: string): HeartScore {
  const t = String(userText || "").replace(/\r/g, "").trim();

  // 正規表現ベースの活用形対応検出
  const exhaustedRx = /疲れ|しんど[いくかっ]|もう無理|限界|眠[いれく]|消えたい|疲労|疲弊|だる[いくかっ]|何もしたくない|やる気が出ない|空っぽ|動けな[いく]/;
  const confusedRx = /わからな[いく]|どうしたら|迷[うっい]|混乱|詰まって|正しさって何|どうしていい|どうすれば|何が正解/;
  const angryRx = /ムカつ[くい]|腹立[つち]|許せな[いく]|最悪|うざ[いく]|不快/;
  const sadRx = /悲し[いくかっ]|つら[いくかっ]|苦し[いくかっ]|寂し[いくかっ]|泣きたい|泣[いけ]て|誰にも(言えな|相談でき|話せな)|居場所がな/;

  if (exhaustedRx.test(t)) return { state: "exhausted", entropy: 0.85 };
  if (angryRx.test(t)) return { state: "angry", entropy: 0.75 };
  if (sadRx.test(t)) return { state: "sad", entropy: 0.70 };
  if (confusedRx.test(t)) return { state: "confused", entropy: 0.65 };

  // 複合表現: 一人称 + 否定形
  const hasFirstPerson = /(わたし|私|俺|僕|自分)/.test(t);
  if (hasFirstPerson && /できな[いく]|ダメ[だな]|うまくいかな/.test(t)) {
    return { state: "sad", entropy: 0.60 };
  }

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
