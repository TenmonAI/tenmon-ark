/**
 * Self-Evolution Log
 * 
 * TENMON-ARK の自己進化ログ
 * 成長の過程を記録し、進化の履歴を保存
 */

import fs from 'fs/promises';
import path from 'path';

const EVOLUTION_LOG_PATH = path.join(process.cwd(), 'shared', 'memory', 'evolution-log.json');

export interface EvolutionEntry {
  id: string;
  timestamp: number;
  newAbility: string;
  description: string;
  metricsImproved: {
    category: string;
    before: number;
    after: number;
    improvement: number; // percentage
  }[];
  relatedChanges: string[];
  impact: 'low' | 'medium' | 'high' | 'transformative';
}

export interface EvolutionStats {
  totalEvolutions: number;
  lastEvolution: number;
  abilities: string[];
  averageImprovement: number;
  impactDistribution: {
    low: number;
    medium: number;
    high: number;
    transformative: number;
  };
}

/**
 * 進化エントリーを記録
 */
export async function logEvolution(entry: Omit<EvolutionEntry, 'id' | 'timestamp'>): Promise<EvolutionEntry> {
  const fullEntry: EvolutionEntry = {
    id: `evo-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    timestamp: Date.now(),
    ...entry,
  };

  try {
    // 既存のログを読み込み
    let log: EvolutionEntry[] = [];
    try {
      const content = await fs.readFile(EVOLUTION_LOG_PATH, 'utf-8');
      log = JSON.parse(content);
    } catch {
      // ファイルが存在しない場合は新規作成
      log = [];
    }

    // 新しいエントリーを追加
    log.push(fullEntry);

    // 最新100件のみ保持
    if (log.length > 100) {
      log = log.slice(-100);
    }

    // ファイルに保存
    await fs.writeFile(EVOLUTION_LOG_PATH, JSON.stringify(log, null, 2));

    return fullEntry;
  } catch (error) {
    console.error('[SelfEvolutionLog] Failed to log evolution:', error);
    throw error;
  }
}

/**
 * すべての進化エントリーを取得
 */
export async function getAllEvolutions(): Promise<EvolutionEntry[]> {
  try {
    const content = await fs.readFile(EVOLUTION_LOG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

/**
 * 最新の進化エントリーを取得
 */
export async function getLatestEvolution(): Promise<EvolutionEntry | null> {
  const evolutions = await getAllEvolutions();
  return evolutions.length > 0 ? evolutions[evolutions.length - 1] : null;
}

/**
 * 進化統計を取得
 */
export async function getEvolutionStats(): Promise<EvolutionStats> {
  const evolutions = await getAllEvolutions();

  if (evolutions.length === 0) {
    return {
      totalEvolutions: 0,
      lastEvolution: 0,
      abilities: [],
      averageImprovement: 0,
      impactDistribution: {
        low: 0,
        medium: 0,
        high: 0,
        transformative: 0,
      },
    };
  }

  // 能力リストを抽出
  const abilities = Array.from(new Set(evolutions.map(e => e.newAbility)));

  // 平均改善率を計算
  const totalImprovement = evolutions.reduce((sum, e) => {
    const avgImprovement = e.metricsImproved.reduce((s, m) => s + m.improvement, 0) / (e.metricsImproved.length || 1);
    return sum + avgImprovement;
  }, 0);
  const averageImprovement = totalImprovement / evolutions.length;

  // インパクト分布を計算
  const impactDistribution = {
    low: evolutions.filter(e => e.impact === 'low').length,
    medium: evolutions.filter(e => e.impact === 'medium').length,
    high: evolutions.filter(e => e.impact === 'high').length,
    transformative: evolutions.filter(e => e.impact === 'transformative').length,
  };

  return {
    totalEvolutions: evolutions.length,
    lastEvolution: evolutions[evolutions.length - 1].timestamp,
    abilities,
    averageImprovement,
    impactDistribution,
  };
}

/**
 * 特定の能力に関連する進化エントリーを取得
 */
export async function getEvolutionsByAbility(ability: string): Promise<EvolutionEntry[]> {
  const evolutions = await getAllEvolutions();
  return evolutions.filter(e => e.newAbility === ability);
}

/**
 * 特定の期間の進化エントリーを取得
 */
export async function getEvolutionsByTimeRange(startTime: number, endTime: number): Promise<EvolutionEntry[]> {
  const evolutions = await getAllEvolutions();
  return evolutions.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);
}

/**
 * インパクト別の進化エントリーを取得
 */
export async function getEvolutionsByImpact(impact: EvolutionEntry['impact']): Promise<EvolutionEntry[]> {
  const evolutions = await getAllEvolutions();
  return evolutions.filter(e => e.impact === impact);
}
