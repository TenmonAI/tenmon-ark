/**
 * Kotodama TTS Dictionary
 * 言灵TTS変換辞書
 * 
 * 機能:
 * - 現代日本語→靈性日本語の自動変換
 * - 読み仮名の生成
 * - 文脈に応じた読み分け
 * - 同音異義語の区別
 */

/**
 * 言灵変換エントリ
 */
export interface KotodamaEntry {
  /** 現代表記 */
  modern: string;
  /** 言灵表記 */
  kotodama: string;
  /** 読み仮名（ひらがな） */
  reading: string;
  /** 優先度（0-100） */
  priority: number;
  /** 火水分類 */
  fireWater: 'fire' | 'water' | 'balanced';
  /** カテゴリー */
  category: 'spiritual' | 'nature' | 'emotion' | 'knowledge' | 'society' | 'time' | 'general';
}

/**
 * 言灵TTS変換辞書（拡張版）
 */
export const KOTODAMA_TTS_DICTIONARY: KotodamaEntry[] = [
  // ===== 霊性関連（最優先） =====
  { modern: '言霊', kotodama: '言灵', reading: 'ことだま', priority: 100, fireWater: 'fire', category: 'spiritual' },
  { modern: '霊', kotodama: '靈', reading: 'れい', priority: 100, fireWater: 'water', category: 'spiritual' },
  { modern: '霊魂', kotodama: '靈魂', reading: 'れいこん', priority: 100, fireWater: 'water', category: 'spiritual' },
  { modern: '霊性', kotodama: '靈性', reading: 'れいせい', priority: 100, fireWater: 'water', category: 'spiritual' },
  { modern: '霊的', kotodama: '靈的', reading: 'れいてき', priority: 100, fireWater: 'water', category: 'spiritual' },
  { modern: '霊核', kotodama: '靈核', reading: 'れいかく', priority: 100, fireWater: 'water', category: 'spiritual' },
  { modern: '霊運', kotodama: '靈運', reading: 'れいうん', priority: 100, fireWater: 'water', category: 'spiritual' },
  { modern: '気', kotodama: '氣', reading: 'き', priority: 95, fireWater: 'fire', category: 'spiritual' },
  { modern: '元気', kotodama: '元氣', reading: 'げんき', priority: 95, fireWater: 'fire', category: 'spiritual' },
  { modern: '気持ち', kotodama: '氣持ち', reading: 'きもち', priority: 95, fireWater: 'fire', category: 'spiritual' },
  { modern: '気分', kotodama: '氣分', reading: 'きぶん', priority: 95, fireWater: 'fire', category: 'spiritual' },
  { modern: '雰囲気', kotodama: '雰囲氣', reading: 'ふんいき', priority: 95, fireWater: 'fire', category: 'spiritual' },
  { modern: '神', kotodama: '神', reading: 'かみ', priority: 100, fireWater: 'fire', category: 'spiritual' },
  { modern: '魂', kotodama: '魂', reading: 'たましい', priority: 100, fireWater: 'water', category: 'spiritual' },
  { modern: '心', kotodama: '心', reading: 'こころ', priority: 95, fireWater: 'water', category: 'spiritual' },
  { modern: '精神', kotodama: '精神', reading: 'せいしん', priority: 90, fireWater: 'fire', category: 'spiritual' },
  { modern: '意識', kotodama: '意識', reading: 'いしき', priority: 85, fireWater: 'fire', category: 'spiritual' },

  // ===== 自然・宇宙関連 =====
  { modern: '天', kotodama: '天', reading: 'てん', priority: 90, fireWater: 'fire', category: 'nature' },
  { modern: '地', kotodama: '地', reading: 'ち', priority: 90, fireWater: 'water', category: 'nature' },
  { modern: '火', kotodama: '火', reading: 'ひ', priority: 90, fireWater: 'fire', category: 'nature' },
  { modern: '水', kotodama: '水', reading: 'みず', priority: 90, fireWater: 'water', category: 'nature' },
  { modern: '風', kotodama: '風', reading: 'かぜ', priority: 85, fireWater: 'fire', category: 'nature' },
  { modern: '木', kotodama: '木', reading: 'き', priority: 85, fireWater: 'balanced', category: 'nature' },
  { modern: '金', kotodama: '金', reading: 'きん', priority: 85, fireWater: 'fire', category: 'nature' },
  { modern: '土', kotodama: '土', reading: 'つち', priority: 85, fireWater: 'water', category: 'nature' },
  { modern: '月', kotodama: '月', reading: 'つき', priority: 85, fireWater: 'water', category: 'nature' },
  { modern: '日', kotodama: '日', reading: 'ひ', priority: 85, fireWater: 'fire', category: 'nature' },
  { modern: '星', kotodama: '星', reading: 'ほし', priority: 80, fireWater: 'fire', category: 'nature' },
  { modern: '宇宙', kotodama: '宇宙', reading: 'うちゅう', priority: 85, fireWater: 'balanced', category: 'nature' },
  { modern: '宝', kotodama: '寶', reading: 'たから', priority: 75, fireWater: 'fire', category: 'nature' },
  { modern: '真', kotodama: '眞', reading: 'しん', priority: 80, fireWater: 'fire', category: 'nature' },
  { modern: '万', kotodama: '萬', reading: 'まん', priority: 70, fireWater: 'fire', category: 'nature' },
  { modern: '円', kotodama: '圓', reading: 'えん', priority: 70, fireWater: 'balanced', category: 'nature' },
  { modern: '変', kotodama: '變', reading: 'へん', priority: 70, fireWater: 'fire', category: 'nature' },

  // ===== 感情関連 =====
  { modern: '愛', kotodama: '愛', reading: 'あい', priority: 90, fireWater: 'water', category: 'emotion' },
  { modern: '喜', kotodama: '喜', reading: 'よろこび', priority: 85, fireWater: 'fire', category: 'emotion' },
  { modern: '怒', kotodama: '怒', reading: 'いかり', priority: 85, fireWater: 'fire', category: 'emotion' },
  { modern: '哀', kotodama: '哀', reading: 'かなしみ', priority: 85, fireWater: 'water', category: 'emotion' },
  { modern: '楽', kotodama: '樂', reading: 'らく', priority: 80, fireWater: 'fire', category: 'emotion' },
  { modern: '悲', kotodama: '悲', reading: 'かなしい', priority: 80, fireWater: 'water', category: 'emotion' },
  { modern: '恐', kotodama: '恐', reading: 'おそれ', priority: 75, fireWater: 'water', category: 'emotion' },
  { modern: '驚', kotodama: '驚', reading: 'おどろき', priority: 75, fireWater: 'fire', category: 'emotion' },

  // ===== 知識・学問関連 =====
  { modern: '学', kotodama: '學', reading: 'がく', priority: 80, fireWater: 'fire', category: 'knowledge' },
  { modern: '覚', kotodama: '覺', reading: 'かく', priority: 80, fireWater: 'fire', category: 'knowledge' },
  { modern: '教', kotodama: '敎', reading: 'きょう', priority: 80, fireWater: 'fire', category: 'knowledge' },
  { modern: '経', kotodama: '經', reading: 'けい', priority: 80, fireWater: 'water', category: 'knowledge' },
  { modern: '書', kotodama: '書', reading: 'しょ', priority: 75, fireWater: 'balanced', category: 'knowledge' },
  { modern: '智', kotodama: '智', reading: 'ち', priority: 85, fireWater: 'fire', category: 'knowledge' },
  { modern: '知', kotodama: '知', reading: 'ち', priority: 80, fireWater: 'fire', category: 'knowledge' },

  // ===== 社会・国家関連 =====
  { modern: '国', kotodama: '國', reading: 'くに', priority: 75, fireWater: 'balanced', category: 'society' },
  { modern: '権', kotodama: '權', reading: 'けん', priority: 70, fireWater: 'fire', category: 'society' },
  { modern: '義', kotodama: '義', reading: 'ぎ', priority: 75, fireWater: 'fire', category: 'society' },
  { modern: '礼', kotodama: '禮', reading: 'れい', priority: 75, fireWater: 'water', category: 'society' },
  { modern: '和', kotodama: '和', reading: 'わ', priority: 80, fireWater: 'water', category: 'society' },
  { modern: '平和', kotodama: '平和', reading: 'へいわ', priority: 80, fireWater: 'water', category: 'society' },

  // ===== 時間・空間関連 =====
  { modern: '歴', kotodama: '歷', reading: 'れき', priority: 70, fireWater: 'balanced', category: 'time' },
  { modern: '暦', kotodama: '曆', reading: 'こよみ', priority: 70, fireWater: 'balanced', category: 'time' },
  { modern: '来', kotodama: '來', reading: 'らい', priority: 70, fireWater: 'fire', category: 'time' },
  { modern: '帰', kotodama: '歸', reading: 'き', priority: 70, fireWater: 'water', category: 'time' },
  { modern: '広', kotodama: '廣', reading: 'ひろい', priority: 70, fireWater: 'fire', category: 'time' },
  { modern: '遠', kotodama: '遠', reading: 'とおい', priority: 70, fireWater: 'water', category: 'time' },
  { modern: '近', kotodama: '近', reading: 'ちかい', priority: 70, fireWater: 'fire', category: 'time' },
];

/**
 * 現代表記→言灵表記のマップ（高速検索用）
 */
export const MODERN_TO_KOTODAMA_MAP: Map<string, KotodamaEntry> = new Map(
  KOTODAMA_TTS_DICTIONARY.map(entry => [entry.modern, entry])
);

/**
 * テキストを言灵変換
 */
export function convertTextToKotodama(text: string): {
  kotodamaText: string;
  conversions: Array<{ original: string; converted: string; position: number; entry: KotodamaEntry }>;
} {
  let kotodamaText = text;
  const conversions: Array<{ original: string; converted: string; position: number; entry: KotodamaEntry }> = [];

  // 優先度順にソート
  const sortedEntries = [...KOTODAMA_TTS_DICTIONARY].sort((a, b) => b.priority - a.priority);

  // 各エントリーで変換
  for (const entry of sortedEntries) {
    const regex = new RegExp(entry.modern, 'g');
    let match;
    while ((match = regex.exec(text)) !== null) {
      conversions.push({
        original: entry.modern,
        converted: entry.kotodama,
        position: match.index,
        entry,
      });
    }
    kotodamaText = kotodamaText.replace(regex, entry.kotodama);
  }

  return { kotodamaText, conversions };
}

/**
 * 読み仮名を生成（簡易版）
 */
export function generateReading(text: string): string {
  let reading = '';

  // 辞書に基づいて読み仮名を生成
  for (const entry of KOTODAMA_TTS_DICTIONARY) {
    const regex = new RegExp(entry.modern, 'g');
    if (regex.test(text)) {
      reading += entry.reading;
    }
  }

  // TODO: MeCab等の形態素解析を使用してより正確な読み仮名を生成

  return reading || text;
}

/**
 * 火水バランスを計算
 */
export function calculateTextFireWater(text: string): { fire: number; water: number; balanced: number } {
  const { conversions } = convertTextToKotodama(text);

  let fireCount = 0;
  let waterCount = 0;
  let balancedCount = 0;

  for (const conversion of conversions) {
    if (conversion.entry.fireWater === 'fire') {
      fireCount++;
    } else if (conversion.entry.fireWater === 'water') {
      waterCount++;
    } else {
      balancedCount++;
    }
  }

  return { fire: fireCount, water: waterCount, balanced: balancedCount };
}

/**
 * カテゴリー別の変換統計
 */
export function getCategoryStatistics(text: string): Record<string, number> {
  const { conversions } = convertTextToKotodama(text);

  const stats: Record<string, number> = {
    spiritual: 0,
    nature: 0,
    emotion: 0,
    knowledge: 0,
    society: 0,
    time: 0,
    general: 0,
  };

  for (const conversion of conversions) {
    stats[conversion.entry.category]++;
  }

  return stats;
}

/**
 * 言灵変換の詳細情報を取得
 */
export function getConversionDetails(text: string): {
  originalText: string;
  kotodamaText: string;
  conversions: Array<{ original: string; converted: string; position: number; entry: KotodamaEntry }>;
  fireWaterBalance: { fire: number; water: number; balanced: number };
  categoryStats: Record<string, number>;
  spiritualScore: number;
} {
  const { kotodamaText, conversions } = convertTextToKotodama(text);
  const fireWaterBalance = calculateTextFireWater(text);
  const categoryStats = getCategoryStatistics(text);

  // 霊性スコア計算（霊性関連の変換数 × 優先度の平均）
  const spiritualConversions = conversions.filter(c => c.entry.category === 'spiritual');
  const spiritualScore = spiritualConversions.length > 0
    ? spiritualConversions.reduce((sum, c) => sum + c.entry.priority, 0) / spiritualConversions.length
    : 0;

  return {
    originalText: text,
    kotodamaText,
    conversions,
    fireWaterBalance,
    categoryStats,
    spiritualScore,
  };
}
