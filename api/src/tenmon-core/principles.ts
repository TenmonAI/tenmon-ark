/**
 * 不変核：言霊の操作・分類・辞・音解釈の原理
 *
 * 法則（Law）を型で定義し、初期法則セットを const 配列で保持
 * 後続フェーズで PDF 全ページを Law 化しても破綻しないよう、
 * 出典情報を LawSource 型として拡張しておく。
 */

export type Operation =
  | "省" // 省略
  | "延開" // 延開
  | "反約" // 反約
  | "反" // 反
  | "約" // 約
  | "略" // 略
  | "転"; // 転

/**
 * 出典情報：PDFページ＋書籍ページ＋章を保持
 */
export type LawSource = {
  doc: "言霊秘書.pdf";
  pdfPage: number;
  bookPage?: number; // 例: 6〜10, 13〜
  section?: string; // 例: "水穂伝附言", "布斗麻通御霊", "神世七代"
  note?: string;
};

export type Law = {
  id: string; // 例: "KOTODAMA-P069-HELPERS"
  title: string; // 法則のタイトル
  quote: string; // 原文（OCR崩れがあってもそのまま保持）
  normalized: string; // 現代語の意味を短く
  tags: string[]; // 例: ["operation","helpers","grammar"]
  source: LawSource;
};

/**
 * HelperWords（佐言）の定義
 */
export const HELPER_WORDS = {
  起言: ["アイ", "ウ", "オ"], // 4（アイウオ）
  補言: ["シ", "ミ", "ツ"], // 3（シミツ）
  助言: ["ラ", "リ", "ル", "レ"], // 4（ラリルレ）
} as const;

/**
 * 五十連十行の「行の役割」
 */
export const GOJUON_ROWS = {
  ア行: { role: "天", description: "天" },
  ヮ行: { role: "地", description: "地" },
  ヤ行: { role: "人", description: "人（君位）" },
  カ行: { role: "臣", description: "語の活用をなす" },
  サ行: { role: "臣", description: "語の活用をなす" },
  タ行: { role: "臣", description: "語の活用をなす" },
  ナ行: { role: "臣", description: "語の活用をなす" },
  ハ行: { role: "臣", description: "語の活用をなす" },
  マ行: { role: "臣", description: "語の活用をなす" },
} as const;

/**
 * 基本法則セット（章に依存しないコア）
 */
const BASE_LAWS: Law[] = [
  {
    id: "KOTODAMA-P069-HELPERS",
    title: "佐言（起言・補言・助言）",
    quote: "起言アイウオ四、補言シミツ三、助言ラリルレ四、合計十一（佐言）",
    normalized: "起言はアイウオの4つ、補言はシミツの3つ、助言はラリルレの4つ、合計11が佐言",
    tags: ["helpers", "grammar", "operation"],
    source: {
      doc: "言霊秘書.pdf",
      pdfPage: 69,
      bookPage: 69,
      section: "佐言",
      note: "佐言の定義",
    },
  },
  {
    id: "KOTODAMA-OPERATION-BASE",
    title: "言霊の操作",
    quote: "省・延開・反約・反・約・略・転",
    normalized: "言霊の操作には省・延開・反約・反・約・略・転がある",
    tags: ["operation", "base"],
    source: {
      doc: "言霊秘書.pdf",
      pdfPage: 1,
      bookPage: 1,
      section: "序",
    },
  },
  {
    id: "KOTODAMA-TENIWOHA",
    title: "辞（テニヲハ）",
    quote: "二〜五言で語と詞を綴り始終を結ぶ",
    normalized: "辞（テニヲハ）は2〜5言で語と詞を綴り、始終を結ぶ",
    tags: ["teniwoha", "grammar"],
    source: {
      doc: "言霊秘書.pdf",
      pdfPage: 1,
      bookPage: 1,
      section: "序",
    },
  },
  {
    id: "KOTODAMA-TAIYOU",
    title: "体用",
    quote: "体用の関係",
    normalized: "体（躰）と用の関係",
    tags: ["taiyou", "structure"],
    source: {
      doc: "言霊秘書.pdf",
      pdfPage: 1,
      bookPage: 1,
      section: "序",
    },
  },
  {
    id: "KOTODAMA-MITAMA-KOTO",
    title: "御霊と言",
    quote: "御霊と言の関係",
    normalized: "御霊（みたま）と言（こと）の関係",
    tags: ["mitama", "koto", "structure"],
    source: {
      doc: "言霊秘書.pdf",
      pdfPage: 1,
      bookPage: 1,
      section: "序",
    },
  },
  {
    id: "KOTODAMA-KOTO-TAMA",
    title: "詞と霊",
    quote: "詞と霊の関係",
    normalized: "詞（こと）と霊（たま）の関係",
    tags: ["koto", "tama", "structure"],
    source: {
      doc: "言霊秘書.pdf",
      pdfPage: 1,
      bookPage: 1,
      section: "序",
    },
  },
  {
    id: "KOTODAMA-REIGO",
    title: "霊合（反しなるものは同義）",
    quote: "反しなるものは同義",
    normalized: "反しなるものは同義（霊合）",
    tags: ["reigo", "operation", "meaning"],
    source: {
      doc: "言霊秘書.pdf",
      pdfPage: 1,
      bookPage: 1,
      section: "序",
    },
  },
];

/**
 * 水穂伝附言（例：P6-10）Law セット
 * 引用テキストは長文コピペせず、キーフレーズ＋出典指定のみ。
 */
export const LAWS_MIZUHO_P6_P10: Law[] = [
  {
    id: "KOTODAMA-MIZUHO-P6-10-INVISIBLE-HIMIZU",
    title: "天地間の不可視火水",
    quote: "天地の間に見えざる火水あり",
    normalized: "天地の間には目に見えない火と水（火水）が満ちている",
    tags: ["mizuho", "himizu", "cosmogony"],
    source: {
      doc: "言霊秘書.pdf",
      pdfPage: 6,
      bookPage: 6,
      section: "水穂伝附言",
      note: "天地間の不可視火水（火水）の説明",
    },
  },
  {
    id: "KOTODAMA-MIZUHO-P6-10-FIRE-AS-YO",
    title: "火＝用",
    quote: "火は用なり",
    normalized: "火は用（働き）として現れる",
    tags: ["mizuho", "fire", "taiyou"],
    source: {
      doc: "言霊秘書.pdf",
      pdfPage: 6,
      bookPage: 6,
      section: "水穂伝附言",
      note: "火＝用（ヨ）としての定義",
    },
  },
  {
    id: "KOTODAMA-MIZUHO-P6-10-TAIYO-REVERSIBLE",
    title: "火鉢／水用の反転",
    quote: "火鉢と水用は反転の関係にある",
    normalized: "火鉢（火の器）と水用（水の働き）は体用が反転する",
    tags: ["mizuho", "himizu", "taiyou"],
    source: {
      doc: "言霊秘書.pdf",
      pdfPage: 7,
      bookPage: 7,
      section: "水穂伝附言",
      note: "火鉢／水用の反転関係",
    },
  },
  {
    id: "KOTODAMA-MIZUHO-P6-10-ONE-STOP-ORIGIN",
    title: "万物一に止",
    quote: "万物一に止まる",
    normalized: "あらゆるものは一つのところに止まり、そこから発する",
    tags: ["mizuho", "one", "cosmogony"],
    source: {
      doc: "言霊秘書.pdf",
      pdfPage: 8,
      bookPage: 8,
      section: "水穂伝附言",
      note: "万物一に止の原理",
    },
  },
  {
    id: "KOTODAMA-MIZUHO-P6-10-GENESIS-CHAIN",
    title: "生成鎖（凝→火水→息→音→五十詞→形仮名→五十連）",
    quote: "凝りて父火母水となり、息となり、音となり、五十詞となり、形仮名となり、五十連となる",
    normalized: "凝→父火母水→息→音→五十詞→形仮名→五十連へと展開する生成鎖",
    tags: ["mizuho", "cosmogony", "chain"],
    source: {
      doc: "言霊秘書.pdf",
      pdfPage: 9,
      bookPage: 9,
      section: "水穂伝附言",
      note: "生成鎖の概要",
    },
  },
  {
    id: "KOTODAMA-CORE-IKI-AND-KOTO",
    title: "息＝御霊／言＝吾",
    quote: "息は御霊、言は吾",
    normalized: "息は御霊（いのち）、言は吾（主体）として働く",
    tags: ["iki", "koto", "core"],
    source: {
      doc: "言霊秘書.pdf",
      pdfPage: 9,
      bookPage: 9,
      section: "水穂伝附言",
      note: "息と言の関係",
    },
  },
];

/**
 * 布斗麻通御霊図（例：P13〜）Law セット
 */
export const LAWS_FUTOMANI_P13_MINAKANUSHI: Law[] = [
  {
    id: "KOTODAMA-FUTOMANI-P13-0-AND-NO",
    title: "0母水／ヽ父滴＝御中主",
    quote: "0は母水、ヽは父滴にして天之御中主とす",
    normalized: "0が母水、ヽが父滴であり、その正中が天之御中主（ミナカヌシ）である",
    tags: ["futomani", "symbol", "minakanushi"],
    source: {
      doc: "言霊秘書.pdf",
      pdfPage: 13,
      bookPage: 13,
      section: "布斗麻通御霊図",
      note: "0とヽによる御中主の図解",
    },
  },
  {
    id: "KOTODAMA-FUTOMANI-P13-AME-IS-ROTATION",
    title: "天＝五十連水火の回転",
    quote: "天は五十連水火の回転なり",
    normalized: "天とは五十連の水火が回転する運動である",
    tags: ["futomani", "ame", "rotation"],
    source: {
      doc: "言霊秘書.pdf",
      pdfPage: 13,
      bookPage: 13,
      section: "布斗麻通御霊図",
      note: "天（アメ）の定義",
    },
  },
];

/**
 * 神世七代（形なきいき＝隠身）Law セット
 */
export const LAWS_KAMIYO_NANAYO_CORE: Law[] = [
  {
    id: "KOTODAMA-KAMIYO-NANAYO-FORMLESS-IKI",
    title: "天神七代＝形なきいき＝隠身",
    quote: "天神七代は形なきいき、隠身なり",
    normalized: "天神七代は形を持たないいき（隠身）としての段階を示す",
    tags: ["kamiyo", "nanayo", "iki", "hidden"],
    source: {
      doc: "言霊秘書.pdf",
      pdfPage: 20,
      bookPage: 20,
      section: "神世七代",
      note: "天神七代の性質",
    },
  },
];

/**
 * 言霊の根・体用・操作体系・辞・反転など
 * 「解析アルゴリズム」そのものに関わる核Lawセット
 */
export const LAWS_METHOD_CORE: Law[] = [
  {
    id: "KOTODAMA-CORE-KOTODAMA-PROCESS",
    title: "言霊＝凝→息→言 の生成プロセス",
    quote: "水火凝々として吹き出すをイキコトと曰う、故に一言と曰う",
    normalized:
      "水火が凝り、吹き出すものをイキコトと呼ぶ。言霊は概念ではなく「凝→息→言」という生成プロセスである。",
    tags: ["kotodama", "iki", "koto", "process"],
    source: {
      doc: "言霊秘書.pdf",
      pdfPage: 31,
      bookPage: 31,
      section: "一言の法則",
      note: "言霊の根源定義（凝→息→言）",
    },
  },
  {
    id: "KOTODAMA-CORE-TAIYOU-RELATIVE",
    title: "体用（火水）の相対反転",
    quote: "水は用、火は体とすといえども、物に付て水火にも火水にもなる",
    normalized:
      "水＝用／火＝体といっても、対象と文脈に付いて水火にも火水にも反転する。体用は固定ラベルではなく関係で決まる。",
    tags: ["taiyou", "mizuho", "relative"],
    source: {
      doc: "言霊秘書.pdf",
      pdfPage: 7,
      bookPage: 7,
      section: "水穂伝附言",
      note: "体用が相対的に反転することの説明",
    },
  },
  {
    id: "KOTODAMA-CORE-DECODE-FLOW",
    title: "解読手順：一言法則・延開・省・反約・起言・補言・助言",
    quote:
      "御霊に現れた語は直に一言の法則に合して心を知り、詞に現れたものは詞に延開して心を知る。ラリルレにて助け、現れ有る所を省き、反約し、アイウオにて起こし、シミツにて補う。",
    normalized:
      "御霊に現れた語は一言の法則に合し、詞は延開して心を知る。その際、助言（ラリルレ）、省、反約、起言（アイウオ）、補言（シミツ）を用いて解読する。",
    tags: ["method", "operation", "helpers", "decode"],
    source: {
      doc: "言霊秘書.pdf",
      pdfPage: 35,
      bookPage: 35,
      section: "一言の法則",
      note: "解読手順そのものの記述",
    },
  },
  {
    id: "KOTODAMA-CORE-UNBOUNDED-ENKAI",
    title: "無限延開：詞に延開こと何言と限りなし",
    quote: "詞に延開こと、何言と限はなし",
    normalized: "詞に対する延開は何言と限りがなく、原理的に無限に展開し得る。",
    tags: ["method", "enkai", "fractal"],
    source: {
      doc: "言霊秘書.pdf",
      pdfPage: 35,
      bookPage: 35,
      section: "一言の法則",
      note: "延開の無制限性（フラクタル展開の根拠）",
    },
  },
  {
    id: "KOTODAMA-CORE-OPERATIONS-FOR-HARD-WORDS",
    title: "音義で解けない語への操作（略・転・延・約）",
    quote: "音義にて素直に解けざる語は略・転・延・約の法を用いる",
    normalized:
      "音義で素直に解けない語は、略・転・延・約などの操作を用いて解くこととされる。",
    tags: ["method", "operation"],
    source: {
      doc: "言霊秘書.pdf",
      pdfPage: 36,
      bookPage: 36,
      section: "一言の法則",
      note: "略・転・延・約など補助操作の列挙",
    },
  },
  {
    id: "KOTODAMA-CORE-TENIWOHA",
    title: "辞（テニヲハ）の構文的役割",
    quote: "辞は二言より五言までにて語と詞と綴り始終を結ぶ",
    normalized:
      "辞（テニヲハ）は二〜五言で語と詞を綴り、文の始終を結ぶ連結規則である。",
    tags: ["teniwoha", "grammar", "syntax"],
    source: {
      doc: "言霊秘書.pdf",
      pdfPage: 37,
      bookPage: 37,
      section: "辞",
      note: "辞（テニヲハ）の定義と語・詞の結節点",
    },
  },
  {
    id: "KOTODAMA-CORE-HAN-EXAMPLES",
    title: "反（反転）操作と例",
    quote: "仮名を反にして上下左右を反す。例に近江（アハウミ→アフミ）などあり。",
    normalized:
      "反（反転）の操作は仮名列を反にし、上下・左右を反すことで語義を読む。近江（アハウミ→アフミ）などの具体例が挙げられる。",
    tags: ["operation", "han", "example"],
    source: {
      doc: "言霊秘書.pdf",
      pdfPage: 40,
      bookPage: 40,
      section: "反",
      note: "反の規則と具体例",
    },
  },
];

/**
 * すべての法則を 1 つの配列に統合
 * （章ごとの配列をそのまま後ろに連結）
 */
export const LAWS: Law[] = [
  ...BASE_LAWS,
  ...LAWS_MIZUHO_P6_P10,
  ...LAWS_FUTOMANI_P13_MINAKANUSHI,
  ...LAWS_KAMIYO_NANAYO_CORE,
  ...LAWS_METHOD_CORE,
];

/**
 * 操作（Operation）の説明
 */
export const OPERATION_DESCRIPTIONS: Record<Operation, string> = {
  省: "省略する",
  延開: "延開する",
  反約: "反約する",
  反: "反する",
  約: "約する",
  略: "略する",
  転: "転じる",
};

/**
 * IDで法則を取得
 */
export function getLawById(id: string): Law | undefined {
  return LAWS.find((law) => law.id === id);
}

/**
 * タグで法則を検索
 */
export function getLawsByTag(tag: string): Law[] {
  return LAWS.filter((law) => law.tags.includes(tag));
}

/**
 * すべての法則を取得
 */
export function getAllLaws(): Law[] {
  return LAWS;
}

