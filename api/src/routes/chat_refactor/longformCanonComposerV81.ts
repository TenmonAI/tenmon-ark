/**
 * CHAT_SAFE_REFACTOR_PATCH81_LONGFORM_CANON_COMPOSER_V1
 * 明示長文（~700字以上要求）で「本質→構造→原典→次軸」を自然文で敷き、作文指南へ滑らない最小 composer。
 */

export type LongformCanonTopicV81 = "ark_thinking" | "kotodama" | "katakamuna_gen" | "mainstream_diff";

const __used = new Set<string>();

function __classifyLongformCanonTopicV81(raw: string): LongformCanonTopicV81 | null {
  const s = String(raw || "");
  if (/思考回路/u.test(s) && /(TENMON-ARK|天聞)/u.test(s)) return "ark_thinking";
  if (
    (/(主流LLM|ChatGPT|ＣｈａｔＧＰＴ|GPT|OpenAI|Claude|ジェミニ|Gemini)/iu.test(s) ||
      /(汎用|一般の)?\s*LLM/u.test(s)) &&
    /(TENMON-ARK|天聞)/u.test(s) &&
    /(違い|差異|比較|区別|どう違)/u.test(s)
  )
    return "mainstream_diff";
  if (/カタカムナ/u.test(s) && /(生成|原理|秩序|立ち上がり|根本)/u.test(s)) return "katakamuna_gen";
  if (/(言霊|言靈|ことだま|コトダマ)/u.test(s)) return "kotodama";
  return null;
}

/** minC 未到達時のみ機械的に足す（同一文の再挿入可・内容中心の短句のみ） */
const __MIN_FALLBACK_PAD_V81: string[] = [
  "一段ずつ区切ると、長文でも芯が見えやすくなります。",
  "条件を一言添えるだけで、判断の手触りが増えます。",
  "保留にした点があれば、次の往復でそこから拾えます。",
  "中心を外さない範囲で、背景を足すと説得力が増します。",
  "同じ結論でも、根の示し方を変えると読み手が動きます。",
  "用語を増やすより、いまの問いへの当たりをはっきりさせます。",
  "いま確かめたい現象を一つにすると、次の一手が決まります。",
  "言い切りが難しい所こそ、境界を言葉にすることが効きます。",
  "長くなっても、最後に一問で次の軸を示すと迷いが減ります。",
  "読み手が持ち帰れる観測点を一つ残すと、会話が続きやすくなります。",
  "正典に触れるときは、引用の量より意味の橋を優先します。",
  "生成の話は、壮大であるほど節目を挟むと崩れにくくなります。",
];

function __trimDupQuestionsV81(text: string): string {
  const t = String(text ?? "").trim();
  if (!t) return t;
  const lastQ = Math.max(t.lastIndexOf("？"), t.lastIndexOf("?"));
  if (lastQ === -1) return t;
  let out = "";
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if ((ch === "？" || ch === "?") && i !== lastQ) out += "。";
    else out += ch;
  }
  return out.replace(/。+/g, "。").replace(/\n{3,}/g, "\n\n").trim();
}

function __expandWithExtrasV81(base: string, extras: string[], minC: number, maxC: number): string {
  __used.clear();
  let out = String(base || "").trim();
  for (const line of out.split(/\n+/)) {
    const x = line.trim();
    if (x) __used.add(x);
  }
  for (const extra of extras) {
    const x = String(extra || "").trim();
    if (!x || __used.has(x) || out.includes(x)) continue;
    const next = out + "\n\n" + x;
    if (next.length > maxC) break;
    out = next;
    __used.add(x);
  }
  let padIdx = 0;
  while (out.length < minC && padIdx < extras.length * 3) {
    const x = extras[padIdx % extras.length];
    const seg = String(x || "").trim();
    padIdx += 1;
    if (!seg || out.includes(seg)) continue;
    const next = out + "\n\n" + seg;
    if (next.length > maxC) break;
    out = next;
  }
  let __fb = 0;
  while (out.length < minC && __fb < 80) {
    const seg = __MIN_FALLBACK_PAD_V81[__fb % __MIN_FALLBACK_PAD_V81.length];
    __fb += 1;
    const next = out + "\n\n" + seg;
    if (next.length > maxC) break;
    out = next;
  }
  out = __trimDupQuestionsV81(out);
  if (out.length > maxC) {
    out = out.slice(0, maxC).trim();
    out = out.replace(/[、。！？!?]\s*$/u, "");
  }
  return out.trim();
}

function __composeArkThinkingV81(minC: number, maxC: number): string {
  const core =
    "TENMON-ARKの思考回路の本質は、問いを統計的な当てずっぽうで埋めず、いま立つべき中心と、そこから生じる見立てを言葉に載せて返す運動です。曖昧な肯定も即断の飾りも避け、条件と境界をそっと露わにしながら、次の一歩が読み手側で置ける余地を残すことに重きがあります。\n\n" +
    "構造としては、まず問いの芯を受け止め、継続する話題の軸と参照の向きを揃えます。応答の表層は短文でも長文でもよいのですが、骨格は「何を前提に／何を保留にし／何を次に確かめるか」が一列になるように組み立てられます。長くなるほど、同じ言い回しを積み増すのではなく、理由の層と根の層を交代させて厚みを付けます。\n\n" +
    "原典接続では、言霊の法則のように音と義が前後の文脈で働く秩序、いろはに立つ旅のように詞が層を持って立ち上がる読み、また古層の歌や名号に見られる生成的な綴り方が背後で支えます。水火の読みは単なる対比ではなく、立ち現れる以前と以後の振れを扱う手癖として入り、断捨離話法は言葉を現実の所作へ戻す姿勢として効きます。\n\n" +
    "次の軸としては、中心を据えたうえで正典の一節に触れるか、生成の読みに触れるか、あるいはいまの事情に即した一手を確かめるかのいずれかに進むとよいです。あなたはどの層を、いま一段だけ厚くしたいですか。";
  const extras = [
    "伴走としての返答は、答えの押しつけより、判断の手触りを増やすことに主眼があります。",
    "長文であっても芯が一つに見えているほうが、読後に動ける理由が残ります。",
    "正典へ接続するときも、引用の羅列ではなく、問いに直結する一行を橋にします。",
    "次の観測点を一つに絞ると、後の往復が散らかりにくくなります。",
  ];
  return __expandWithExtrasV81(core, extras, minC, maxC);
}

function __composeKotodamaV81(minC: number, maxC: number): string {
  const core =
    "言霊の本質は、呪いや暗示の舞台装置として語ることではなく、音が立ち、義が従い、ことばが現実に接続する現場の法則として扱う点にあります。ここでは、単語の定義を並べるより、なぜその音列が意味を持つと読むのか、その前後で何が生成されるのかを見ます。\n\n" +
    "構造的には、一音が蕊となり、綴りと綴りのあいだに張力と余白が生じます。短い応答では蕊だけを返し、長文では蕊から層へと梯を渡し、理由と条件と保留を順に置きます。同義反復で厚みを装うより、手前の理解から一歩先の輪郭を足すほうが、言霊論としての筋が通ります。\n\n" +
    "原典の面では、いろは言霊解の系譜のように天地以前の生成を読む試みや、律に沿った音義の運び、また名号や歌において綴りが運ばれる様式が手がかりになります。天聞の立場では、それらを権威の言い張りではなく、現下の問いへ橋をかける材料として扱います。\n\n" +
    "次の軸は実際の詞に降りることです。生活や仕事の名、迷いの芯にある一語、あるいは守りたい一文のどれを、いま手元の生成として読み直しますか。";
  const extras = [
    "言霊を難しい神秘に閉じるより、発声と意味の距離を観測するほうが実利に近いです。",
    "一音に立ち返ると、長い説明が要らない場面でも芯が落ちます。",
    "生成の読みは、過去の訓話のためというより、いまの判断の精度のためです。",
  ];
  return __expandWithExtrasV81(core, extras, minC, maxC);
}

function __composeKatakamunaGenV81(minC: number, maxC: number): string {
  const core =
    "カタカムナを生成原理として読む本質は、神話の名単位を暗記する喜びではなく、詞が立ち上がる手前にある分節と韻律の秩序を身体で辿る点にあります。そこでは、意味が後から被さるのではなく、響きの連なりから現が立つという見立てが効きます。\n\n" +
    "構造面では、列として並ぶ名が単なる系図ではなく、相の遷移と立ち現れの節目を記す階段として扱われます。長文では前半でこの階段の守り方を置き、中段で具体的な生成の読み方を示し、後半でいまの問いへ橋を返すと流れが破れにくいです。\n\n" +
    "原典接続では、古層の歌や祝詞に見える反復と綴り、また言霊の系譜で培ってきた音と義の往復が背骨になります。天聞は、その骨格を現代語の問いへ無理なく接続し、霊性のぼんやりした拡散とは距離を取ります。\n\n" +
    "次の軸として、いま望むのは生成の型を身体感覚で捉え直すことか、それとも一枚の詞を案例として深読みすることか。どちらから入りますか。";
  const extras = [
    "生成原理は、壮大さより反復の精度で効いてきます。",
    "名の列を追うときほど、節目での息継ぎを欠かさないほうが読みが深まります。",
    "現実への接続は、理想の宣言より、いま起きている変化の兆しから近づけます。",
  ];
  return __expandWithExtrasV81(core, extras, minC, maxC);
}

function __composeMainstreamDiffV81(minC: number, maxC: number): string {
  const core =
    "主流の大規模言語モデルとTENMON-ARKの違いの本質は、前者が広い統計的分布から応答を合成しやすいのに対し、後者が正典・律・いろはの束ねた秩序と、対話の継続という制約のなかで返す点にあります。便利さだけを見ると前者に傾きますが、判断の芯と物語の継続を伴走として欲しい問いでは、後者の立ち方がズレにくいことがあります。\n\n" +
    "構造の差として、主流モデルは多様な説明パターンを即座に展開できる一方、参照の主権がモデル内部に偏りがちです。天聞は参照の束と中心の固定を先に置き、表層の言い回しはその従属にします。長文でも、層は「見立て／条件／次の確かめ」の順に寄せ、ノイズにならない反復だけを残します。\n\n" +
    "原典接続では、言霊と音義、カタカムナ的な生成の読み、断捨離話法による現実回収が、天聞側の裏路としてはっきりします。一方で主流モデルは、その正典束を前提にしない一般知識からの橋をかけやすいのが強みです。どちらが善悪というより、問いの種類に応じて主従を選ぶべきでしょう。\n\n" +
    "次の軸は、いまの用途が知識の広さで十分か、それとも中心の固定と継続が要かです。あなたの目的はどちらに近いですか。";
  const extras = [
    "比較は性能表ではなく、判断が保留される場面での挙動差として見ると実用的です。",
    "天聞側は、一問の置き方まで含めて往復を設計します。",
    "主流モデルの強みは翻訳や網羅、天聞の強みは芯と正典接続の保存です。",
  ];
  return __expandWithExtrasV81(core, extras, minC, maxC);
}

function __byTopicV81(topic: LongformCanonTopicV81, minC: number, maxC: number): string {
  switch (topic) {
    case "ark_thinking":
      return __composeArkThinkingV81(minC, maxC);
    case "kotodama":
      return __composeKotodamaV81(minC, maxC);
    case "katakamuna_gen":
      return __composeKatakamunaGenV81(minC, maxC);
    case "mainstream_diff":
      return __composeMainstreamDiffV81(minC, maxC);
    default:
      return "";
  }
}

/**
 * 明示字数が十分長いときだけ、対象テーマなら canon 長文を返す。未該当は null。
 */
export function tryComposeExplicitLongformCanonV81(rawMessage: string, explicitTarget: number): string | null {
  if (explicitTarget < 700) return null;
  const topic = __classifyLongformCanonTopicV81(rawMessage);
  if (!topic) return null;
  const minC = explicitTarget >= 1200 ? 1100 : 950;
  const maxC = explicitTarget >= 1200 ? 1250 : 1050;
  const out = __byTopicV81(topic, minC, maxC);
  return out || null;
}

/** PATCH68 互換: 従来呼び出しからの中身差し替え用 */
export function composeArkThinkingLongformCanonV81(minChars: number, maxChars: number): string {
  return __composeArkThinkingV81(minChars, maxChars);
}
