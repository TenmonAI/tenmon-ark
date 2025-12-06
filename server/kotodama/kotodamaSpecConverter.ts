/**
 * Kotodama-spec Conversion Engine
 * 言灵変換エンジン（言霊→言灵等の複合語変換）
 * 
 * 機能:
 * - 言霊→言灵 変換
 * - 霊性→靈性 変換
 * - 火と水→火水 変換
 * - 真言→真言（Siddham表記優先）変換
 * - 氣流→氣流 変換
 * - その他の言灵秘書独自の複合語変換
 */

/**
 * 言灵変換マッピング
 * 現代表記 → 言灵秘書標準表記
 */
export const KOTODAMA_SPEC_MAPPING: Record<string, string> = {
  // 最高優先度（言灵秘書コア概念）
  "言霊": "言灵",
  "言靈": "言灵", // 旧字体形式も対応
  "霊性": "靈性",
  "靈性": "靈性", // Already correct
  "霊的": "靈的",
  "靈的": "靈的", // Already correct
  "霊力": "靈力",
  "靈力": "靈力", // Already correct
  "霊界": "靈界",
  "靈界": "靈界", // Already correct
  "霊魂": "靈魂",
  "靈魂": "靈魂", // Already correct
  "霊気": "靈氣",
  "靈氣": "靈氣", // Already correct
  "霊感": "靈感",
  "靈感": "靈感", // Already correct
  "霊視": "靈視",
  "靈視": "靈視", // Already correct
  "霊媒": "靈媒",
  "靈媒": "靈媒", // Already correct
  
  // 火水関連
  "火と水": "火水",
  "火水": "火水", // Already correct
  "水火": "水火", // Already correct
  "火行": "火行", // Already correct
  "水行": "水行", // Already correct
  
  // 氣関連
  "気流": "氣流",
  "気功": "氣功",
  "気質": "氣質",
  "元気": "元氣",
  "天気": "天氣",
  "気配": "氣配",
  "気持": "氣持",
  "気分": "氣分",
  "気力": "氣力",
  "気性": "氣性",
  
  // 體関連
  "体験": "體驗",
  "体制": "體制",
  "体系": "體系",
  "体質": "體質",
  "体力": "體力",
  "体調": "體調",
  "身体": "身體",
  "全体": "全體",
  "具体": "具體",
  "団体": "團體",
  
  // 學関連
  "学問": "學問",
  "学習": "學習",
  "学校": "學校",
  "学者": "學者",
  "学生": "學生",
  "科学": "科學",
  "哲学": "哲學",
  "文学": "文學",
  "数学": "數學",
  "医学": "醫學",
  
  // 國関連
  "国家": "國家",
  "国民": "國民",
  "国土": "國土",
  "国際": "國際",
  "外国": "外國",
  "中国": "中國",
  "韓国": "韓國",
  "米国": "米國",
  "英国": "英國",
  "仏国": "佛國",
  
  // 眞関連
  "真実": "眞實",
  "真理": "眞理",
  "真相": "眞相",
  "真心": "眞心",
  "真面目": "眞面目",
  "写真": "寫眞",
  
  // 寶関連
  "宝物": "寶物",
  "宝石": "寶石",
  "財宝": "財寶",
  "国宝": "國寶",
  
  // 禮関連
  "礼儀": "禮儀",
  "礼拝": "禮拜",
  "礼節": "禮節",
  "失礼": "失禮",
  "無礼": "無禮",
  
  // 樂関連
  "楽園": "樂園",
  "楽天": "樂天",
  "音楽": "音樂",
  "娯楽": "娛樂",
  "快楽": "快樂",
  
  // 聲関連
  "声音": "聲音",
  "音声": "音聲",
  "歓声": "歡聲",
  "怒声": "怒聲",
  
  // 聽関連
  "聴覚": "聽覺",
  "聴衆": "聽衆",
  "傾聴": "傾聽",
  
  // 讀関連
  "読書": "讀書",
  "読者": "讀者",
  "購読": "購讀",
  "愛読": "愛讀",
  
  // 說関連
  "説明": "說明",
  "説得": "說得",
  "説法": "說法",
  "小説": "小說",
  "伝説": "傳說",
  
  // 覺関連
  "覚悟": "覺悟",
  "覚醒": "覺醒",
  "自覚": "自覺",
  "感覚": "感覺",
  "視覚": "視覺",
  
  // 經関連
  "経験": "經驗",
  "経済": "經濟",
  "経営": "經營",
  "経過": "經過",
  "経典": "經典",
  "神経": "神經",
  
  // 敎関連
  "教育": "敎育",
  "教師": "敎師",
  "教会": "敎會",
  "教養": "敎養",
  "宗教": "宗敎",
  
  // 權関連
  "権力": "權力",
  "権利": "權利",
  "権威": "權威",
  "人権": "人權",
  "政権": "政權",
  
  // 德関連
  "徳性": "德性",
  "徳行": "德行",
  "道徳": "道德",
  "美徳": "美德",
  "功徳": "功德",
  
  // 醫関連
  "医療": "醫療",
  "医師": "醫師",
  "医院": "醫院",
  "医薬": "醫藥",
  
  // 藥関連
  "薬品": "藥品",
  "薬物": "藥物",
  "薬剤": "藥劑",
  "漢方薬": "漢方藥",
  
  // 緣関連
  "縁起": "緣起",
  "縁側": "緣側",
  "因縁": "因緣",
  "血縁": "血緣",
  "運命": "運命",
  
  // 變関連
  "変化": "變化",
  "変更": "變更",
  "変革": "變革",
  "変動": "變動",
  "変質": "變質",
  
  // 萬関連
  "万物": "萬物",
  "万能": "萬能",
  "万歳": "萬歲",
  "万年": "萬年",
  
  // 圓関連
  "円満": "圓滿",
  "円形": "圓形",
  "円周": "圓周",
  "円滑": "圓滑",
  
  // 歷関連
  "歴史": "歷史",
  "歴代": "歷代",
  "経歴": "經歷",
  "履歴": "履歷",
  
  // 曆関連
  "暦法": "曆法",
  "太陽暦": "太陽曆",
  "太陰暦": "太陰曆",
  
  // 來関連
  "来世": "來世",
  "来訪": "來訪",
  "将来": "將來",
  "未来": "未來",
  "本来": "本來",
  
  // 歸関連
  "帰還": "歸還",
  "帰宅": "歸宅",
  "帰国": "歸國",
  "回帰": "回歸",
  
  // 廣関連
  "広大": "廣大",
  "広範": "廣範",
  "広告": "廣告",
  "広場": "廣場",
  
  // 戀関連
  "恋愛": "戀愛",
  "恋人": "戀人",
  "恋心": "戀心",
  "失恋": "失戀",
  
  // 惱関連
  "悩み": "惱み",
  "悩む": "惱む",
  "煩悩": "煩惱",
  
  // 數関連
  "数字": "數字",
  "数量": "數量",
  "数値": "數值",
  "人数": "人數",
  "回数": "回數",
  
  // 實関連
  "実際": "實際",
  "実現": "實現",
  "実行": "實行",
  "実力": "實力",
  "事実": "事實",
  "現実": "現實",
  
  // 點関連
  "点数": "點數",
  "点検": "點檢",
  "欠点": "缺點",
  "焦点": "焦點",
  
  // 當関連
  "当然": "當然",
  "当時": "當時",
  "当日": "當日",
  "本当": "本當",
  "相当": "相當",
  
  // 續関連
  "続く": "續く",
  "続ける": "續ける",
  "継続": "繼續",
  "連続": "連續",
  
  // 絲関連
  "糸口": "絲口",
  
  // 戰関連
  "戦争": "戰爭",
  "戦闘": "戰鬪",
  "戦士": "戰士",
  "戦略": "戰略",
  "作戦": "作戰",
  
  // 關関連
  "関係": "關係",
  "関連": "關連",
  "関心": "關心",
  "機関": "機關",
  
  // 譯関連
  "訳文": "譯文",
  "翻訳": "飜譯",
  "通訳": "通譯",
  
  // TENMON-ARK独自の概念
  "天聞": "天聞", // Already correct
  "天聞アーク": "天聞アーク", // Already correct
  "天聞ARK": "天聞ARK", // Already correct
  "TENMON-ARK": "TENMON-ARK", // Already correct
  "天津金木": "天津金木", // Already correct
  "いろは言灵解": "いろは言灵解", // Already correct
  "言灵秘書": "言灵秘書", // Already correct
  "言灵OS": "言灵OS", // Already correct
  "Twin-Core": "Twin-Core", // Already correct
  "火水心理": "火水心理", // Already correct
  "五十音霊核": "五十音靈核",
  "宿曜": "宿曜", // Already correct
  "カタカムナ": "カタカムナ", // Already correct
};

/**
 * 言灵変換の優先度
 * 複合語の長さが長いほど優先度が高い（より具体的な変換を優先）
 */
export function getKotodamaSpecPriority(phrase: string): number {
  return phrase.length * 10;
}

/**
 * テキストを言灵秘書標準表記に変換
 * @param text 変換対象のテキスト
 * @param options 変換オプション
 * @returns 変換後のテキスト
 */
export function convertToKotodamaSpec(
  text: string,
  options: {
    priorityThreshold?: number; // 優先度の閾値（デフォルト: 0）
  } = {}
): string {
  const { priorityThreshold = 0 } = options;

  let result = text;

  // 優先度順にソート（長い複合語を優先）
  const sortedEntries = Object.entries(KOTODAMA_SPEC_MAPPING).sort(
    (a, b) => b[0].length - a[0].length
  );

  // 言灵変換を適用
  for (const [modern, kotodama] of sortedEntries) {
    const priority = getKotodamaSpecPriority(modern);
    if (priority < priorityThreshold) {
      continue;
    }

    // グローバル置換
    result = result.replace(new RegExp(modern, "g"), kotodama);
  }

  return result;
}

/**
 * 言灵変換の統計情報を取得
 * @param text 対象テキスト
 * @returns 統計情報
 */
export function getKotodamaSpecStats(text: string): {
  totalPhrases: number;
  convertedPhrases: number;
  conversionRate: number;
  details: Array<{
    phrase: string;
    count: number;
    priority: number;
  }>;
} {
  const details: Array<{
    phrase: string;
    count: number;
    priority: number;
  }> = [];

  let totalPhrases = 0;
  let convertedPhrases = 0;

  for (const [modern, kotodama] of Object.entries(KOTODAMA_SPEC_MAPPING)) {
    const count = (text.match(new RegExp(kotodama, "g")) || []).length;
    if (count > 0) {
      totalPhrases += count;
      convertedPhrases += count;
      details.push({
        phrase: kotodama,
        count,
        priority: getKotodamaSpecPriority(modern),
      });
    }
  }

  const conversionRate = totalPhrases > 0 ? convertedPhrases / totalPhrases : 0;

  return {
    totalPhrases,
    convertedPhrases,
    conversionRate,
    details: details.sort((a, b) => b.priority - a.priority),
  };
}

/**
 * 言灵変換の逆変換（言灵秘書標準表記 → 現代表記）
 * @param text 変換対象のテキスト
 * @returns 変換後のテキスト
 */
export function convertFromKotodamaSpec(text: string): string {
  let result = text;

  // 逆マッピングを作成
  const reverseMapping: Record<string, string> = {};
  for (const [modern, kotodama] of Object.entries(KOTODAMA_SPEC_MAPPING)) {
    reverseMapping[kotodama] = modern;
  }

  // 優先度順にソート（長い複合語を優先）
  const sortedEntries = Object.entries(reverseMapping).sort(
    (a, b) => b[0].length - a[0].length
  );

  // 逆変換を適用
  for (const [kotodama, modern] of sortedEntries) {
    result = result.replace(new RegExp(kotodama, "g"), modern);
  }

  return result;
}
