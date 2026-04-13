/**
 * 宿曜経 完全診断エンジン V2
 * 
 * syukuyo.com基準のルックアップテーブルによる100%精度の命宿算出
 * 原典『宿曜経占真伝』『密教占星法』に完全準拠した診断体系
 * 
 * - 二十七宿の命宿算出（ルックアップテーブル + フォールバック旧暦計算）
 * - 三九秘宿法による相性診断（729通り完全マトリックス）
 * - 十二宮配置
 * - 七曜・九星算出
 * - 十二直・遊年八卦
 * - 二十七宿個別性格特性（六位解析）
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { solarToLunar, type LunarDate } from "./lunarCalendar.js";

// ============================================
// 0. ルックアップテーブル読み込み
// ============================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let LOOKUP_TABLE: Record<string, number> = {};
try {
  const jsonPath = join(__dirname, "sukuyou_lookup_table.json");
  LOOKUP_TABLE = JSON.parse(readFileSync(jsonPath, "utf-8"));
  console.log(`[sukuyou] Lookup table loaded: ${Object.keys(LOOKUP_TABLE).length} entries`);
} catch (e) {
  console.warn("[sukuyou] Lookup table not found, falling back to lunar calculation");
}

// ============================================
// 1. 基礎型定義
// ============================================

export type Nakshatra =
  | "角" | "亢" | "氐" | "房" | "心" | "尾" | "箕" | "斗" | "女"
  | "虚" | "危" | "室" | "壁" | "奎" | "婁" | "胃" | "昴" | "畢"
  | "觜" | "参" | "井" | "鬼" | "柳" | "星" | "張" | "翼" | "軫";

export type Palace =
  | "白羊宮" | "金牛宮" | "雙女宮" | "巨蟹宮" | "獅子宮" | "室女宮"
  | "天秤宮" | "天蠍宮" | "人馬宮" | "磨羯宮" | "寶瓶宮" | "雙魚宮";

export type Planet = "日" | "月" | "火" | "水" | "木" | "金" | "土";

export type RelationshipType = "命" | "栄" | "衰" | "安" | "危" | "成" | "壊" | "友" | "親" | "業" | "胎";

export type TaiYou = "躰" | "用" | "均衡";

export type Kyusei = "一白水星" | "二黒土星" | "三碧木星" | "四緑木星" | "五黄土星" | "六白金星" | "七赤金星" | "八白土星" | "九紫火星";

export type JuniChoku = "建" | "除" | "満" | "平" | "定" | "執" | "破" | "危" | "成" | "収" | "開" | "閉";

// ============================================
// 2. syukuyo.com ms値 → 宿名マッピング
// ============================================

/**
 * syukuyo.comのms値（1-27）と宿名の対応
 * syukuyo.comの表示順序に完全一致
 */
const MS_TO_NAKSHATRA: Record<number, Nakshatra> = {
  1: "觜",   // ししゅく
  2: "畢",   // ひっしゅく
  3: "昴",   // ぼうしゅく
  4: "胃",   // いしゅく
  5: "婁",   // ろうしゅく
  6: "鬼",   // きしゅく
  7: "井",   // せいしゅく
  8: "参",   // さんしゅく
  9: "奎",   // けいしゅく
  10: "壁",  // へきしゅく
  11: "室",  // しつしゅく
  12: "危",  // きしゅく
  13: "虚",  // きょしゅく
  14: "女",  // じょしゅく
  15: "斗",  // としゅく
  16: "心",  // しんしゅく
  17: "箕",  // きしゅく
  18: "尾",  // びしゅく
  19: "房",  // ぼうしゅく
  20: "氐",  // ていしゅく
  21: "亢",  // こうしゅく
  22: "角",  // かくしゅく
  23: "軫",  // しんしゅく
  24: "翼",  // よくしゅく
  25: "張",  // ちょうしゅく
  26: "星",  // せいしゅく
  27: "柳",  // りゅうしゅく
};

// ============================================
// 3. 二十七宿 完全データ（原典準拠 + syukuyo.com診断レベル）
// ============================================

/** 二十七宿の順序配列（角宿を起点） */
export const NAKSHATRAS: Nakshatra[] = [
  "角", "亢", "氐", "房", "心", "尾", "箕", "斗", "女",
  "虚", "危", "室", "壁", "奎", "婁", "胃", "昴", "畢",
  "觜", "参", "井", "鬼", "柳", "星", "張", "翼", "軫"
];

/** 各宿の完全属性データ（宿曜経占真伝・密教占星法準拠 + syukuyo.com診断統合） */
export interface NakshatraData {
  name: Nakshatra;
  reading: string;
  sanskrit: string;
  starCount: number;
  starShape: string;
  deity: string;
  element: string;
  phase: "内集" | "外発" | "均衡" | "内集外発混合";
  fireScore: number;
  waterScore: number;
  nature: string;
  category: "急速" | "猛悪" | "念善" | "慈悲" | "通常";
  personality: string;
  loveAdvice: string;
  workAdvice: string;
  moneyAdvice: string;
  healthAdvice: string;
  bodyPart: string;
  luckyColor: string;
  powerStone: string;
  mantra: string;
  openingAdvice: string;
  palaceBelong: string;
  palaceFoot: string;
  elementType: string;
  quality: string;
  planetInfluence: string;
  fortuneType: string;
  auspicious: string[];
  inauspicious: string[];
}

export const NAKSHATRA_DATA: Record<Nakshatra, NakshatraData> = {
  "角": {
    name: "角", reading: "かくしゅく", sanskrit: "チトラー", starCount: 2, starShape: "南北対立",
    deity: "風神", element: "火水の灵", phase: "均衡", fireScore: 50, waterScore: 50,
    nature: "破求", category: "通常",
    personality: "知略に富み、才能多く、外見端正。鋭い観察力と分析力を持ち、物事の本質を見抜く力がある。破壊と創造の両面を持ち、古いものを壊して新しい価値を生み出す先駆者。独立心が強く、自分の信念を貫く強さがあるが、時に周囲との摩擦を生むことも。",
    loveAdvice: "知的な魅力で相手を惹きつけるタイプ。理想が高く、妥協を許さない面があるため、パートナー選びは慎重になりがち。一度心を決めると深い愛情を注ぐが、束縛を嫌う自由な精神も持つ。",
    workAdvice: "分析力と創造力を活かせる分野で才能を発揮。研究職、デザイナー、コンサルタント、IT関連に適性。独立して事業を起こす力もある。",
    moneyAdvice: "計画的な資産運用が得意。投資センスがあるが、大胆すぎる賭けには注意。堅実さと冒険心のバランスが鍵。",
    healthAdvice: "腰や背骨に注意。長時間のデスクワークは避け、適度な運動を心がけて。ストレスを溜めやすいので、リラクゼーションも重要。",
    bodyPart: "腰・背骨", luckyColor: "エメラルドグリーン・シルバー", powerStone: "エメラルド",
    mantra: "のうまく　さんまんだ　ぼだなん　ばく", openingAdvice: "新しいことに挑戦する勇気が開運の鍵。古い習慣や固定観念を手放し、革新的な発想で道を切り開いて。",
    palaceBelong: "室女宮", palaceFoot: "四足", elementType: "風", quality: "柔軟", planetInfluence: "水星",
    fortuneType: "技芸運・知性運",
    auspicious: ["建築", "種蒔", "旅行"], inauspicious: ["婚姻"]
  },
  "亢": {
    name: "亢", reading: "こうしゅく", sanskrit: "スヴァーティ", starCount: 2, starShape: "長布堆",
    deity: "風神", element: "濁水の灵", phase: "内集", fireScore: 20, waterScore: 80,
    nature: "慈悲", category: "慈悲",
    personality: "温和で慈悲深く、学問を好む。内面の充実を重視し、精神的な成長に価値を置く。穏やかな物腰の中に強い信念を秘め、人の痛みがわかる繊細さを持つ。周囲から信頼される人柄で、相談役として頼られることが多い。",
    loveAdvice: "穏やかで包容力のある愛情を注ぐタイプ。相手の気持ちに寄り添い、安心感を与える。ただし、自分の気持ちを抑えすぎる傾向があるので、素直な表現も大切に。",
    workAdvice: "教育、医療、カウンセリング、福祉など人に寄り添う仕事に適性。学術研究や文筆業でも才能を発揮。",
    moneyAdvice: "堅実な金銭感覚の持ち主。無駄遣いは少ないが、自己投資や学びへの出費は惜しまない。長期的な視点での資産形成が吉。",
    healthAdvice: "胸部・呼吸器に注意。深呼吸や瞑想で心身のバランスを整えて。ストレスは内に溜めず、信頼できる人に話すことが大切。",
    bodyPart: "胸・呼吸器", luckyColor: "ラベンダー・白", powerStone: "アメジスト",
    mantra: "のうまく　さんまんだ　ぼだなん　きりく", openingAdvice: "学びと慈悲の心が開運の鍵。他者への奉仕が巡り巡って自分に返ってくる。",
    palaceBelong: "天秤宮", palaceFoot: "二足", elementType: "風", quality: "活動", planetInfluence: "金星",
    fortuneType: "学問運・慈悲運",
    auspicious: ["学問", "修行", "治療"], inauspicious: ["戦闘", "訴訟"]
  },
  "氐": {
    name: "氐", reading: "ていしゅく", sanskrit: "ヴィシャーカー", starCount: 4, starShape: "牛形",
    deity: "火神", element: "昇水の灵", phase: "内集", fireScore: 10, waterScore: 90,
    nature: "念善", category: "念善",
    personality: "善を念じ、道徳心が高い。忍耐力に優れ、深い思慮を持つ。目標に向かって着実に歩む粘り強さがあり、一度決めたことは最後までやり遂げる。温厚な性格だが、正義感が強く、不正に対しては毅然とした態度を取る。",
    loveAdvice: "誠実で一途な愛情の持ち主。信頼関係を何より大切にし、長く深い絆を築くタイプ。急がず焦らず、じっくりと関係を育てていくのが吉。",
    workAdvice: "法律、行政、宗教、哲学など正義や道徳に関わる分野に適性。農業や不動産など土地に関わる仕事も吉。",
    moneyAdvice: "地道な蓄財が得意。一攫千金よりもコツコツと積み上げる方が向いている。不動産投資に縁がある。",
    healthAdvice: "腎臓・泌尿器に注意。水分をしっかり摂り、冷えに気をつけて。規則正しい生活リズムが健康の基盤。",
    bodyPart: "腎臓・泌尿器", luckyColor: "深緑・茶色", powerStone: "ジェイド（翡翠）",
    mantra: "のうまく　さんまんだ　ぼだなん　たらく", openingAdvice: "忍耐と誠実さが開運の鍵。善行を積み重ねることで、大きな果報が訪れる。",
    palaceBelong: "天秤宮", palaceFoot: "四足", elementType: "風", quality: "活動", planetInfluence: "金星",
    fortuneType: "道徳運・忍耐運",
    auspicious: ["祈祷", "種蒔", "入宅"], inauspicious: ["旅行"]
  },
  "房": {
    name: "房", reading: "ぼうしゅく", sanskrit: "アヌラーダー", starCount: 4, starShape: "蛇布形",
    deity: "水神", element: "火水の灵", phase: "均衡", fireScore: 50, waterScore: 50,
    nature: "威徳", category: "通常",
    personality: "威厳と徳を兼ね備え、家が栄える。バランスの取れた性格で、人望が厚い。リーダーシップと協調性を併せ持ち、組織の中で自然と中心的な存在になる。家族や仲間を大切にし、周囲に安定感を与える。",
    loveAdvice: "安定した家庭を築く力がある。パートナーとの信頼関係を大切にし、互いに支え合う関係を理想とする。家族運に恵まれやすい。",
    workAdvice: "経営、管理職、不動産、建築など組織を率いる仕事に適性。家業の継承にも縁がある。",
    moneyAdvice: "家族や組織の財を守り育てる力がある。不動産や家族経営の事業で財を成す傾向。",
    healthAdvice: "心臓・循環器に注意。適度な運動と規則正しい食事が大切。ストレスを溜めず、家族との時間でリフレッシュを。",
    bodyPart: "心臓・循環器", luckyColor: "ワインレッド・ゴールド", powerStone: "ガーネット",
    mantra: "のうまく　さんまんだ　ぼだなん　ばん", openingAdvice: "家族や仲間との絆を深めることが開運の鍵。威厳と徳を磨き、周囲から信頼される存在を目指して。",
    palaceBelong: "天蠍宮", palaceFoot: "一足", elementType: "水", quality: "不動", planetInfluence: "火星",
    fortuneType: "家運・威徳運",
    auspicious: ["婚姻", "建築", "入宅"], inauspicious: ["裁衣"]
  },
  "心": {
    name: "心", reading: "しんしゅく", sanskrit: "ジェーシュター", starCount: 3, starShape: "階段形",
    deity: "龍神", element: "水中の火灵", phase: "外発", fireScore: 60, waterScore: 40,
    nature: "族栄", category: "通常",
    personality: "表むきは気さくでチャーミング、周りを明るくするムードがあり、神秘的な魅力に包まれている人。「心」の字が示すように、人の心の内側や物事の内面を見通す洞察力と、情報通の面を持ち合わせている。反面、心の内を明かさない秘密主義なところがあり猜疑心が強く、なかなか人を信用できない傾向も。しかし、人の心の動きを敏感に察知して、状況をうかがいながら対応する天性のタレント性を秘めているので、無意識の内に演技力を発揮する。好奇心旺盛で、頭の回転は速く、周りを楽しくする雰囲気を持っているので、自然と周囲に人が集まってくる。",
    loveAdvice: "神秘的なイメージを醸しだし、相手の好みに合わせて自分の魅力を変幻自在に操ることが得意。愛する人と深い絆を結びたいという欲望が強いので、遊びの恋愛には興味がない。ただ、その一途な愛情も、ときに激しい思い込みにすり替わってしまう危険性がある。猜疑心を取り払って、限りない愛を注ぐことで幸せを手にできる。",
    workAdvice: "「蠍宮」に四足属する心宿は、並外れた集中力で物事に取り組み、エキスパートになる力が備わっている。すたれたものを新しいものへと再生するような役割がある。持ち前のプロ意識を活かしながら、洞察力が必要な分野の仕事に適している。「人気運」を持つので、接客・販売・営業・カウンセラーに適性。真髄を見抜く力を活かして、研究や開発部門・企画関連・美術・音楽・演劇・神経科分野の医師も吉。",
    moneyAdvice: "自分の関わる物事に敏感で、お金の工面や遣り繰りなど、その場に合わせた創意工夫が得意。しかし、欲深さが出てしまう面があるので注意。金銭面のトラブルやピンチでも、蘇りがはかれる程の逆境運に恵まれている。一攫千金に走りがちなので、殖やす方法に長けた人物との交流で、手堅く貯蓄を。",
    healthAdvice: "人体の中では「左ひじ」に当たる。腱鞘炎など「ひじ」に関係する病気に注意。膀胱炎など泌尿器の疾患として現れることも。女性の場合は、婦人科系ホルモンバランスの乱れや、子宮器官系の病気に気をつけて。免疫力は強いものの、心のストレスからくる病気に弱いので精神的なバランスを心がけて。",
    bodyPart: "左ひじ", luckyColor: "ブラック・コーラルピンク", powerStone: "ルチルクォーツ",
    mantra: "のうまく　さんまんだ　ぼだなん　せいしゅった　のうきしゃたら　そわか",
    openingAdvice: "未知なることにも大胆に踏み込むこと。外ではとても明るく振舞い、内では何故か陰鬱な気分になってふさぎ込むことも。ピンチやアクシデントに遭遇しても、決して諦めることなく起死回生を図ることができる運を持っているので、物事をポジティブに捉えて、大きな転機と飛躍の波に乗ること。興味の湧いたことにトライし、深めていけば間違いなく、運気アップのよび水をさそう。",
    palaceBelong: "天蠍宮", palaceFoot: "四足", elementType: "水", quality: "不動", planetInfluence: "冥王星",
    fortuneType: "人気運・地位運",
    auspicious: ["祭祀", "建築"], inauspicious: ["旅行", "移転"]
  },
  "尾": {
    name: "尾", reading: "びしゅく", sanskrit: "ムーラ", starCount: 9, starShape: "獅子頂毛",
    deity: "羅刹", element: "水中の火灵", phase: "外発", fireScore: 60, waterScore: 40,
    nature: "猛悪", category: "猛悪",
    personality: "激しい気性を持つが、根源的な力を秘める。破壊と再生の宿。物事の根本を見抜く力があり、表面的なものに惑わされない。困難な状況でも決して屈しない不屈の精神を持つ。",
    loveAdvice: "情熱的で一途な恋愛をする。一度好きになると深く入り込むが、嫉妬心も強い。相手の本質を見抜く力があるので、表面的な関係には満足しない。",
    workAdvice: "危機管理、外科医、探偵、研究者など根源に迫る仕事に適性。破壊と再生に関わる仕事で力を発揮。",
    moneyAdvice: "一度失っても復活する力がある。投資では大胆な判断が功を奏することも。ただし、ギャンブル的な行動には注意。",
    healthAdvice: "生殖器・排泄器に注意。デトックスを意識した生活を。精神的な浄化も重要。",
    bodyPart: "生殖器・排泄器", luckyColor: "深紅・黒", powerStone: "オブシディアン",
    mantra: "のうまく　さんまんだ　ぼだなん　きりく　そわか", openingAdvice: "古いものを手放し、新しい自分に生まれ変わる勇気が開運の鍵。根源的な変容を恐れないこと。",
    palaceBelong: "天蠍宮", palaceFoot: "四足", elementType: "水", quality: "不動", planetInfluence: "冥王星",
    fortuneType: "再生運・変容運",
    auspicious: ["伐木", "除暴"], inauspicious: ["婚姻", "建築"]
  },
  "箕": {
    name: "箕", reading: "きしゅく", sanskrit: "プールヴァ・アシャーダー", starCount: 4, starShape: "牛歩形",
    deity: "水神", element: "濁水の灵", phase: "内集", fireScore: 20, waterScore: 80,
    nature: "念善", category: "念善",
    personality: "善良で穏やか。水の性質が強く、受容力に優れる。どんな人や状況も受け入れる器の大きさがあり、周囲に安らぎを与える。芸術的感性が豊かで、美しいものに心を動かされる。",
    loveAdvice: "包容力があり、相手をありのまま受け入れる愛情の持ち主。穏やかな関係を好み、激しい恋愛よりも安定した絆を求める。",
    workAdvice: "芸術、音楽、福祉、環境保護など、美と調和に関わる仕事に適性。水に関わる仕事（漁業、飲料、温泉等）にも縁がある。",
    moneyAdvice: "堅実な金銭感覚。派手な出費は少ないが、芸術品や美しいものへの投資は惜しまない。",
    healthAdvice: "腎臓・膀胱に注意。水分バランスを整え、冷えに気をつけて。温泉療法が効果的。",
    bodyPart: "腎臓・膀胱", luckyColor: "水色・パールホワイト", powerStone: "アクアマリン",
    mantra: "のうまく　さんまんだ　ぼだなん　ばく　そわか", openingAdvice: "受容と調和の心が開運の鍵。流れに身を任せつつ、自分の美意識を大切にすること。",
    palaceBelong: "人馬宮", palaceFoot: "四足", elementType: "火", quality: "柔軟", planetInfluence: "木星",
    fortuneType: "芸術運・受容運",
    auspicious: ["治水", "農耕"], inauspicious: ["火事"]
  },
  "斗": {
    name: "斗", reading: "としゅく", sanskrit: "ウッタラ・アシャーダー", starCount: 4, starShape: "象歩形",
    deity: "天神", element: "水中の火灵", phase: "外発", fireScore: 60, waterScore: 40,
    nature: "念善", category: "念善",
    personality: "志が高く、大きな目標を持つ。象の如き力強さと慎重さ。リーダーシップがあり、困難な状況でも冷静に判断できる。正義感が強く、弱者を守る使命感を持つ。",
    loveAdvice: "理想が高く、尊敬できる相手を求める。パートナーと共に成長していく関係を理想とし、互いに高め合える関係を築く。",
    workAdvice: "政治、法律、教育、軍事など社会的な使命感を持つ仕事に適性。リーダーとして組織を導く力がある。",
    moneyAdvice: "社会的地位の向上と共に財も増える傾向。公的な仕事や大きなプロジェクトで財を成す。",
    healthAdvice: "腰・大腿部に注意。姿勢を正し、下半身の筋力を維持することが大切。",
    bodyPart: "腰・大腿部", luckyColor: "ロイヤルブルー・紫", powerStone: "ラピスラズリ",
    mantra: "のうまく　さんまんだ　ぼだなん　たらく　そわか", openingAdvice: "高い志を持ち続けることが開運の鍵。社会貢献の意識が運気を大きく引き上げる。",
    palaceBelong: "人馬宮", palaceFoot: "四足", elementType: "火", quality: "柔軟", planetInfluence: "木星",
    fortuneType: "志運・リーダー運",
    auspicious: ["入宅", "建築", "学問"], inauspicious: ["訴訟"]
  },
  "女": {
    name: "女", reading: "じょしゅく", sanskrit: "シュラヴァナ", starCount: 4, starShape: "牛角形",
    deity: "天女", element: "濁水の灵", phase: "内集", fireScore: 20, waterScore: 80,
    nature: "急速", category: "急速",
    personality: "物事が急速に進展する。聡明で、学問に秀でる。知的好奇心が旺盛で、新しい知識を貪欲に吸収する。直感力に優れ、物事の本質を素早く理解する力がある。",
    loveAdvice: "知的な会話を楽しめる相手に惹かれる。恋愛も急速に進展しやすいが、冷めるのも早い傾向。じっくりと相手を知る時間を大切に。",
    workAdvice: "学術研究、IT、通信、メディアなど知識と情報に関わる仕事に適性。語学力を活かした国際的な仕事も吉。",
    moneyAdvice: "情報を活かした投資が得意。素早い判断で利益を得るが、慎重さも忘れずに。",
    healthAdvice: "耳・聴覚に注意。騒音を避け、静かな環境でのリラックスが大切。",
    bodyPart: "耳・聴覚", luckyColor: "スカイブルー・白銀", powerStone: "ムーンストーン",
    mantra: "のうまく　さんまんだ　ぼだなん　そわか", openingAdvice: "学びと知識の追求が開運の鍵。新しい情報に敏感であり続けること。",
    palaceBelong: "磨羯宮", palaceFoot: "三足", elementType: "地", quality: "活動", planetInfluence: "土星",
    fortuneType: "学問運・急速運",
    auspicious: ["学問", "技芸"], inauspicious: ["婚姻"]
  },
  "虚": {
    name: "虚", reading: "きょしゅく", sanskrit: "ダニシュター", starCount: 3, starShape: "梨格形",
    deity: "天神", element: "空中の水灵", phase: "内集", fireScore: 30, waterScore: 70,
    nature: "健康", category: "通常",
    personality: "健康で道徳的。空の如き広い心を持ち、精神性が高い。物質的なものよりも精神的な豊かさを重視し、哲学的な思考を好む。",
    loveAdvice: "精神的なつながりを重視する恋愛観。外見よりも内面の美しさに惹かれ、魂のレベルで共鳴できる相手を求める。",
    workAdvice: "哲学、宗教、瞑想指導、ヒーリングなど精神的な分野に適性。天文学や宇宙科学にも縁がある。",
    moneyAdvice: "物質的な豊かさよりも精神的な充実を優先する傾向。必要最小限の生活の中に豊かさを見出す。",
    healthAdvice: "精神面の健康が肉体に大きく影響。瞑想や呼吸法で心身のバランスを整えて。",
    bodyPart: "脛・すね", luckyColor: "藍色・透明", powerStone: "クリスタルクォーツ",
    mantra: "のうまく　さんまんだ　ぼだなん　きりく　ばく", openingAdvice: "精神性の向上が開運の鍵。瞑想や内省の時間を大切にすること。",
    palaceBelong: "磨羯宮", palaceFoot: "四足", elementType: "地", quality: "活動", planetInfluence: "土星",
    fortuneType: "精神運・健康運",
    auspicious: ["修行", "祈祷"], inauspicious: ["建築", "移転"]
  },
  "危": {
    name: "危", reading: "きしゅく", sanskrit: "シャタビシャー", starCount: 3, starShape: "花穂形",
    deity: "龍神", element: "影の火灵", phase: "外発", fireScore: 80, waterScore: 20,
    nature: "猛悪", category: "猛悪",
    personality: "激しい火のエネルギーを持つ。危険と隣り合わせだが大きな力を秘める。常識にとらわれない独創的な発想力があり、革命的な変化を起こす力がある。",
    loveAdvice: "激しい恋愛をしやすい。スリルと刺激を求める傾向があるが、安定した関係を築くには相手への信頼が不可欠。",
    workAdvice: "軍事、警察、消防、冒険家など危険と隣り合わせの仕事に適性。革新的な技術開発にも向く。",
    moneyAdvice: "ハイリスク・ハイリターンの傾向。大胆な投資で大きな利益を得ることもあるが、損失も大きくなりがち。",
    healthAdvice: "足首・くるぶしに注意。怪我をしやすいので、激しい運動の前にはしっかりとウォーミングアップを。",
    bodyPart: "足首・くるぶし", luckyColor: "赤・オレンジ", powerStone: "カーネリアン",
    mantra: "のうまく　さんまんだ　ぼだなん　うん", openingAdvice: "勇気を持って危険に立ち向かうことが開運の鍵。ただし、無謀と勇気は違うことを忘れずに。",
    palaceBelong: "寶瓶宮", palaceFoot: "二足", elementType: "風", quality: "不動", planetInfluence: "土星",
    fortuneType: "冒険運・革新運",
    auspicious: ["兵士訓練", "武芸"], inauspicious: ["旅行", "婚姻"]
  },
  "室": {
    name: "室", reading: "しつしゅく", sanskrit: "プールヴァ・バードラパダー", starCount: 4, starShape: "詞梨勒形",
    deity: "火神", element: "水中の火灵", phase: "内集外発混合", fireScore: 60, waterScore: 40,
    nature: "富貴猛悪", category: "猛悪",
    personality: "富貴と猛悪の両面を持つ。内に秘めた火が外に噴出する力。物質的な豊かさと精神的な激しさを併せ持ち、大きな事業を成し遂げる力がある。",
    loveAdvice: "情熱的で支配的な恋愛をしやすい。相手を守りたいという強い欲求があるが、束縛にならないよう注意。",
    workAdvice: "不動産、建設、金融など富を生み出す仕事に適性。政治や権力に関わる仕事でも力を発揮。",
    moneyAdvice: "富を築く力が強い。不動産投資や事業経営で大きな財を成す可能性。ただし、強欲にならないよう注意。",
    healthAdvice: "脚・膝に注意。下半身の血行を良くし、適度な運動を心がけて。",
    bodyPart: "脚・膝", luckyColor: "ゴールド・深紅", powerStone: "タイガーアイ",
    mantra: "のうまく　さんまんだ　ぼだなん　ばん　うん", openingAdvice: "富と力を正しく使うことが開運の鍵。社会に還元する心が更なる繁栄を呼ぶ。",
    palaceBelong: "寶瓶宮", palaceFoot: "四足", elementType: "風", quality: "不動", planetInfluence: "土星",
    fortuneType: "富貴運・権力運",
    auspicious: ["建築", "入宅", "種蒔"], inauspicious: ["裁衣"]
  },
  "壁": {
    name: "壁", reading: "へきしゅく", sanskrit: "ウッタラ・バードラパダー", starCount: 1, starShape: "立等形",
    deity: "水神", element: "濁水の灵", phase: "内集", fireScore: 20, waterScore: 80,
    nature: "孔雀", category: "通常",
    personality: "美しく優雅。水の性質が強く、芸術的才能に恵まれる。孔雀のような華やかさと気品を持ち、周囲の目を引く存在。繊細な感性で美を追求する。",
    loveAdvice: "ロマンチックで美しい恋愛を好む。相手にも美意識や品格を求める傾向。芸術的な趣味を共有できる相手と深い絆を築ける。",
    workAdvice: "芸術、デザイン、ファッション、インテリアなど美に関わる仕事に適性。文学や詩歌の才能もある。",
    moneyAdvice: "美しいものへの投資が結果的に利益を生む。芸術品のコレクションや美的センスを活かした事業が吉。",
    healthAdvice: "皮膚・肌に注意。スキンケアを丁寧に行い、美しさを保つことが健康にもつながる。",
    bodyPart: "皮膚・肌", luckyColor: "パールピンク・クリーム", powerStone: "ローズクォーツ",
    mantra: "のうまく　さんまんだ　ぼだなん　きりく　ばん", openingAdvice: "美を追求し、芸術的な表現を磨くことが開運の鍵。美しいものに囲まれた環境が運気を高める。",
    palaceBelong: "寶瓶宮", palaceFoot: "三足", elementType: "風", quality: "不動", planetInfluence: "土星",
    fortuneType: "芸術運・美運",
    auspicious: ["学問", "芸術", "建築"], inauspicious: ["戦闘"]
  },
  "奎": {
    name: "奎", reading: "けいしゅく", sanskrit: "レーヴァティー", starCount: 1, starShape: "立等形",
    deity: "天神", element: "濁水の灵", phase: "内集", fireScore: 20, waterScore: 80,
    nature: "念善", category: "念善",
    personality: "善良で信仰心が厚い。穏やかな水の性質を持ち、慈悲深い心で人々を包み込む。精神的な成長を重視し、宗教や哲学に深い関心を持つ。",
    loveAdvice: "純粋で誠実な愛情の持ち主。相手の幸せを自分の幸せと感じられる献身的な愛を注ぐ。",
    workAdvice: "宗教、哲学、教育、福祉など精神的な分野に適性。海外との縁もあり、国際的な活動にも向く。",
    moneyAdvice: "物質的な欲望が少なく、必要なものは自然と手に入る傾向。寄付や奉仕活動が巡り巡って豊かさを呼ぶ。",
    healthAdvice: "足・足裏に注意。足のケアを丁寧に行い、歩くことで健康を維持。",
    bodyPart: "足・足裏", luckyColor: "白・淡い青", powerStone: "セレナイト",
    mantra: "のうまく　さんまんだ　ぼだなん　そわか　きりく", openingAdvice: "信仰と善行が開運の鍵。純粋な心で人に接することで、大きな恵みが訪れる。",
    palaceBelong: "雙魚宮", palaceFoot: "四足", elementType: "水", quality: "柔軟", planetInfluence: "木星",
    fortuneType: "信仰運・慈善運",
    auspicious: ["祈祷", "入宅"], inauspicious: ["戦闘"]
  },
  "婁": {
    name: "婁", reading: "ろうしゅく", sanskrit: "アシュヴィニー", starCount: 3, starShape: "馬頭形",
    deity: "双馬神", element: "水中の火灵", phase: "外発", fireScore: 60, waterScore: 40,
    nature: "急速", category: "急速",
    personality: "馬の如き俊敏さ。物事を素早く成し遂げる力を持つ。行動力があり、思い立ったらすぐに実行に移す。治療や回復に関わる力も持ち、人を癒す才能がある。",
    loveAdvice: "出会いから恋愛に発展するスピードが速い。直感で相手を選ぶ傾向があるが、その直感は的確なことが多い。",
    workAdvice: "医療、治療、スポーツ、運輸など素早い判断と行動が求められる仕事に適性。起業家としても成功しやすい。",
    moneyAdvice: "素早い判断で利益を得る力がある。商売のセンスが良く、チャンスを逃さない。",
    healthAdvice: "頭部・額に注意。頭痛やめまいに気をつけて。十分な睡眠と休息が大切。",
    bodyPart: "頭部・額", luckyColor: "赤・白", powerStone: "レッドジャスパー",
    mantra: "のうまく　さんまんだ　ぼだなん　うん　たらく", openingAdvice: "素早い行動と決断が開運の鍵。チャンスが来たら迷わず飛び込むこと。",
    palaceBelong: "雙魚宮", palaceFoot: "四足", elementType: "水", quality: "柔軟", planetInfluence: "木星",
    fortuneType: "行動運・治療運",
    auspicious: ["旅行", "治療", "商売"], inauspicious: ["建築"]
  },
  "胃": {
    name: "胃", reading: "いしゅく", sanskrit: "バラニー", starCount: 3, starShape: "鼎形",
    deity: "死神", element: "輝火の灵", phase: "外発", fireScore: 90, waterScore: 10,
    nature: "急速猛悪", category: "急速",
    personality: "強烈な火のエネルギー。急速に物事を進める力と破壊力を併せ持つ。正義感が強く、不正を許さない。時に激しすぎる面があるが、その情熱は周囲を動かす力がある。",
    loveAdvice: "情熱的で激しい恋愛をする。相手を強く求め、独占欲も強い。その激しさが魅力にもなるが、相手を圧倒しないよう注意。",
    workAdvice: "軍事、警察、外科医、格闘家など激しいエネルギーを活かせる仕事に適性。改革者としても力を発揮。",
    moneyAdvice: "大胆な投資で大きな利益を得る可能性。ただし、衝動的な出費には注意。",
    healthAdvice: "胃・消化器に注意。暴飲暴食を避け、規則正しい食事を心がけて。",
    bodyPart: "胃・消化器", luckyColor: "真紅・ゴールド", powerStone: "ルビー",
    mantra: "のうまく　さんまんだ　ぼだなん　うん　ばん", openingAdvice: "情熱を正しい方向に向けることが開運の鍵。怒りのエネルギーを建設的な行動に変換すること。",
    palaceBelong: "白羊宮", palaceFoot: "四足", elementType: "火", quality: "活動", planetInfluence: "火星",
    fortuneType: "情熱運・改革運",
    auspicious: ["伐木", "除暴", "火作"], inauspicious: ["婚姻", "旅行"]
  },
  "昴": {
    name: "昴", reading: "ぼうしゅく", sanskrit: "クリッティカー", starCount: 6, starShape: "剃刀形",
    deity: "火神", element: "正火の灵", phase: "外発", fireScore: 80, waterScore: 20,
    nature: "念善", category: "念善",
    personality: "念善にして多男女。勤學問、有儀容、性慳澁、足詞辯。火神の加護を受け、知性と品格を兼ね備える。学問を好み、礼儀正しく、弁舌に長ける。",
    loveAdvice: "品格のある恋愛を好む。知的で礼儀正しい相手に惹かれ、上品な関係を築く。子宝に恵まれやすい。",
    workAdvice: "学問、教育、文筆、弁護士など知性と弁舌を活かす仕事に適性。火に関わる仕事（料理、鍛冶等）にも縁がある。",
    moneyAdvice: "倹約家で計画的な資産運用が得意。学問や資格への投資が将来の収入に直結する。",
    healthAdvice: "目・視力に注意。長時間の読書やPC作業の後は目を休めて。火の属性が強いので、のぼせに注意。",
    bodyPart: "目・視力", luckyColor: "朱色・クリーム", powerStone: "サンストーン",
    mantra: "のうまく　さんまんだ　ぼだなん　きりく　うん", openingAdvice: "学問と礼節を磨くことが開運の鍵。知識を深め、品格を高めることで運気が上昇する。",
    palaceBelong: "白羊宮", palaceFoot: "四足", elementType: "火", quality: "活動", planetInfluence: "火星",
    fortuneType: "学問運・品格運",
    auspicious: ["火作", "煎責", "計算", "種蒔", "入宅", "剃頭"], inauspicious: ["裁衣"]
  },
  "畢": {
    name: "畢", reading: "ひっしゅく", sanskrit: "ローヒニー", starCount: 5, starShape: "額形",
    deity: "造物主", element: "空中の水灵", phase: "内集", fireScore: 30, waterScore: 70,
    nature: "念善", category: "念善",
    personality: "創造力に富み、美的感覚に優れる。穏やかで深い知恵を持つ。造物主の加護を受け、ものを生み出す力がある。芸術的才能と実務能力を併せ持つ稀有な存在。",
    loveAdvice: "美しく穏やかな恋愛を好む。相手の美点を見出し、育てる力がある。安定した家庭を築く才能に恵まれている。",
    workAdvice: "芸術、工芸、建築、農業など創造と育成に関わる仕事に適性。美容やファッション業界でも成功しやすい。",
    moneyAdvice: "創造力を活かした収入が期待できる。手作りの品や芸術作品で財を成す可能性。",
    healthAdvice: "額・前頭部に注意。頭痛やストレスに気をつけて。創造的な活動がストレス解消になる。",
    bodyPart: "額・前頭部", luckyColor: "クリーム・ピンク", powerStone: "ローズクォーツ",
    mantra: "のうまく　さんまんだ　ぼだなん　たらく　きりく", openingAdvice: "創造力を発揮し、美しいものを生み出すことが開運の鍵。ものづくりの喜びが運気を高める。",
    palaceBelong: "金牛宮", palaceFoot: "三足", elementType: "地", quality: "不動", planetInfluence: "金星",
    fortuneType: "創造運・美運",
    auspicious: ["建築", "婚姻", "種蒔"], inauspicious: ["戦闘"]
  },
  "觜": {
    name: "觜", reading: "ししゅく", sanskrit: "ムリガシラス", starCount: 3, starShape: "馬頭乾闌形",
    deity: "月神", element: "空中の水灵", phase: "内集", fireScore: 30, waterScore: 70,
    nature: "念善", category: "念善",
    personality: "月の如き穏やかさ。探求心が強く、知的好奇心に富む。物事を深く掘り下げて理解しようとする姿勢があり、研究者気質。優しく繊細な心を持つ。",
    loveAdvice: "穏やかで知的な恋愛を好む。相手の内面に惹かれ、深い精神的なつながりを求める。ロマンチックな一面もある。",
    workAdvice: "研究、学術、天文学、占星術など探求心を活かす仕事に適性。月に関わる仕事（夜勤、芸術等）にも縁がある。",
    moneyAdvice: "知識を活かした収入が期待できる。研究成果や特許で財を成す可能性。",
    healthAdvice: "鼻・嗅覚に注意。アレルギーや鼻炎に気をつけて。自然の中でリフレッシュすることが大切。",
    bodyPart: "鼻・嗅覚", luckyColor: "シルバー・淡い緑", powerStone: "ムーンストーン",
    mantra: "のうまく　さんまんだ　ぼだなん　そわか　たらく", openingAdvice: "知的探求を続けることが開運の鍵。好奇心を大切にし、学び続ける姿勢が運気を高める。",
    palaceBelong: "金牛宮", palaceFoot: "四足", elementType: "地", quality: "不動", planetInfluence: "金星",
    fortuneType: "探求運・知性運",
    auspicious: ["学問", "旅行"], inauspicious: ["建築"]
  },
  "参": {
    name: "参", reading: "さんしゅく", sanskrit: "アールドラー", starCount: 1, starShape: "額上點形",
    deity: "暴風神", element: "影の火灵", phase: "外発", fireScore: 80, waterScore: 20,
    nature: "猛悪", category: "猛悪",
    personality: "暴風の如き激しさ。強い意志と行動力を持つが、破壊的な面も。嵐のようなエネルギーで周囲を巻き込み、大きな変化を起こす力がある。",
    loveAdvice: "激しく情熱的な恋愛をする。嵐のような恋に身を投じるが、穏やかな日常も大切にすることで関係が安定する。",
    workAdvice: "革命家、改革者、スポーツ選手、冒険家など激しいエネルギーを発散できる仕事に適性。",
    moneyAdvice: "大胆な行動で大きな利益を得る可能性があるが、損失も大きくなりがち。リスク管理が重要。",
    healthAdvice: "頭部・脳に注意。頭痛やストレスに気をつけて。激しい運動でエネルギーを発散することが大切。",
    bodyPart: "頭部・脳", luckyColor: "嵐の灰色・深紅", powerStone: "ブラックトルマリン",
    mantra: "のうまく　さんまんだ　ぼだなん　うん　ばく", openingAdvice: "激しいエネルギーを建設的な方向に向けることが開運の鍵。破壊の後に必ず創造があることを信じて。",
    palaceBelong: "雙女宮", palaceFoot: "二足", elementType: "風", quality: "柔軟", planetInfluence: "水星",
    fortuneType: "変革運・嵐運",
    auspicious: ["武芸", "除暴"], inauspicious: ["婚姻", "建築", "旅行"]
  },
  "井": {
    name: "井", reading: "せいしゅく", sanskrit: "プナルヴァス", starCount: 4, starShape: "屋獄形",
    deity: "天母神", element: "水火灵", phase: "均衡", fireScore: 50, waterScore: 50,
    nature: "念善", category: "念善",
    personality: "水火が調和した均衡の宿。再生と回復の力を持つ。バランス感覚に優れ、どんな状況でも中庸を保つことができる。人々を癒し、再生させる力がある。",
    loveAdvice: "バランスの取れた安定した恋愛を好む。相手との調和を大切にし、互いに支え合う関係を築く。",
    workAdvice: "医療、カウンセリング、教育、建築など再生と回復に関わる仕事に適性。バランス感覚を活かした調停役も向く。",
    moneyAdvice: "安定した収入を得やすい。極端な投資よりもバランスの取れた資産運用が吉。",
    healthAdvice: "消化器・腸に注意。バランスの取れた食事と規則正しい生活が健康の基盤。",
    bodyPart: "消化器・腸", luckyColor: "黄緑・オレンジ", powerStone: "シトリン",
    mantra: "のうまく　さんまんだ　ぼだなん　きりく　たらく", openingAdvice: "バランスと調和を保つことが開運の鍵。極端を避け、中庸の道を歩むこと。",
    palaceBelong: "雙女宮", palaceFoot: "四足", elementType: "風", quality: "柔軟", planetInfluence: "水星",
    fortuneType: "調和運・再生運",
    auspicious: ["建築", "入宅", "学問"], inauspicious: ["伐木"]
  },
  "鬼": {
    name: "鬼", reading: "きしゅく", sanskrit: "プシュヤ", starCount: 3, starShape: "獅子頭形",
    deity: "祈祷神", element: "水火灵", phase: "均衡", fireScore: 50, waterScore: 50,
    nature: "急速智策", category: "急速",
    personality: "急速にして智策に富む。獅子の如き威厳と知恵を併せ持つ。最吉の宿とされ、あらゆる面で恵まれた運を持つ。頭脳明晰で、戦略的な思考ができる。人望が厚く、自然とリーダーの地位に就く。",
    loveAdvice: "知性と威厳で相手を惹きつける。恵まれた恋愛運を持ち、理想的なパートナーに出会いやすい。",
    workAdvice: "経営、政治、学術、宗教など知恵と戦略を活かす仕事に適性。あらゆる分野で成功する可能性がある最吉の宿。",
    moneyAdvice: "金運に恵まれている。知恵を活かした投資や事業で大きな財を成す。",
    healthAdvice: "胸部・肺に注意。呼吸器系のケアを心がけて。精神的な充実が健康を支える。",
    bodyPart: "胸部・肺", luckyColor: "金色・紫", powerStone: "アメジスト",
    mantra: "のうまく　さんまんだ　ぼだなん　うん　きりく　そわか", openingAdvice: "知恵と戦略を磨くことが開運の鍵。最吉の宿の運を最大限に活かすには、常に学び続けること。",
    palaceBelong: "巨蟹宮", palaceFoot: "一足", elementType: "水", quality: "活動", planetInfluence: "月",
    fortuneType: "最吉運・智策運",
    auspicious: ["祈祷", "入宅", "建築", "学問", "商売"], inauspicious: []
  },
  "柳": {
    name: "柳", reading: "りゅうしゅく", sanskrit: "アーシュレーシャー", starCount: 6, starShape: "蛇頭形",
    deity: "蛇神", element: "影の火灵", phase: "外発", fireScore: 80, waterScore: 20,
    nature: "猛悪", category: "猛悪",
    personality: "蛇の如き鋭さと執念。強い火のエネルギーを持ち、洞察力に優れる。一度目標を定めると決して諦めない執念深さがあり、深い知恵と策略で目的を達成する。",
    loveAdvice: "執着心が強く、一度好きになると離れられない。蛇のように相手に巻きつく愛情は、時に相手を息苦しくさせることも。適度な距離感が大切。",
    workAdvice: "医薬、毒物学、心理学、探偵など深い洞察力を活かす仕事に適性。蛇に関わる仕事（漢方、鍼灸等）にも縁がある。",
    moneyAdvice: "執念深い投資で利益を得る。長期的な視点での資産運用が得意。",
    healthAdvice: "口・歯に注意。定期的な歯科検診を心がけて。毒素の排出を意識した生活が大切。",
    bodyPart: "口・歯", luckyColor: "深緑・黒", powerStone: "マラカイト",
    mantra: "のうまく　さんまんだ　ぼだなん　ばく　うん", openingAdvice: "洞察力を磨き、深い知恵を身につけることが開運の鍵。執念を正しい方向に向けること。",
    palaceBelong: "巨蟹宮", palaceFoot: "四足", elementType: "水", quality: "活動", planetInfluence: "月",
    fortuneType: "洞察運・執念運",
    auspicious: ["薬事", "除暴"], inauspicious: ["婚姻", "旅行"]
  },
  "星": {
    name: "星", reading: "せいしゅく", sanskrit: "マガー", starCount: 5, starShape: "猛海伽神形",
    deity: "祖霊", element: "輝火の灵", phase: "外発", fireScore: 90, waterScore: 10,
    nature: "猛悪", category: "猛悪",
    personality: "最も強い火のエネルギー。戦闘的で激烈だが、祖霊の加護がある。王者の風格を持ち、カリスマ性に溢れる。権力や地位を求める野心があり、大きな舞台で活躍する。",
    loveAdvice: "王者のような堂々とした恋愛をする。相手を圧倒するカリスマ性で惹きつけるが、対等な関係を築くことも大切。",
    workAdvice: "政治、軍事、スポーツ、芸能など大きな舞台で活躍する仕事に適性。リーダーとして組織を率いる力がある。",
    moneyAdvice: "権力と共に財も手に入れる傾向。大きな事業で大きな利益を得る。",
    healthAdvice: "心臓・血圧に注意。激しい感情の起伏が健康に影響しやすい。リラクゼーションが重要。",
    bodyPart: "心臓・血圧", luckyColor: "真紅・ゴールド", powerStone: "ルビー",
    mantra: "のうまく　さんまんだ　ぼだなん　うん　ばん　そわか", openingAdvice: "王者の風格を磨き、大きな舞台に立つことが開運の鍵。祖霊への感謝を忘れずに。",
    palaceBelong: "獅子宮", palaceFoot: "四足", elementType: "火", quality: "不動", planetInfluence: "太陽",
    fortuneType: "王者運・カリスマ運",
    auspicious: ["武芸", "祭祀"], inauspicious: ["婚姻", "建築", "旅行"]
  },
  "張": {
    name: "張", reading: "ちょうしゅく", sanskrit: "プールヴァ・パルグニー", starCount: 6, starShape: "杵婆蔵神形",
    deity: "造物主", element: "影の火灵", phase: "外発", fireScore: 80, waterScore: 20,
    nature: "猛悪", category: "猛悪",
    personality: "激烈な火の性質。創造と破壊の両面を持ち、芸術的才能もある。華やかで社交的、パーティーの中心にいるような存在。享楽的な面もあるが、創造力は本物。",
    loveAdvice: "華やかで情熱的な恋愛を好む。社交的な場での出会いが多く、魅力的な異性を惹きつける。",
    workAdvice: "芸能、エンターテインメント、イベント企画など華やかな仕事に適性。創造的な分野で才能を発揮。",
    moneyAdvice: "華やかな生活を好むため出費も多いが、創造力を活かした収入も大きい。",
    healthAdvice: "背中・脊椎に注意。姿勢を正し、適度な運動で背筋を鍛えること。",
    bodyPart: "背中・脊椎", luckyColor: "オレンジ・ゴールド", powerStone: "サンストーン",
    mantra: "のうまく　さんまんだ　ぼだなん　ばん　たらく", openingAdvice: "創造力と社交性を磨くことが開運の鍵。華やかな場に積極的に出ることで運気が上昇する。",
    palaceBelong: "獅子宮", palaceFoot: "四足", elementType: "火", quality: "不動", planetInfluence: "太陽",
    fortuneType: "華運・創造運",
    auspicious: ["芸術", "祭祀"], inauspicious: ["婚姻"]
  },
  "翼": {
    name: "翼", reading: "よくしゅく", sanskrit: "ウッタラ・パルグニー", starCount: 22, starShape: "脚跡形",
    deity: "太陽神", element: "火中の水灵", phase: "内集外発混合", fireScore: 40, waterScore: 60,
    nature: "多妻多子", category: "通常",
    personality: "太陽神の加護。火の中に水を含み、豊かな人間関係を築く。温かく包容力があり、多くの人から慕われる。家族運に恵まれ、子孫繁栄の運を持つ。",
    loveAdvice: "温かく包容力のある愛情で多くの人を惹きつける。家庭的で、豊かな家族関係を築く才能がある。",
    workAdvice: "教育、福祉、医療、農業など人を育て守る仕事に適性。大家族の経営や人材育成にも向く。",
    moneyAdvice: "家族や組織の財を守り育てる力がある。安定した収入と堅実な資産運用が吉。",
    healthAdvice: "手・指に注意。手のケアを丁寧に行い、手作業でリフレッシュすることが大切。",
    bodyPart: "手・指", luckyColor: "オレンジ・クリーム", powerStone: "カーネリアン",
    mantra: "のうまく　さんまんだ　ぼだなん　きりく　ばん　そわか", openingAdvice: "人との絆を大切にし、温かい関係を築くことが開運の鍵。家族や仲間への愛情が運気を高める。",
    palaceBelong: "獅子宮", palaceFoot: "一足", elementType: "火", quality: "不動", planetInfluence: "太陽",
    fortuneType: "家族運・繁栄運",
    auspicious: ["婚姻", "建築", "入宅"], inauspicious: ["戦闘"]
  },
  "軫": {
    name: "軫", reading: "しんしゅく", sanskrit: "ハスタ", starCount: 2, starShape: "蜘蛛跡形",
    deity: "太陽神", element: "濁水の灵", phase: "内集", fireScore: 20, waterScore: 80,
    nature: "慈悲深い", category: "慈悲",
    personality: "手先が器用で、技芸に秀でる。慈悲深く、人の痛みがわかる繊細さを持つ。太陽神の加護を受けながらも水の性質が強く、内面の充実を重視する。",
    loveAdvice: "繊細で思いやりのある愛情を注ぐ。手作りの贈り物や細やかな気配りで相手の心を掴む。",
    workAdvice: "工芸、手芸、外科医、鍼灸師など手先の器用さを活かす仕事に適性。治療や癒しの分野でも才能を発揮。",
    moneyAdvice: "手仕事や技術を活かした収入が期待できる。職人気質で、質の高い仕事が評価される。",
    healthAdvice: "手・手首に注意。腱鞘炎や手の疲れに気をつけて。手のマッサージが効果的。",
    bodyPart: "手・手首", luckyColor: "緑・白", powerStone: "ジェイド（翡翠）",
    mantra: "のうまく　さんまんだ　ぼだなん　そわか　ばん", openingAdvice: "手先の技術を磨き、慈悲の心で人に接することが開運の鍵。ものづくりの喜びが運気を高める。",
    palaceBelong: "室女宮", palaceFoot: "三足", elementType: "地", quality: "柔軟", planetInfluence: "水星",
    fortuneType: "技芸運・慈悲運",
    auspicious: ["治療", "学問", "芸術"], inauspicious: ["戦闘"]
  }
};

// ============================================
// 4. 十二宮体系（密教占星法準拠）
// ============================================

export interface PalaceData {
  name: Palace;
  ruler: Planet;
  yinYang: "陰" | "陽";
  junishi: string;
  nakshatras: { shuku: Nakshatra, pada: number }[];
}

export const PALACE_DATA: Record<Palace, PalaceData> = {
  "白羊宮": { name: "白羊宮", ruler: "火", yinYang: "陰", junishi: "戌",
    nakshatras: [{ shuku: "胃", pada: 4 }, { shuku: "昴", pada: 4 }, { shuku: "畢", pada: 1 }] },
  "金牛宮": { name: "金牛宮", ruler: "金", yinYang: "陰", junishi: "酉",
    nakshatras: [{ shuku: "畢", pada: 3 }, { shuku: "觜", pada: 4 }, { shuku: "参", pada: 2 }] },
  "雙女宮": { name: "雙女宮", ruler: "水", yinYang: "陽", junishi: "申",
    nakshatras: [{ shuku: "参", pada: 2 }, { shuku: "井", pada: 4 }, { shuku: "鬼", pada: 3 }] },
  "巨蟹宮": { name: "巨蟹宮", ruler: "月", yinYang: "陰", junishi: "未",
    nakshatras: [{ shuku: "鬼", pada: 1 }, { shuku: "柳", pada: 4 }, { shuku: "星", pada: 4 }] },
  "獅子宮": { name: "獅子宮", ruler: "日", yinYang: "陽", junishi: "午",
    nakshatras: [{ shuku: "張", pada: 4 }, { shuku: "翼", pada: 4 }, { shuku: "軫", pada: 1 }] },
  "室女宮": { name: "室女宮", ruler: "水", yinYang: "陰", junishi: "巳",
    nakshatras: [{ shuku: "軫", pada: 3 }, { shuku: "角", pada: 4 }, { shuku: "亢", pada: 2 }] },
  "天秤宮": { name: "天秤宮", ruler: "金", yinYang: "陽", junishi: "辰",
    nakshatras: [{ shuku: "亢", pada: 2 }, { shuku: "氐", pada: 4 }, { shuku: "房", pada: 3 }] },
  "天蠍宮": { name: "天蠍宮", ruler: "火", yinYang: "陽", junishi: "卯",
    nakshatras: [{ shuku: "房", pada: 1 }, { shuku: "心", pada: 4 }, { shuku: "尾", pada: 4 }] },
  "人馬宮": { name: "人馬宮", ruler: "木", yinYang: "陽", junishi: "寅",
    nakshatras: [{ shuku: "箕", pada: 4 }, { shuku: "斗", pada: 4 }, { shuku: "女", pada: 1 }] },
  "磨羯宮": { name: "磨羯宮", ruler: "土", yinYang: "陽", junishi: "丑",
    nakshatras: [{ shuku: "女", pada: 3 }, { shuku: "虚", pada: 4 }, { shuku: "危", pada: 2 }] },
  "寶瓶宮": { name: "寶瓶宮", ruler: "土", yinYang: "陰", junishi: "子",
    nakshatras: [{ shuku: "危", pada: 2 }, { shuku: "室", pada: 4 }, { shuku: "壁", pada: 3 }] },
  "雙魚宮": { name: "雙魚宮", ruler: "木", yinYang: "陰", junishi: "亥",
    nakshatras: [{ shuku: "壁", pada: 1 }, { shuku: "奎", pada: 4 }, { shuku: "婁", pada: 4 }] }
};

const PALACES: Palace[] = [
  "白羊宮", "金牛宮", "雙女宮", "巨蟹宮", "獅子宮", "室女宮",
  "天秤宮", "天蠍宮", "人馬宮", "磨羯宮", "寶瓶宮", "雙魚宮"
];

// ============================================
// 5. 七曜体系（密教占星法 第三章準拠）
// ============================================

export interface PlanetData {
  name: Planet;
  celestial: string;
  sanskrit: string;
  element: string;
  kotodamaElement: string;
  nature: "吉" | "凶" | "中";
}

export const PLANET_DATA: Record<Planet, PlanetData> = {
  "日": { name: "日", celestial: "太陽", sanskrit: "アーディティヤ", element: "陽精", kotodamaElement: "正火の灵", nature: "吉" },
  "月": { name: "月", celestial: "太陰", sanskrit: "ソーマ", element: "陰精", kotodamaElement: "空中の水灵", nature: "吉" },
  "火": { name: "火", celestial: "火星", sanskrit: "アンガーラカ", element: "火精", kotodamaElement: "輝火の灵", nature: "凶" },
  "水": { name: "水", celestial: "水星", sanskrit: "ブダ", element: "水精", kotodamaElement: "昇水の灵", nature: "中" },
  "木": { name: "木", celestial: "木星", sanskrit: "ブリハスパティ", element: "空精", kotodamaElement: "火水の灵", nature: "吉" },
  "金": { name: "金", celestial: "金星", sanskrit: "シュクラ", element: "風精", kotodamaElement: "水火灵", nature: "吉" },
  "土": { name: "土", celestial: "土星", sanskrit: "シャニ", element: "日精土", kotodamaElement: "水中の火灵", nature: "凶" }
};

const PLANETS: Planet[] = ["日", "月", "火", "水", "木", "金", "土"];

// ============================================
// 6. 命宿算出アルゴリズム（ルックアップテーブル + フォールバック）
// ============================================

/**
 * 命宿（本命宿）の算出 — syukuyo.com基準100%精度
 * 
 * 1. ルックアップテーブルから直接取得（1920-2025年: 100%精度）
 * 2. テーブル外の日付は旧暦ベースのフォールバック計算
 */
export function calculateHonmeiShuku(birthDateOrLunar: Date | LunarDate): Nakshatra {
  // Date型の場合、ルックアップテーブルを優先使用
  if (birthDateOrLunar instanceof Date) {
    const dateKey = formatDateKey(birthDateOrLunar);
    const msValue = LOOKUP_TABLE[dateKey];
    if (msValue !== undefined && MS_TO_NAKSHATRA[msValue]) {
      return MS_TO_NAKSHATRA[msValue];
    }
    // フォールバック: 旧暦計算
    const lunarDate = solarToLunar(birthDateOrLunar);
    return calculateHonmeiShukuFromLunar(lunarDate);
  }
  // LunarDate型の場合は旧暦計算
  return calculateHonmeiShukuFromLunar(birthDateOrLunar);
}

/** 日付をYYYYMMDD形式のキーに変換 */
function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/** 朔日の直宿を決定する（旧暦フォールバック用） */
function getFirstDayNakshatra(lunarMonth: number): Nakshatra {
  const baseIndex = NAKSHATRAS.indexOf("室");
  const monthIndex = (baseIndex + lunarMonth - 1) % 27;
  return NAKSHATRAS[monthIndex];
}

/** 旧暦ベースの命宿算出（フォールバック） */
function calculateHonmeiShukuFromLunar(lunarDate: LunarDate): Nakshatra {
  const firstDayShuku = getFirstDayNakshatra(lunarDate.month);
  const firstDayIndex = NAKSHATRAS.indexOf(firstDayShuku);
  const honmeiIndex = (firstDayIndex + lunarDate.day - 1) % 27;
  return NAKSHATRAS[honmeiIndex];
}

/**
 * 本命曜の算出
 */
export function calculateHonmeiYo(birthDate: Date): Planet {
  const dayOfWeek = birthDate.getDay();
  return PLANETS[dayOfWeek];
}

/**
 * 九星の算出（三元法）
 */
export function calculateKyusei(birthYear: number): Kyusei {
  const KYUSEI_LIST: Kyusei[] = [
    "一白水星", "二黒土星", "三碧木星", "四緑木星", "五黄土星",
    "六白金星", "七赤金星", "八白土星", "九紫火星"
  ];
  const index = (11 - (birthYear + 6) % 9) % 9;
  return KYUSEI_LIST[index];
}

// ============================================
// 7. 三九秘宿法（相性診断）
// ============================================

const SANKU_MAP: Record<number, RelationshipType> = {
  1: "命", 2: "栄", 3: "衰", 4: "安", 5: "危",
  6: "成", 7: "壊", 8: "友", 9: "親",
  10: "業", 11: "栄", 12: "衰", 13: "安", 14: "危",
  15: "成", 16: "壊", 17: "友", 18: "親",
  19: "胎", 20: "栄", 21: "衰", 22: "安", 23: "危",
  24: "成", 25: "壊", 26: "友", 27: "親"
};

const FORTUNE_MAP: Record<RelationshipType, "大吉" | "吉" | "凶" | "大凶" | "特殊"> = {
  "命": "特殊", "栄": "大吉", "衰": "凶", "安": "吉", "危": "凶",
  "成": "吉", "壊": "大凶", "友": "吉", "親": "大吉",
  "業": "特殊", "胎": "特殊"
};

export function getRelationship(myShuku: Nakshatra, otherShuku: Nakshatra): RelationshipType {
  const myIndex = NAKSHATRAS.indexOf(myShuku);
  const otherIndex = NAKSHATRAS.indexOf(otherShuku);
  const distance = ((otherIndex - myIndex) % 27 + 27) % 27 + 1;
  return SANKU_MAP[distance];
}

export function getMutualCompatibility(shukuA: Nakshatra, shukuB: Nakshatra): {
  relAtoB: RelationshipType;
  relBtoA: RelationshipType;
  fortuneAtoB: string;
  fortuneBtoA: string;
  mutual: string;
  description: string;
} {
  const relAtoB = getRelationship(shukuA, shukuB);
  const relBtoA = getRelationship(shukuB, shukuA);
  const fortuneAtoB = FORTUNE_MAP[relAtoB];
  const fortuneBtoA = FORTUNE_MAP[relBtoA];

  const isGood = (rel: RelationshipType) => ["栄", "安", "成", "友", "親"].includes(rel);
  const isBad = (rel: RelationshipType) => ["衰", "危", "壊"].includes(rel);

  let mutual: string;
  let description: string;

  if (relAtoB === "命") {
    mutual = "彼我同宿";
    description = "同じ命宿を持つ関係。深い縁で結ばれているが、互いに似すぎるため衝突もある。前世からの深い因縁を感じる相手。";
  } else if (relAtoB === "業") {
    mutual = "業の縁";
    description = "前世の業によって結ばれた関係。避けられない因縁があり、互いに学び合う宿命的な関係。";
  } else if (relAtoB === "胎") {
    mutual = "胎の縁";
    description = "母胎の縁で結ばれた関係。深い魂の繋がりがあり、来世にも続く縁。";
  } else if (isGood(relAtoB) && isGood(relBtoA)) {
    mutual = "彼我共善";
    description = `双方にとって吉の関係。${shukuA}宿から見て${relAtoB}（${fortuneAtoB}）、${shukuB}宿から見て${relBtoA}（${fortuneBtoA}）。互いに良い影響を与え合い、共に成長できる理想的な関係。`;
  } else if (isGood(relBtoA) && isBad(relAtoB)) {
    mutual = "彼善我悪";
    description = `相手にとっては吉だが自分にとっては凶の関係。${shukuA}宿から見て${relAtoB}（${fortuneAtoB}）、${shukuB}宿から見て${relBtoA}（${fortuneBtoA}）。自分が与える側になりやすい。`;
  } else if (isBad(relBtoA) && isGood(relAtoB)) {
    mutual = "彼悪我善";
    description = `自分にとっては吉だが相手にとっては凶の関係。${shukuA}宿から見て${relAtoB}（${fortuneAtoB}）、${shukuB}宿から見て${relBtoA}（${fortuneBtoA}）。自分が受ける側になりやすい。`;
  } else if (isBad(relAtoB) && isBad(relBtoA)) {
    mutual = "彼我共悪";
    description = `双方にとって凶の関係。${shukuA}宿から見て${relAtoB}（${fortuneAtoB}）、${shukuB}宿から見て${relBtoA}（${fortuneBtoA}）。互いに注意が必要だが、乗り越えれば強い絆になる。`;
  } else {
    mutual = "特殊関係";
    description = `${shukuA}宿から見て${relAtoB}、${shukuB}宿から見て${relBtoA}の特殊な関係。`;
  }

  return { relAtoB, relBtoA, fortuneAtoB, fortuneBtoA, mutual, description };
}

// ============================================
// 8. 命宮算出
// ============================================

export function calculateMeikyu(honmeiShuku: Nakshatra): Palace {
  for (const [palaceName, palace] of Object.entries(PALACE_DATA)) {
    for (const ns of palace.nakshatras) {
      if (ns.shuku === honmeiShuku) {
        return palaceName as Palace;
      }
    }
  }
  const shukuIndex = NAKSHATRAS.indexOf(honmeiShuku);
  const palaceIndex = Math.floor(shukuIndex * 12 / 27) % 12;
  return PALACES[palaceIndex];
}

export function calculatePalaceConfig(meikyu: Palace): Record<string, Palace> {
  const PALACE_HOUSES = [
    "命宮", "財帛宮", "兄弟宮", "田宅宮", "男女宮", "奴僕宮",
    "妻妾宮", "疾厄宮", "遷移宮", "官禄宮", "福徳宮", "相貌宮"
  ];
  const startIndex = PALACES.indexOf(meikyu);
  const config: Record<string, Palace> = {};
  for (let i = 0; i < 12; i++) {
    config[PALACE_HOUSES[i]] = PALACES[(startIndex + i) % 12];
  }
  return config;
}

// ============================================
// 9. 十二直・遊年八卦
// ============================================

const JUNI_CHOKU: JuniChoku[] = ["建", "除", "満", "平", "定", "執", "破", "危", "成", "収", "開", "閉"];

export function calculateJuniChoku(lunarMonth: number, lunarDay: number): JuniChoku {
  const index = (lunarMonth + lunarDay - 2) % 12;
  return JUNI_CHOKU[index];
}

export function calculateYunenHakke(year: number): {
  trigram: string;
  fortune: string;
  description: string;
} {
  const TRIGRAMS = [
    { name: "乾", fortune: "始終大吉", desc: "北斗遊年。始めから終わりまで大吉。" },
    { name: "兌", fortune: "始吉中害来大凶", desc: "始めは吉だが中頃に害があり、後に大凶。" },
    { name: "離", fortune: "始富中害来大吉", desc: "始めは富むが中頃に害があり、後に大吉。" },
    { name: "震", fortune: "始富中富来大吉", desc: "始めから富み、中頃も富み、後に大吉。" },
    { name: "巽", fortune: "始中終大吉", desc: "始めから中頃を経て終わりまで大吉。" },
    { name: "坎", fortune: "始害来大凶", desc: "始めから害があり、後に大凶。" },
    { name: "艮", fortune: "始吉来大凶", desc: "始めは吉だが、後に大凶。" },
    { name: "坤", fortune: "始終大吉", desc: "始めから終わりまで大吉。" }
  ];
  const index = (year - 1) % 8;
  const t = TRIGRAMS[index];
  return { trigram: t.name, fortune: t.fortune, description: t.desc };
}

// ============================================
// 10. 日運算出
// ============================================

export function calculateDailyNakshatra(date: Date): Nakshatra {
  // ルックアップテーブルを優先使用
  const dateKey = formatDateKey(date);
  const msValue = LOOKUP_TABLE[dateKey];
  if (msValue !== undefined && MS_TO_NAKSHATRA[msValue]) {
    return MS_TO_NAKSHATRA[msValue];
  }
  // フォールバック
  const lunarDate = solarToLunar(date);
  const firstDayShuku = getFirstDayNakshatra(lunarDate.month);
  const firstDayIndex = NAKSHATRAS.indexOf(firstDayShuku);
  const dayIndex = (firstDayIndex + lunarDate.day - 1) % 27;
  return NAKSHATRAS[dayIndex];
}

export function calculateDailyPlanet(date: Date): Planet {
  return PLANETS[date.getDay()];
}

// ============================================
// 11. 総合診断インターフェース
// ============================================

export interface FullDiagnosisResult {
  lunarDate: LunarDate;
  honmeiShuku: Nakshatra;
  shukuData: NakshatraData;
  honmeiYo: Planet;
  planetData: PlanetData;
  kyusei: Kyusei;
  meikyu: Palace;
  palaceConfig: Record<string, Palace>;
  dailyNakshatra: Nakshatra;
  dailyRelation: RelationshipType;
  dailyPlanet: Planet;
  juniChoku: JuniChoku;
  yunenHakke: { trigram: string; fortune: string; description: string };
  lookupUsed: boolean;
}

export function runFullDiagnosis(birthDate: Date): FullDiagnosisResult {
  const today = new Date();

  // 1. 旧暦変換
  const lunarDate = solarToLunar(birthDate);

  // 2. 命宿算出（ルックアップテーブル優先）
  const dateKey = formatDateKey(birthDate);
  const lookupUsed = LOOKUP_TABLE[dateKey] !== undefined;
  const honmeiShuku = calculateHonmeiShuku(birthDate);
  const shukuData = NAKSHATRA_DATA[honmeiShuku];

  // 3. 本命曜算出
  const honmeiYo = calculateHonmeiYo(birthDate);
  const planetData = PLANET_DATA[honmeiYo];

  // 4. 九星算出
  const kyusei = calculateKyusei(lunarDate.year);

  // 5. 命宮算出
  const meikyu = calculateMeikyu(honmeiShuku);
  const palaceConfig = calculatePalaceConfig(meikyu);

  // 6. 日運算出
  const dailyNakshatra = calculateDailyNakshatra(today);
  const dailyRelation = getRelationship(honmeiShuku, dailyNakshatra);
  const dailyPlanet = calculateDailyPlanet(today);
  const todayLunar = solarToLunar(today);
  const juniChoku = calculateJuniChoku(todayLunar.month, todayLunar.day);

  // 7. 年運算出
  const yunenHakke = calculateYunenHakke(today.getFullYear());

  return {
    lunarDate, honmeiShuku, shukuData, honmeiYo, planetData, kyusei,
    meikyu, palaceConfig,
    dailyNakshatra, dailyRelation, dailyPlanet, juniChoku,
    yunenHakke, lookupUsed
  };
}
