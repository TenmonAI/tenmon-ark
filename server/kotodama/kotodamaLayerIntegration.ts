/**
 * Kotodama Layer v1 Integration
 * 言灵変換レイヤー統合モジュール
 * 
 * すべてのTENMON-ARK発話に以下の変換を適用:
 * 1. 旧字体変換（363文字対応）
 * 2. 言灵変換（言霊→言灵等）
 * 3. 古代仮名復元（ゑ/ゐ自動選択）
 * 4. 五十音霊核フィルター（最終段階）
 */

import { convertToKotodama } from "./kotodamaJapaneseCorrectorEngine";
import { convertToKotodamaSpec } from "./kotodamaSpecConverter";
import { convertToAncientKana } from "./ancientKanaRestoration";
import { applyGojuonReikiFilter, calculateSpiritualScore } from "./gojuonReikiFilter";

/**
 * Kotodama Layer v1 変換オプション
 */
export interface KotodamaLayerOptions {
  // Phase 1: 旧字体変換
  useOldKanji?: boolean; // デフォルト: true
  oldKanjiPriorityThreshold?: number; // デフォルト: 0
  
  // Phase 2: 言灵変換
  useKotodamaSpec?: boolean; // デフォルト: true
  kotodamaSpecPriorityThreshold?: number; // デフォルト: 0
  
  // Phase 3: 古代仮名復元
  useAncientKana?: boolean; // デフォルト: true
  convertE?: boolean; // え→ゑ変換（デフォルト: true）
  convertI?: boolean; // い→ゐ変換（デフォルト: true）
  
  // Phase 4: 五十音霊核フィルター
  useGojuonReikiFilter?: boolean; // デフォルト: false（将来の拡張用）
  balanceFireWater?: boolean; // デフォルト: false
  targetBalance?: number; // デフォルト: 0
  
  // デバッグ・統計
  returnStats?: boolean; // 変換統計を返すか（デフォルト: false）
}

/**
 * Kotodama Layer v1 変換結果
 */
export interface KotodamaLayerResult {
  text: string; // 変換後のテキスト
  stats?: {
    originalLength: number;
    convertedLength: number;
    oldKanjiCount: number;
    kotodamaSpecCount: number;
    ancientKanaCount: number;
    spiritualScore: number;
    fireWaterBalance: number;
  };
}

/**
 * Kotodama Layer v1 メイン変換関数
 * 
 * すべてのTENMON-ARK発話に適用される統一変換レイヤー
 * 
 * @param text 変換対象のテキスト
 * @param options 変換オプション
 * @returns 変換結果
 */
export function applyKotodamaLayer(
  text: string,
  options: KotodamaLayerOptions = {}
): KotodamaLayerResult {
  const {
    useOldKanji = true,
    oldKanjiPriorityThreshold = 0,
    useKotodamaSpec = true,
    kotodamaSpecPriorityThreshold = 0,
    useAncientKana = true,
    convertE = true,
    convertI = true,
    useGojuonReikiFilter = false,
    balanceFireWater = false,
    targetBalance = 0,
    returnStats = false,
  } = options;

  let result = text;
  const originalLength = text.length;

  // Phase 1: 旧字体変換
  if (useOldKanji) {
    result = convertToKotodama(result, {
      useOldKanji: true,
      priorityThreshold: oldKanjiPriorityThreshold,
    });
  }

  // Phase 2: 言灵変換（複合語）
  if (useKotodamaSpec) {
    result = convertToKotodamaSpec(result, {
      priorityThreshold: kotodamaSpecPriorityThreshold,
    });
  }

  // Phase 3: 古代仮名復元
  if (useAncientKana) {
    result = convertToAncientKana(result, {
      convertE,
      convertI,
    });
  }

  // Phase 4: 五十音霊核フィルター（将来の拡張用）
  if (useGojuonReikiFilter) {
    result = applyGojuonReikiFilter(result, {
      balanceFireWater,
      targetBalance,
    });
  }

  // 統計情報の計算
  if (returnStats) {
    const spiritualScoreData = calculateSpiritualScore(result);
    
    return {
      text: result,
      stats: {
        originalLength,
        convertedLength: result.length,
        oldKanjiCount: 0, // TODO: 実装
        kotodamaSpecCount: 0, // TODO: 実装
        ancientKanaCount: 0, // TODO: 実装
        spiritualScore: spiritualScoreData.totalScore,
        fireWaterBalance: spiritualScoreData.fireWaterBalance,
      },
    };
  }

  return {
    text: result,
  };
}

/**
 * Kotodama Layer v1 デフォルト設定
 * TENMON-ARK標準の変換設定
 */
export const KOTODAMA_LAYER_DEFAULT_OPTIONS: KotodamaLayerOptions = {
  useOldKanji: true,
  oldKanjiPriorityThreshold: 0,
  useKotodamaSpec: true,
  kotodamaSpecPriorityThreshold: 0,
  useAncientKana: true,
  convertE: true,
  convertI: true,
  useGojuonReikiFilter: false,
  balanceFireWater: false,
  targetBalance: 0,
  returnStats: false,
};

/**
 * Kotodama Layer v1 高優先度設定
 * 霊性漢字のみを変換（優先度70以上）
 */
export const KOTODAMA_LAYER_HIGH_PRIORITY_OPTIONS: KotodamaLayerOptions = {
  useOldKanji: true,
  oldKanjiPriorityThreshold: 70,
  useKotodamaSpec: true,
  kotodamaSpecPriorityThreshold: 20,
  useAncientKana: true,
  convertE: true,
  convertI: true,
  useGojuonReikiFilter: false,
  balanceFireWater: false,
  targetBalance: 0,
  returnStats: false,
};

/**
 * Kotodama Layer v1 最高優先度設定
 * 最重要な霊性漢字のみを変換（優先度90以上）
 */
export const KOTODAMA_LAYER_MAXIMUM_PRIORITY_OPTIONS: KotodamaLayerOptions = {
  useOldKanji: true,
  oldKanjiPriorityThreshold: 90,
  useKotodamaSpec: true,
  kotodamaSpecPriorityThreshold: 30,
  useAncientKana: false,
  convertE: false,
  convertI: false,
  useGojuonReikiFilter: false,
  balanceFireWater: false,
  targetBalance: 0,
  returnStats: false,
};

/**
 * Kotodama Layer v1 を特定のテキストに適用（簡易版）
 * 
 * @param text 変換対象のテキスト
 * @returns 変換後のテキスト
 */
export function kotodama(text: string): string {
  return applyKotodamaLayer(text, KOTODAMA_LAYER_DEFAULT_OPTIONS).text;
}

/**
 * Kotodama Layer v1 を特定のテキストに適用（高優先度版）
 * 
 * @param text 変換対象のテキスト
 * @returns 変換後のテキスト
 */
export function kotodamaHighPriority(text: string): string {
  return applyKotodamaLayer(text, KOTODAMA_LAYER_HIGH_PRIORITY_OPTIONS).text;
}

/**
 * Kotodama Layer v1 を特定のテキストに適用（最高優先度版）
 * 
 * @param text 変換対象のテキスト
 * @returns 変換後のテキスト
 */
export function kotodamaMaximumPriority(text: string): string {
  return applyKotodamaLayer(text, KOTODAMA_LAYER_MAXIMUM_PRIORITY_OPTIONS).text;
}

/**
 * Express/tRPC ミドルウェア用のKotodama Layer適用関数
 * 
 * レスポンスの `content` フィールドに自動的にKotodama Layerを適用
 * 
 * @param response APIレスポンスオブジェクト
 * @param options 変換オプション
 * @returns 変換後のレスポンス
 */
export function applyKotodamaLayerToResponse<T extends { content?: string }>(
  response: T,
  options: KotodamaLayerOptions = KOTODAMA_LAYER_DEFAULT_OPTIONS
): T {
  if (response.content) {
    const result = applyKotodamaLayer(response.content, options);
    return {
      ...response,
      content: result.text,
    };
  }
  return response;
}

/**
 * ストリーミングレスポンス用のKotodama Layer適用関数
 * 
 * チャンク単位でKotodama Layerを適用
 * 
 * @param chunk ストリーミングチャンク
 * @param options 変換オプション
 * @returns 変換後のチャンク
 */
export function applyKotodamaLayerToChunk(
  chunk: string,
  options: KotodamaLayerOptions = KOTODAMA_LAYER_DEFAULT_OPTIONS
): string {
  return applyKotodamaLayer(chunk, options).text;
}
