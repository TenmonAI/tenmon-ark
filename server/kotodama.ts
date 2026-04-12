/**
 * 言灵五十音深層構文解析
 * 
 * 五十音は天地の水火の流れを示す灵的な「音の地図」。
 * ア行〜ワ行は水火十行構造に従い、天地創造のプロセスそのものを音で表している。
 * 
 * 【唯一の参照元】言灵秘書（山口志道霊学全集）
 * インターネット検索、外部情報、推測による解釈は禁止。
 * 
 * v3_gojiuren_51: 言灵秘書原典（五十連十行法則）10行×5列=50音+ン=51音完全準拠版
 */

/**
 * 五十音の行（言灵秘書 五列十行準拠）
 */
export enum KotodamaRow {
  A = "a",   // ア行：空中の水の灵
  KA = "ka", // カ行：煇火の灵
  SA = "sa", // サ行：昇水の灵
  TA = "ta", // タ行：水中の火の灵
  NA = "na", // ナ行：火水の灵
  HA = "ha", // ハ行：正火の灵
  MA = "ma", // マ行：火中の水の灵
  YA = "ya", // ヤ行：火水の灵（八行）
  RA = "ra", // ラ行：濁水の灵
  WA = "wa", // ワ行：水火の灵
}

/**
 * 五十音の段
 */
export enum KotodamaColumn {
  A = "a",   // ア段
  I = "i",   // イ段
  U = "u",   // ウ段
  E = "e",   // エ段
  O = "o",   // オ段
}

/**
 * 五十音の1音（KHS準拠）
 */
export interface KotodamaSound {
  sound: string;
  row: KotodamaRow;
  column: KotodamaColumn;
  spiritualMeaning: string;
  fireWaterNature: "fire" | "water" | "neutral" | "fire_in_water" | "water_in_fire" | "fire_water" | "water_fire" | "turbid_water" | "condensed";
  element: "heaven" | "earth" | "human";
  /** KHS原典分類 */
  khsClassification?: string;
}

/**
 * 五十音のマスターデータ（言灵秘書原典準拠）
 * 
 * 分類法則:
 *   ア行 = 空中の水の灵（water）
 *   カ行 = 煇火の灵（fire）
 *   サ行 = 昇水の灵（water）
 *   タ行 = 水中の火の灵（fire_in_water）
 *   ナ行 = 火水の灵（fire_water）
 *   ハ行 = 正火の灵（fire）
 *   マ行 = 火中の水の灵（water_in_fire）
 *   ヤ行 = 火水の灵（fire_water）
 *   ラ行 = 濁水の灵（turbid_water）
 *   ワ行 = 水火の灵（water_fire）
 */
const KOTODAMA_SOUNDS: KotodamaSound[] = [
  // ═══════════════════════════════════════════
  // ア行：空中の水の灵
  // ═══════════════════════════════════════════
  { sound: "あ", row: KotodamaRow.A, column: KotodamaColumn.A, spiritualMeaning: "無にして有也・五十連の総名也・天也・海也・吾也・自然也", fireWaterNature: "water", element: "heaven", khsClassification: "空中の水の灵" },
  { sound: "い", row: KotodamaRow.A, column: KotodamaColumn.I, spiritualMeaning: "出息也・命也・灵核", fireWaterNature: "water", element: "heaven", khsClassification: "空中の水の灵" },
  { sound: "う", row: KotodamaRow.A, column: KotodamaColumn.U, spiritualMeaning: "浮き昇る也・動也・生也・暗也", fireWaterNature: "water", element: "heaven", khsClassification: "空中の水の灵" },
  { sound: "え", row: KotodamaRow.A, column: KotodamaColumn.E, spiritualMeaning: "天地の胞衣也・枝也・肢也・灵核", fireWaterNature: "water", element: "heaven", khsClassification: "空中の水の灵" },
  { sound: "お", row: KotodamaRow.A, column: KotodamaColumn.O, spiritualMeaning: "起也・貴也・高也・於也・天の総括音", fireWaterNature: "water", element: "heaven", khsClassification: "空中の水の灵" },

  // ═══════════════════════════════════════════
  // カ行：煇火の灵
  // ═══════════════════════════════════════════
  { sound: "か", row: KotodamaRow.KA, column: KotodamaColumn.A, spiritualMeaning: "影也・別也・香也・必也・陽の昇也・搦也", fireWaterNature: "fire", element: "heaven", khsClassification: "煇火の灵" },
  { sound: "き", row: KotodamaRow.KA, column: KotodamaColumn.I, spiritualMeaning: "氣也・正中也・限也・生也・貴也・来也", fireWaterNature: "fire", element: "heaven", khsClassification: "煇火の灵" },
  { sound: "く", row: KotodamaRow.KA, column: KotodamaColumn.U, spiritualMeaning: "氣の降る也・与也・土也・黒也・濁也", fireWaterNature: "fire", element: "heaven", khsClassification: "煇火の灵" },
  { sound: "け", row: KotodamaRow.KA, column: KotodamaColumn.E, spiritualMeaning: "差別也・正也・香也・器也・五穀也", fireWaterNature: "fire", element: "heaven", khsClassification: "煇火の灵" },
  { sound: "こ", row: KotodamaRow.KA, column: KotodamaColumn.O, spiritualMeaning: "男也・女也・総ての人の灵也・凝也・器也", fireWaterNature: "fire", element: "heaven", khsClassification: "煇火の灵" },

  // ═══════════════════════════════════════════
  // サ行：昇水の灵
  // ═══════════════════════════════════════════
  { sound: "さ", row: KotodamaRow.SA, column: KotodamaColumn.A, spiritualMeaning: "割別也・細也・小也・少也・短也・誘也", fireWaterNature: "water", element: "human", khsClassification: "昇水の灵" },
  { sound: "し", row: KotodamaRow.SA, column: KotodamaColumn.I, spiritualMeaning: "始也・終也・死也・己也・幸也・司也・育也", fireWaterNature: "water", element: "human", khsClassification: "昇水の灵" },
  { sound: "す", row: KotodamaRow.SA, column: KotodamaColumn.U, spiritualMeaning: "澄也・洲也・直也・穴也・差別也", fireWaterNature: "water", element: "human", khsClassification: "昇水の灵" },
  { sound: "せ", row: KotodamaRow.SA, column: KotodamaColumn.E, spiritualMeaning: "与也・助也・瀬也・背也・偽也・甲也", fireWaterNature: "water", element: "human", khsClassification: "昇水の灵" },
  { sound: "そ", row: KotodamaRow.SA, column: KotodamaColumn.O, spiritualMeaning: "形の無也・遅也・揃也・塩也・白也・底也", fireWaterNature: "water", element: "human", khsClassification: "昇水の灵" },

  // ═══════════════════════════════════════════
  // タ行：水中の火の灵
  // ═══════════════════════════════════════════
  { sound: "た", row: KotodamaRow.TA, column: KotodamaColumn.A, spiritualMeaning: "タマ也・種也・大也・多也・連也・胎也", fireWaterNature: "fire_in_water", element: "earth", khsClassification: "水中の火の灵" },
  { sound: "ち", row: KotodamaRow.TA, column: KotodamaColumn.I, spiritualMeaning: "胎内の火の灵也・血也・地中の火也・息の本也", fireWaterNature: "fire_in_water", element: "earth", khsClassification: "水中の火の灵" },
  { sound: "つ", row: KotodamaRow.TA, column: KotodamaColumn.U, spiritualMeaning: "渦巻也・列也・続也・積也・約也", fireWaterNature: "fire_in_water", element: "earth", khsClassification: "水中の火の灵" },
  { sound: "て", row: KotodamaRow.TA, column: KotodamaColumn.E, spiritualMeaning: "右左也・掌也・風也・人也・発也", fireWaterNature: "fire_in_water", element: "earth", khsClassification: "水中の火の灵" },
  { sound: "と", row: KotodamaRow.TA, column: KotodamaColumn.O, spiritualMeaning: "男也・轟也・解也・飛也・基也・止め也", fireWaterNature: "fire_in_water", element: "earth", khsClassification: "水中の火の灵" },

  // ═══════════════════════════════════════════
  // ナ行：火水の灵
  // ═══════════════════════════════════════════
  { sound: "な", row: KotodamaRow.NA, column: KotodamaColumn.A, spiritualMeaning: "和也・女也・正中の灵也・凝也・過去現在未来にわたる灵也", fireWaterNature: "fire_water", element: "earth", khsClassification: "火水の灵" },
  { sound: "に", row: KotodamaRow.NA, column: KotodamaColumn.I, spiritualMeaning: "天地也・日月也・水火の凝也・丹也", fireWaterNature: "fire_water", element: "earth", khsClassification: "火水の灵" },
  { sound: "ぬ", row: KotodamaRow.NA, column: KotodamaColumn.U, spiritualMeaning: "黒也・暗也・終也・潤也・緯也", fireWaterNature: "fire_water", element: "earth", khsClassification: "火水の灵" },
  { sound: "ね", row: KotodamaRow.NA, column: KotodamaColumn.E, spiritualMeaning: "水火の根也・母の灵也・土也・鎮也", fireWaterNature: "fire_water", element: "earth", khsClassification: "火水の灵" },
  { sound: "の", row: KotodamaRow.NA, column: KotodamaColumn.O, spiritualMeaning: "回水也・如也・差別を宰る也・切也", fireWaterNature: "fire_water", element: "earth", khsClassification: "火水の灵" },

  // ═══════════════════════════════════════════
  // ハ行：正火の灵
  // ═══════════════════════════════════════════
  { sound: "は", row: KotodamaRow.HA, column: KotodamaColumn.A, spiritualMeaning: "地の方を宰る也・端也・角也・実也・初也・発也", fireWaterNature: "fire", element: "heaven", khsClassification: "正火の灵" },
  { sound: "ひ", row: KotodamaRow.HA, column: KotodamaColumn.I, spiritualMeaning: "天を回る火の灵也・日也・出入息の本也", fireWaterNature: "fire", element: "heaven", khsClassification: "正火の灵" },
  { sound: "ふ", row: KotodamaRow.HA, column: KotodamaColumn.U, spiritualMeaning: "火水の両を宰る也・経也・含也・太也・吹也", fireWaterNature: "fire", element: "heaven", khsClassification: "正火の灵" },
  { sound: "へ", row: KotodamaRow.HA, column: KotodamaColumn.E, spiritualMeaning: "膨也・隔也・経也・緯也", fireWaterNature: "fire", element: "heaven", khsClassification: "正火の灵" },
  { sound: "ほ", row: KotodamaRow.HA, column: KotodamaColumn.O, spiritualMeaning: "母也・火浮也・尖也・天地万物の初也", fireWaterNature: "fire", element: "heaven", khsClassification: "正火の灵" },

  // ═══════════════════════════════════════════
  // マ行：火中の水の灵
  // ═══════════════════════════════════════════
  { sound: "ま", row: KotodamaRow.MA, column: KotodamaColumn.A, spiritualMeaning: "潤水也・向也・眼也・回也・間也・円也", fireWaterNature: "water_in_fire", element: "human", khsClassification: "火中の水の灵" },
  { sound: "み", row: KotodamaRow.MA, column: KotodamaColumn.I, spiritualMeaning: "潤水也・正中を宰る也・月の灵也・貴也", fireWaterNature: "water_in_fire", element: "human", khsClassification: "火中の水の灵" },
  { sound: "む", row: KotodamaRow.MA, column: KotodamaColumn.U, spiritualMeaning: "潤水也・無也・空也・息の終也・結也・睦也", fireWaterNature: "water_in_fire", element: "human", khsClassification: "火中の水の灵" },
  { sound: "め", row: KotodamaRow.MA, column: KotodamaColumn.E, spiritualMeaning: "潤水也・回也・芽也・正中を宰る也・女也", fireWaterNature: "water_in_fire", element: "human", khsClassification: "火中の水の灵" },
  { sound: "も", row: KotodamaRow.MA, column: KotodamaColumn.O, spiritualMeaning: "潤水也・舫也・塊也・亦也・累也", fireWaterNature: "water_in_fire", element: "human", khsClassification: "火中の水の灵" },

  // ═══════════════════════════════════════════
  // ヤ行：火水の灵（八行）
  // ═══════════════════════════════════════════
  { sound: "や", row: KotodamaRow.YA, column: KotodamaColumn.A, spiritualMeaning: "文也・和也・沼也・家也・水火の両を宰る也", fireWaterNature: "fire_water", element: "human", khsClassification: "火水の灵（八行）" },
  { sound: "ヤ行い", row: KotodamaRow.YA, column: KotodamaColumn.I, spiritualMeaning: "入息のイの灵也・ア行イとワ行ヰの文也・完全内集也・灵核", fireWaterNature: "fire_water", element: "human", khsClassification: "火水の灵（八行）・中心灵" },
  { sound: "ゆ", row: KotodamaRow.YA, column: KotodamaColumn.U, spiritualMeaning: "寛也・火水の和也・流水也", fireWaterNature: "fire_water", element: "human", khsClassification: "火水の灵（八行）" },
  { sound: "ヤ行え", row: KotodamaRow.YA, column: KotodamaColumn.E, spiritualMeaning: "昼夜の胞衣のエの灵也・ア行エとワ行ヱの文也・完全外発也・灵核", fireWaterNature: "fire_water", element: "human", khsClassification: "火水の灵（八行）・中心灵" },
  { sound: "よ", row: KotodamaRow.YA, column: KotodamaColumn.O, spiritualMeaning: "与也・女男の契也・淀也・齢也", fireWaterNature: "fire_water", element: "human", khsClassification: "火水の灵（八行）" },

  // ═══════════════════════════════════════════
  // ラ行：濁水の灵
  // ═══════════════════════════════════════════
  { sound: "ら", row: KotodamaRow.RA, column: KotodamaColumn.A, spiritualMeaning: "降也・涎也・唾也", fireWaterNature: "turbid_water", element: "earth", khsClassification: "濁水の灵" },
  { sound: "り", row: KotodamaRow.RA, column: KotodamaColumn.I, spiritualMeaning: "息息の両也・人也・割別也・涎也", fireWaterNature: "turbid_water", element: "earth", khsClassification: "濁水の灵" },
  { sound: "る", row: KotodamaRow.RA, column: KotodamaColumn.U, spiritualMeaning: "涎也・唾也・濁水の灵", fireWaterNature: "turbid_water", element: "earth", khsClassification: "濁水の灵" },
  { sound: "れ", row: KotodamaRow.RA, column: KotodamaColumn.E, spiritualMeaning: "涎也・唾也・濁水の灵", fireWaterNature: "turbid_water", element: "earth", khsClassification: "濁水の灵" },
  { sound: "ろ", row: KotodamaRow.RA, column: KotodamaColumn.O, spiritualMeaning: "大濁の塊也・ラリルレの四音に代りてなすことある也", fireWaterNature: "turbid_water", element: "earth", khsClassification: "濁水の灵" },

  // ═══════════════════════════════════════════
  // ワ行：水火の灵
  // ═══════════════════════════════════════════
  { sound: "わ", row: KotodamaRow.WA, column: KotodamaColumn.A, spiritualMeaning: "国土也・水火水也・水の◯也・万物の形を宰る也", fireWaterNature: "water_fire", element: "human", khsClassification: "水火の灵" },
  { sound: "ゐ", row: KotodamaRow.WA, column: KotodamaColumn.I, spiritualMeaning: "蒼空也・潮水也・引汐也・天地人万物を搦めて備えたるしほみつ也", fireWaterNature: "water_fire", element: "human", khsClassification: "水火の灵" },
  { sound: "ワ行う", row: KotodamaRow.WA, column: KotodamaColumn.U, spiritualMeaning: "渦巻降のウの灵也・左に渦巻きて降る也・ア行ウ（浮昇）の対極", fireWaterNature: "water_fire", element: "human", khsClassification: "水火の灵" },
  { sound: "ゑ", row: KotodamaRow.WA, column: KotodamaColumn.E, spiritualMeaning: "搦也・胞衣也・恵也・回也", fireWaterNature: "water_fire", element: "human", khsClassification: "水火の灵" },
  { sound: "を", row: KotodamaRow.WA, column: KotodamaColumn.O, spiritualMeaning: "縦也・賤也・男也・終也・折也・五十連の結び", fireWaterNature: "water_fire", element: "human", khsClassification: "水火の灵" },

  // ═══════════════════════════════════════════
  // ン：凝灵
  // ═══════════════════════════════════════════
  { sound: "ん", row: KotodamaRow.WA, column: KotodamaColumn.O, spiritualMeaning: "ウム・凝り結ぶ究極の灵・五十連を超えた凝結点", fireWaterNature: "condensed", element: "earth", khsClassification: "凝灵" },
];

/**
 * 五十音の音を取得
 */
export function getKotodamaSound(sound: string): KotodamaSound | null {
  return KOTODAMA_SOUNDS.find((s) => s.sound === sound) || null;
}

/**
 * すべての五十音を取得
 */
export function getAllKotodamaSounds(): KotodamaSound[] {
  return KOTODAMA_SOUNDS;
}

/**
 * テキストを五十音で解析（言灵秘書準拠）
 */
export function analyzeKotodama(text: string): {
  sounds: KotodamaSound[];
  fireCount: number;
  waterCount: number;
  neutralCount: number;
  spiritualMeaning: string;
} {
  const sounds: KotodamaSound[] = [];
  let fireCount = 0;
  let waterCount = 0;
  let neutralCount = 0;

  for (const char of text) {
    const sound = getKotodamaSound(char);
    if (sound) {
      sounds.push(sound);
      const nature = sound.fireWaterNature;
      if (nature === "fire") {
        fireCount++;
      } else if (nature === "water" || nature === "turbid_water") {
        waterCount++;
      } else if (nature === "fire_in_water" || nature === "fire_water") {
        // 水中の火・火水 → 火寄り
        fireCount += 0.5;
        waterCount += 0.5;
      } else if (nature === "water_in_fire" || nature === "water_fire") {
        // 火中の水・水火 → 水寄り
        fireCount += 0.5;
        waterCount += 0.5;
      } else if (nature === "condensed") {
        neutralCount++;
      } else {
        neutralCount++;
      }
    }
  }

  // 灵的意味の統合
  let spiritualMeaning = "";
  if (fireCount > waterCount) {
    spiritualMeaning = "火の性質が強く、外発・創造・拡大のエネルギーを持つ";
  } else if (waterCount > fireCount) {
    spiritualMeaning = "水の性質が強く、内集・統合・浄化のエネルギーを持つ";
  } else {
    spiritualMeaning = "火水のバランスが取れ、調和のエネルギーを持つ";
  }

  return {
    sounds,
    fireCount: Math.round(fireCount),
    waterCount: Math.round(waterCount),
    neutralCount,
    spiritualMeaning,
  };
}
