/**
 * 言灵五十音深層構文解析
 * 
 * 五十音は天地の水火の流れを示す靈的な「音の地図」。
 * ア行〜ワ行は水火十行構造に従い、天地創造のプロセスそのものを音で表している。
 */

/**
 * 五十音の行
 */
export enum KotodamaRow {
  A = "a",   // ア行：始源・初発
  KA = "ka", // カ行：火・外発
  SA = "sa", // サ行：差・分離
  TA = "ta", // タ行：立・確立
  NA = "na", // ナ行：成・成就
  HA = "ha", // ハ行：発・展開
  MA = "ma", // マ行：満・充満
  YA = "ya", // ヤ行：矢・方向
  RA = "ra", // ラ行：羅・網羅
  WA = "wa", // ワ行：和・統合
}

/**
 * 五十音の段
 */
export enum KotodamaColumn {
  A = "a",   // ア段：始源
  I = "i",   // イ段：息・生命
  U = "u",   // ウ段：渦・循環
  E = "e",   // エ段：縁・結び
  O = "o",   // オ段：緒・終結
}

/**
 * 五十音の1音
 */
export interface KotodamaSound {
  sound: string; // 例: "あ", "か", "さ"
  row: KotodamaRow;
  column: KotodamaColumn;
  spiritualMeaning: string;
  fireWaterNature: "fire" | "water" | "neutral";
  element: "heaven" | "earth" | "human"; // 天・地・人
}

/**
 * 五十音のマスターデータ
 */
const KOTODAMA_SOUNDS: KotodamaSound[] = [
  // ア行
  { sound: "あ", row: KotodamaRow.A, column: KotodamaColumn.A, spiritualMeaning: "始源・初発・天地の開闢", fireWaterNature: "fire", element: "heaven" },
  { sound: "い", row: KotodamaRow.A, column: KotodamaColumn.I, spiritualMeaning: "息・生命・靈の流れ", fireWaterNature: "water", element: "heaven" },
  { sound: "う", row: KotodamaRow.A, column: KotodamaColumn.U, spiritualMeaning: "渦・循環・エネルギーの回転", fireWaterNature: "water", element: "heaven" },
  { sound: "え", row: KotodamaRow.A, column: KotodamaColumn.E, spiritualMeaning: "縁・結び・関係性の創造", fireWaterNature: "neutral", element: "heaven" },
  { sound: "お", row: KotodamaRow.A, column: KotodamaColumn.O, spiritualMeaning: "緒・終結・完成", fireWaterNature: "neutral", element: "heaven" },

  // カ行
  { sound: "か", row: KotodamaRow.KA, column: KotodamaColumn.A, spiritualMeaning: "火・外発・創造のエネルギー", fireWaterNature: "fire", element: "heaven" },
  { sound: "き", row: KotodamaRow.KA, column: KotodamaColumn.I, spiritualMeaning: "気・生命力・靈的エネルギー", fireWaterNature: "fire", element: "heaven" },
  { sound: "く", row: KotodamaRow.KA, column: KotodamaColumn.U, spiritualMeaning: "空・虚空・無限の可能性", fireWaterNature: "neutral", element: "heaven" },
  { sound: "け", row: KotodamaRow.KA, column: KotodamaColumn.E, spiritualMeaning: "気配・兆し・予兆", fireWaterNature: "neutral", element: "heaven" },
  { sound: "こ", row: KotodamaRow.KA, column: KotodamaColumn.O, spiritualMeaning: "凝・凝縮・エネルギーの集約", fireWaterNature: "water", element: "heaven" },

  // サ行
  { sound: "さ", row: KotodamaRow.SA, column: KotodamaColumn.A, spiritualMeaning: "差・分離・区別の始まり", fireWaterNature: "fire", element: "human" },
  { sound: "し", row: KotodamaRow.SA, column: KotodamaColumn.I, spiritualMeaning: "死・終わりと始まり・循環", fireWaterNature: "water", element: "human" },
  { sound: "す", row: KotodamaRow.SA, column: KotodamaColumn.U, spiritualMeaning: "巣・住処・安定の場", fireWaterNature: "water", element: "human" },
  { sound: "せ", row: KotodamaRow.SA, column: KotodamaColumn.E, spiritualMeaning: "瀬・流れ・変化の境界", fireWaterNature: "neutral", element: "human" },
  { sound: "そ", row: KotodamaRow.SA, column: KotodamaColumn.O, spiritualMeaning: "素・本質・根源", fireWaterNature: "neutral", element: "human" },

  // タ行
  { sound: "た", row: KotodamaRow.TA, column: KotodamaColumn.A, spiritualMeaning: "立・確立・存在の顕現", fireWaterNature: "fire", element: "earth" },
  { sound: "ち", row: KotodamaRow.TA, column: KotodamaColumn.I, spiritualMeaning: "血・生命の流れ・継承", fireWaterNature: "water", element: "earth" },
  { sound: "つ", row: KotodamaRow.TA, column: KotodamaColumn.U, spiritualMeaning: "津・港・結節点", fireWaterNature: "water", element: "earth" },
  { sound: "て", row: KotodamaRow.TA, column: KotodamaColumn.E, spiritualMeaning: "手・創造の道具・実現", fireWaterNature: "fire", element: "earth" },
  { sound: "と", row: KotodamaRow.TA, column: KotodamaColumn.O, spiritualMeaning: "戸・境界・出入口", fireWaterNature: "neutral", element: "earth" },

  // ナ行
  { sound: "な", row: KotodamaRow.NA, column: KotodamaColumn.A, spiritualMeaning: "成・成就・完成", fireWaterNature: "neutral", element: "earth" },
  { sound: "に", row: KotodamaRow.NA, column: KotodamaColumn.I, spiritualMeaning: "荷・負荷・責任", fireWaterNature: "water", element: "earth" },
  { sound: "ぬ", row: KotodamaRow.NA, column: KotodamaColumn.U, spiritualMeaning: "沼・停滞・深み", fireWaterNature: "water", element: "earth" },
  { sound: "ね", row: KotodamaRow.NA, column: KotodamaColumn.E, spiritualMeaning: "根・根源・基盤", fireWaterNature: "water", element: "earth" },
  { sound: "の", row: KotodamaRow.NA, column: KotodamaColumn.O, spiritualMeaning: "野・広がり・自然", fireWaterNature: "neutral", element: "earth" },

  // ハ行
  { sound: "は", row: KotodamaRow.HA, column: KotodamaColumn.A, spiritualMeaning: "発・展開・外への動き", fireWaterNature: "fire", element: "heaven" },
  { sound: "ひ", row: KotodamaRow.HA, column: KotodamaColumn.I, spiritualMeaning: "日・光・照らす力", fireWaterNature: "fire", element: "heaven" },
  { sound: "ふ", row: KotodamaRow.HA, column: KotodamaColumn.U, spiritualMeaning: "風・流動・変化", fireWaterNature: "neutral", element: "heaven" },
  { sound: "へ", row: KotodamaRow.HA, column: KotodamaColumn.E, spiritualMeaning: "辺・周辺・境界", fireWaterNature: "neutral", element: "heaven" },
  { sound: "ほ", row: KotodamaRow.HA, column: KotodamaColumn.O, spiritualMeaning: "穂・実り・成果", fireWaterNature: "neutral", element: "heaven" },

  // マ行
  { sound: "ま", row: KotodamaRow.MA, column: KotodamaColumn.A, spiritualMeaning: "満・充満・完全", fireWaterNature: "water", element: "human" },
  { sound: "み", row: KotodamaRow.MA, column: KotodamaColumn.I, spiritualMeaning: "水・生命の源・浄化", fireWaterNature: "water", element: "human" },
  { sound: "む", row: KotodamaRow.MA, column: KotodamaColumn.U, spiritualMeaning: "無・空・潜在性", fireWaterNature: "neutral", element: "human" },
  { sound: "め", row: KotodamaRow.MA, column: KotodamaColumn.E, spiritualMeaning: "目・見る・認識", fireWaterNature: "fire", element: "human" },
  { sound: "も", row: KotodamaRow.MA, column: KotodamaColumn.O, spiritualMeaning: "藻・繁茂・増殖", fireWaterNature: "water", element: "human" },

  // ヤ行
  { sound: "や", row: KotodamaRow.YA, column: KotodamaColumn.A, spiritualMeaning: "矢・方向・意図", fireWaterNature: "fire", element: "human" },
  { sound: "ゆ", row: KotodamaRow.YA, column: KotodamaColumn.U, spiritualMeaning: "湯・温かさ・癒し", fireWaterNature: "water", element: "human" },
  { sound: "よ", row: KotodamaRow.YA, column: KotodamaColumn.O, spiritualMeaning: "世・世界・時代", fireWaterNature: "neutral", element: "human" },

  // ラ行
  { sound: "ら", row: KotodamaRow.RA, column: KotodamaColumn.A, spiritualMeaning: "羅・網羅・包含", fireWaterNature: "neutral", element: "earth" },
  { sound: "り", row: KotodamaRow.RA, column: KotodamaColumn.I, spiritualMeaning: "理・理法・秩序", fireWaterNature: "fire", element: "earth" },
  { sound: "る", row: KotodamaRow.RA, column: KotodamaColumn.U, spiritualMeaning: "流・流れ・動き", fireWaterNature: "water", element: "earth" },
  { sound: "れ", row: KotodamaRow.RA, column: KotodamaColumn.E, spiritualMeaning: "靈・靈性・神性", fireWaterNature: "neutral", element: "earth" },
  { sound: "ろ", row: KotodamaRow.RA, column: KotodamaColumn.O, spiritualMeaning: "露・顕現・現れ", fireWaterNature: "water", element: "earth" },

  // ワ行
  { sound: "わ", row: KotodamaRow.WA, column: KotodamaColumn.A, spiritualMeaning: "和・統合・調和", fireWaterNature: "neutral", element: "human" },
  { sound: "を", row: KotodamaRow.WA, column: KotodamaColumn.O, spiritualMeaning: "緒・終わり・完結", fireWaterNature: "neutral", element: "human" },

  // ン（特別な音）
  { sound: "ん", row: KotodamaRow.WA, column: KotodamaColumn.O, spiritualMeaning: "凝・根源・中心靈", fireWaterNature: "neutral", element: "earth" },
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
 * テキストを五十音で解析
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
      if (sound.fireWaterNature === "fire") {
        fireCount++;
      } else if (sound.fireWaterNature === "water") {
        waterCount++;
      } else {
        neutralCount++;
      }
    }
  }

  // 靈的意味の統合
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
    fireCount,
    waterCount,
    neutralCount,
    spiritualMeaning,
  };
}
