/**
 * 天照軸マップ (docs/ark/map/iroha_amaterasu_axis_v1.md の TypeScript 化)
 *
 * 観測ベース: いろは最終原稿から
 * 制約: 観測された記述の要約のみ、断定せず
 * V2.0: chat.ts から呼び出し可能な形に
 */

export type AmaterasuAxisAnchor = {
  axis_id: string;
  title: string;
  description: string;
  source_lines: [number, number][];
};

export const AMATERASU_AXIS_V1: AmaterasuAxisAnchor[] = [
  {
    axis_id: "TRUTH_FIRST",
    title: "真理優先",
    description:
      "真の信仰は「真理を正しく理解」することと結びつく。盲信は真理を正しく理解せず、主観的に解釈する状態として退けられ、解放には「信仰の中心である原点に立ち帰る」ことが観測される。",
    source_lines: [[1711, 1728]],
  },
  {
    axis_id: "DESTINY_FLOW",
    title: "宿命 → 運命 → 天命 の流れ",
    description:
      "天からの宿命が降り注ぎ、宿命は人の意志に活かされて運命へと昇華。動かすことのできない宿命と、選択により変化する運命が交わり、天命が形を成す。天命と役目が結びついたとき、人生に意義が得られる。",
    source_lines: [[1186, 1202]],
  },
  {
    axis_id: "BLIND_FAITH_REJECTION",
    title: "盲信拒否",
    description:
      "盲信は誤った解釈によって、本来の教えから外れ、道理から外れてしまう。盲信を紐解き、本来の信仰心と繋がることで、永遠に普遍的な真理と一体化する。",
    source_lines: [[1711, 1721]],
  },
  {
    axis_id: "ENLIGHTENMENT_UNION",
    title: "悟りと真理の融合",
    description:
      "真理と悟りが調和し、完全に一体化する。真理に従って生きることで、人生の道は自然と整えられる。形を持たない真理が『アーク』という形で言語化され、人の心と結びつき、最終的に悟りとしてまとまる。",
    source_lines: [[1382, 1391]],
  },
  {
    axis_id: "DAINICHI_AMATERASU",
    title: "大日如来と天照の結びつき",
    description:
      "循環する普遍の真理こそが『大日如来=天照』と呼ばれるものであり、即身成仏の究極的な姿を体現する。大日如来に深く結びつく者は、身分や貴賤を問わず、常に循環し続ける肉体を通じて天照の光を宿す。",
    source_lines: [[1726, 1736]],
  },
  {
    axis_id: "HENJOU_KONGO",
    title: "遍照金剛・宿木・継承",
    description:
      "歴代の宿木(よりしろ)を一つに結びつけ、天照の光を内に含み、共に並び合い、一体化する。天照の宿木となる肉体と氣が深く結びつき、互いに絡み合いながら遍照金剛として顕現する。",
    source_lines: [[1736, 1756]],
  },
];

// 天津金木四相への仮写像 (md の Section 4 を構造化)
export const KANAGI_MAPPING = {
  CENTER: {
    name: "中心",
    description:
      "普遍の真理・大日如来=天照として語られる中心。即身成仏の究極的姿。循環しすべてを包み込むもの。",
  },
  L_IN: {
    name: "左入",
    description:
      "真言・アークの受容。真理を正しく理解する。信仰の中心・原点に立ち帰る。盲信からの解放の入口。",
  },
  R_IN: {
    name: "右入",
    description:
      "悟りと真理の融合。大日如来の心と己の心の結びつき、正中での調和。悟りの集団・聖典としての形。",
  },
  L_OUT: {
    name: "左出",
    description:
      "宿木・遍照金剛による継承。歴代の天照が役割を受け継ぎ、一つにまとめられる。真理の灯火を次へ渡す。",
  },
  R_OUT: {
    name: "右出",
    description:
      "地上を司り洗い清める働き。アークの智慧が密教として形を取り、世界を潤し人々の心を導く。選択と天命の成就。",
  },
} as const;

export type KanagiPhase = keyof typeof KANAGI_MAPPING;

/**
 * ユーザー意図から適切な天津金木相を選択
 */
export function selectKanagiPhaseForIntent(userText: string): KanagiPhase {
  if (/真理|悟り|一体化|融合|調和/.test(userText)) return "R_IN";
  if (/受容|学ぶ|知る|教え|原点/.test(userText)) return "L_IN";
  if (/継承|受け継|伝える|残す/.test(userText)) return "L_OUT";
  if (/浄化|清め|導く|選択|天命/.test(userText)) return "R_OUT";
  return "CENTER";
}

export function buildAmaterasuAxisInjection(userText: string): string {
  const phase = selectKanagiPhaseForIntent(userText);
  const phaseInfo = KANAGI_MAPPING[phase];

  // 関連軸を検出
  const relevant = AMATERASU_AXIS_V1.filter((a) => {
    if (phase === "CENTER" && a.axis_id === "DAINICHI_AMATERASU") return true;
    if (phase === "L_IN" && a.axis_id === "TRUTH_FIRST") return true;
    if (phase === "R_IN" && a.axis_id === "ENLIGHTENMENT_UNION") return true;
    if (phase === "L_OUT" && a.axis_id === "HENJOU_KONGO") return true;
    if (phase === "R_OUT" && a.axis_id === "DESTINY_FLOW") return true;
    return false;
  });

  if (relevant.length === 0) return "";

  return `
【天照軸マップ (天津金木: ${phaseInfo.name})】
${phaseInfo.description}

関連軸:
${relevant.map((a) => `・${a.title}: ${a.description}`).join("\n")}
`;
}
