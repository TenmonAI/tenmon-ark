/**
 * Universal Language Corrector Engine (ULCE)
 * 多言語靈性変換エンジン
 */

import { calculateUniversalFireWaterBalance, getLanguageFireWater, type FireWaterType } from "./universalFireWaterClassification";

export interface SpiritualMapping {
  from: string;
  to: string;
  language: string;
  spiritualScore: number;
  fireWaterType: FireWaterType;
  description: string;
}

export interface UniversalConversionResult {
  original: string;
  converted: string;
  language: string;
  fireWaterBalance: {
    fire: number;
    water: number;
    balance: number;
  };
  spiritualScore: number;
  mappings: SpiritualMapping[];
}

/**
 * 英語の靈性マッピング
 * 一般的な単語を靈性的な表現に変換
 */
export const ENGLISH_SPIRITUAL_MAPPING: Record<string, string> = {
  // 精神・靈性関連
  "spirit": "divine essence",
  "soul": "eternal core",
  "mind": "consciousness",
  "heart": "sacred center",
  "energy": "vital force",
  "power": "inner strength",
  "love": "universal compassion",
  "peace": "inner harmony",
  "wisdom": "sacred knowledge",
  "truth": "eternal reality",
  
  // 自然・宇宙関連
  "nature": "cosmic order",
  "universe": "infinite expanse",
  "earth": "sacred ground",
  "water": "flowing essence",
  "fire": "transforming force",
  "air": "breath of life",
  "light": "divine radiance",
  "darkness": "mystery depth",
  
  // 行動・状態関連
  "create": "manifest",
  "destroy": "transform",
  "heal": "restore harmony",
  "protect": "shield with light",
  "guide": "illuminate path",
  "connect": "unite essence",
  "balance": "harmonize forces",
  "transform": "transmute energy",
};

/**
 * 韓国語の靈性マッピング
 */
export const KOREAN_SPIRITUAL_MAPPING: Record<string, string> = {
  // 精神・靈性関連
  "영혼": "신성한 본질",
  "마음": "영적 중심",
  "정신": "의식의 빛",
  "사랑": "우주적 자비",
  "평화": "내면의 조화",
  "지혜": "신성한 지식",
  "진리": "영원한 실재",
  
  // 自然・宇宙関連
  "자연": "우주의 질서",
  "우주": "무한한 공간",
  "땅": "신성한 대지",
  "물": "흐르는 본질",
  "불": "변화의 힘",
  "공기": "생명의 숨결",
  "빛": "신성한 광채",
  
  // 行動・状態関連
  "창조하다": "현현하다",
  "치유하다": "조화를 회복하다",
  "보호하다": "빛으로 보호하다",
  "인도하다": "길을 밝히다",
  "연결하다": "본질을 통합하다",
  "균형": "힘의 조화",
};

/**
 * 中国語の靈性マッピング
 */
export const CHINESE_SPIRITUAL_MAPPING: Record<string, string> = {
  // 精神・靈性関連
  "灵魂": "神圣本质",
  "心灵": "灵性中心",
  "精神": "意识之光",
  "爱": "宇宙慈悲",
  "和平": "内在和谐",
  "智慧": "神圣知识",
  "真理": "永恒实相",
  
  // 自然・宇宙関連
  "自然": "宇宙秩序",
  "宇宙": "无限空间",
  "大地": "神圣土地",
  "水": "流动本质",
  "火": "转化之力",
  "空气": "生命气息",
  "光": "神圣光辉",
  
  // 行動・状態関連
  "创造": "显化",
  "治愈": "恢复和谐",
  "保护": "光之守护",
  "引导": "照亮道路",
  "连接": "统一本质",
  "平衡": "力量和谐",
};

/**
 * アラビア語の靈性マッピング
 */
export const ARABIC_SPIRITUAL_MAPPING: Record<string, string> = {
  // 精神・靈性関連
  "روح": "جوهر إلهي",
  "قلب": "مركز مقدس",
  "عقل": "وعي",
  "حب": "رحمة كونية",
  "سلام": "انسجام داخلي",
  "حكمة": "معرفة مقدسة",
  "حقيقة": "واقع أبدي",
  
  // 自然・宇宙関連
  "طبيعة": "نظام كوني",
  "كون": "فضاء لا نهائي",
  "أرض": "أرض مقدسة",
  "ماء": "جوهر متدفق",
  "نار": "قوة تحويلية",
  "هواء": "نفس الحياة",
  "نور": "إشراق إلهي",
  
  // 行動・状態関連
  "خلق": "تجلي",
  "شفاء": "استعادة الانسجام",
  "حماية": "درع بالنور",
  "إرشاد": "إنارة الطريق",
  "توازن": "تناغم القوى",
};

/**
 * ヒンディー語の靈性マッピング
 */
export const HINDI_SPIRITUAL_MAPPING: Record<string, string> = {
  // 精神・靈性関連
  "आत्मा": "दिव्य सार",
  "मन": "चेतना",
  "हृदय": "पवित्र केंद्र",
  "प्रेम": "सार्वभौमिक करुणा",
  "शांति": "आंतरिक सामंजस्य",
  "ज्ञान": "पवित्र ज्ञान",
  "सत्य": "शाश्वत वास्तविकता",
  
  // 自然・宇宙関連
  "प्रकृति": "ब्रह्मांडीय व्यवस्था",
  "ब्रह्मांड": "अनंत विस्तार",
  "पृथ्वी": "पवित्र भूमि",
  "जल": "प्रवाहित सार",
  "अग्नि": "परिवर्तनकारी शक्ति",
  "वायु": "जीवन की सांस",
  "प्रकाश": "दिव्य चमक",
  
  // 行動・状態関連
  "सृजन": "प्रकट",
  "उपचार": "सामंजस्य बहाल",
  "रक्षा": "प्रकाश से रक्षा",
  "मार्गदर्शन": "पथ प्रकाशित",
  "संतुलन": "शक्तियों का सामंजस्य",
};

/**
 * 全言語の靈性マッピングを統合
 */
export const ALL_SPIRITUAL_MAPPING = {
  en: ENGLISH_SPIRITUAL_MAPPING,
  ko: KOREAN_SPIRITUAL_MAPPING,
  zh: CHINESE_SPIRITUAL_MAPPING,
  ar: ARABIC_SPIRITUAL_MAPPING,
  hi: HINDI_SPIRITUAL_MAPPING,
};

/**
 * テキストを靈性的な表現に変換（多言語対応）
 */
export function convertToSpiritualLanguage(
  text: string,
  language: string,
  options: {
    balanceFireWater?: boolean;
    priorityThreshold?: number;
  } = {}
): UniversalConversionResult {
  const mapping = ALL_SPIRITUAL_MAPPING[language as keyof typeof ALL_SPIRITUAL_MAPPING] || {};
  const mappings: SpiritualMapping[] = [];
  let converted = text;

  // 単語レベルでの変換
  for (const [from, to] of Object.entries(mapping)) {
    // ASCII文字は\bを使用、非ASCII文字は単純マッチング
    const isAscii = /^[\x00-\x7F]+$/.test(from);
    const regex = isAscii ? new RegExp(`\\b${from}\\b`, "gi") : new RegExp(from, "g");
    if (regex.test(converted)) {
      const classifications = getLanguageFireWater(language);
      const fromType = classifications.find((c) => c.phoneme === from[0])?.type || "water";
      
      mappings.push({
        from,
        to,
        language,
        spiritualScore: 80 + Math.random() * 20, // 80-100
        fireWaterType: fromType,
        description: `Spiritual transformation: ${from} → ${to}`,
      });
      
      converted = converted.replace(regex, to);
    }
  }

  // 火水バランスを考慮した調整
  if (options.balanceFireWater) {
    const balance = calculateUniversalFireWaterBalance(converted, language);
    if (balance.balance < 0.4 || balance.balance > 0.6) {
      // バランスが悪い場合、調整を試みる
      // （実装は簡略化）
    }
  }

  const fireWaterBalance = calculateUniversalFireWaterBalance(converted, language);
  const spiritualScore = calculateSpiritualScore(converted, language, mappings.length);

  return {
    original: text,
    converted,
    language,
    fireWaterBalance,
    spiritualScore,
    mappings,
  };
}

/**
 * 靈性スコアを計算（多言語対応）
 */
export function calculateSpiritualScore(
  text: string,
  language: string,
  mappingCount: number
): number {
  const fireWaterBalance = calculateUniversalFireWaterBalance(text, language);
  
  // バランススコア（0-50点）
  const balanceScore = 50 - Math.abs(fireWaterBalance.balance - 0.5) * 100;
  
  // 変換スコア（0-50点）
  const conversionScore = Math.min(mappingCount * 10, 50);
  
  return Math.round(balanceScore + conversionScore);
}

/**
 * 言語間での靈性マッピング
 * 例: 日本語の「氣」→ 英語の「vital force」
 */
export interface CrossLanguageMapping {
  sourceLanguage: string;
  targetLanguage: string;
  sourceWord: string;
  targetWord: string;
  spiritualScore: number;
  description: string;
}

/**
 * 言語間靈性マッピングデータ
 */
export const CROSS_LANGUAGE_SPIRITUAL_MAPPING: CrossLanguageMapping[] = [
  // 日本語 ⇔ 英語
  { sourceLanguage: "ja", targetLanguage: "en", sourceWord: "氣", targetWord: "vital force", spiritualScore: 95, description: "Universal life energy" },
  { sourceLanguage: "ja", targetLanguage: "en", sourceWord: "靈", targetWord: "divine spirit", spiritualScore: 98, description: "Sacred spiritual essence" },
  { sourceLanguage: "ja", targetLanguage: "en", sourceWord: "魂", targetWord: "eternal soul", spiritualScore: 90, description: "Immortal essence" },
  { sourceLanguage: "ja", targetLanguage: "en", sourceWord: "和", targetWord: "harmony", spiritualScore: 85, description: "Balance and peace" },
  
  // 英語 ⇔ 韓国語
  { sourceLanguage: "en", targetLanguage: "ko", sourceWord: "spirit", targetWord: "영혼", spiritualScore: 90, description: "Spiritual essence" },
  { sourceLanguage: "en", targetLanguage: "ko", sourceWord: "energy", targetWord: "기운", spiritualScore: 85, description: "Vital energy" },
  { sourceLanguage: "en", targetLanguage: "ko", sourceWord: "harmony", targetWord: "조화", spiritualScore: 88, description: "Balance" },
  
  // 韓国語 ⇔ 中国語
  { sourceLanguage: "ko", targetLanguage: "zh", sourceWord: "영혼", targetWord: "灵魂", spiritualScore: 92, description: "Soul essence" },
  { sourceLanguage: "ko", targetLanguage: "zh", sourceWord: "기운", targetWord: "气", spiritualScore: 90, description: "Life force" },
  { sourceLanguage: "ko", targetLanguage: "zh", sourceWord: "조화", targetWord: "和谐", spiritualScore: 87, description: "Harmony" },
  
  // 中国語 ⇔ アラビア語
  { sourceLanguage: "zh", targetLanguage: "ar", sourceWord: "灵魂", targetWord: "روح", spiritualScore: 91, description: "Spirit" },
  { sourceLanguage: "zh", targetLanguage: "ar", sourceWord: "气", targetWord: "طاقة", spiritualScore: 88, description: "Energy" },
  
  // アラビア語 ⇔ ヒンディー語
  { sourceLanguage: "ar", targetLanguage: "hi", sourceWord: "روح", targetWord: "आत्मा", spiritualScore: 93, description: "Soul/Spirit" },
  { sourceLanguage: "ar", targetLanguage: "hi", sourceWord: "نور", targetWord: "प्रकाश", spiritualScore: 89, description: "Divine light" },
];

/**
 * 言語間で靈性を保持した変換
 */
export function convertBetweenLanguages(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): {
  original: string;
  converted: string;
  sourceLanguage: string;
  targetLanguage: string;
  mappings: CrossLanguageMapping[];
  spiritualScore: number;
} {
  const mappings: CrossLanguageMapping[] = [];
  let converted = text;

  // 該当する言語間マッピングを適用
  const relevantMappings = CROSS_LANGUAGE_SPIRITUAL_MAPPING.filter(
    (m) => m.sourceLanguage === sourceLanguage && m.targetLanguage === targetLanguage
  );

  for (const mapping of relevantMappings) {
    const regex = new RegExp(mapping.sourceWord, "g");
    if (regex.test(converted)) {
      mappings.push(mapping);
      converted = converted.replace(regex, mapping.targetWord);
    }
  }

  const spiritualScore = mappings.length > 0
    ? Math.round(mappings.reduce((sum, m) => sum + m.spiritualScore, 0) / mappings.length)
    : 50;

  return {
    original: text,
    converted,
    sourceLanguage,
    targetLanguage,
    mappings,
    spiritualScore,
  };
}
