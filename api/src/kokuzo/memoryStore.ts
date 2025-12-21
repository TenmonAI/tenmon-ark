import type { ThinkingAxis } from "../persona/thinkingAxis.js";
import type { KanagiPhase } from "../persona/kanagi.js";
import type { LexicalBias } from "../persona/lexicalBias.js";

// KOKŪZŌ: 最小記憶構造（全文保存しない）
export type KokuzoMemorySeed = {
  id: string;
  personaId: string;
  summary: string;        // 会話の要約（短文）
  thinkingAxis: ThinkingAxis;
  kanagiPhase: KanagiPhase;
  lexicalBias: LexicalBias;
  inertiaSnapshot: number; // inertia.level のスナップショット
  createdAt: number;      // timestamp
};

// KOKŪZŌ: in-memory 記憶ストア
const memoryStore: KokuzoMemorySeed[] = [];
const MAX_STORE_SIZE = 100; // 最大保存件数

/**
 * KOKŪZŌ: 記憶シードを保存する
 */
export function saveKokuzoMemorySeed(seed: KokuzoMemorySeed): void {
  memoryStore.push(seed);
  
  // 最大件数を超えた場合、古いものを削除
  if (memoryStore.length > MAX_STORE_SIZE) {
    memoryStore.shift();
  }
}

/**
 * KOKŪZŌ: 直近N件の記憶シードを取得する
 */
export function getRecentKokuzoMemorySeeds(count: number = 5): KokuzoMemorySeed[] {
  return memoryStore.slice(-count);
}

/**
 * KOKŪZŌ: 傾向の集計を取得する
 */
export type KokuzoTendency = {
  thinkingAxisFrequency: Record<ThinkingAxis, number>;
  kanagiPhaseFrequency: Record<KanagiPhase, number>;
  averageInertia: number;
  totalCount: number;
};

export function getKokuzoTendency(recentSeeds: KokuzoMemorySeed[]): KokuzoTendency {
  const thinkingAxisCount: Record<ThinkingAxis, number> = {
    introspective: 0,
    observational: 0,
    constructive: 0,
    executive: 0,
  };
  
  const kanagiPhaseCount: Record<KanagiPhase, number> = {
    "L-IN": 0,
    "L-OUT": 0,
    "R-IN": 0,
    "R-OUT": 0,
    "INTEGRATION": 0,
  };
  
  let totalInertia = 0;
  
  for (const seed of recentSeeds) {
    thinkingAxisCount[seed.thinkingAxis]++;
    kanagiPhaseCount[seed.kanagiPhase]++;
    totalInertia += seed.inertiaSnapshot;
  }
  
  const totalCount = recentSeeds.length;
  const averageInertia = totalCount > 0 ? totalInertia / totalCount : 0;
  
  return {
    thinkingAxisFrequency: thinkingAxisCount,
    kanagiPhaseFrequency: kanagiPhaseCount,
    averageInertia,
    totalCount,
  };
}

/**
 * KOKŪZŌ: 応答から要約を生成する（簡易版）
 */
export function generateSummary(response: string): string {
  if (!response || response.trim().length === 0) {
    return "";
  }
  
  // 最初の文（50文字まで）を要約として使用
  const firstSentence = response.split(/[。！？]/)[0];
  if (firstSentence && firstSentence.length > 0) {
    const summary = firstSentence.length > 50 
      ? firstSentence.substring(0, 47) + "..."
      : firstSentence;
    return summary.trim();
  }
  
  // 文がない場合は最初の50文字
  return response.length > 50 ? response.substring(0, 47) + "..." : response;
}

