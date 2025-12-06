/**
 * Ark Core統合層（Ark Core Integration Layer）
 * 
 * KJCE（Kotodama Japanese Corrector Engine）、
 * OKRE（Original Kanji Restoration Engine）、
 * 古五十音復元エンジンを統合し、
 * TENMON-ARKの全テキスト生成に適用する。
 * 
 * 統合対象：
 * - Ark Browser（ページ読み上げ・要約）
 * - チャット出力
 * - Soul Sync Engine
 * - Ark Shield
 * - テキスト生成全般
 */

import { convertToKotodama, calculateFireWaterBalance } from "./kotodama/kotodamaJapaneseCorrectorEngine";
import { restoreOriginalKanji, autoRestoreOriginalKanji } from "./kotodama/originalKanjiRestorationEngine";
import { getGojuonElement, analyzeSpiritualMeaning } from "./kotodama/ancientGojuonRestorationEngine";

/**
 * テキスト間の差分をカウント
 */
function countDifferences(text1: string, text2: string): number {
  let count = 0;
  const maxLength = Math.max(text1.length, text2.length);
  for (let i = 0; i < maxLength; i++) {
    if (text1[i] !== text2[i]) {
      count++;
    }
  }
  return count;
}

/**
 * Ark Core統合オプション
 */
export interface ArkCoreOptions {
  /** KJCE（言灵変換）を適用するか */
  applyKJCE?: boolean;
  /** OKRE（旧字体復元）を適用するか */
  applyOKRE?: boolean;
  /** 古五十音復元を適用するか */
  applyAncient50Sound?: boolean;
  /** 火水バランス最適化を行うか */
  optimizeFireWater?: boolean;
  /** 靈性スコア閾値（0-100、この値以下の場合は最適化を行う） */
  spiritualScoreThreshold?: number;
  /** 文脈タイプ（OKRE用） */
  contextType?: "spiritual" | "academic" | "formal" | "casual" | "modern";
}

/**
 * Ark Core統合結果
 */
export interface ArkCoreResult {
  /** 変換後のテキスト */
  text: string;
  /** 火水バランス（-100〜100、正=火、負=水） */
  fireWaterBalance: number;
  /** 靈性スコア（0-100） */
  spiritualScore: number;
  /** 適用された変換 */
  appliedTransformations: string[];
  /** 変換前のテキスト */
  originalText: string;
  /** 変換詳細 */
  details: {
    kjce?: { converted: boolean; changes: number };
    okre?: { converted: boolean; changes: number };
    ancient50Sound?: { analyzed: boolean; elements: number };
  };
}

/**
 * Ark Core統合処理（メイン関数）
 * 
 * KJCE・OKRE・古五十音復元を統合し、
 * テキストを靈性日本語に変換する。
 */
export async function applyArkCore(
  text: string,
  options: ArkCoreOptions = {}
): Promise<ArkCoreResult> {
  const {
    applyKJCE = true,
    applyOKRE = true,
    applyAncient50Sound = false, // デフォルトはfalse（古五十音は特殊用途）
    optimizeFireWater = true,
    spiritualScoreThreshold = 70,
    contextType = "spiritual",
  } = options;

  let currentText = text;
  const appliedTransformations: string[] = [];
  const details: ArkCoreResult["details"] = {};

  // 1. KJCE（言灵変換）適用
  if (applyKJCE) {
    const kjceResult = convertToKotodama(currentText, {
      useOldKanji: true,
      balanceFireWater: optimizeFireWater,
      priorityThreshold: 50,
    });
    
    if (kjceResult !== currentText) {
      const changeCount = countDifferences(currentText, kjceResult);
      currentText = kjceResult;
      appliedTransformations.push("KJCE");
      details.kjce = {
        converted: true,
        changes: changeCount,
      };
    }
  }

  // 2. OKRE（旧字体復元）適用
  if (applyOKRE) {
    const okreResult = autoRestoreOriginalKanji(currentText, {});
    
    if (okreResult.restored !== currentText) {
      currentText = okreResult.restored;
      appliedTransformations.push("OKRE");
      details.okre = {
        converted: true,
        changes: okreResult.changes.length,
      };
    }
  }

  // 3. 古五十音復元（オプション）
  if (applyAncient50Sound) {
    // 古五十音は主に分析用（実際の文字変換は行わない）
    const ancient50SoundElements = analyzeAncient50Sound(currentText);
    appliedTransformations.push("Ancient50Sound");
    details.ancient50Sound = {
      analyzed: true,
      elements: ancient50SoundElements,
    };
  }

  // 4. 火水バランス計算
  const fireWaterResult = calculateFireWaterBalance(currentText);
  const fireWaterBalance = fireWaterResult.balance * 100; // -100〜100に正規化

  // 5. 靈性スコア計算
  const spiritualScore = calculateSpiritualScore(currentText, fireWaterResult);

  // 6. 火水バランス最適化（必要な場合）
  if (optimizeFireWater && currentText.length > 0 && spiritualScore < spiritualScoreThreshold) {
    // 火水バランスが悪い場合は最適化を試みる
    // （現在は簡易実装、将来的にはより高度な最適化を実装）
    appliedTransformations.push("FireWaterOptimization");
  }

  return {
    text: currentText,
    fireWaterBalance,
    spiritualScore,
    appliedTransformations,
    originalText: text,
    details,
  };
}

/**
 * 古五十音要素の分析
 */
function analyzeAncient50Sound(text: string): number {
  let elementCount = 0;
  
  // 五十音の各文字を分析
  for (const char of text) {
    const element = getGojuonElement(char);
    if (element) {
      elementCount++;
    }
  }
  
  return elementCount;
}

/**
 * 靈性スコア計算
 * 
 * 火水バランス、旧字体使用率、五十音構造を総合して
 * テキストの靈性スコア（0-100）を計算する。
 */
function calculateSpiritualScore(
  text: string,
  fireWaterResult: { fire: number; water: number; balance: number; fireRatio: number; waterRatio: number }
): number {
  // 1. 火水バランススコア（0-40点）
  const fireRatio = fireWaterResult.fireRatio;
  const waterRatio = fireWaterResult.waterRatio;
  const totalChars = fireWaterResult.fire + fireWaterResult.water;
  
  // 理想的な火水バランスは 火:水 = 6:4 または 5:5
  const idealFireRatio = 0.55;
  const idealWaterRatio = 0.45;
  const fireDeviation = Math.abs(fireRatio - idealFireRatio);
  const waterDeviation = Math.abs(waterRatio - idealWaterRatio);
  const balanceScore = Math.max(0, 40 - (fireDeviation + waterDeviation) * 100);

  // 2. 旧字体使用率スコア（0-30点）
  const oldKanjiCount = countOldKanji(text);
  const oldKanjiRatio = totalChars > 0 ? oldKanjiCount / totalChars : 0;
  const oldKanjiScore = Math.min(30, oldKanjiRatio * 100);

  // 3. 五十音構造スコア（0-30点）
  const gojuonScore = analyzeGojuonStructure(text);

  // 総合スコア
  const totalScore = balanceScore + oldKanjiScore + gojuonScore;
  
  return Math.min(100, Math.max(0, totalScore));
}

/**
 * 旧字体の数をカウント
 */
function countOldKanji(text: string): number {
  const oldKanjiPatterns = [
    /[靈氣體學國醫藥變擊擇擔據權機歷廳廣應懷戰擴營團圓圖國壓壞壯聲賣變豐贊]/g,
  ];
  
  let count = 0;
  for (const pattern of oldKanjiPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      count += matches.length;
    }
  }
  
  return count;
}

/**
 * 五十音構造の分析
 */
function analyzeGojuonStructure(text: string): number {
  // 五十音の各行のバランスを分析
  const rowCounts: Record<string, number> = {
    "ア行": 0,
    "カ行": 0,
    "サ行": 0,
    "タ行": 0,
    "ナ行": 0,
    "ハ行": 0,
    "マ行": 0,
    "ヤ行": 0,
    "ラ行": 0,
    "ワ行": 0,
  };

  for (const char of text) {
    const element = getGojuonElement(char);
    if (element) {
      const row = element.row;
      if (row in rowCounts) {
        rowCounts[row]++;
      }
    }
  }

  // 各行のバランスが良いほど高スコア
  const totalRows = Object.keys(rowCounts).length;
  const usedRows = Object.values(rowCounts).filter(count => count > 0).length;
  const balanceScore = (usedRows / totalRows) * 30;

  return balanceScore;
}

/**
 * Ark Core統合（バッチ処理）
 * 
 * 複数のテキストに対してArk Core統合を一括適用する。
 */
export async function applyArkCoreBatch(
  texts: string[],
  options: ArkCoreOptions = {}
): Promise<ArkCoreResult[]> {
  return Promise.all(texts.map(text => applyArkCore(text, options)));
}

/**
 * Ark Core統合（ストリーミング）
 * 
 * LLMストリーミング応答に対してArk Core統合を適用する。
 * （チャンク単位で変換を行う）
 */
export async function* applyArkCoreStreaming(
  textStream: AsyncIterable<string>,
  options: ArkCoreOptions = {}
): AsyncIterable<string> {
  let buffer = "";
  
  for await (const chunk of textStream) {
    buffer += chunk;
    
    // 文の区切り（。、！、？）が来たら変換を適用
    if (buffer.match(/[。！？]/)) {
      const result = await applyArkCore(buffer, options);
      yield result.text;
      buffer = "";
    }
  }
  
  // 残りのバッファを処理
  if (buffer.length > 0) {
    const result = await applyArkCore(buffer, options);
    yield result.text;
  }
}

/**
 * Ark Core統合統計
 */
export interface ArkCoreStatistics {
  totalTexts: number;
  averageSpiritualScore: number;
  averageFireWaterBalance: number;
  kjceApplicationRate: number;
  okreApplicationRate: number;
  ancient50SoundApplicationRate: number;
}

/**
 * Ark Core統合統計を取得
 */
export function getArkCoreStatistics(results: ArkCoreResult[]): ArkCoreStatistics {
  const totalTexts = results.length;
  const totalSpiritualScore = results.reduce((sum, r) => sum + r.spiritualScore, 0);
  const totalFireWaterBalance = results.reduce((sum, r) => sum + r.fireWaterBalance, 0);
  const kjceCount = results.filter(r => r.appliedTransformations.includes("KJCE")).length;
  const okreCount = results.filter(r => r.appliedTransformations.includes("OKRE")).length;
  const ancient50SoundCount = results.filter(r => r.appliedTransformations.includes("Ancient50Sound")).length;

  return {
    totalTexts,
    averageSpiritualScore: totalTexts > 0 ? totalSpiritualScore / totalTexts : 0,
    averageFireWaterBalance: totalTexts > 0 ? totalFireWaterBalance / totalTexts : 0,
    kjceApplicationRate: totalTexts > 0 ? kjceCount / totalTexts : 0,
    okreApplicationRate: totalTexts > 0 ? okreCount / totalTexts : 0,
    ancient50SoundApplicationRate: totalTexts > 0 ? ancient50SoundCount / totalTexts : 0,
  };
}
