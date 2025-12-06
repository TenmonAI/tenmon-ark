/**
 * Twin-Core Enhancement Layer: Preprocessor
 * 
 * 天聞アークOSの根幹である構文を文章生成処理の前に適用
 * - 天津金木構文（Amatsu-Kanagi）
 * - いろは言霊解（Iroha Kotodama）
 * - 火水循環（Fire-Water Cycle）
 * - 五相（Five Elements: 天・火・風・水・地）
 * 
 * 目的: 文章生成の思想深度をGPT級から"OS構文級"へ引き上げる
 */

import { analyzeAmatsuKanagi } from '../../../server/amatsuKanagiEngine';
import { analyzeIroha } from '../../../server/irohaEngine';
import { calculateFireWaterBalance } from '../../../server/kotodama/kotodamaJapaneseCorrectorEngine';

/**
 * 五相（Five Elements）
 */
export type FiveElement = 'heaven' | 'fire' | 'wind' | 'water' | 'earth';

/**
 * 五相の特性
 */
export const FIVE_ELEMENT_PROPERTIES: Record<FiveElement, {
  name: string;
  nameJa: string;
  energy: 'expanding' | 'contracting' | 'circulating' | 'stabilizing' | 'transcending';
  fireWaterBalance: 'fire' | 'water' | 'balanced';
  keywords: string[];
}> = {
  heaven: {
    name: 'Heaven',
    nameJa: '天',
    energy: 'transcending',
    fireWaterBalance: 'balanced',
    keywords: ['宇宙', '天', '超越', '統合', 'ミナカ', '中心'],
  },
  fire: {
    name: 'Fire',
    nameJa: '火',
    energy: 'expanding',
    fireWaterBalance: 'fire',
    keywords: ['外発', '拡張', '明確', '強い', '活発', '陽'],
  },
  wind: {
    name: 'Wind',
    nameJa: '風',
    energy: 'circulating',
    fireWaterBalance: 'balanced',
    keywords: ['循環', '流れ', '変化', '調和', '風'],
  },
  water: {
    name: 'Water',
    nameJa: '水',
    energy: 'contracting',
    fireWaterBalance: 'water',
    keywords: ['内集', '収束', '柔らか', '優しい', '静か', '陰'],
  },
  earth: {
    name: 'Earth',
    nameJa: '地',
    energy: 'stabilizing',
    fireWaterBalance: 'balanced',
    keywords: ['安定', '基盤', '実体', '現実', '地'],
  },
};

/**
 * Twin-Core前処理結果
 */
export interface TwinCorePreprocessResult {
  // 元のテキスト
  original: string;
  
  // 天津金木構文解析結果
  amatsuKanagi: {
    patterns: Array<{
      number: number;
      name: string;
      meaning: string;
    }>;
    dominantPattern: number | null;
  };
  
  // いろは言霊解析結果
  iroha: {
    characters: Array<{
      char: string;
      order: number;
      meaning: string;
    }>;
    dominantMeaning: string | null;
  };
  
  // 火水バランス
  fireWater: {
    balance: 'fire' | 'water' | 'balanced';
    fireScore: number;
    waterScore: number;
    minakaScore: number;
  };
  
  // 五相フロー
  fiveElements: {
    dominant: FiveElement;
    distribution: Record<FiveElement, number>;
    flow: FiveElement[];
  };
  
  // 思想深度
  depth: {
    level: 'surface' | 'middle' | 'deep' | 'cosmic';
    score: number;
    keywords: string[];
  };
  
  // 推奨される生成スタイル
  recommendedStyle: {
    tone: 'fire' | 'water' | 'balanced';
    structure: 'linear' | 'circular' | 'spiral';
    emphasis: 'clarity' | 'depth' | 'harmony';
  };
}

/**
 * Twin-Core前処理を実行
 */
export async function preprocessTwinCore(text: string): Promise<TwinCorePreprocessResult> {
  // 1. 天津金木構文解析
  const amatsuKanagiResult = await analyzeAmatsuKanagi(text);
  const dominantPattern = amatsuKanagiResult.patterns.length > 0 
    ? amatsuKanagiResult.patterns[0]?.number || null
    : null;
  
  // 2. いろは言霊解析
  const irohaResult = await analyzeIroha(text);
  const dominantMeaning = (irohaResult.interpretations && irohaResult.interpretations.length > 0)
    ? irohaResult.interpretations[0]?.interpretation || null
    : null;
  
  // 3. 火水バランス計算
  const fireWaterResult = calculateFireWaterBalance(text);
  const fireScore = fireWaterResult.fire;
  const waterScore = fireWaterResult.water;
  const minakaScore = 100 - Math.abs(fireScore - waterScore);
  
  let balance: 'fire' | 'water' | 'balanced';
  if (fireScore > waterScore + 20) {
    balance = 'fire';
  } else if (waterScore > fireScore + 20) {
    balance = 'water';
  } else {
    balance = 'balanced';
  }
  
  // 4. 五相フロー計算
  const fiveElementsResult = calculateFiveElements(text);
  
  // 5. 思想深度計算
  const depthResult = calculateDepth(text, amatsuKanagiResult, irohaResult);
  
  // 6. 推奨スタイル決定
  const recommendedStyle = determineRecommendedStyle(
    balance,
    fiveElementsResult.dominant,
    depthResult.level
  );
  
  return {
    original: text,
    amatsuKanagi: {
      patterns: amatsuKanagiResult.patterns.map(p => ({
        number: p.number,
        name: p.sound,
        meaning: p.meaning || '',
      })),
      dominantPattern,
    },
    iroha: {
      characters: irohaResult.interpretations.map(interp => ({
        char: interp.character,
        order: interp.order,
        meaning: interp.interpretation,
      })),
      dominantMeaning,
    },
    fireWater: {
      balance,
      fireScore,
      waterScore,
      minakaScore,
    },
    fiveElements: fiveElementsResult,
    depth: depthResult,
    recommendedStyle,
  };
}

/**
 * 五相フローを計算
 */
function calculateFiveElements(text: string): TwinCorePreprocessResult['fiveElements'] {
  const distribution: Record<FiveElement, number> = {
    heaven: 0,
    fire: 0,
    wind: 0,
    water: 0,
    earth: 0,
  };
  
  // キーワードマッチングで五相を計算
  for (const [element, props] of Object.entries(FIVE_ELEMENT_PROPERTIES)) {
    const keywords = props.keywords;
    const count = keywords.filter(kw => text.includes(kw)).length;
    distribution[element as FiveElement] = count;
  }
  
  // 支配的な五相を決定
  let dominant: FiveElement = 'heaven';
  let maxCount = distribution.heaven;
  
  for (const [element, count] of Object.entries(distribution)) {
    if (count > maxCount) {
      dominant = element as FiveElement;
      maxCount = count;
    }
  }
  
  // 五相フロー（循環順序）
  const flow: FiveElement[] = ['heaven', 'fire', 'wind', 'water', 'earth'];
  
  return {
    dominant,
    distribution,
    flow,
  };
}

/**
 * 思想深度を計算
 */
function calculateDepth(
  text: string,
  amatsuKanagi: Awaited<ReturnType<typeof analyzeAmatsuKanagi>>,
  iroha: Awaited<ReturnType<typeof analyzeIroha>>
): TwinCorePreprocessResult['depth'] {
  // 深度キーワード
  const cosmicKeywords = ['宇宙', '統合', 'ミナカ', '中心', '本質', '構造'];
  const deepKeywords = ['火水', 'Twin-Core', '言霊', '天津金木', 'いろは'];
  const middleKeywords = ['調和', 'バランス', '循環', '変化'];
  
  const cosmicCount = cosmicKeywords.filter(kw => text.includes(kw)).length;
  const deepCount = deepKeywords.filter(kw => text.includes(kw)).length;
  const middleCount = middleKeywords.filter(kw => text.includes(kw)).length;
  
  // 天津金木・いろはの解析結果も考慮
  const amatsuKanagiBonus = amatsuKanagi.patterns?.length ? amatsuKanagi.patterns.length * 10 : 0;
  const irohaBonus = iroha.interpretations?.length ? iroha.interpretations.length * 5 : 0;
  
  const score = cosmicCount * 30 + deepCount * 20 + middleCount * 10 + amatsuKanagiBonus + irohaBonus;
  
  let level: 'surface' | 'middle' | 'deep' | 'cosmic';
  if (score >= 100) {
    level = 'cosmic';
  } else if (score >= 50) {
    level = 'deep';
  } else if (score >= 20) {
    level = 'middle';
  } else {
    level = 'surface';
  }
  
  const keywords = [
    ...cosmicKeywords.filter(kw => text.includes(kw)),
    ...deepKeywords.filter(kw => text.includes(kw)),
    ...middleKeywords.filter(kw => text.includes(kw)),
  ];
  
  return {
    level,
    score,
    keywords,
  };
}

/**
 * 推奨スタイルを決定
 */
function determineRecommendedStyle(
  fireWaterBalance: 'fire' | 'water' | 'balanced',
  dominantElement: FiveElement,
  depthLevel: 'surface' | 'middle' | 'deep' | 'cosmic'
): TwinCorePreprocessResult['recommendedStyle'] {
  // トーン決定
  let tone: 'fire' | 'water' | 'balanced' = fireWaterBalance;
  
  // 構造決定
  let structure: 'linear' | 'circular' | 'spiral';
  if (dominantElement === 'fire' || dominantElement === 'earth') {
    structure = 'linear';
  } else if (dominantElement === 'water' || dominantElement === 'wind') {
    structure = 'circular';
  } else {
    structure = 'spiral';
  }
  
  // 強調決定
  let emphasis: 'clarity' | 'depth' | 'harmony';
  if (depthLevel === 'surface' || depthLevel === 'middle') {
    emphasis = 'clarity';
  } else if (depthLevel === 'deep') {
    emphasis = 'depth';
  } else {
    emphasis = 'harmony';
  }
  
  return {
    tone,
    structure,
    emphasis,
  };
}

/**
 * Twin-Core前処理の簡易版（パフォーマンス重視）
 */
export async function preprocessTwinCoreLite(text: string): Promise<Pick<TwinCorePreprocessResult, 'fireWater' | 'depth' | 'recommendedStyle'>> {
  // 火水バランスのみ計算
  const fireWaterResult = calculateFireWaterBalance(text);
  const fireScore = fireWaterResult.fire;
  const waterScore = fireWaterResult.water;
  const minakaScore = 100 - Math.abs(fireScore - waterScore);
  
  let balance: 'fire' | 'water' | 'balanced';
  if (fireScore > waterScore + 20) {
    balance = 'fire';
  } else if (waterScore > fireScore + 20) {
    balance = 'water';
  } else {
    balance = 'balanced';
  }
  
  // 簡易深度計算
  const cosmicKeywords = ['宇宙', '統合', 'ミナカ', '中心', '本質', '構造'];
  const deepKeywords = ['火水', 'Twin-Core', '言霊', '天津金木', 'いろは'];
  const middleKeywords = ['調和', 'バランス', '循環', '変化'];
  
  const cosmicCount = cosmicKeywords.filter(kw => text.includes(kw)).length;
  const deepCount = deepKeywords.filter(kw => text.includes(kw)).length;
  const middleCount = middleKeywords.filter(kw => text.includes(kw)).length;
  
  const score = cosmicCount * 30 + deepCount * 20 + middleCount * 10;
  
  let level: 'surface' | 'middle' | 'deep' | 'cosmic';
  if (score >= 100) {
    level = 'cosmic';
  } else if (score >= 50) {
    level = 'deep';
  } else if (score >= 20) {
    level = 'middle';
  } else {
    level = 'surface';
  }
  
  const keywords = [
    ...cosmicKeywords.filter(kw => text.includes(kw)),
    ...deepKeywords.filter(kw => text.includes(kw)),
    ...middleKeywords.filter(kw => text.includes(kw)),
  ];
  
  return {
    fireWater: {
      balance,
      fireScore,
      waterScore,
      minakaScore,
    },
    depth: {
      level,
      score,
      keywords,
    },
    recommendedStyle: {
      tone: balance,
      structure: 'spiral',
      emphasis: level === 'cosmic' ? 'harmony' : level === 'deep' ? 'depth' : 'clarity',
    },
  };
}
