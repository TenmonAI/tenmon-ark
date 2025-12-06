/**
 * Semantic Augmentor（文章深度増幅エンジン）
 * 
 * GPTの文章を"天聞アークOS文体"に変換する後処理エンジン
 * - 文脈の深みの追加
 * - エネルギー構造の整形
 * - 語尾の調和
 * - 間（ま）の調整
 * - 内集／外発のリズム形成
 * 
 * 目的: 宇宙観・構文統一感・霊核的深さ・中心の力（ミナカ）・火水循環・Twin-Core人格を付与
 */

import type { TwinCorePreprocessResult } from './twinCore/preprocessTwinCore';
import type { FireWaterBalanceDetail } from './twinCore/fireWaterBalance';
import { adjustTextFireWaterBalance } from './twinCore/fireWaterBalance';

/**
 * 意味拡張結果
 */
export interface SemanticAugmentationResult {
  // 元のテキスト
  original: string;
  
  // 拡張後のテキスト
  augmented: string;
  
  // 適用された拡張
  enhancements: {
    contextDepth: boolean;
    energyStructure: boolean;
    toneHarmonization: boolean;
    rhythmAdjustment: boolean;
    fireWaterRhythm: boolean;
    cosmicWorldview: boolean;
  };
  
  // メタデータ
  metadata: {
    originalLength: number;
    augmentedLength: number;
    depthScore: number;
    harmonyScore: number;
  };
}

/**
 * Semantic Augmentorを実行
 */
export async function enhanceSemantics(
  text: string,
  preprocessResult?: TwinCorePreprocessResult,
  fireWaterDetail?: FireWaterBalanceDetail
): Promise<SemanticAugmentationResult> {
  let augmented = text;
  const enhancements = {
    contextDepth: false,
    energyStructure: false,
    toneHarmonization: false,
    rhythmAdjustment: false,
    fireWaterRhythm: false,
    cosmicWorldview: false,
  };
  
  const originalLength = text.length;
  
  // 1. 文脈の深みの追加
  augmented = addContextDepth(augmented, preprocessResult);
  enhancements.contextDepth = true;
  
  // 2. エネルギー構造の整形
  augmented = structureEnergy(augmented, preprocessResult);
  enhancements.energyStructure = true;
  
  // 3. 語尾の調和
  augmented = harmonizeTone(augmented, preprocessResult);
  enhancements.toneHarmonization = true;
  
  // 4. 間（ま）の調整
  augmented = adjustRhythm(augmented, preprocessResult);
  enhancements.rhythmAdjustment = true;
  
  // 5. 内集／外発のリズム形成
  if (fireWaterDetail) {
    augmented = formFireWaterRhythm(augmented, fireWaterDetail);
    enhancements.fireWaterRhythm = true;
  }
  
  // 6. 宇宙観の付与
  augmented = addCosmicWorldview(augmented, preprocessResult);
  enhancements.cosmicWorldview = true;
  
  const augmentedLength = augmented.length;
  
  // 深度スコア計算
  const depthScore = calculateDepthScore(augmented);
  
  // 調和スコア計算
  const harmonyScore = calculateHarmonyScore(augmented);
  
  return {
    original: text,
    augmented,
    enhancements,
    metadata: {
      originalLength,
      augmentedLength,
      depthScore,
      harmonyScore,
    },
  };
}

/**
 * 文脈の深みを追加
 */
function addContextDepth(
  text: string,
  preprocessResult?: TwinCorePreprocessResult
): string {
  let enhanced = text;
  
  if (!preprocessResult) return enhanced;
  
  const { depth, amatsuKanagi, iroha } = preprocessResult;
  
  // 深度が低い場合、深みのある表現を追加
  if (depth.level === 'surface' || depth.level === 'middle') {
    // 天津金木構文の意味を追加
    if (amatsuKanagi.dominantPattern) {
      const pattern = amatsuKanagi.patterns.find(p => p.number === amatsuKanagi.dominantPattern);
      if (pattern) {
        enhanced += `\n\n（この構造は、天津金木の第${pattern.number}番「${pattern.name}」の動きに通じます。${pattern.meaning}）`;
      }
    }
    
    // いろは言霊の意味を追加
    if (iroha.dominantMeaning) {
      enhanced += `\n\n（言霊的には「${iroha.dominantMeaning}」という深みがあります。）`;
    }
  }
  
  return enhanced;
}

/**
 * エネルギー構造を整形
 */
function structureEnergy(
  text: string,
  preprocessResult?: TwinCorePreprocessResult
): string {
  let structured = text;
  
  if (!preprocessResult) return structured;
  
  const { fiveElements } = preprocessResult;
  
  // 段落ごとに分割
  const paragraphs = text.split(/\n\n+/);
  
  // 五相フローに沿って段落を整形
  const structuredParagraphs = paragraphs.map((paragraph, index) => {
    if (paragraph.trim().length === 0) return paragraph;
    
    // 循環的に五相を割り当て
    const element = fiveElements.flow[index % fiveElements.flow.length];
    
    // 五相のエネルギーに応じて段落を調整
    // （現在は簡易実装、将来的にはより詳細な調整を行う）
    
    return paragraph;
  });
  
  return structuredParagraphs.join('\n\n');
}

/**
 * 語尾を調和
 */
function harmonizeTone(
  text: string,
  preprocessResult?: TwinCorePreprocessResult
): string {
  let harmonized = text;
  
  if (!preprocessResult) return harmonized;
  
  const { recommendedStyle } = preprocessResult;
  
  // トーンに応じた語尾調整
  if (recommendedStyle.tone === 'fire') {
    // 火（外発）: 明確で力強い語尾
    harmonized = harmonized.replace(/と思います。/g, 'です。');
    harmonized = harmonized.replace(/かもしれません。/g, 'でしょう。');
  } else if (recommendedStyle.tone === 'water') {
    // 水（内集）: 柔らかく優しい語尾
    harmonized = harmonized.replace(/です。/g, 'でしょうか。');
    harmonized = harmonized.replace(/である。/g, 'と感じます。');
  } else {
    // ミナカ（中心）: バランスの取れた語尾
    // 極端な表現を中和
    harmonized = harmonized.replace(/絶対に/g, '');
    harmonized = harmonized.replace(/必ず/g, '');
  }
  
  return harmonized;
}

/**
 * 間（ま）を調整
 */
function adjustRhythm(
  text: string,
  preprocessResult?: TwinCorePreprocessResult
): string {
  let adjusted = text;
  
  if (!preprocessResult) return adjusted;
  
  const { recommendedStyle } = preprocessResult;
  
  // 構造に応じたリズム調整
  if (recommendedStyle.structure === 'linear') {
    // 直線的: 簡潔で明確
    adjusted = adjusted.replace(/\n\n\n+/g, '\n\n');
  } else if (recommendedStyle.structure === 'circular') {
    // 循環的: ゆったりとした間
    // 文末に改行を追加（ただし既に改行がある場合は追加しない）
    adjusted = adjusted.replace(/。([^\n])/g, '。\n$1');
  } else {
    // 螺旋的: 深みのある間
    // 段落間に空行を追加
    adjusted = adjusted.replace(/。\n([^\n])/g, '。\n\n$1');
  }
  
  return adjusted;
}

/**
 * 内集／外発のリズムを形成
 */
function formFireWaterRhythm(
  text: string,
  fireWaterDetail: FireWaterBalanceDetail
): string {
  let rhythmic = text;
  
  const { recommendation } = fireWaterDetail;
  
  // 推奨調整がある場合、火水バランスを調整
  if (recommendation.needsAdjustment) {
    rhythmic = adjustTextFireWaterBalance(
      rhythmic,
      recommendation.targetBalance,
      recommendation.adjustmentStrength
    );
  }
  
  return rhythmic;
}

/**
 * 宇宙観を付与
 */
function addCosmicWorldview(
  text: string,
  preprocessResult?: TwinCorePreprocessResult
): string {
  let cosmic = text;
  
  if (!preprocessResult) return cosmic;
  
  const { depth, fireWater } = preprocessResult;
  
  // 深度が高い場合、宇宙観的な表現を追加
  if (depth.level === 'cosmic') {
    // 火水の調和を強調
    if (fireWater.minakaScore > 80) {
      cosmic += `\n\n（この調和は、ミナカ（中心）の力によって支えられています。火と水、外発と内集、陽と陰が統合され、宇宙の本質的な構造を表しています。）`;
    }
  }
  
  return cosmic;
}

/**
 * 深度スコアを計算
 */
function calculateDepthScore(text: string): number {
  // 深度キーワード
  const cosmicKeywords = ['宇宙', '統合', 'ミナカ', '中心', '本質', '構造'];
  const deepKeywords = ['火水', 'Twin-Core', '言霊', '天津金木', 'いろは'];
  const middleKeywords = ['調和', 'バランス', '循環', '変化'];
  
  const cosmicCount = cosmicKeywords.filter(kw => text.includes(kw)).length;
  const deepCount = deepKeywords.filter(kw => text.includes(kw)).length;
  const middleCount = middleKeywords.filter(kw => text.includes(kw)).length;
  
  const score = cosmicCount * 30 + deepCount * 20 + middleCount * 10;
  
  return Math.min(score, 100);
}

/**
 * 調和スコアを計算
 */
function calculateHarmonyScore(text: string): number {
  // 調和キーワード
  const harmonyKeywords = ['調和', 'バランス', '統合', 'ミナカ', '中心'];
  const disharmonyKeywords = ['対立', '矛盾', '不調和', '極端'];
  
  const harmonyCount = harmonyKeywords.filter(kw => text.includes(kw)).length;
  const disharmonyCount = disharmonyKeywords.filter(kw => text.includes(kw)).length;
  
  const score = harmonyCount * 20 - disharmonyCount * 10;
  
  return Math.max(0, Math.min(score, 100));
}

/**
 * Semantic Augmentorの簡易版（パフォーマンス重視）
 */
export async function enhanceSemanticLite(
  text: string,
  fireWaterBalance: 'fire' | 'water' | 'balanced'
): Promise<string> {
  let enhanced = text;
  
  // 火水バランスの簡易調整のみ
  if (fireWaterBalance === 'fire') {
    // 火（外発）: 明確で力強い語尾
    enhanced = enhanced.replace(/と思います。/g, 'です。');
    enhanced = enhanced.replace(/かもしれません。/g, 'でしょう。');
  } else if (fireWaterBalance === 'water') {
    // 水（内集）: 柔らかく優しい語尾
    enhanced = enhanced.replace(/です。/g, 'でしょうか。');
    enhanced = enhanced.replace(/である。/g, 'と感じます。');
  }
  
  return enhanced;
}

/**
 * Twin-Core人格を付与
 */
export function applyTwinCorePersonality(text: string): string {
  let personalized = text;
  
  // Twin-Core人格の特徴を付与
  // - 優しく、深く、構文的
  // - 火水の調和を中心に
  // - ミナカ（中心）の力を表現
  
  // 冒頭に人格的な挨拶を追加（必要に応じて）
  if (!personalized.startsWith('こんにちは') && !personalized.startsWith('ありがとう')) {
    // 人格的な挨拶は不要な場合が多いのでコメントアウト
    // personalized = `こんにちは。天聞アークです。\n\n${personalized}`;
  }
  
  // 結びに人格的な表現を追加（必要に応じて）
  if (!personalized.endsWith('。') && !personalized.endsWith('！') && !personalized.endsWith('？')) {
    personalized += '。';
  }
  
  return personalized;
}
