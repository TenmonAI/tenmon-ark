/**
 * カタカムナ80首解析
 * TENMON_KATAKAMUNA_COMPLETE_V1
 *
 * カタカムナは円環・渦・水火の結びの図形言語。
 * 言葉・図・響きが一体となって真理を顕す「構文曼荼羅」として機能する。
 *
 * KHS原則: カタカムナは写像レイヤー（SCRIPTURE_MAP）に属する。
 * 中枢語義は言灵秘書（KHS）のみが定義する。
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// === 型定義 ===

export interface KatakamunUta {
  utaNumber: number;
  text: string;
  theme: string;
  keywords: string[];
}

export interface KatakamunSymbol {
  symbol: string;
  meaning: string;
  structure: "circle" | "spiral" | "cross" | "wave";
  fireWaterNature: "fire" | "water" | "neutral";
}

// === データ読み込み ===

let _utas: KatakamunUta[] | null = null;

function loadUtas(): KatakamunUta[] {
  if (_utas) return _utas;
  try {
    const candidates = [
      resolve(__dirname, "../shared/katakamuna/katakamuna80.json"),
      resolve(__dirname, "../../shared/katakamuna/katakamuna80.json"),
      resolve(__dirname, "../../../shared/katakamuna/katakamuna80.json"),
    ];
    let raw = "";
    for (const p of candidates) {
      try {
        raw = readFileSync(p, "utf-8");
        break;
      } catch {
        continue;
      }
    }
    if (!raw) {
      console.warn("[katakamuna] katakamuna80.json not found, using empty array");
      _utas = [];
      return _utas;
    }
    const data = JSON.parse(raw);
    _utas = (data.utas || []).map((u: any) => ({
      utaNumber: u.number,
      text: u.text,
      theme: u.theme || "",
      keywords: u.keywords || [],
    }));
    console.log(`[katakamuna] Loaded ${_utas!.length} utas`);
    return _utas!;
  } catch (e) {
    console.warn("[katakamuna] Failed to load katakamuna80.json:", e);
    _utas = [];
    return _utas;
  }
}

// === カタカムナ文字のマスターデータ（言灵秘書音義に基づく） ===

const KATAKAMUNA_SYMBOLS: KatakamunSymbol[] = [
  // 母音（空中水灵）
  { symbol: "ア", meaning: "無にして有・始源・天", structure: "circle", fireWaterNature: "neutral" },
  { symbol: "イ", meaning: "出息・命・射る", structure: "spiral", fireWaterNature: "fire" },
  { symbol: "ウ", meaning: "浮き昇る・動・生", structure: "spiral", fireWaterNature: "water" },
  { symbol: "エ", meaning: "枝葉・選・得", structure: "wave", fireWaterNature: "water" },
  { symbol: "オ", meaning: "大・親・重", structure: "circle", fireWaterNature: "fire" },
  // カ行（煇火の灵）
  { symbol: "カ", meaning: "煇・上・外発", structure: "cross", fireWaterNature: "fire" },
  { symbol: "キ", meaning: "気・木・生命力", structure: "spiral", fireWaterNature: "fire" },
  { symbol: "ク", meaning: "組む・苦・来", structure: "cross", fireWaterNature: "fire" },
  { symbol: "ケ", meaning: "毛・気・異", structure: "wave", fireWaterNature: "fire" },
  { symbol: "コ", meaning: "凝る・子・此処", structure: "circle", fireWaterNature: "fire" },
  // サ行（昇水の灵）
  { symbol: "サ", meaning: "去る・裂く・差", structure: "wave", fireWaterNature: "water" },
  { symbol: "シ", meaning: "締まる・知・死", structure: "spiral", fireWaterNature: "water" },
  { symbol: "ス", meaning: "澄む・進・巣", structure: "circle", fireWaterNature: "water" },
  { symbol: "セ", meaning: "迫る・堰・瀬", structure: "wave", fireWaterNature: "water" },
  { symbol: "ソ", meaning: "外・反・空", structure: "wave", fireWaterNature: "water" },
  // タ行（水中火の灵）
  { symbol: "タ", meaning: "立つ・田・多", structure: "cross", fireWaterNature: "fire" },
  { symbol: "チ", meaning: "千・血・乳・道", structure: "spiral", fireWaterNature: "fire" },
  { symbol: "ツ", meaning: "連なる・津・積", structure: "wave", fireWaterNature: "neutral" },
  { symbol: "テ", meaning: "手・照・天", structure: "cross", fireWaterNature: "fire" },
  { symbol: "ト", meaning: "止まる・門・十", structure: "cross", fireWaterNature: "neutral" },
  // ナ行（火水の灵）
  { symbol: "ナ", meaning: "並ぶ・名・成", structure: "wave", fireWaterNature: "neutral" },
  { symbol: "ニ", meaning: "煮る・似・二", structure: "wave", fireWaterNature: "fire" },
  { symbol: "ヌ", meaning: "抜く・布・主", structure: "wave", fireWaterNature: "water" },
  { symbol: "ネ", meaning: "根・音・寝", structure: "circle", fireWaterNature: "neutral" },
  { symbol: "ノ", meaning: "伸びる・野・之", structure: "wave", fireWaterNature: "neutral" },
  // ハ行（正火の灵）
  { symbol: "ハ", meaning: "端・葉・母", structure: "wave", fireWaterNature: "fire" },
  { symbol: "ヒ", meaning: "火・灵・日・一", structure: "spiral", fireWaterNature: "fire" },
  { symbol: "フ", meaning: "吹く・振・二", structure: "wave", fireWaterNature: "fire" },
  { symbol: "ヘ", meaning: "減る・経・辺", structure: "wave", fireWaterNature: "fire" },
  { symbol: "ホ", meaning: "火の本・穂・秀", structure: "spiral", fireWaterNature: "fire" },
  // マ行（火中水の灵）
  { symbol: "マ", meaning: "間・真・目・円", structure: "circle", fireWaterNature: "water" },
  { symbol: "ミ", meaning: "水・身・実・三", structure: "wave", fireWaterNature: "water" },
  { symbol: "ム", meaning: "結ぶ・蒸・六", structure: "circle", fireWaterNature: "neutral" },
  { symbol: "メ", meaning: "芽・女・目", structure: "wave", fireWaterNature: "water" },
  { symbol: "モ", meaning: "藻・百・母", structure: "circle", fireWaterNature: "water" },
  // ヤ行（凝水の灵）
  { symbol: "ヤ", meaning: "弥・矢・八", structure: "wave", fireWaterNature: "water" },
  { symbol: "ユ", meaning: "揺る・湯・結", structure: "spiral", fireWaterNature: "water" },
  { symbol: "ヨ", meaning: "世・四・代", structure: "wave", fireWaterNature: "water" },
  // ラ行（濁水の灵）
  { symbol: "ラ", meaning: "螺旋・等", structure: "spiral", fireWaterNature: "water" },
  { symbol: "リ", meaning: "理・利・離", structure: "spiral", fireWaterNature: "water" },
  { symbol: "ル", meaning: "流る・留", structure: "spiral", fireWaterNature: "water" },
  { symbol: "レ", meaning: "連・列", structure: "wave", fireWaterNature: "water" },
  { symbol: "ロ", meaning: "路・炉・六", structure: "spiral", fireWaterNature: "water" },
  // ワ行（水火の灵）
  { symbol: "ワ", meaning: "和・輪・環", structure: "circle", fireWaterNature: "neutral" },
  { symbol: "ヰ", meaning: "居・坐", structure: "circle", fireWaterNature: "neutral" },
  { symbol: "ヱ", meaning: "恵・得", structure: "wave", fireWaterNature: "neutral" },
  { symbol: "ヲ", meaning: "終・緒・雄", structure: "wave", fireWaterNature: "neutral" },
  { symbol: "ン", meaning: "凝縮・無声の結・中心灵", structure: "circle", fireWaterNature: "neutral" },
  // 濁音
  { symbol: "ガ", meaning: "我・牙", structure: "cross", fireWaterNature: "fire" },
  { symbol: "ギ", meaning: "義・技", structure: "spiral", fireWaterNature: "fire" },
  { symbol: "グ", meaning: "具・愚", structure: "cross", fireWaterNature: "fire" },
  { symbol: "ゲ", meaning: "下・外", structure: "wave", fireWaterNature: "fire" },
  { symbol: "ゴ", meaning: "後・御", structure: "circle", fireWaterNature: "fire" },
  { symbol: "ザ", meaning: "座・雑", structure: "wave", fireWaterNature: "water" },
  { symbol: "ジ", meaning: "地・自", structure: "spiral", fireWaterNature: "water" },
  { symbol: "ズ", meaning: "図・頭", structure: "circle", fireWaterNature: "water" },
  { symbol: "ゼ", meaning: "是・全", structure: "wave", fireWaterNature: "water" },
  { symbol: "ゾ", meaning: "像・造", structure: "wave", fireWaterNature: "water" },
  { symbol: "ダ", meaning: "打・大", structure: "cross", fireWaterNature: "fire" },
  { symbol: "ヂ", meaning: "地・持", structure: "spiral", fireWaterNature: "fire" },
  { symbol: "ヅ", meaning: "続・図", structure: "wave", fireWaterNature: "neutral" },
  { symbol: "デ", meaning: "出・手", structure: "cross", fireWaterNature: "fire" },
  { symbol: "ド", meaning: "土・度", structure: "cross", fireWaterNature: "neutral" },
  { symbol: "バ", meaning: "場・馬", structure: "wave", fireWaterNature: "fire" },
  { symbol: "ビ", meaning: "火の変化・美", structure: "spiral", fireWaterNature: "fire" },
  { symbol: "ブ", meaning: "部・分", structure: "wave", fireWaterNature: "fire" },
  { symbol: "ベ", meaning: "辺・部", structure: "wave", fireWaterNature: "neutral" },
  { symbol: "ボ", meaning: "母・坊", structure: "circle", fireWaterNature: "fire" },
];

// === 公開API ===

/**
 * カタカムナの1首を取得
 */
export function getKatakamunUta(utaNumber: number): KatakamunUta | null {
  const utas = loadUtas();
  return utas.find((u) => u.utaNumber === utaNumber) || null;
}

/**
 * すべてのカタカムナ80首を取得
 */
export function getAllKatakamunUtas(): KatakamunUta[] {
  return loadUtas();
}

/**
 * キーワードでカタカムナ首を検索
 */
export function searchKatakamunUtas(keyword: string): KatakamunUta[] {
  const utas = loadUtas();
  const kw = keyword.trim();
  if (!kw) return [];
  return utas.filter(
    (u) =>
      u.text.includes(kw) ||
      u.theme.includes(kw) ||
      u.keywords.some((k) => k.includes(kw))
  );
}

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
    return { symbol: null, meaning: "未知の文字", structure: "不明" };
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
  fireCount: number;
  waterCount: number;
  neutralCount: number;
  spiritualMeaning: string;
} {
  const symbols: KatakamunSymbol[] = [];
  let circleCount = 0;
  let spiralCount = 0;
  let crossCount = 0;
  let waveCount = 0;
  let fireCount = 0;
  let waterCount = 0;
  let neutralCount = 0;

  for (const char of text) {
    const symbol = getKatakamunSymbol(char);
    if (symbol) {
      symbols.push(symbol);
      switch (symbol.structure) {
        case "circle": circleCount++; break;
        case "spiral": spiralCount++; break;
        case "cross": crossCount++; break;
        case "wave": waveCount++; break;
      }
      switch (symbol.fireWaterNature) {
        case "fire": fireCount++; break;
        case "water": waterCount++; break;
        case "neutral": neutralCount++; break;
      }
    }
  }

  const parts: string[] = [];
  if (spiralCount > circleCount && spiralCount > waveCount) {
    parts.push("渦の構造が強く、エネルギーの回転と変化を示す");
  } else if (circleCount > spiralCount && circleCount > waveCount) {
    parts.push("円環の構造が強く、完全性と統合を示す");
  } else if (waveCount > circleCount && waveCount > spiralCount) {
    parts.push("波の構造が強く、流動と伝播を示す");
  } else {
    parts.push("円環・渦・波のバランスが取れ、調和のエネルギーを持つ");
  }

  if (fireCount > waterCount * 1.5) {
    parts.push("火の性質が優勢で、顕現・外発の力が強い");
  } else if (waterCount > fireCount * 1.5) {
    parts.push("水の性質が優勢で、潜在・内集の力が強い");
  } else {
    parts.push("水火のバランスが整い、陰陽調和の状態");
  }

  return {
    symbols,
    circleCount,
    spiralCount,
    crossCount,
    waveCount,
    fireCount,
    waterCount,
    neutralCount,
    spiritualMeaning: parts.join("。"),
  };
}

/**
 * LLMプロンプト用：カタカムナ首のコンテキストテキストを生成
 */
export function buildKatakamunContext(utaNumber?: number, keyword?: string): string {
  const parts: string[] = [];
  parts.push("【カタカムナウタヒ — 写像レイヤー】");
  parts.push("※カタカムナは写像レイヤーに属する。中枢語義は言灵秘書（KHS）が定義する。");

  if (utaNumber) {
    const uta = getKatakamunUta(utaNumber);
    if (uta) {
      parts.push("");
      parts.push(`第${uta.utaNumber}首: ${uta.text}`);
      parts.push(`主題: ${uta.theme}`);
      parts.push(`鍵語: ${uta.keywords.join("、")}`);
      const analysis = analyzeKatakamunText(uta.text);
      parts.push(`構造: 円=${analysis.circleCount} 渦=${analysis.spiralCount} 十字=${analysis.crossCount} 波=${analysis.waveCount}`);
      parts.push(`水火: 火=${analysis.fireCount} 水=${analysis.waterCount} 中=${analysis.neutralCount}`);
      parts.push(`灵的意味: ${analysis.spiritualMeaning}`);
    }
  }

  if (keyword) {
    const hits = searchKatakamunUtas(keyword);
    if (hits.length > 0) {
      parts.push("");
      parts.push(`「${keyword}」を含む首（${hits.length}件）:`);
      for (const h of hits.slice(0, 5)) {
        parts.push(`  第${h.utaNumber}首: ${h.text.slice(0, 60)}… [${h.theme}]`);
      }
    }
  }

  return parts.join("\n");
}
