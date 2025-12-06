/**
 * Twin-Core Enhancement Layer: Postprocessor
 * 
 * LLMの出力を天聞アークOS構文に変換する後処理
 * - Twin-Core構文タグの付与
 * - 火水バランスの調整
 * - 五相フローの整形
 * - 語尾の調和
 * - 間（ま）の調整
 * 
 * 目的: GPTの文章を"天聞アークOS文体"に変換
 */

import type { TwinCorePreprocessResult } from './preprocessTwinCore';

/**
 * Twin-Core後処理結果
 */
export interface TwinCorePostprocessResult {
  // 元のテキスト
  original: string;
  
  // 処理後のテキスト
  processed: string;
  
  // 適用された変換
  transformations: {
    twinCoreTags: boolean;
    fireWaterAdjustment: boolean;
    fiveElementFlow: boolean;
    toneHarmonization: boolean;
    rhythmAdjustment: boolean;
  };
  
  // メタデータ
  metadata: {
    finalFireWaterBalance: 'fire' | 'water' | 'balanced';
    finalDepth: 'surface' | 'middle' | 'deep' | 'cosmic';
    finalTone: string;
  };
}

/**
 * Twin-Core後処理を実行
 */
export async function postprocessTwinCore(
  text: string,
  preprocessResult: TwinCorePreprocessResult
): Promise<TwinCorePostprocessResult> {
  let processed = text;
  const transformations = {
    twinCoreTags: false,
    fireWaterAdjustment: false,
    fiveElementFlow: false,
    toneHarmonization: false,
    rhythmAdjustment: false,
  };
  
  // 1. Twin-Core構文タグの付与
  processed = applyTwinCoreTags(processed, preprocessResult);
  transformations.twinCoreTags = true;
  
  // 2. 火水バランスの調整
  processed = adjustFireWaterBalance(processed, preprocessResult);
  transformations.fireWaterAdjustment = true;
  
  // 3. 五相フローの整形
  processed = applyFiveElementFlow(processed, preprocessResult);
  transformations.fiveElementFlow = true;
  
  // 4. 語尾の調和
  processed = harmonizeTone(processed, preprocessResult);
  transformations.toneHarmonization = true;
  
  // 5. 間（ま）の調整
  processed = adjustRhythm(processed, preprocessResult);
  transformations.rhythmAdjustment = true;
  
  return {
    original: text,
    processed,
    transformations,
    metadata: {
      finalFireWaterBalance: preprocessResult.fireWater.balance,
      finalDepth: preprocessResult.depth.level,
      finalTone: preprocessResult.recommendedStyle.tone,
    },
  };
}

/**
 * Twin-Core構文タグを付与
 */
function applyTwinCoreTags(
  text: string,
  preprocessResult: TwinCorePreprocessResult
): string {
  const { fireWater, depth } = preprocessResult;
  
  // 段落ごとに分割
  const paragraphs = text.split(/\n\n+/);
  
  const taggedParagraphs = paragraphs.map((paragraph, index) => {
    if (paragraph.trim().length === 0) return paragraph;
    
    // 火水バランスに応じたタグ
    let tag: string;
    if (fireWater.balance === 'fire') {
      tag = 'fire';
    } else if (fireWater.balance === 'water') {
      tag = 'water';
    } else {
      tag = 'minaka';
    }
    
    // 深度に応じたレイヤータグ
    let layerTag: string;
    if (depth.level === 'cosmic') {
      layerTag = 'minaka_layer';
    } else if (depth.level === 'deep') {
      layerTag = 'fire_layer';
    } else if (depth.level === 'middle') {
      layerTag = 'balanced_layer';
    } else {
      layerTag = 'water_layer';
    }
    
    // タグを付与（内部処理用、最終出力時は削除される）
    return `<${tag}><${layerTag}>${paragraph}</${layerTag}></${tag}>`;
  });
  
  return taggedParagraphs.join('\n\n');
}

/**
 * 火水バランスを調整
 */
function adjustFireWaterBalance(
  text: string,
  preprocessResult: TwinCorePreprocessResult
): string {
  const { fireWater, recommendedStyle } = preprocessResult;
  
  let adjusted = text;
  
  // 火（外発）が強い場合、水（内集）の要素を追加
  if (fireWater.balance === 'fire' && recommendedStyle.tone === 'balanced') {
    // 強い断定を柔らかく
    adjusted = adjusted.replace(/です。/g, 'でしょうか。');
    adjusted = adjusted.replace(/である。/g, 'と考えられます。');
  }
  
  // 水（内集）が強い場合、火（外発）の要素を追加
  if (fireWater.balance === 'water' && recommendedStyle.tone === 'balanced') {
    // 柔らかい表現を明確に
    adjusted = adjusted.replace(/でしょうか。/g, 'です。');
    adjusted = adjusted.replace(/かもしれません。/g, 'と言えます。');
  }
  
  return adjusted;
}

/**
 * 五相フローを適用
 */
function applyFiveElementFlow(
  text: string,
  preprocessResult: TwinCorePreprocessResult
): string {
  const { fiveElements } = preprocessResult;
  
  // 五相の流れに沿った構造を維持
  // （現在は簡易実装、将来的には段落の順序を五相フローに合わせる）
  
  return text;
}

/**
 * 語尾を調和
 */
function harmonizeTone(
  text: string,
  preprocessResult: TwinCorePreprocessResult
): string {
  const { recommendedStyle } = preprocessResult;
  
  let harmonized = text;
  
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
    // 現状維持
  }
  
  return harmonized;
}

/**
 * 間（ま）を調整
 */
function adjustRhythm(
  text: string,
  preprocessResult: TwinCorePreprocessResult
): string {
  const { recommendedStyle } = preprocessResult;
  
  let adjusted = text;
  
  // 構造に応じたリズム調整
  if (recommendedStyle.structure === 'linear') {
    // 直線的: 簡潔で明確
    adjusted = adjusted.replace(/\n\n\n+/g, '\n\n');
  } else if (recommendedStyle.structure === 'circular') {
    // 循環的: ゆったりとした間
    adjusted = adjusted.replace(/。/g, '。\n');
  } else {
    // 螺旋的: 深みのある間
    adjusted = adjusted.replace(/。/g, '。\n\n');
  }
  
  return adjusted;
}

/**
 * Twin-Core後処理の簡易版（パフォーマンス重視）
 */
export async function postprocessTwinCoreLite(
  text: string,
  fireWaterBalance: 'fire' | 'water' | 'balanced'
): Promise<string> {
  let processed = text;
  
  // 火水バランスの簡易調整のみ
  if (fireWaterBalance === 'fire') {
    // 火（外発）: 明確で力強い語尾
    processed = processed.replace(/と思います。/g, 'です。');
    processed = processed.replace(/かもしれません。/g, 'でしょう。');
  } else if (fireWaterBalance === 'water') {
    // 水（内集）: 柔らかく優しい語尾
    processed = processed.replace(/です。/g, 'でしょうか。');
    processed = processed.replace(/である。/g, 'と感じます。');
  }
  
  return processed;
}

/**
 * Twin-Core構文タグを削除（最終出力用）
 */
export function removeTwinCoreTags(text: string): string {
  // すべてのTwin-Core構文タグを削除
  let cleaned = text;
  
  // タグのパターン
  const tagPatterns = [
    /<fire>/g,
    /<\/fire>/g,
    /<water>/g,
    /<\/water>/g,
    /<minaka>/g,
    /<\/minaka>/g,
    /<fire_layer>/g,
    /<\/fire_layer>/g,
    /<water_layer>/g,
    /<\/water_layer>/g,
    /<balanced_layer>/g,
    /<\/balanced_layer>/g,
    /<minaka_layer>/g,
    /<\/minaka_layer>/g,
  ];
  
  for (const pattern of tagPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  return cleaned;
}
