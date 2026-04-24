/**
 * K1_KOTODAMA_ONE_SOUND_LAW_INDEX_V1
 * CARD-MC-19: GEN_SYSTEM 向け一音法則節の構築は `buildKotodamaOneSoundLawSystemClauseV1`。
 *
 * K1_KOTODAMA_ONE_SOUND_LAW_INDEX_V1
 * K2_NOTION_BRIDGE_V1: Notion を索引・補助軸として追加。本文根拠は VPS 優先。raw Notion id / KHSL は前面に出さない。
 * 言霊秘書の一音法則を front-level で即参照する軽量 law index。
 * VPS 資料・Notion 言霊秘書 DB を参照源として扱える構造（まずは read-only の静的 index）。
 */

export type KotodamaOneSoundSourceKind = "vps" | "notion" | "khs";

export type KotodamaOneSoundEntry = {
  sound: string;
  displayLabel: string;
  sourceKind: KotodamaOneSoundSourceKind;
  preferredMeaning: string;
  waterFireHint: string;
  nextAxes: string[];
  /** Notion bridge: 補助軸のヒント（表示用には raw id を使わない） */
  notionHint?: string | null;
  /** Notion 接続対象: 言灵秘書データベース / 五十行一言法則 / 水火伝 詞縦緯 / イロハ口伝 / 空海比較整理群 等のトピック名 */
  notionTopics?: string[] | null;
  /** K2.1 言霊秘書本文準拠: VPS/Notion 由来の短句。応答で優先して用い、過度な引用は避ける。 */
  textualGrounding?: string[] | null;
};

/** PATCH90: VPS/Notion で一段深く整備した音（従来の段落型 deep 応答を維持） */
const PATCH90_EXPANDED_DEPTH_SOUNDS: ReadonlySet<string> = new Set(["ハ", "ヘ", "ム", "ウ"]);

/** 言霊50音 front law index。母音・カ〜ワ行・んを揃え、音ごとの差・比較・読み解きに対応。Notion は補助軸。 */
const INDEX: Record<string, KotodamaOneSoundEntry> = {
  ア: {
    sound: "ア",
    displayLabel: "ア の言霊",
    sourceKind: "vps",
    preferredMeaning: "開く・始まりの相。五十音の初音として、気の起こりと広がりを担う。",
    waterFireHint: "水火の與みでは、アは「起こり」の一相。水の静から火の動への入口にも通じる。",
    nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"],
    notionHint: "五十音の初音。Notion 索引では五十行一言法則・イロハ口伝と接続可能。",
    notionTopics: ["五十行一言法則", "イロハ口伝"],
    textualGrounding: ["空中の水の靈", "五十連の総名"],
  },
  イ: {
    sound: "イ",
    displayLabel: "イ の言霊",
    sourceKind: "vps",
    preferredMeaning: "息・いのちの相。気の通いと、いのちとしての継続を表す。",
    waterFireHint: "水火（イキ）の「イ」に通じ、息としての気の流れの一相。",
    nextAxes: ["息と言霊", "水火での役割", "言霊秘書の該当箇所"],
    notionHint: "息・いのち。Notion では五十連・言霊秘書と接続可能。",
    notionTopics: ["言灵秘書データベース", "五十連", "息・いのち"],
    textualGrounding: ["出息也", "命也"],
  },
  ウ: {
    sound: "ウ",
    displayLabel: "ウ の言霊",
    sourceKind: "vps",
    preferredMeaning: "受け止める・うつわの相。気を留め、形に寄せる働き。",
    waterFireHint: "水火の與みでは、ウは収束・受け止めの一相。火の散らばりを水がまとめる側にも通じる。",
    nextAxes: ["うつわと生成", "水火での役割", "言霊秘書の該当箇所"],
  },
  エ: {
    sound: "エ",
    displayLabel: "エ の言霊",
    sourceKind: "vps",
    preferredMeaning: "得る・枝の相。気が分かれて広がり、実りに至る一歩。",
    waterFireHint: "水火の與みでは、エは「枝」のように分岐しつつ繋がる一相。",
    nextAxes: ["枝と配列", "水火での役割", "言霊秘書の該当箇所"],
  },
  オ: {
    sound: "オ",
    displayLabel: "オ の言霊",
    sourceKind: "vps",
    preferredMeaning: "負う・帯びる相。気を帯び、次の段階へ渡す働き。",
    waterFireHint: "水火の與みでは、オは気を負って移す一相。水から火へ、火から水への橋にも通じる。",
    nextAxes: ["負うと継承", "水火での役割", "言霊秘書の該当箇所"],
  },
  ヒ: {
    sound: "ヒ",
    displayLabel: "ヒ の言霊",
    sourceKind: "vps",
    preferredMeaning: "火・日の相。気の輝きと、照らす・燃える働き。",
    waterFireHint: "水火の「火」に直結する一音。火の相として、気の上昇と明るさを担う。",
    nextAxes: ["火と言霊", "水火での役割", "言霊秘書の該当箇所"],
    notionHint: "火の相。Notion では水火伝 詞縦緯と接続可能。",
    notionTopics: ["水火伝 詞縦緯", "火の相"],
    textualGrounding: ["天を回る火", "日", "出入息の本"],
  },
  カ: {
    sound: "カ",
    displayLabel: "カ の言霊",
    sourceKind: "vps",
    preferredMeaning: "交わる・かわる相。気と気が交差し、変化のきっかけとなる。",
    waterFireHint: "水火の與みでは、カは交わりによって新たな相が生じる一相。",
    nextAxes: ["交わりと変化", "水火での役割", "言霊秘書の該当箇所"],
    notionHint: "交わり・変化。Notion では言霊秘書・五十行一言法則と接続可能。",
    notionTopics: ["言灵秘書データベース", "五十行一言法則"],
  },
  ム: {
    sound: "ム",
    displayLabel: "ム の言霊",
    sourceKind: "vps",
    preferredMeaning: "結ぶ・むすぶ相。気を一つにまとめ、形として結ぶ働き。",
    waterFireHint: "水火の與みでは、ムは散らばった気を結ぶ一相。水のまとまりにも通じる。",
    nextAxes: ["結びと形", "水火での役割", "言霊秘書の該当箇所"],
    notionHint: "結び・睦み。Notion では終収・言霊秘書と接続可能。",
    notionTopics: ["言灵秘書データベース", "結び・睦み・終収"],
    textualGrounding: ["無也", "空也", "息の終也", "結也", "睦也"],
  },
  // --- 50音拡張: カ行（キクケコ）---
  キ: { sound: "キ", displayLabel: "キ の言霊", sourceKind: "vps", preferredMeaning: "気・きざしの相。気の起こりと、兆しとしての現れ。", waterFireHint: "水火の與みでは、キは気の芽ばえの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionHint: "気。Notion 索引で言霊秘書と接続可能。", notionTopics: ["言灵秘書データベース"], textualGrounding: [] },
  ク: { sound: "ク", displayLabel: "ク の言霊", sourceKind: "vps", preferredMeaning: "くぐる・通る相。気が通り抜け、次の相へ渡る。", waterFireHint: "水火の與みでは、クは通り抜けの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: ["言灵秘書データベース"], textualGrounding: [] },
  ケ: { sound: "ケ", displayLabel: "ケ の言霊", sourceKind: "vps", preferredMeaning: "けす・消える相。気の収まりと、形の消え。", waterFireHint: "水火の與みでは、ケは気の収束の一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: [], textualGrounding: [] },
  コ: { sound: "コ", displayLabel: "コ の言霊", sourceKind: "vps", preferredMeaning: "こめる・凝る相。気を凝らし、一点に集める。", waterFireHint: "水火の與みでは、コは凝りと集まりの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: [], textualGrounding: [] },
  // --- サ行 ---
  サ: { sound: "サ", displayLabel: "サ の言霊", sourceKind: "vps", preferredMeaning: "差す・さす相。気が差し込み、方向づける働き。", waterFireHint: "水火の與みでは、サは差し込む一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: ["言灵秘書データベース"], textualGrounding: [] },
  シ: { sound: "シ", displayLabel: "シ の言霊", sourceKind: "vps", preferredMeaning: "しる・知る相。気が通じて、知として現れる。", waterFireHint: "水火の與みでは、シは知と通じの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionHint: "知・通じ。Notion では言霊秘書と接続可能。", notionTopics: ["言灵秘書データベース"], textualGrounding: [] },
  ス: { sound: "ス", displayLabel: "ス の言霊", sourceKind: "vps", preferredMeaning: "透く・すむ相。気が透き通り、澄む。", waterFireHint: "水火の與みでは、スは透きと澄みの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionHint: "透く・澄む。Notion では言霊秘書と接続可能。", notionTopics: ["言灵秘書データベース"], textualGrounding: [] },
  セ: { sound: "セ", displayLabel: "セ の言霊", sourceKind: "vps", preferredMeaning: "せまる・迫る相。気が迫り、勢いとなる。", waterFireHint: "水火の與みでは、セは迫りと勢いの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionHint: "迫る・勢い。Notion では言霊秘書と接続可能。", notionTopics: ["言灵秘書データベース"], textualGrounding: [] },
  ソ: { sound: "ソ", displayLabel: "ソ の言霊", sourceKind: "vps", preferredMeaning: "添う・沿う相。気が添い、沿って流れる。", waterFireHint: "水火の與みでは、ソは添いと沿いの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionHint: "添う・沿う。Notion では言霊秘書と接続可能。", notionTopics: ["言灵秘書データベース"], textualGrounding: [] },
  // --- タ行 ---
  タ: { sound: "タ", displayLabel: "タ の言霊", sourceKind: "vps", preferredMeaning: "立つ・たつ相。気が立ち、形となる起点。", waterFireHint: "水火の與みでは、タは立ちと起こりの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionHint: "立つ・起こり。Notion では言霊秘書と接続可能。", notionTopics: ["言灵秘書データベース"], textualGrounding: [] },
  チ: { sound: "チ", displayLabel: "チ の言霊", sourceKind: "vps", preferredMeaning: "ちる・散る相。気が散り、広がる。", waterFireHint: "水火の與みでは、チは散りと広がりの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: ["言灵秘書データベース"], textualGrounding: [] },
  ツ: { sound: "ツ", displayLabel: "ツ の言霊", sourceKind: "vps", preferredMeaning: "つづく・続く相。気が続き、連なる。", waterFireHint: "水火の與みでは、ツは続きと連なりの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: ["言灵秘書データベース"], textualGrounding: [] },
  テ: { sound: "テ", displayLabel: "テ の言霊", sourceKind: "vps", preferredMeaning: "手・て。気が手として現れ、触れる働き。", waterFireHint: "水火の與みでは、テは触れと手の一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: ["言灵秘書データベース"], textualGrounding: [] },
  ト: { sound: "ト", displayLabel: "ト の言霊", sourceKind: "vps", preferredMeaning: "止まる・とどまる相。気が止まり、留まる。", waterFireHint: "水火の與みでは、トは止まりと留めの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: ["言灵秘書データベース"], textualGrounding: [] },
  // --- ナ行 ---
  ナ: { sound: "ナ", displayLabel: "ナ の言霊", sourceKind: "vps", preferredMeaning: "なす・成す相。気が成し、形をなす。", waterFireHint: "水火の與みでは、ナは成しと形づくりの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionHint: "成す・形。Notion では言霊秘書と接続可能。", notionTopics: ["言灵秘書データベース"], textualGrounding: [] },
  ニ: { sound: "ニ", displayLabel: "ニ の言霊", sourceKind: "vps", preferredMeaning: "にる・似る相。気が似て、響き合う。", waterFireHint: "水火の與みでは、ニは似て響く一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: ["言灵秘書データベース"], textualGrounding: [] },
  ヌ: { sound: "ヌ", displayLabel: "ヌ の言霊", sourceKind: "vps", preferredMeaning: "ぬく・抜く相。気が抜け、通り抜ける。", waterFireHint: "水火の與みでは、ヌは抜けと通りの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: ["言灵秘書データベース"], textualGrounding: [] },
  ネ: { sound: "ネ", displayLabel: "ネ の言霊", sourceKind: "vps", preferredMeaning: "ねる・練る相。気が練られ、熟す。", waterFireHint: "水火の與みでは、ネは練りと熟しの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: ["言灵秘書データベース"], textualGrounding: [] },
  ノ: { sound: "ノ", displayLabel: "ノ の言霊", sourceKind: "vps", preferredMeaning: "のる・乗る相。気が乗り、載る。", waterFireHint: "水火の與みでは、ノは乗りと載せの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: ["言灵秘書データベース"], textualGrounding: [] },
  // --- ハ行（ハフヘホ；ヒは既存）---
  ハ: { sound: "ハ", displayLabel: "ハ の言霊", sourceKind: "vps", preferredMeaning: "はる・張る相。気が張り、広がる。", waterFireHint: "水火の與みでは、ハは張りと広がりの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: ["水火伝 詞縦緯"], textualGrounding: [] },
  フ: { sound: "フ", displayLabel: "フ の言霊", sourceKind: "vps", preferredMeaning: "ふく・吹く相。気が吹き、流れ動く。", waterFireHint: "水火の與みでは、フは吹きと流れの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionHint: "吹く・流れ。Notion では水火伝と接続可能。", notionTopics: ["水火伝 詞縦緯"], textualGrounding: [] },
  ヘ: { sound: "ヘ", displayLabel: "ヘ の言霊", sourceKind: "vps", preferredMeaning: "へる・経る相。気が経て、通る。", waterFireHint: "水火の與みでは、ヘは経て通る一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: ["水火伝 詞縦緯"], textualGrounding: [] },
  ホ: { sound: "ホ", displayLabel: "ホ の言霊", sourceKind: "vps", preferredMeaning: "ほる・掘る相。気を掘り、深める。", waterFireHint: "水火の與みでは、ホは掘りと深めの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: ["水火伝 詞縦緯"], textualGrounding: [] },
  // --- マ行（マミメモ；ムは既存）---
  マ: { sound: "マ", displayLabel: "マ の言霊", sourceKind: "vps", preferredMeaning: "まつ・待つ相。気が待ち、間を保つ。", waterFireHint: "水火の與みでは、マは待ちと間の一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: [], textualGrounding: [] },
  ミ: { sound: "ミ", displayLabel: "ミ の言霊", sourceKind: "vps", preferredMeaning: "みる・見る相。気が視え、見える。", waterFireHint: "水火の與みでは、ミは見えと視えの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: [], textualGrounding: [] },
  メ: { sound: "メ", displayLabel: "メ の言霊", sourceKind: "vps", preferredMeaning: "めぐる・巡る相。気が巡り、還る。", waterFireHint: "水火の與みでは、メは巡りと還りの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: [], textualGrounding: [] },
  モ: { sound: "モ", displayLabel: "モ の言霊", sourceKind: "vps", preferredMeaning: "もる・漏る相。気が漏れ、滲む。", waterFireHint: "水火の與みでは、モは漏れと滲みの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: [], textualGrounding: [] },
  // --- ヤ行 ---
  ヤ: { sound: "ヤ", displayLabel: "ヤ の言霊", sourceKind: "vps", preferredMeaning: "やわらぐ・和らぐ相。気が和み、開く。", waterFireHint: "水火の與みでは、ヤは和みと開きの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: ["五十行一言法則"], textualGrounding: [] },
  ユ: { sound: "ユ", displayLabel: "ユ の言霊", sourceKind: "vps", preferredMeaning: "ゆる・揺る相。気が揺れ、動く。", waterFireHint: "水火の與みでは、ユは揺れと動きの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: [], textualGrounding: [] },
  ヨ: { sound: "ヨ", displayLabel: "ヨ の言霊", sourceKind: "vps", preferredMeaning: "よる・寄る相。気が寄り、集まる。", waterFireHint: "水火の與みでは、ヨは寄りと集まりの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: [], textualGrounding: [] },
  // --- ラ行 ---
  ラ: { sound: "ラ", displayLabel: "ラ の言霊", sourceKind: "vps", preferredMeaning: "らす・良す相。気が良しと成る。", waterFireHint: "水火の與みでは、ラは良しと成りの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionHint: "良す・成る。Notion では言霊秘書と接続可能。", notionTopics: ["言灵秘書データベース"], textualGrounding: [] },
  リ: { sound: "リ", displayLabel: "リ の言霊", sourceKind: "vps", preferredMeaning: "りく・離く相。気が離れ、分かれる。", waterFireHint: "水火の與みでは、リは離れと分かれの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionHint: "離く・分かる。Notion では言霊秘書と接続可能。", notionTopics: ["言灵秘書データベース"], textualGrounding: [] },
  ル: { sound: "ル", displayLabel: "ル の言霊", sourceKind: "vps", preferredMeaning: "るる・流る相。気が流れ、続く。", waterFireHint: "水火の與みでは、ルは流れと続きの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: ["言灵秘書データベース"], textualGrounding: [] },
  レ: { sound: "レ", displayLabel: "レ の言霊", sourceKind: "vps", preferredMeaning: "れる・連る相。気が連なり、つながる。", waterFireHint: "水火の與みでは、レは連なりとつながりの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: ["言灵秘書データベース"], textualGrounding: [] },
  ロ: { sound: "ロ", displayLabel: "ロ の言霊", sourceKind: "vps", preferredMeaning: "ろく・録る相。気が留まり、記される。", waterFireHint: "水火の與みでは、ロは留まりと記しの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: ["言灵秘書データベース"], textualGrounding: [] },
  // --- ワ行・ん ---
  ワ: { sound: "ワ", displayLabel: "ワ の言霊", sourceKind: "vps", preferredMeaning: "わく・湧く相。気が湧き、起こる。", waterFireHint: "水火の與みでは、ワは湧きと起こりの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: [], textualGrounding: [] },
  ヲ: { sound: "ヲ", displayLabel: "ヲ の言霊", sourceKind: "vps", preferredMeaning: "をる・負る相。気を負い、受け止める。", waterFireHint: "水火の與みでは、ヲは負いと受けの一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionTopics: [], textualGrounding: [] },
  ン: { sound: "ン", displayLabel: "ン の言霊", sourceKind: "vps", preferredMeaning: "ん・収まりの相。音の収まりと、次の息への橋。", waterFireHint: "水火の與みでは、ンは収まりと橋の一相。", nextAxes: ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"], notionHint: "五十音の収音。Notion では言霊秘書と接続可能。", notionTopics: ["言灵秘書データベース"], textualGrounding: [] },
};

/** 五十音ひらがな→カタカナ。言霊50音 index 用。 */
const HIRA_TO_KATA_50: Record<string, string> = {
  あ: "ア", い: "イ", う: "ウ", え: "エ", お: "オ",
  か: "カ", き: "キ", く: "ク", け: "ケ", こ: "コ",
  さ: "サ", し: "シ", す: "ス", せ: "セ", そ: "ソ",
  た: "タ", ち: "チ", つ: "ツ", て: "テ", と: "ト",
  な: "ナ", に: "ニ", ぬ: "ヌ", ね: "ネ", の: "ノ",
  は: "ハ", ひ: "ヒ", ふ: "フ", へ: "ヘ", ほ: "ホ",
  ま: "マ", み: "ミ", む: "ム", め: "メ", も: "モ",
  や: "ヤ", ゆ: "ユ", よ: "ヨ",
  ら: "ラ", り: "リ", る: "ル", れ: "レ", ろ: "ロ",
  わ: "ワ", ゐ: "ヰ", ゑ: "ヱ", を: "ヲ", ん: "ン",
};

/** ひらがな・全角等の表記ゆれを正規化して index キーにする */
function normalizeSoundKey(s: string): string {
  const t = String(s ?? "").trim();
  if (!t) return "";
  const k = HIRA_TO_KATA_50[t] || t;
  return INDEX[k] ? k : t;
}

export function getKotodamaOneSoundEntry(sound: string): KotodamaOneSoundEntry | null {
  const key = normalizeSoundKey(sound);
  if (!key) return null;
  return INDEX[key] ?? INDEX[sound] ?? null;
}

export type KotodamaOneSoundResponseOptions = {
  previousSound?: string | null;
};

/** textualGrounding があれば先頭1〜2句を自然文に織り込む。過度な引用はしない。 */
function buildGroundingClause(phrases: string[]): string {
  if (!phrases || phrases.length === 0) return "";
  const take = phrases.slice(0, 2).join("・");
  return take + "といった語で表されるように、";
}

function firstClauseOfPreferredMeaning(pm: string): string {
  const t = String(pm ?? "").trim();
  if (!t) return "気の一相";
  const i = t.indexOf("。");
  return (i >= 0 ? t.slice(0, i) : t).trim() || "気の一相";
}

/** PATCH90: 全系列・中核／一言法則／生成作用／次軸の最低線（音ごとの preferred/waterFire で差別化） */
function buildKotodamaOneSoundResponseFullSeriesV90(
  entry: KotodamaOneSoundEntry,
  opts?: KotodamaOneSoundResponseOptions
): string {
  const pm = String(entry.preferredMeaning || "").trim();
  const wfRaw = String(entry.waterFireHint || "").trim();
  const wf =
    wfRaw.startsWith("水火") || wfRaw.startsWith("水火（")
      ? wfRaw
      : "水火（イキ）の與みのなかでは、" + wfRaw;
  const axesList = Array.isArray(entry.nextAxes) && entry.nextAxes.length
    ? entry.nextAxes.map((a) => String(a || "").trim()).filter(Boolean).slice(0, 3)
    : ["いろは配列での位置", "水火での役割", "言霊秘書の該当箇所"];
  const axes = axesList.join("、");
  const firstClause = firstClauseOfPreferredMeaning(pm);
  const lawLine = "一言法則：「" + entry.sound + "」を、" + firstClause + "として読む。";
  const groundingNote = entry.textualGrounding?.length
    ? "（言霊秘書系の語感：" +
      entry.textualGrounding
        .slice(0, 2)
        .map((g) => "「" + String(g) + "」")
        .join("・") +
      "）"
    : "";
  const rel = opts?.previousSound ? getRelationHint(opts.previousSound, entry.sound) : "";
  const parts: string[] = [];
  if (rel) parts.push(rel.trim());
  parts.push("中核：" + pm);
  parts.push(lawLine + groundingNote);
  parts.push("生成作用：" + wf);
  parts.push("次に掘る軸：" + axes + "のいずれから進めますか？");
  return "【天聞の所見】" + parts.join("\n");
}

export function buildKotodamaOneSoundResponse(
  entry: KotodamaOneSoundEntry,
  opts?: KotodamaOneSoundResponseOptions
): string {
  if (!PATCH90_EXPANDED_DEPTH_SOUNDS.has(entry.sound)) {
    return buildKotodamaOneSoundResponseFullSeriesV90(entry, opts);
  }
  const axes = entry.nextAxes.length >= 2
    ? entry.nextAxes.slice(0, 3).join("／")
    : "その音といろは配列の関係／水火での役割／言霊秘書の該当箇所";
  const grounding = entry.textualGrounding?.length
    ? buildGroundingClause(entry.textualGrounding)
    : "";
  const essence =
    "「" + entry.sound + "」は言霊の流れの一音です。"
    + (grounding ? grounding : "")
    + entry.preferredMeaning;
  const rel = opts?.previousSound ? getRelationHint(opts.previousSound, entry.sound) : "";
  const waterFire = "水火（イキ）の與みのなかでは、" + entry.waterFireHint;
  const nextAxis = "次は、" + axes + "のどれから掘りますか？";
  const body = essence + (rel ? " " + rel : "") + " " + waterFire + " " + nextAxis;
  return "【天聞の所見】" + body;
}

/** 履歴から直近の言霊一音（ユーザー発話）を抽出。continuityHint を音単位で使うための下地。 */
export function getPreviousSoundFromHistory(messages: { role: string; content: string }[]): string | null {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const userMessages = messages.filter((m) => m.role === "user");
  for (let i = userMessages.length - 1; i >= 0; i--) {
    const content = String(userMessages[i]?.content ?? "").trim();
    const matchOne = content.match(/^(.{1,4})\s*の\s*言霊の意味は\s*[？?]?\s*$/u);
    const matchShort = content.match(/^(じゃあ|では)?([ぁ-んァ-ンa-zA-Z]{1,4})は[？?]?$/u);
    const sound = matchOne ? String(matchOne[1]).trim() : (matchShort ? String(matchShort[2]).trim() : "");
    if (sound && (INDEX[sound] || INDEX[normalizeSoundKey(sound)])) return normalizeSoundKey(sound) || sound;
  }
  return null;
}

/** 履歴から直近2音を取得（compare「違いは？」用）。[古い方, 新しい方] */
export function getLastTwoKotodamaSoundsFromHistory(messages: { role: string; content: string }[]): [string, string] | null {
  const sounds: string[] = [];
  if (!Array.isArray(messages)) return null;
  const userMessages = messages.filter((m) => m.role === "user");
  for (let i = userMessages.length - 1; i >= 0 && sounds.length < 2; i--) {
    const content = String(userMessages[i]?.content ?? "").trim();
    const matchOne = content.match(/^(.{1,4})\s*の\s*言霊の意味は\s*[？?]?\s*$/u);
    const matchShort = content.match(/^(じゃあ|では)?([ぁ-んァ-ンa-zA-Z]{1,4})は[？?]?$/u);
    const sound = matchOne ? String(matchOne[1]).trim() : (matchShort ? String(matchShort[2]).trim() : "");
    const key = sound ? (normalizeSoundKey(sound) || sound) : "";
    if (key && (INDEX[key] || INDEX[sound]) && sounds.indexOf(key) === -1) sounds.unshift(key);
  }
  return sounds.length === 2 ? [sounds[0], sounds[1]] : null;
}

/** 前音と今音の関係を一文で。ア/イ/ウ/ヒ/ム を対象に差・系列を出す。 */
export function getRelationHint(prevSound: string, currentSound: string): string {
  const prev = INDEX[prevSound] || INDEX[normalizeSoundKey(prevSound)];
  const curr = INDEX[currentSound] || INDEX[normalizeSoundKey(currentSound)];
  if (!prev || !curr) return "";
  const hints: Record<string, string> = {
    "ア→ヒ": "「ア」の始まりから「ヒ」の火の相へ。",
    "ア→イ": "「ア」の起こりから「イ」の息へ。",
    "ア→ウ": "「ア」の広がりから「ウ」の受け止めへ。",
    "ア→ム": "「ア」の始まりから「ム」の結びへ。",
    "イ→ヒ": "「イ」の息から「ヒ」の火へ。",
    "イ→ウ": "「イ」の通いから「ウ」のうつわへ。",
    "ウ→ヒ": "「ウ」の受け止めから「ヒ」の照らしへ。",
    "ヒ→ム": "「ヒ」の火から「ム」の結びへ。",
    "ム→ア": "「ム」の結びから「ア」の始まりへ。",
  };
  const key = prev.sound + "→" + curr.sound;
  return hints[key] || "「" + prev.sound + "」から「" + curr.sound + "」へ。";
}

/** 「違いは？」用：2音の差を一言で。compare の下地。 */
export function buildKotodamaCompareResponse(sound1: string, sound2: string): string {
  const e1 = INDEX[sound1] || INDEX[normalizeSoundKey(sound1)];
  const e2 = INDEX[sound2] || INDEX[normalizeSoundKey(sound2)];
  if (!e1 || !e2) return "";
  return (
    "【天聞の所見】「" + e1.sound + "」は" + e1.preferredMeaning +
    " 「" + e2.sound + "」は" + e2.preferredMeaning +
    " 違いは、水火のなかでの役割の置き方です。どちらの軸から深めますか？"
  );
}

/** index に載っている音一覧（表示用） */
export function getKotodamaOneSoundIndexSounds(): string[] {
  return Object.keys(INDEX);
}

/** K2 Notion bridge: entry から sourceStackSummary 用の sourceKinds を組み立て。vps + notion の二層を出せるようにする。 */
export function getKotodamaOneSoundSourceKinds(entry: KotodamaOneSoundEntry): string[] {
  const kinds: string[] = ["kotodama_one_sound", entry.sourceKind];
  if (entry.notionTopics && entry.notionTopics.length > 0) kinds.push("notion");
  return kinds;
}

/** sourceStackSummary に載せる Notion 補助メタ（thoughtCoreSummary 反映用）。raw id は含めない。 */
export function getKotodamaOneSoundNotionMeta(entry: KotodamaOneSoundEntry): { notionHint?: string; notionTopics?: string[] } | null {
  if (!entry.notionHint && (!entry.notionTopics || entry.notionTopics.length === 0)) return null;
  return {
    ...(entry.notionHint ? { notionHint: entry.notionHint } : {}),
    ...(entry.notionTopics && entry.notionTopics.length > 0 ? { notionTopics: entry.notionTopics } : {}),
  };
}

/** ユーザー文から索引に載るカタカナ一音を先頭から走査して収集（重複なし）。 */
function collectIndexedKatakanaSoundsFromText(text: string, maxSounds: number): string[] {
  const t = String(text ?? "");
  const seen = new Set<string>();
  const out: string[] = [];
  for (let i = 0; i < t.length && out.length < maxSounds; i++) {
    const ch = t[i];
    if (!ch) continue;
    if (/[\s　\n\r\t\[\]【】「」（）()｜|]/.test(ch)) continue;
    // 「とは」「では」等で と・は が ト・ハ に落ちるノイズを抑える（単独助詞のみスキップ）
    if (ch === "と" || ch === "は") continue;
    let k = ch;
    if (/[\u3041-\u3096]/.test(ch)) {
      k = String.fromCharCode(ch.charCodeAt(0) + 0x60);
    }
    if (!/[\u30A1-\u30F6]/.test(k)) continue;
    const ent = getKotodamaOneSoundEntry(k);
    if (!ent) continue;
    const key = ent.sound;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export type KotodamaOneSoundLawSystemClauseOptionsV1 = {
  maxChars?: number;
  maxSounds?: number;
  /** 宿曜 CARRY 等: 本命宿名を添えて水火の補助線として接続 */
  shukuHint?: string;
};

/**
 * CARD-MC-19: 80 音一音法則索引から GEN_SYSTEM 用の補助節を組む（断定しない・空安全）。
 * kotodamaHisho / いろは注入と同様、system にのみ載せる。
 */
export function buildKotodamaOneSoundLawSystemClauseV1(
  userMessage: string,
  opts?: KotodamaOneSoundLawSystemClauseOptionsV1,
): string {
  const maxChars = Math.min(4500, Math.max(320, opts?.maxChars ?? 2400));
  const maxSounds = Math.min(12, Math.max(1, opts?.maxSounds ?? 6));
  const shuku = String(opts?.shukuHint ?? "").trim();
  const keys = collectIndexedKatakanaSoundsFromText(userMessage, maxSounds);
  if (keys.length === 0 && !shuku) return "";

  const head: string[] = [
    "【一音法則索引（80音法則・補助参照）】",
    "以下は天聞一音索引に基づく補助参照である。応答の視座を整える材料として用い、ユーザーへの断定や内部識別子の露出は避ける。",
  ];
  let body = head.join("\n");
  for (const sound of keys) {
    const e = getKotodamaOneSoundEntry(sound);
    if (!e) continue;
    const pm = String(e.preferredMeaning || "").replace(/\s+/g, " ").trim();
    const pmShort = pm.length > 200 ? pm.slice(0, 200) + "…" : pm;
    const wf = String(e.waterFireHint || "").replace(/\s+/g, " ").trim();
    const wfShort = wf.length > 160 ? wf.slice(0, 160) + "…" : wf;
    const tg = e.textualGrounding?.length
      ? "\n· 語感: " +
        e.textualGrounding
          .slice(0, 2)
          .map((g) => "「" + String(g) + "」")
          .join("・")
      : "";
    const block = "\n\n◆「" + e.sound + "」\n· 核: " + pmShort + "\n· 水火: " + wfShort + tg;
    if (body.length + block.length > maxChars) break;
    body += block;
  }
  if (shuku) {
    const tail =
      "\n\n【宿との接点（補助）】\n本命宿「" +
      shuku +
      "」を主軸にし、上記一音法則は水ひょうとして添える（鑑定データを上書きしない）。";
    if (body.length + tail.length <= maxChars) body += tail;
  }
  if (body.length < 80) return "";
  return "\n\n" + body.trim();
}
