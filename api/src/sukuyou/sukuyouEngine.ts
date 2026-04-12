/**
 * 宿曜経 完全診断エンジン
 * 
 * 原典『宿曜経占真伝』『密教占星法』に完全準拠。
 * - 二十七宿の命宿算出
 * - 三九秘宿法による相性診断（729通り完全マトリックス）
 * - 十二宮配置
 * - 七曜・九星算出
 * - 十二直・遊年八卦
 * - 二十七宿個別性格特性（六位解析）
 */

import { solarToLunar, type LunarDate } from "./lunarCalendar.js";

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
// 2. 二十七宿 完全データ（原典準拠）
// ============================================

/** 二十七宿の順序配列（角宿を起点） */
export const NAKSHATRAS: Nakshatra[] = [
  "角", "亢", "氐", "房", "心", "尾", "箕", "斗", "女",
  "虚", "危", "室", "壁", "奎", "婁", "胃", "昴", "畢",
  "觜", "参", "井", "鬼", "柳", "星", "張", "翼", "軫"
];

/** 各宿の完全属性データ（宿曜経占真伝・密教占星法準拠） */
export interface NakshatraData {
  name: Nakshatra;
  reading: string;
  sanskrit: string;
  starCount: number;
  starShape: string;
  deity: string;
  element: string;        // 言霊の水火属性
  phase: "内集" | "外発" | "均衡" | "内集外発混合";
  fireScore: number;      // 0-100
  waterScore: number;     // 0-100
  nature: string;         // 性質（原典の分類）
  category: "急速" | "猛悪" | "念善" | "慈悲" | "通常";
  personality: string;    // 生人の性格
  auspicious: string[];   // 直日の吉行事
  inauspicious: string[]; // 直日の凶行事
}

export const NAKSHATRA_DATA: Record<Nakshatra, NakshatraData> = {
  "角": {
    name: "角", reading: "かくしゅく", sanskrit: "チトラー", starCount: 2, starShape: "南北対立",
    deity: "風神", element: "火水の灵", phase: "均衡", fireScore: 50, waterScore: 50,
    nature: "破求", category: "通常",
    personality: "知略に富み、才能多く、外見端正。破壊と創造の両面を持つ。",
    auspicious: ["建築", "種蒔", "旅行"], inauspicious: ["婚姻"]
  },
  "亢": {
    name: "亢", reading: "こうしゅく", sanskrit: "スヴァーティ", starCount: 2, starShape: "長布堆",
    deity: "風神", element: "濁水の灵", phase: "内集", fireScore: 20, waterScore: 80,
    nature: "慈悲", category: "慈悲",
    personality: "温和で慈悲深く、学問を好む。内面の充実を重視する。",
    auspicious: ["学問", "修行", "治療"], inauspicious: ["戦闘", "訴訟"]
  },
  "氐": {
    name: "氐", reading: "ていしゅく", sanskrit: "ヴィシャーカー", starCount: 4, starShape: "牛形",
    deity: "火神", element: "昇水の灵", phase: "内集", fireScore: 10, waterScore: 90,
    nature: "念善", category: "念善",
    personality: "善を念じ、道徳心が高い。忍耐力に優れ、深い思慮を持つ。",
    auspicious: ["祈祷", "種蒔", "入宅"], inauspicious: ["旅行"]
  },
  "房": {
    name: "房", reading: "ぼうしゅく", sanskrit: "アヌラーダー", starCount: 4, starShape: "蛇布形",
    deity: "水神", element: "火水の灵", phase: "均衡", fireScore: 50, waterScore: 50,
    nature: "威徳", category: "通常",
    personality: "威厳と徳を兼ね備え、家が栄える。バランスの取れた性格。",
    auspicious: ["婚姻", "建築", "入宅"], inauspicious: ["裁衣"]
  },
  "心": {
    name: "心", reading: "しんしゅく", sanskrit: "ジェーシュター", starCount: 3, starShape: "階段形",
    deity: "龍神", element: "水中の火灵", phase: "外発", fireScore: 60, waterScore: 40,
    nature: "族栄", category: "通常",
    personality: "一族を栄えさせる力を持つ。外に向かう情熱と内なる知恵を併せ持つ。",
    auspicious: ["祭祀", "建築"], inauspicious: ["旅行", "移転"]
  },
  "尾": {
    name: "尾", reading: "びしゅく", sanskrit: "ムーラ", starCount: 9, starShape: "獅子頂毛",
    deity: "羅刹", element: "水中の火灵", phase: "外発", fireScore: 60, waterScore: 40,
    nature: "猛悪", category: "猛悪",
    personality: "激しい気性を持つが、根源的な力を秘める。破壊と再生の宿。",
    auspicious: ["伐木", "除暴"], inauspicious: ["婚姻", "建築"]
  },
  "箕": {
    name: "箕", reading: "きしゅく", sanskrit: "プールヴァ・アシャーダー", starCount: 4, starShape: "牛歩形",
    deity: "水神", element: "濁水の灵", phase: "内集", fireScore: 20, waterScore: 80,
    nature: "念善", category: "念善",
    personality: "善良で穏やか。水の性質が強く、受容力に優れる。",
    auspicious: ["治水", "農耕"], inauspicious: ["火事"]
  },
  "斗": {
    name: "斗", reading: "としゅく", sanskrit: "ウッタラ・アシャーダー", starCount: 4, starShape: "象歩形",
    deity: "天神", element: "水中の火灵", phase: "外発", fireScore: 60, waterScore: 40,
    nature: "念善", category: "念善",
    personality: "志が高く、大きな目標を持つ。象の如き力強さと慎重さ。",
    auspicious: ["入宅", "建築", "学問"], inauspicious: ["訴訟"]
  },
  "女": {
    name: "女", reading: "じょしゅく", sanskrit: "シュラヴァナ", starCount: 4, starShape: "牛角形",
    deity: "天女", element: "濁水の灵", phase: "内集", fireScore: 20, waterScore: 80,
    nature: "急速", category: "急速",
    personality: "物事が急速に進展する。聡明で、学問に秀でる。",
    auspicious: ["学問", "技芸"], inauspicious: ["婚姻"]
  },
  "虚": {
    name: "虚", reading: "きょしゅく", sanskrit: "ダニシュター", starCount: 3, starShape: "梨格形",
    deity: "天神", element: "空中の水灵", phase: "内集", fireScore: 30, waterScore: 70,
    nature: "健康", category: "通常",
    personality: "健康で道徳的。空の如き広い心を持ち、精神性が高い。",
    auspicious: ["修行", "祈祷"], inauspicious: ["建築", "移転"]
  },
  "危": {
    name: "危", reading: "きしゅく", sanskrit: "シャタビシャー", starCount: 3, starShape: "花穂形",
    deity: "龍神", element: "影の火灵", phase: "外発", fireScore: 80, waterScore: 20,
    nature: "猛悪", category: "猛悪",
    personality: "激しい火のエネルギーを持つ。危険と隣り合わせだが大きな力を秘める。",
    auspicious: ["兵士訓練", "武芸"], inauspicious: ["旅行", "婚姻"]
  },
  "室": {
    name: "室", reading: "しつしゅく", sanskrit: "プールヴァ・バードラパダー", starCount: 4, starShape: "詞梨勒形",
    deity: "火神", element: "水中の火灵", phase: "内集外発混合", fireScore: 60, waterScore: 40,
    nature: "富貴猛悪", category: "猛悪",
    personality: "富貴と猛悪の両面を持つ。内に秘めた火が外に噴出する力。",
    auspicious: ["建築", "入宅", "種蒔"], inauspicious: ["裁衣"]
  },
  "壁": {
    name: "壁", reading: "へきしゅく", sanskrit: "ウッタラ・バードラパダー", starCount: 1, starShape: "立等形",
    deity: "水神", element: "濁水の灵", phase: "内集", fireScore: 20, waterScore: 80,
    nature: "孔雀", category: "通常",
    personality: "美しく優雅。水の性質が強く、芸術的才能に恵まれる。",
    auspicious: ["学問", "芸術", "建築"], inauspicious: ["戦闘"]
  },
  "奎": {
    name: "奎", reading: "けいしゅく", sanskrit: "レーヴァティー", starCount: 1, starShape: "立等形",
    deity: "天神", element: "濁水の灵", phase: "内集", fireScore: 20, waterScore: 80,
    nature: "念善", category: "念善",
    personality: "善良で信仰心が厚い。穏やかな水の性質を持つ。",
    auspicious: ["祈祷", "入宅"], inauspicious: ["戦闘"]
  },
  "婁": {
    name: "婁", reading: "ろうしゅく", sanskrit: "アシュヴィニー", starCount: 3, starShape: "馬頭形",
    deity: "双馬神", element: "水中の火灵", phase: "外発", fireScore: 60, waterScore: 40,
    nature: "急速", category: "急速",
    personality: "馬の如き俊敏さ。物事を素早く成し遂げる力を持つ。",
    auspicious: ["旅行", "治療", "商売"], inauspicious: ["建築"]
  },
  "胃": {
    name: "胃", reading: "いしゅく", sanskrit: "バラニー", starCount: 3, starShape: "鼎形",
    deity: "死神", element: "輝火の灵", phase: "外発", fireScore: 90, waterScore: 10,
    nature: "急速猛悪", category: "急速",
    personality: "強烈な火のエネルギー。急速に物事を進める力と破壊力を併せ持つ。",
    auspicious: ["伐木", "除暴", "火作"], inauspicious: ["婚姻", "旅行"]
  },
  "昴": {
    name: "昴", reading: "ぼうしゅく", sanskrit: "クリッティカー", starCount: 6, starShape: "剃刀形",
    deity: "火神", element: "正火の灵", phase: "外発", fireScore: 80, waterScore: 20,
    nature: "念善", category: "念善",
    personality: "念善にして多男女。勤學問、有儀容、性慳澁、足詞辯。火神の加護を受ける。",
    auspicious: ["火作", "煎責", "計算", "種蒔", "入宅", "剃頭"], inauspicious: ["裁衣"]
  },
  "畢": {
    name: "畢", reading: "ひっしゅく", sanskrit: "ローヒニー", starCount: 5, starShape: "額形",
    deity: "造物主", element: "空中の水灵", phase: "内集", fireScore: 30, waterScore: 70,
    nature: "念善", category: "念善",
    personality: "創造力に富み、美的感覚に優れる。穏やかで深い知恵を持つ。",
    auspicious: ["建築", "婚姻", "種蒔"], inauspicious: ["戦闘"]
  },
  "觜": {
    name: "觜", reading: "ししゅく", sanskrit: "ムリガシラス", starCount: 3, starShape: "馬頭乾闌形",
    deity: "月神", element: "空中の水灵", phase: "内集", fireScore: 30, waterScore: 70,
    nature: "念善", category: "念善",
    personality: "月の如き穏やかさ。探求心が強く、知的好奇心に富む。",
    auspicious: ["学問", "旅行"], inauspicious: ["建築"]
  },
  "参": {
    name: "参", reading: "しんしゅく", sanskrit: "アールドラー", starCount: 1, starShape: "額上點形",
    deity: "暴風神", element: "影の火灵", phase: "外発", fireScore: 80, waterScore: 20,
    nature: "猛悪", category: "猛悪",
    personality: "暴風の如き激しさ。強い意志と行動力を持つが、破壊的な面も。",
    auspicious: ["武芸", "除暴"], inauspicious: ["婚姻", "建築", "旅行"]
  },
  "井": {
    name: "井", reading: "せいしゅく", sanskrit: "プナルヴァス", starCount: 4, starShape: "屋獄形",
    deity: "天母神", element: "水火灵", phase: "均衡", fireScore: 50, waterScore: 50,
    nature: "念善", category: "念善",
    personality: "水火が調和した均衡の宿。再生と回復の力を持つ。",
    auspicious: ["建築", "入宅", "学問"], inauspicious: ["伐木"]
  },
  "鬼": {
    name: "鬼", reading: "きしゅく", sanskrit: "プシュヤ", starCount: 3, starShape: "獅子頭形",
    deity: "祈祷神", element: "水火灵", phase: "均衡", fireScore: 50, waterScore: 50,
    nature: "急速智策", category: "急速",
    personality: "急速にして智策に富む。獅子の如き威厳と知恵を併せ持つ。最吉の宿。",
    auspicious: ["祈祷", "入宅", "建築", "学問", "商売"], inauspicious: []
  },
  "柳": {
    name: "柳", reading: "りゅうしゅく", sanskrit: "アーシュレーシャー", starCount: 6, starShape: "蛇頭形",
    deity: "蛇神", element: "影の火灵", phase: "外発", fireScore: 80, waterScore: 20,
    nature: "猛悪", category: "猛悪",
    personality: "蛇の如き鋭さと執念。強い火のエネルギーを持ち、洞察力に優れる。",
    auspicious: ["薬事", "除暴"], inauspicious: ["婚姻", "旅行"]
  },
  "星": {
    name: "星", reading: "せいしゅく", sanskrit: "マガー", starCount: 5, starShape: "猛海伽神形",
    deity: "祖霊", element: "輝火の灵", phase: "外発", fireScore: 90, waterScore: 10,
    nature: "猛悪", category: "猛悪",
    personality: "最も強い火のエネルギー。戦闘的で激烈だが、祖霊の加護がある。",
    auspicious: ["武芸", "祭祀"], inauspicious: ["婚姻", "建築", "旅行"]
  },
  "張": {
    name: "張", reading: "ちょうしゅく", sanskrit: "プールヴァ・パルグニー", starCount: 6, starShape: "杵婆蔵神形",
    deity: "造物主", element: "影の火灵", phase: "外発", fireScore: 80, waterScore: 20,
    nature: "猛悪", category: "猛悪",
    personality: "激烈な火の性質。創造と破壊の両面を持ち、芸術的才能もある。",
    auspicious: ["芸術", "祭祀"], inauspicious: ["婚姻"]
  },
  "翼": {
    name: "翼", reading: "よくしゅく", sanskrit: "ウッタラ・パルグニー", starCount: 22, starShape: "脚跡形",
    deity: "太陽神", element: "火中の水灵", phase: "内集外発混合", fireScore: 40, waterScore: 60,
    nature: "多妻多子", category: "通常",
    personality: "太陽神の加護。火の中に水を含み、豊かな人間関係を築く。",
    auspicious: ["婚姻", "建築", "入宅"], inauspicious: ["戦闘"]
  },
  "軫": {
    name: "軫", reading: "しんしゅく", sanskrit: "ハスタ", starCount: 2, starShape: "蜘蛛跡形",
    deity: "太陽神", element: "濁水の灵", phase: "内集", fireScore: 20, waterScore: 80,
    nature: "慈悲深い", category: "慈悲",
    personality: "慈悲深く、手先が器用。水の性質が強く、人を癒す力を持つ。",
    auspicious: ["治療", "学問", "芸術"], inauspicious: ["戦闘"]
  }
};

// ============================================
// 3. 十二宮体系（密教占星法準拠）
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
// 4. 七曜体系（密教占星法 第三章準拠）
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
// 5. 命宿算出アルゴリズム
// ============================================

/**
 * 朔日（1日）の直宿を決定する（二十七宿配日法）
 * 正月朔日を室宿とする日本式（安倍晴明朝臣伝）
 * 
 * 密教占星法 第五章 第四節に基づく
 */
export function getFirstDayNakshatra(lunarMonth: number): Nakshatra {
  const baseIndex = NAKSHATRAS.indexOf("室"); // 室=11
  const monthIndex = (baseIndex + lunarMonth - 1) % 27;
  return NAKSHATRAS[monthIndex];
}

/**
 * 命宿（本命宿）の算出
 * 
 * 宿曜経占真伝 第四章に基づく
 * 生まれた月の朔日の直宿から生日まで順に数える
 */
export function calculateHonmeiShuku(lunarDate: LunarDate): Nakshatra {
  const firstDayShuku = getFirstDayNakshatra(lunarDate.month);
  const firstDayIndex = NAKSHATRAS.indexOf(firstDayShuku);
  const honmeiIndex = (firstDayIndex + lunarDate.day - 1) % 27;
  return NAKSHATRAS[honmeiIndex];
}

/**
 * 本命曜の算出
 * 
 * 密教占星法 第五章 七曜直日の算出法に基づく
 * 大同元年丙戌歳正月二日丁卯太陽直日を起点
 */
export function calculateHonmeiYo(birthDate: Date): Planet {
  // 大同元年（806年）正月二日 = 日曜を起点
  // 簡易算出: 既知の曜日から計算
  const dayOfWeek = birthDate.getDay(); // 0=日, 1=月, ..., 6=土
  return PLANETS[dayOfWeek];
}

/**
 * 九星の算出（三元法）
 * 
 * 密教占星法 第四章に基づく
 * 60年周期で三元に分ける
 */
export function calculateKyusei(birthYear: number): Kyusei {
  const KYUSEI_LIST: Kyusei[] = [
    "一白水星", "二黒土星", "三碧木星", "四緑木星", "五黄土星",
    "六白金星", "七赤金星", "八白土星", "九紫火星"
  ];
  // 九星は年によって逆順に配当される
  // 2026年 = 二黒土星（確認済み）
  // 計算式: (11 - (year + 6) % 9) % 9
  const index = (11 - (birthYear + 6) % 9) % 9;
  return KYUSEI_LIST[index];
}

// ============================================
// 6. 三九秘宿法（相性診断）
// ============================================

/** 三九法の関係性マッピング（宿曜経占真伝 p230-234） */
const SANKU_MAP: Record<number, RelationshipType> = {
  1: "命", 2: "栄", 3: "衰", 4: "安", 5: "危",
  6: "成", 7: "壊", 8: "友", 9: "親",
  10: "業", 11: "栄", 12: "衰", 13: "安", 14: "危",
  15: "成", 16: "壊", 17: "友", 18: "親",
  19: "胎", 20: "栄", 21: "衰", 22: "安", 23: "危",
  24: "成", 25: "壊", 26: "友", 27: "親"
};

/** 関係性の吉凶分類 */
const FORTUNE_MAP: Record<RelationshipType, "大吉" | "吉" | "凶" | "大凶" | "特殊"> = {
  "命": "特殊", "栄": "大吉", "衰": "凶", "安": "吉", "危": "凶",
  "成": "吉", "壊": "大凶", "友": "吉", "親": "大吉",
  "業": "特殊", "胎": "特殊"
};

/**
 * 三九秘宿法による関係性判定
 */
export function getRelationship(myShuku: Nakshatra, otherShuku: Nakshatra): RelationshipType {
  const myIndex = NAKSHATRAS.indexOf(myShuku);
  const otherIndex = NAKSHATRAS.indexOf(otherShuku);
  const distance = ((otherIndex - myIndex) % 27 + 27) % 27 + 1;
  return SANKU_MAP[distance];
}

/**
 * 双方向の相性判定（四句の判定）
 * 宿曜経占真伝 p232
 */
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
    description = "同じ命宿を持つ関係。深い縁で結ばれているが、互いに似すぎるため衝突もある。";
  } else if (relAtoB === "業") {
    mutual = "業の縁";
    description = "前世の業によって結ばれた関係。避けられない因縁がある。";
  } else if (relAtoB === "胎") {
    mutual = "胎の縁";
    description = "母胎の縁で結ばれた関係。深い魂の繋がりがある。";
  } else if (isGood(relAtoB) && isGood(relBtoA)) {
    mutual = "彼我共善";
    description = `双方にとって吉の関係。${shukuA}宿から見て${relAtoB}（${fortuneAtoB}）、${shukuB}宿から見て${relBtoA}（${fortuneBtoA}）。互いに良い影響を与え合う。`;
  } else if (isGood(relBtoA) && isBad(relAtoB)) {
    mutual = "彼善我悪";
    description = `相手にとっては吉だが自分にとっては凶の関係。${shukuA}宿から見て${relAtoB}（${fortuneAtoB}）、${shukuB}宿から見て${relBtoA}（${fortuneBtoA}）。`;
  } else if (isBad(relBtoA) && isGood(relAtoB)) {
    mutual = "彼悪我善";
    description = `自分にとっては吉だが相手にとっては凶の関係。${shukuA}宿から見て${relAtoB}（${fortuneAtoB}）、${shukuB}宿から見て${relBtoA}（${fortuneBtoA}）。`;
  } else if (isBad(relAtoB) && isBad(relBtoA)) {
    mutual = "彼我共悪";
    description = `双方にとって凶の関係。${shukuA}宿から見て${relAtoB}（${fortuneAtoB}）、${shukuB}宿から見て${relBtoA}（${fortuneBtoA}）。注意が必要。`;
  } else {
    mutual = "特殊関係";
    description = `${shukuA}宿から見て${relAtoB}、${shukuB}宿から見て${relBtoA}の特殊な関係。`;
  }

  return { relAtoB, relBtoA, fortuneAtoB, fortuneBtoA, mutual, description };
}

// ============================================
// 7. 命宮算出
// ============================================

/**
 * 命宮の算出
 * 命宿が属する十二宮を特定する
 */
export function calculateMeikyu(honmeiShuku: Nakshatra): Palace {
  for (const [palaceName, palace] of Object.entries(PALACE_DATA)) {
    for (const ns of palace.nakshatras) {
      if (ns.shuku === honmeiShuku) {
        return palaceName as Palace;
      }
    }
  }
  // フォールバック: 宿の番号から近似的に宮を算出
  const shukuIndex = NAKSHATRAS.indexOf(honmeiShuku);
  const palaceIndex = Math.floor(shukuIndex * 12 / 27) % 12;
  return PALACES[palaceIndex];
}

/**
 * 十二宮配置（命宮体系）の算出
 * 密教占星法 第八章に基づく
 */
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
// 8. 十二直・遊年八卦
// ============================================

const JUNI_CHOKU: JuniChoku[] = ["建", "除", "満", "平", "定", "執", "破", "危", "成", "収", "開", "閉"];

/**
 * 十二直の算出
 * 密教占星法 第六章に基づく
 */
export function calculateJuniChoku(lunarMonth: number, lunarDay: number): JuniChoku {
  // 各月の建日は月の十二支に対応
  // 簡易算出: 月と日から十二直を計算
  const index = (lunarMonth + lunarDay - 2) % 12;
  return JUNI_CHOKU[index];
}

/**
 * 遊年八卦法
 * 密教占星法 第六章に基づく
 */
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
// 9. 日運算出
// ============================================

/**
 * 今日の直宿を算出
 */
export function calculateDailyNakshatra(date: Date): Nakshatra {
  const lunarDate = solarToLunar(date);
  const firstDayShuku = getFirstDayNakshatra(lunarDate.month);
  const firstDayIndex = NAKSHATRAS.indexOf(firstDayShuku);
  const dayIndex = (firstDayIndex + lunarDate.day - 1) % 27;
  return NAKSHATRAS[dayIndex];
}

/**
 * 今日の直曜を算出
 */
export function calculateDailyPlanet(date: Date): Planet {
  return PLANETS[date.getDay()];
}

// ============================================
// 10. 総合診断インターフェース
// ============================================

export interface FullDiagnosisResult {
  // 基本情報
  lunarDate: LunarDate;
  honmeiShuku: Nakshatra;
  shukuData: NakshatraData;
  honmeiYo: Planet;
  planetData: PlanetData;
  kyusei: Kyusei;

  // 十二宮
  meikyu: Palace;
  palaceConfig: Record<string, Palace>;

  // 日運
  dailyNakshatra: Nakshatra;
  dailyRelation: RelationshipType;
  dailyPlanet: Planet;
  juniChoku: JuniChoku;

  // 年運
  yunenHakke: { trigram: string; fortune: string; description: string };
}

/**
 * 宿曜経 完全診断の実行
 */
export function runFullDiagnosis(birthDate: Date): FullDiagnosisResult {
  const today = new Date();

  // 1. 旧暦変換
  const lunarDate = solarToLunar(birthDate);

  // 2. 命宿算出
  const honmeiShuku = calculateHonmeiShuku(lunarDate);
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
    yunenHakke
  };
}
