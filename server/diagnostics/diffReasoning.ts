/**
 * Diff Reasoning Engine
 * 推論のぶれを自動検出
 * before/after Reasoning Snapshot を比較
 */

import type { ReasoningChainResult } from '../twinCoreEngine';

/**
 * 推論スナップショット
 */
export interface ReasoningSnapshot {
  timestamp: number;
  inputText: string;
  reasoning: ReasoningChainResult;
  hash: string; // 推論結果のハッシュ（比較用）
}

/**
 * 推論の差分
 */
export interface ReasoningDiff {
  inputText: string;
  before: ReasoningSnapshot;
  after: ReasoningSnapshot;
  differences: Array<{
    layer: string;
    before: any;
    after: any;
    severity: 'low' | 'medium' | 'high';
  }>;
  overallSimilarity: number; // 0-1 (1 = 完全一致)
}

// 推論スナップショットのストレージ（in-memory、本番環境ではDBに保存）
const snapshots: Map<string, ReasoningSnapshot[]> = new Map();

/**
 * 推論スナップショットを保存
 * 
 * @param inputText 入力テキスト
 * @param reasoning 推論結果
 */
export function saveReasoningSnapshot(inputText: string, reasoning: ReasoningChainResult): void {
  const hash = generateReasoningHash(reasoning);
  const snapshot: ReasoningSnapshot = {
    timestamp: Date.now(),
    inputText,
    reasoning,
    hash,
  };

  const key = normalizeInputText(inputText);
  if (!snapshots.has(key)) {
    snapshots.set(key, []);
  }

  const snapshotsList = snapshots.get(key)!;
  snapshotsList.push(snapshot);

  // 最新10件のみ保持
  if (snapshotsList.length > 10) {
    snapshotsList.shift();
  }
}

/**
 * 推論の差分を検出
 * 
 * @param inputText 入力テキスト
 * @param currentReasoning 現在の推論結果
 * @returns 推論の差分
 */
export function diffReasoning(
  inputText: string,
  currentReasoning: ReasoningChainResult
): ReasoningDiff | null {
  const key = normalizeInputText(inputText);
  const snapshotsList = snapshots.get(key);

  if (!snapshotsList || snapshotsList.length === 0) {
    // 初回実行の場合は差分なし
    saveReasoningSnapshot(inputText, currentReasoning);
    return null;
  }

  // 最新のスナップショットと比較
  const latestSnapshot = snapshotsList[snapshotsList.length - 1];
  const currentHash = generateReasoningHash(currentReasoning);

  // ハッシュが一致する場合は差分なし
  if (currentHash === latestSnapshot.hash) {
    return null;
  }

  // 差分を検出
  const differences = detectDifferences(latestSnapshot.reasoning, currentReasoning);
  const overallSimilarity = calculateSimilarity(latestSnapshot.reasoning, currentReasoning);

  const diff: ReasoningDiff = {
    inputText,
    before: latestSnapshot,
    after: {
      timestamp: Date.now(),
      inputText,
      reasoning: currentReasoning,
      hash: currentHash,
    },
    differences,
    overallSimilarity,
  };

  // 現在の推論をスナップショットに保存
  saveReasoningSnapshot(inputText, currentReasoning);

  return diff;
}

/**
 * 推論結果のハッシュを生成
 */
function generateReasoningHash(reasoning: ReasoningChainResult): string {
  // 主要な推論結果を文字列化してハッシュ化
  const keyParts = [
    reasoning.fireWater?.dominantElement || '',
    reasoning.rotation?.dominantRotation || '',
    reasoning.convergenceDivergence?.dominantMovement || '',
    reasoning.yinYang?.dominantPolarity || '',
    reasoning.futomani?.position || '',
    reasoning.minaka?.spiritualLevel || 0,
  ];

  return keyParts.join('|');
}

/**
 * 入力テキストを正規化（比較用）
 */
function normalizeInputText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * 推論結果の差分を検出
 */
function detectDifferences(
  before: ReasoningChainResult,
  after: ReasoningChainResult
): Array<{
  layer: string;
  before: any;
  after: any;
  severity: 'low' | 'medium' | 'high';
}> {
  const differences: Array<{
    layer: string;
    before: any;
    after: any;
    severity: 'low' | 'medium' | 'high';
  }> = [];

  // Fire-Water レイヤーの比較
  if (before.fireWater?.dominantElement !== after.fireWater?.dominantElement) {
    differences.push({
      layer: 'fireWater',
      before: before.fireWater?.dominantElement,
      after: after.fireWater?.dominantElement,
      severity: 'high',
    });
  }

  // Rotation レイヤーの比較
  if (before.rotation?.dominantRotation !== after.rotation?.dominantRotation) {
    differences.push({
      layer: 'rotation',
      before: before.rotation?.dominantRotation,
      after: after.rotation?.dominantRotation,
      severity: 'medium',
    });
  }

  // Yin-Yang レイヤーの比較
  if (before.yinYang?.dominantPolarity !== after.yinYang?.dominantPolarity) {
    differences.push({
      layer: 'yinYang',
      before: before.yinYang?.dominantPolarity,
      after: after.yinYang?.dominantPolarity,
      severity: 'high',
    });
  }

  // Minaka レイヤーの比較（spiritualLevelの差が大きい場合）
  const spiritualLevelDiff = Math.abs(
    (before.minaka?.spiritualLevel || 0) - (after.minaka?.spiritualLevel || 0)
  );
  if (spiritualLevelDiff > 10) {
    differences.push({
      layer: 'minaka',
      before: before.minaka?.spiritualLevel,
      after: after.minaka?.spiritualLevel,
      severity: spiritualLevelDiff > 20 ? 'high' : 'medium',
    });
  }

  // Final Interpretation の比較
  const beforeInterpretation = before.finalInterpretation?.unifiedInterpretation || '';
  const afterInterpretation = after.finalInterpretation?.unifiedInterpretation || '';
  if (beforeInterpretation !== afterInterpretation) {
    // 文字列の類似度を計算
    const similarity = calculateStringSimilarity(beforeInterpretation, afterInterpretation);
    if (similarity < 0.8) {
      differences.push({
        layer: 'finalInterpretation',
        before: beforeInterpretation.substring(0, 100),
        after: afterInterpretation.substring(0, 100),
        severity: similarity < 0.5 ? 'high' : 'medium',
      });
    }
  }

  return differences;
}

/**
 * 推論結果の類似度を計算（0-1）
 */
function calculateSimilarity(
  before: ReasoningChainResult,
  after: ReasoningChainResult
): number {
  let matches = 0;
  let total = 0;

  // Fire-Water
  total++;
  if (before.fireWater?.dominantElement === after.fireWater?.dominantElement) {
    matches++;
  }

  // Rotation
  total++;
  if (before.rotation?.dominantRotation === after.rotation?.dominantRotation) {
    matches++;
  }

  // Yin-Yang
  total++;
  if (before.yinYang?.dominantPolarity === after.yinYang?.dominantPolarity) {
    matches++;
  }

  // Minaka (spiritualLevelの差が小さい場合)
  total++;
  const spiritualLevelDiff = Math.abs(
    (before.minaka?.spiritualLevel || 0) - (after.minaka?.spiritualLevel || 0)
  );
  if (spiritualLevelDiff <= 5) {
    matches++;
  }

  return matches / total;
}

/**
 * 文字列の類似度を計算（0-1）
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  // 簡易版: 共通部分の割合を計算
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {
    return 1.0;
  }

  // 最長共通部分列（LCS）の簡易版
  let commonLength = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) {
      commonLength++;
    }
  }

  return commonLength / longer.length;
}

/**
 * 推論スナップショットを取得
 * 
 * @param inputText 入力テキスト
 * @returns スナップショットの配列
 */
export function getReasoningSnapshots(inputText: string): ReasoningSnapshot[] {
  const key = normalizeInputText(inputText);
  return snapshots.get(key) || [];
}

/**
 * 推論のぶれを検出（簡易版）
 * 同じ入力に対して推論結果が異なる場合に警告
 * 
 * @param inputText 入力テキスト
 * @param currentReasoning 現在の推論結果
 * @returns ぶれが検出された場合の差分、検出されない場合はnull
 */
export function detectReasoningDrift(
  inputText: string,
  currentReasoning: ReasoningChainResult
): ReasoningDiff | null {
  const diff = diffReasoning(inputText, currentReasoning);

  if (!diff) {
    return null;
  }

  // 類似度が0.7未満の場合はぶれが大きいと判断
  if (diff.overallSimilarity < 0.7) {
    console.warn(`[DiffReasoning] Significant reasoning drift detected for input: "${inputText}"`);
    console.warn(`[DiffReasoning] Similarity: ${diff.overallSimilarity.toFixed(2)}`);
    console.warn(`[DiffReasoning] Differences:`, diff.differences);
    return diff;
  }

  return null;
}

