/**
 * Ancient Kana Restoration Engine
 * 古代仮名復元エンジン（ゑ/ゐ自動選択）
 * 
 * 機能:
 * - 現代仮名（え/い）を古代仮名（ゑ/ゐ）に復元
 * - 文脈に基づく自動選択
 * - 歴史的仮名遣いに準拠
 */

/**
 * 古代仮名マッピング
 * 現代仮名 → 古代仮名の変換ルール
 */
export const ANCIENT_KANA_MAPPING: Record<string, string> = {
  // ゑ（ヱ）系列
  "ゑ": "ゑ", // Already ancient
  "ヱ": "ヱ", // Already ancient
  
  // ゐ（ヰ）系列
  "ゐ": "ゐ", // Already ancient
  "ヰ": "ヰ", // Already ancient
  
  // を（ヲ）系列
  "を": "を", // Already ancient
  "ヲ": "ヲ", // Already ancient
};

/**
 * え→ゑ変換が必要な語彙リスト
 * 歴史的仮名遣いで「ゑ」を使用する単語
 */
export const E_TO_WE_WORDS: string[] = [
  "ゑ", // 単独の「ゑ」
  "ゑん", // 縁
  "ゑにし", // 縁
  "ゑんぶ", // 閻浮
  "ゑんま", // 閻魔
  "こゑ", // 声
  "こゑん", // 声援
  "かへる", // 帰る、返る、変える
  "かへす", // 返す
  "かへり", // 帰り
  "かへりみる", // 顧みる
  "かへって", // 却って
  "かへりみ", // 顧み
  "むかへる", // 迎える
  "むかへ", // 迎え
  "こたへる", // 答える
  "こたへ", // 答え
  "たまへ", // 給へ（古語）
  "つかへる", // 仕える
  "つかへ", // 仕え
  "さかへる", // 栄える
  "さかへ", // 栄え
  "ととのへる", // 整える
  "ととのへ", // 整え
  "そなへる", // 備える、供える
  "そなへ", // 備え、供え
  "たくへる", // 蓄える
  "たくへ", // 蓄え
];

/**
 * い→ゐ変換が必要な語彙リスト
 * 歴史的仮名遣いで「ゐ」を使用する単語
 */
export const I_TO_WI_WORDS: string[] = [
  "ゐ", // 単独の「ゐ」（居）
  "ゐる", // 居る
  "ゐた", // 居た
  "ゐて", // 居て
  "ゐます", // 居ます
  "ゐない", // 居ない
  "ゐられる", // 居られる
  "ゐのこる", // 居残る
  "ゐどころ", // 居所
  "ゐずまい", // 居住まい
  "かはゐい", // 可愛い
  "かはゐらしい", // 可愛らしい
  "ゐん", // 韻
  "ゐんりょく", // 引力
  "ゐんよう", // 引用
  "ゐんたい", // 引退
];

/**
 * 文脈に基づいてえ→ゑ変換を判定
 * @param text 対象テキスト
 * @param position え/エの位置
 * @returns ゑ/ヱに変換すべきか
 */
function shouldConvertEToWe(text: string, position: number): boolean {
  // 前後の文脈を取得
  const before = text.substring(Math.max(0, position - 5), position);
  const after = text.substring(position + 1, Math.min(text.length, position + 6));
  const context = before + text[position] + after;

  // E_TO_WE_WORDSに含まれる語彙をチェック
  for (const word of E_TO_WE_WORDS) {
    if (context.includes(word.replace(/ゑ/g, "え"))) {
      return true;
    }
  }

  // 「かへ」「こへ」「さへ」など、特定のパターンをチェック
  if (/[かこさたなはまやらわ]へ/.test(context)) {
    return true;
  }

  return false;
}

/**
 * 文脈に基づいてい→ゐ変換を判定
 * @param text 対象テキスト
 * @param position い/イの位置
 * @returns ゐ/ヰに変換すべきか
 */
function shouldConvertIToWi(text: string, position: number): boolean {
  // 前後の文脈を取得
  const before = text.substring(Math.max(0, position - 5), position);
  const after = text.substring(position + 1, Math.min(text.length, position + 6));
  const context = before + text[position] + after;

  // I_TO_WI_WORDSに含まれる語彙をチェック
  for (const word of I_TO_WI_WORDS) {
    if (context.includes(word.replace(/ゐ/g, "い"))) {
      return true;
    }
  }

  // 「ゐる」「ゐた」など、特定のパターンをチェック
  if (/ゐ[るたてますないられのどずまい]/.test(context.replace(/い/g, "ゐ"))) {
    return true;
  }

  return false;
}

/**
 * テキストを古代仮名に復元
 * @param text 変換対象のテキスト
 * @param options 変換オプション
 * @returns 変換後のテキスト
 */
export function convertToAncientKana(
  text: string,
  options: {
    convertE?: boolean; // え→ゑ変換を有効にするか（デフォルト: true）
    convertI?: boolean; // い→ゐ変換を有効にするか（デフォルト: true）
    convertO?: boolean; // を→を変換を有効にするか（デフォルト: false、既に古代形）
  } = {}
): string {
  const {
    convertE = true,
    convertI = true,
    convertO = false,
  } = options;

  let result = text;
  const replacements: Array<{ pos: number; char: string }> = [];

  // え→ゑ変換
  if (convertE) {
    for (let i = 0; i < result.length; i++) {
      if (result[i] === "え" && shouldConvertEToWe(result, i)) {
        replacements.push({ pos: i, char: "ゑ" });
      } else if (result[i] === "エ" && shouldConvertEToWe(result, i)) {
        replacements.push({ pos: i, char: "ヱ" });
      }
    }
  }

  // い→ゐ変換
  if (convertI) {
    for (let i = 0; i < result.length; i++) {
      if (result[i] === "い" && shouldConvertIToWi(result, i)) {
        replacements.push({ pos: i, char: "ゐ" });
      } else if (result[i] === "イ" && shouldConvertIToWi(result, i)) {
        replacements.push({ pos: i, char: "ヰ" });
      }
    }
  }

  // 置換を適用（後ろから適用して位置ずれを防ぐ）
  replacements.sort((a, b) => b.pos - a.pos);
  for (const { pos, char } of replacements) {
    result = result.substring(0, pos) + char + result.substring(pos + 1);
  }

  return result;
}

/**
 * 古代仮名を現代仮名に戻す（逆変換）
 * @param text 変換対象のテキスト
 * @returns 変換後のテキスト
 */
export function convertToModernKana(text: string): string {
  let result = text;

  // ゑ→え変換
  result = result.replace(/ゑ/g, "え");
  result = result.replace(/ヱ/g, "エ");

  // ゐ→い変換
  result = result.replace(/ゐ/g, "い");
  result = result.replace(/ヰ/g, "イ");

  return result;
}

/**
 * テキスト内の古代仮名の数を数える
 * @param text 対象テキスト
 * @returns 古代仮名の数
 */
export function countAncientKana(text: string): {
  we: number;
  wi: number;
  wo: number;
  total: number;
} {
  const we = (text.match(/[ゑヱ]/g) || []).length;
  const wi = (text.match(/[ゐヰ]/g) || []).length;
  const wo = (text.match(/[をヲ]/g) || []).length;

  return {
    we,
    wi,
    wo,
    total: we + wi + wo,
  };
}

/**
 * 古代仮名復元の統計情報を取得
 * @param originalText 元のテキスト
 * @param convertedText 変換後のテキスト
 * @returns 統計情報
 */
export function getAncientKanaStats(
  originalText: string,
  convertedText: string
): {
  originalCount: number;
  convertedCount: number;
  conversionRate: number;
  details: {
    we: { before: number; after: number };
    wi: { before: number; after: number };
    wo: { before: number; after: number };
  };
} {
  const originalCounts = countAncientKana(originalText);
  const convertedCounts = countAncientKana(convertedText);

  const originalCount = originalCounts.total;
  const convertedCount = convertedCounts.total;
  const conversionRate =
    originalCount > 0 ? convertedCount / originalCount : 0;

  return {
    originalCount,
    convertedCount,
    conversionRate,
    details: {
      we: {
        before: originalCounts.we,
        after: convertedCounts.we,
      },
      wi: {
        before: originalCounts.wi,
        after: convertedCounts.wi,
      },
      wo: {
        before: originalCounts.wo,
        after: convertedCounts.wo,
      },
    },
  };
}
