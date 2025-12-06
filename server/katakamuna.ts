/**
 * カタカムナ80首解析
 * 
 * カタカムナは円環・渦・水火の結びの図形言語。
 * 言葉・図・響きが一体となって真理を顕す「構文曼荼羅」として機能する。
 */

/**
 * カタカムナの1首
 */
export interface KatakamunUta {
  utaNumber: number; // 1-80
  text: string; // カタカムナ原文
  interpretation: string; // 靈的解釈
  structure: string; // 構造解析
  spiritualMeaning: string; // 靈的意味
}

/**
 * カタカムナ80首のマスターデータ（サンプル）
 * TODO: 実際の80首を追加
 */
const KATAKAMUNA_UTAS: KatakamunUta[] = [
  {
    utaNumber: 1,
    text: "カタカムナ ヒビキ マノスベシ アシアトウアン ウツシマツル カタカムナ ウタヒ",
    interpretation: "カタカムナの響きは、真の道を示す。足跡を追い、写し祀る。カタカムナの歌。",
    structure: "円環構造：始まりと終わりが一つに結ばれる",
    spiritualMeaning: "カタカムナの根源的な響きと、真理を写し取る力",
  },
  {
    utaNumber: 2,
    text: "アマノミナカヌシ タカミムスビ カムミムスビ",
    interpretation: "天の中心主、高御産巣日神、神産巣日神",
    structure: "三位一体構造：天・高・神の三つの産靈",
    spiritualMeaning: "宇宙創造の三大原理、水火の結びと生成",
  },
  {
    utaNumber: 3,
    text: "ウマシアシカビヒコヂ アメノトコタチ",
    interpretation: "美しい葦の芽のように立つ、天の常立",
    structure: "生命の萌芽構造：地から天へ立ち上がる力",
    spiritualMeaning: "生命の始まり、天地の確立",
  },
  // TODO: 残りの77首を追加
];

/**
 * カタカムナの1首を取得
 */
export function getKatakamunUta(utaNumber: number): KatakamunUta | null {
  return KATAKAMUNA_UTAS.find((u) => u.utaNumber === utaNumber) || null;
}

/**
 * すべてのカタカムナ80首を取得
 */
export function getAllKatakamunUtas(): KatakamunUta[] {
  return KATAKAMUNA_UTAS;
}

/**
 * カタカムナ文字の構造解析
 */
export interface KatakamunSymbol {
  symbol: string;
  meaning: string;
  structure: "circle" | "spiral" | "cross" | "wave"; // 円・渦・十字・波
  fireWaterNature: "fire" | "water" | "neutral";
}

/**
 * カタカムナ文字のマスターデータ（サンプル）
 */
const KATAKAMUNA_SYMBOLS: KatakamunSymbol[] = [
  { symbol: "カ", meaning: "火・外発", structure: "cross", fireWaterNature: "fire" },
  { symbol: "タ", meaning: "立・確立", structure: "cross", fireWaterNature: "fire" },
  { symbol: "ム", meaning: "無・空", structure: "circle", fireWaterNature: "neutral" },
  { symbol: "ナ", meaning: "成・成就", structure: "wave", fireWaterNature: "neutral" },
  { symbol: "ミ", meaning: "水・生命の源", structure: "wave", fireWaterNature: "water" },
  { symbol: "ヒ", meaning: "日・光", structure: "spiral", fireWaterNature: "fire" },
  { symbol: "ビ", meaning: "火の変化", structure: "spiral", fireWaterNature: "fire" },
  { symbol: "キ", meaning: "気・生命力", structure: "spiral", fireWaterNature: "fire" },
  { symbol: "マ", meaning: "満・充満", structure: "circle", fireWaterNature: "water" },
  { symbol: "ノ", meaning: "野・広がり", structure: "wave", fireWaterNature: "neutral" },
  { symbol: "ス", meaning: "巣・住処", structure: "circle", fireWaterNature: "water" },
  { symbol: "ベ", meaning: "辺・周辺", structure: "wave", fireWaterNature: "neutral" },
  { symbol: "シ", meaning: "死・循環", structure: "spiral", fireWaterNature: "water" },
  { symbol: "ア", meaning: "始源・初発", structure: "circle", fireWaterNature: "fire" },
  { symbol: "ト", meaning: "戸・境界", structure: "cross", fireWaterNature: "neutral" },
  { symbol: "ウ", meaning: "渦・循環", structure: "spiral", fireWaterNature: "water" },
  { symbol: "ン", meaning: "凝・根源・中心靈", structure: "circle", fireWaterNature: "neutral" },
];

/**
 * カタカムナ文字を取得
 */
export function getKatakamunSymbol(symbol: string): KatakamunSymbol | null {
  return KATAKAMUNA_SYMBOLS.find((s) => s.symbol === symbol) || null;
}

/**
 * カタカムナ文字の構造解析
 */
export function analyzeKatakamunSymbol(symbol: string): {
  symbol: KatakamunSymbol | null;
  meaning: string;
  structure: string;
} {
  const katakamunSymbol = getKatakamunSymbol(symbol);

  if (!katakamunSymbol) {
    return {
      symbol: null,
      meaning: "未知の文字",
      structure: "不明",
    };
  }

  return {
    symbol: katakamunSymbol,
    meaning: katakamunSymbol.meaning,
    structure: katakamunSymbol.structure,
  };
}

/**
 * カタカムナテキストを解析
 */
export function analyzeKatakamunText(text: string): {
  symbols: KatakamunSymbol[];
  circleCount: number;
  spiralCount: number;
  crossCount: number;
  waveCount: number;
  spiritualMeaning: string;
} {
  const symbols: KatakamunSymbol[] = [];
  let circleCount = 0;
  let spiralCount = 0;
  let crossCount = 0;
  let waveCount = 0;

  for (const char of text) {
    const symbol = getKatakamunSymbol(char);
    if (symbol) {
      symbols.push(symbol);
      if (symbol.structure === "circle") {
        circleCount++;
      } else if (symbol.structure === "spiral") {
        spiralCount++;
      } else if (symbol.structure === "cross") {
        crossCount++;
      } else if (symbol.structure === "wave") {
        waveCount++;
      }
    }
  }

  // 靈的意味の統合
  let spiritualMeaning = "";
  if (spiralCount > circleCount) {
    spiritualMeaning = "渦の構造が強く、エネルギーの回転と変化を示す";
  } else if (circleCount > spiralCount) {
    spiritualMeaning = "円環の構造が強く、完全性と統合を示す";
  } else {
    spiritualMeaning = "円環と渦のバランスが取れ、調和のエネルギーを持つ";
  }

  return {
    symbols,
    circleCount,
    spiralCount,
    crossCount,
    waveCount,
    spiritualMeaning,
  };
}
