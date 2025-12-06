/**
 * Fire-Water Balance Calculator
 * 
 * 火水バランスの高度な計算と調整
 * - 文章の火水バランスを詳細に分析
 * - 火水循環の流れを可視化
 * - 最適なバランスを提案
 */

/**
 * 火水バランス詳細結果
 */
export interface FireWaterBalanceDetail {
  // 基本バランス
  balance: 'fire' | 'water' | 'balanced';
  
  // スコア
  fireScore: number;
  waterScore: number;
  minakaScore: number;
  
  // 詳細分析
  analysis: {
    fireElements: string[];
    waterElements: string[];
    minakaElements: string[];
    dominantElement: 'fire' | 'water' | 'minaka';
  };
  
  // 循環フロー
  flow: {
    direction: 'fire-to-water' | 'water-to-fire' | 'balanced-cycle';
    strength: number;
    harmony: number;
  };
  
  // 推奨調整
  recommendation: {
    needsAdjustment: boolean;
    targetBalance: 'fire' | 'water' | 'balanced';
    adjustmentStrength: 'light' | 'medium' | 'strong';
  };
}

/**
 * 火（外発）のキーワード
 */
const FIRE_KEYWORDS = [
  // 断定的表現
  'です', 'である', 'だ', '明確', '確実',
  
  // 外向的表現
  '拡張', '発展', '広がる', '外へ', '展開',
  
  // 強い表現
  '強い', '力強い', '活発', '積極的', '能動的',
  
  // 陽の表現
  '陽', '明るい', '輝く', '光', '太陽',
  
  // 火の要素
  '火', '炎', '熱', '燃える', 'エネルギー',
];

/**
 * 水（内集）のキーワード
 */
const WATER_KEYWORDS = [
  // 柔らかい表現
  'でしょうか', 'かもしれません', 'と感じます', 'と思います',
  
  // 内向的表現
  '収束', '内へ', '深まる', '静か', '落ち着く',
  
  // 柔らかい表現
  '柔らか', '優しい', '穏やか', '静か', '受動的',
  
  // 陰の表現
  '陰', '暗い', '影', '月', '夜',
  
  // 水の要素
  '水', '流れ', '波', '海', '川',
];

/**
 * ミナカ（中心）のキーワード
 */
const MINAKA_KEYWORDS = [
  // 中心的表現
  'ミナカ', '中心', '統合', '調和', 'バランス',
  
  // 宇宙的表現
  '宇宙', '天', '超越', '本質', '構造',
  
  // 循環的表現
  '循環', '流れ', '変化', '調和', '風',
  
  // Twin-Core
  'Twin-Core', '火水', '二元', '統合',
];

/**
 * 火水バランスを詳細計算
 */
export function calculateFireWaterBalanceDetail(text: string): FireWaterBalanceDetail {
  // 1. 基本スコア計算
  const fireElements = FIRE_KEYWORDS.filter(kw => text.includes(kw));
  const waterElements = WATER_KEYWORDS.filter(kw => text.includes(kw));
  const minakaElements = MINAKA_KEYWORDS.filter(kw => text.includes(kw));
  
  const fireScore = fireElements.length * 10;
  const waterScore = waterElements.length * 10;
  const minakaScore = minakaElements.length * 15 + (100 - Math.abs(fireScore - waterScore));
  
  // 2. バランス判定
  let balance: 'fire' | 'water' | 'balanced';
  if (minakaScore > 80) {
    balance = 'balanced';
  } else if (fireScore > waterScore + 20) {
    balance = 'fire';
  } else if (waterScore > fireScore + 20) {
    balance = 'water';
  } else {
    balance = 'balanced';
  }
  
  // 3. 支配的要素
  let dominantElement: 'fire' | 'water' | 'minaka';
  if (minakaScore > Math.max(fireScore, waterScore)) {
    dominantElement = 'minaka';
  } else if (fireScore > waterScore) {
    dominantElement = 'fire';
  } else {
    dominantElement = 'water';
  }
  
  // 4. 循環フロー計算
  const flow = calculateFlow(fireScore, waterScore, minakaScore);
  
  // 5. 推奨調整
  const recommendation = calculateRecommendation(balance, fireScore, waterScore, minakaScore);
  
  return {
    balance,
    fireScore,
    waterScore,
    minakaScore,
    analysis: {
      fireElements,
      waterElements,
      minakaElements,
      dominantElement,
    },
    flow,
    recommendation,
  };
}

/**
 * 循環フローを計算
 */
function calculateFlow(
  fireScore: number,
  waterScore: number,
  minakaScore: number
): FireWaterBalanceDetail['flow'] {
  // 方向決定
  let direction: 'fire-to-water' | 'water-to-fire' | 'balanced-cycle';
  if (minakaScore > 80) {
    direction = 'balanced-cycle';
  } else if (fireScore > waterScore) {
    direction = 'fire-to-water';
  } else {
    direction = 'water-to-fire';
  }
  
  // 強度計算
  const strength = Math.abs(fireScore - waterScore);
  
  // 調和度計算
  const harmony = 100 - strength;
  
  return {
    direction,
    strength,
    harmony,
  };
}

/**
 * 推奨調整を計算
 */
function calculateRecommendation(
  balance: 'fire' | 'water' | 'balanced',
  fireScore: number,
  waterScore: number,
  minakaScore: number
): FireWaterBalanceDetail['recommendation'] {
  // 調整が必要かどうか
  const needsAdjustment = Math.abs(fireScore - waterScore) > 50;
  
  // 目標バランス
  let targetBalance: 'fire' | 'water' | 'balanced';
  if (minakaScore > 80) {
    targetBalance = 'balanced';
  } else if (balance === 'fire' && fireScore > 100) {
    targetBalance = 'balanced';
  } else if (balance === 'water' && waterScore > 100) {
    targetBalance = 'balanced';
  } else {
    targetBalance = balance;
  }
  
  // 調整強度
  let adjustmentStrength: 'light' | 'medium' | 'strong';
  const diff = Math.abs(fireScore - waterScore);
  if (diff > 100) {
    adjustmentStrength = 'strong';
  } else if (diff > 50) {
    adjustmentStrength = 'medium';
  } else {
    adjustmentStrength = 'light';
  }
  
  return {
    needsAdjustment,
    targetBalance,
    adjustmentStrength,
  };
}

/**
 * 火水バランスを調整
 */
export function adjustTextFireWaterBalance(
  text: string,
  targetBalance: 'fire' | 'water' | 'balanced',
  strength: 'light' | 'medium' | 'strong' = 'medium'
): string {
  let adjusted = text;
  
  // 調整強度に応じた置換回数
  const maxReplacements = strength === 'strong' ? 100 : strength === 'medium' ? 50 : 20;
  let replacementCount = 0;
  
  if (targetBalance === 'fire') {
    // 火（外発）への調整
    const waterToFire = [
      { from: /でしょうか。/g, to: 'です。' },
      { from: /かもしれません。/g, to: 'でしょう。' },
      { from: /と感じます。/g, to: 'と言えます。' },
      { from: /と思います。/g, to: 'です。' },
    ];
    
    for (const { from, to } of waterToFire) {
      if (replacementCount >= maxReplacements) break;
      const matches = adjusted.match(from);
      if (matches) {
        adjusted = adjusted.replace(from, to);
        replacementCount += matches.length;
      }
    }
  } else if (targetBalance === 'water') {
    // 水（内集）への調整
    const fireToWater = [
      { from: /です。/g, to: 'でしょうか。' },
      { from: /である。/g, to: 'と感じます。' },
      { from: /と言えます。/g, to: 'と思います。' },
      { from: /でしょう。/g, to: 'かもしれません。' },
    ];
    
    for (const { from, to } of fireToWater) {
      if (replacementCount >= maxReplacements) break;
      const matches = adjusted.match(from);
      if (matches) {
        adjusted = adjusted.replace(from, to);
        replacementCount += matches.length;
      }
    }
  } else {
    // バランス調整（ミナカ）
    // 極端な表現を中和
    adjusted = adjusted.replace(/非常に/g, '');
    adjusted = adjusted.replace(/とても/g, '');
    adjusted = adjusted.replace(/絶対に/g, '');
  }
  
  return adjusted;
}

/**
 * 火水循環を可視化
 */
export function visualizeFireWaterCycle(detail: FireWaterBalanceDetail): string {
  const { fireScore, waterScore, minakaScore, flow } = detail;
  
  // ASCII アートで循環を表現
  const fireBar = '█'.repeat(Math.floor(fireScore / 10));
  const waterBar = '█'.repeat(Math.floor(waterScore / 10));
  const minakaBar = '█'.repeat(Math.floor(minakaScore / 10));
  
  const visualization = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
火水循環ビジュアライゼーション
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

火（外発）: ${fireBar} ${fireScore}
水（内集）: ${waterBar} ${waterScore}
ミナカ（中心）: ${minakaBar} ${minakaScore}

循環方向: ${flow.direction === 'fire-to-water' ? '火 → 水' : flow.direction === 'water-to-fire' ? '水 → 火' : '調和循環'}
循環強度: ${flow.strength}
調和度: ${flow.harmony}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
  
  return visualization;
}
