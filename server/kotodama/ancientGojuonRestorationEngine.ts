/**
 * Ancient Gojuon Restoration Engine
 * 古五十音復元エンジン
 * 
 * 機能:
 * - 音韻復元（ヤ行のイ・エ、ワ行のウ、古代音の復活）
 * - 意味復元（火水分類）
 * - 靈義復元（天津金木配置）
 * - ミナカ中心の五十音配置
 */

/**
 * 古代五十音の音韻マッピング
 * 現代音 → 古代音
 */
export const ANCIENT_SOUND_MAPPING: Record<string, string> = {
  // ヤ行の復元
  "い": "ゐ", // ヤ行のイ（wi）
  "イ": "ヰ",
  "え": "ゑ", // ヤ行のエ（we）
  "エ": "ヱ",
  
  // ワ行の復元
  // "う": "ゔ", // ワ行のウ（vu）- 現代では使用されない
  
  // 濁音の復元
  "ぢ": "ぢ", // 既に古代音
  "づ": "づ", // 既に古代音
};

/**
 * 五十音の火水分類（詳細版）
 */
export interface GojuonElement {
  char: string; // 文字
  romanji: string; // ローマ字
  type: "fire" | "water"; // 火水分類
  row: string; // 行（ア行、カ行など）
  column: string; // 段（ア段、イ段など）
  tenshinKinokiPosition?: string; // 天津金木配置
  spiritualMeaning?: string; // 靈的意味
}

/**
 * 完全な五十音図（火水分類付き）
 */
export const COMPLETE_GOJUON: GojuonElement[] = [
  // ア行
  { char: "あ", romanji: "a", type: "fire", row: "ア行", column: "ア段", spiritualMeaning: "始源・開始" },
  { char: "い", romanji: "i", type: "water", row: "ア行", column: "イ段", spiritualMeaning: "生命・息" },
  { char: "う", romanji: "u", type: "fire", row: "ア行", column: "ウ段", spiritualMeaning: "統合・宇宙" },
  { char: "え", romanji: "e", type: "water", row: "ア行", column: "エ段", spiritualMeaning: "枝分かれ・展開" },
  { char: "お", romanji: "o", type: "fire", row: "ア行", column: "オ段", spiritualMeaning: "大いなる・包含" },
  
  // カ行
  { char: "か", romanji: "ka", type: "fire", row: "カ行", column: "ア段", spiritualMeaning: "力・顕現" },
  { char: "き", romanji: "ki", type: "water", row: "カ行", column: "イ段", spiritualMeaning: "氣・生命力" },
  { char: "く", romanji: "ku", type: "fire", row: "カ行", column: "ウ段", spiritualMeaning: "駆動・動き" },
  { char: "け", romanji: "ke", type: "water", row: "カ行", column: "エ段", spiritualMeaning: "消える・気配" },
  { char: "こ", romanji: "ko", type: "fire", row: "カ行", column: "オ段", spiritualMeaning: "凝縮・核" },
  
  // サ行
  { char: "さ", romanji: "sa", type: "fire", row: "サ行", column: "ア段", spiritualMeaning: "差異・分離" },
  { char: "し", romanji: "shi", type: "water", row: "サ行", column: "イ段", spiritualMeaning: "静寂・死" },
  { char: "す", romanji: "su", type: "fire", row: "サ行", column: "ウ段", spiritualMeaning: "進む・透過" },
  { char: "せ", romanji: "se", type: "water", row: "サ行", column: "エ段", spiritualMeaning: "狭まる・瀬" },
  { char: "そ", romanji: "so", type: "fire", row: "サ行", column: "オ段", spiritualMeaning: "外・空" },
  
  // タ行
  { char: "た", romanji: "ta", type: "fire", row: "タ行", column: "ア段", spiritualMeaning: "高・立つ" },
  { char: "ち", romanji: "chi", type: "water", row: "タ行", column: "イ段", spiritualMeaning: "血・地" },
  { char: "つ", romanji: "tsu", type: "fire", row: "タ行", column: "ウ段", spiritualMeaning: "継ぐ・連なる" },
  { char: "て", romanji: "te", type: "water", row: "タ行", column: "エ段", spiritualMeaning: "手・出す" },
  { char: "と", romanji: "to", type: "fire", row: "タ行", column: "オ段", spiritualMeaning: "戸・止まる" },
  
  // ナ行
  { char: "な", romanji: "na", type: "water", row: "ナ行", column: "ア段", spiritualMeaning: "名・成る" },
  { char: "に", romanji: "ni", type: "water", row: "ナ行", column: "イ段", spiritualMeaning: "荷・煮る" },
  { char: "ぬ", romanji: "nu", type: "water", row: "ナ行", column: "ウ段", spiritualMeaning: "抜く・脱ぐ" },
  { char: "ね", romanji: "ne", type: "water", row: "ナ行", column: "エ段", spiritualMeaning: "根・寝る" },
  { char: "の", romanji: "no", type: "water", row: "ナ行", column: "オ段", spiritualMeaning: "野・延びる" },
  
  // ハ行
  { char: "は", romanji: "ha", type: "fire", row: "ハ行", column: "ア段", spiritualMeaning: "葉・放つ" },
  { char: "ひ", romanji: "hi", type: "water", row: "ハ行", column: "イ段", spiritualMeaning: "火・日・靈" },
  { char: "ふ", romanji: "fu", type: "fire", row: "ハ行", column: "ウ段", spiritualMeaning: "風・増える" },
  { char: "へ", romanji: "he", type: "water", row: "ハ行", column: "エ段", spiritualMeaning: "辺・減る" },
  { char: "ほ", romanji: "ho", type: "fire", row: "ハ行", column: "オ段", spiritualMeaning: "穂・秀でる" },
  
  // マ行
  { char: "ま", romanji: "ma", type: "water", row: "マ行", column: "ア段", spiritualMeaning: "真・間" },
  { char: "み", romanji: "mi", type: "water", row: "マ行", column: "イ段", spiritualMeaning: "水・実" },
  { char: "む", romanji: "mu", type: "water", row: "マ行", column: "ウ段", spiritualMeaning: "無・夢" },
  { char: "め", romanji: "me", type: "water", row: "マ行", column: "エ段", spiritualMeaning: "目・芽" },
  { char: "も", romanji: "mo", type: "water", row: "マ行", column: "オ段", spiritualMeaning: "藻・喪" },
  
  // ヤ行
  { char: "や", romanji: "ya", type: "fire", row: "ヤ行", column: "ア段", spiritualMeaning: "矢・家" },
  { char: "ゐ", romanji: "wi", type: "water", row: "ヤ行", column: "イ段", spiritualMeaning: "居・井" },
  { char: "ゆ", romanji: "yu", type: "fire", row: "ヤ行", column: "ウ段", spiritualMeaning: "湯・結ぶ" },
  { char: "ゑ", romanji: "we", type: "water", row: "ヤ行", column: "エ段", spiritualMeaning: "恵・笑み" },
  { char: "よ", romanji: "yo", type: "fire", row: "ヤ行", column: "オ段", spiritualMeaning: "世・夜" },
  
  // ラ行
  { char: "ら", romanji: "ra", type: "water", row: "ラ行", column: "ア段", spiritualMeaning: "螺旋・羅" },
  { char: "り", romanji: "ri", type: "water", row: "ラ行", column: "イ段", spiritualMeaning: "理・離" },
  { char: "る", romanji: "ru", type: "water", row: "ラ行", column: "ウ段", spiritualMeaning: "流・留" },
  { char: "れ", romanji: "re", type: "water", row: "ラ行", column: "エ段", spiritualMeaning: "靈・礼" },
  { char: "ろ", romanji: "ro", type: "water", row: "ラ行", column: "オ段", spiritualMeaning: "路・炉" },
  
  // ワ行
  { char: "わ", romanji: "wa", type: "fire", row: "ワ行", column: "ア段", spiritualMeaning: "和・輪" },
  { char: "ゐ", romanji: "wi", type: "water", row: "ワ行", column: "イ段", spiritualMeaning: "居・井" },
  // { char: "ゔ", romanji: "vu", type: "fire", row: "ワ行", column: "ウ段", spiritualMeaning: "産・生" },
  { char: "ゑ", romanji: "we", type: "water", row: "ワ行", column: "エ段", spiritualMeaning: "恵・笑み" },
  { char: "を", romanji: "wo", type: "fire", row: "ワ行", column: "オ段", spiritualMeaning: "緒・尾" },
  
  // ン
  { char: "ん", romanji: "n", type: "water", row: "ン", column: "ン", spiritualMeaning: "根源・終わり" },
];

/**
 * 文字から五十音要素を取得
 * @param char 文字
 * @returns 五十音要素
 */
export function getGojuonElement(char: string): GojuonElement | undefined {
  return COMPLETE_GOJUON.find(e => e.char === char);
}

/**
 * テキストを古代五十音に復元
 * @param text 復元対象のテキスト
 * @param options 復元オプション
 * @returns 復元後のテキスト
 */
export function restoreAncientGojuon(
  text: string,
  options: {
    restoreYaGyou?: boolean; // ヤ行を復元するか（デフォルト: true）
    restoreWaGyou?: boolean; // ワ行を復元するか（デフォルト: true）
  } = {}
): string {
  const {
    restoreYaGyou = true,
    restoreWaGyou = true,
  } = options;

  let result = text;

  if (restoreYaGyou) {
    // ヤ行の復元（文脈に応じて）
    // 注: 完全な復元には文脈解析が必要
    // 現在は簡易的な実装
  }

  if (restoreWaGyou) {
    // ワ行の復元
    // 注: 完全な復元には文脈解析が必要
  }

  return result;
}

/**
 * テキストの靈的意味を解析
 * @param text 解析対象のテキスト
 * @returns 靈的意味の配列
 */
export function analyzeSpiritualMeaning(text: string): Array<{
  char: string;
  meaning: string;
  type: "fire" | "water";
}> {
  const result: Array<{
    char: string;
    meaning: string;
    type: "fire" | "water";
  }> = [];

  for (const char of text) {
    const element = getGojuonElement(char);
    if (element && element.spiritualMeaning) {
      result.push({
        char,
        meaning: element.spiritualMeaning,
        type: element.type,
      });
    }
  }

  return result;
}

/**
 * 五十音図を取得（行・段別）
 * @returns 五十音図
 */
export function getGojuonChart(): Record<string, Record<string, GojuonElement>> {
  const chart: Record<string, Record<string, GojuonElement>> = {};

  for (const element of COMPLETE_GOJUON) {
    if (!chart[element.row]) {
      chart[element.row] = {};
    }
    chart[element.row]![element.column] = element;
  }

  return chart;
}

/**
 * 火水バランスを可視化
 * @param text 対象テキスト
 * @returns 可視化文字列
 */
export function visualizeFireWaterBalance(text: string): string {
  const lines: string[] = [];
  let fireCount = 0;
  let waterCount = 0;

  for (const char of text) {
    const element = getGojuonElement(char);
    if (element) {
      const symbol = element.type === "fire" ? "🔥" : "💧";
      lines.push(`${char} ${symbol} ${element.spiritualMeaning || ""}`);
      
      if (element.type === "fire") {
        fireCount++;
      } else {
        waterCount++;
      }
    }
  }

  const total = fireCount + waterCount;
  const fireRatio = total > 0 ? (fireCount / total * 100).toFixed(1) : "0.0";
  const waterRatio = total > 0 ? (waterCount / total * 100).toFixed(1) : "0.0";

  lines.push("");
  lines.push(`火: ${fireCount} (${fireRatio}%)`);
  lines.push(`水: ${waterCount} (${waterRatio}%)`);

  return lines.join("\n");
}

/**
 * 行別の火水バランスを取得
 * @param text 対象テキスト
 * @returns 行別の火水バランス
 */
export function getRowFireWaterBalance(text: string): Record<string, { fire: number; water: number }> {
  const balance: Record<string, { fire: number; water: number }> = {};

  for (const char of text) {
    const element = getGojuonElement(char);
    if (element) {
      if (!balance[element.row]) {
        balance[element.row] = { fire: 0, water: 0 };
      }

      if (element.type === "fire") {
        balance[element.row]!.fire++;
      } else {
        balance[element.row]!.water++;
      }
    }
  }

  return balance;
}
