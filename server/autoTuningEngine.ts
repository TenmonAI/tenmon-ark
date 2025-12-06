/**
 * Auto-Tuning Engine
 * 
 * TENMON-ARK の自動最適化エンジン
 * レンダーコスト、LP-QAモデル選択、キャッシュポリシー、API並列化を自動調整
 */

import type { DiagnosticReport } from '../shared/sharedMemory';
import { getLatestDiagnosticReport } from '../shared/sharedMemory';

export interface TuningResult {
  category: 'render-cost' | 'lpqa-model' | 'cache-policy' | 'api-parallelization';
  action: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  expectedImprovement: number; // 0-100
  appliedAt: number;
}

export interface TuningConfig {
  renderOptimization: {
    enabled: boolean;
    aggressiveness: 'low' | 'medium' | 'high';
  };
  lpqaModelSelection: {
    enabled: boolean;
    strategy: 'quality' | 'speed' | 'balanced';
  };
  cachePolicy: {
    enabled: boolean;
    ttl: number; // seconds
    maxSize: number; // MB
  };
  apiParallelization: {
    enabled: boolean;
    maxConcurrent: number;
  };
}

// デフォルト設定
const defaultConfig: TuningConfig = {
  renderOptimization: {
    enabled: true,
    aggressiveness: 'medium',
  },
  lpqaModelSelection: {
    enabled: true,
    strategy: 'balanced',
  },
  cachePolicy: {
    enabled: true,
    ttl: 3600,
    maxSize: 100,
  },
  apiParallelization: {
    enabled: true,
    maxConcurrent: 5,
  },
};

let currentConfig: TuningConfig = { ...defaultConfig };

/**
 * 自動チューニングを実行
 */
export async function runAutoTuning(): Promise<TuningResult[]> {
  const results: TuningResult[] = [];

  // 最新の診断レポートを取得
  const report = await getLatestDiagnosticReport();

  if (!report) {
    return [];
  }

  // レンダーコスト最適化
  if (currentConfig.renderOptimization.enabled) {
    const renderResult = await optimizeRenderCost(report);
    if (renderResult) {
      results.push(renderResult);
    }
  }

  // LP-QAモデル選択最適化
  if (currentConfig.lpqaModelSelection.enabled) {
    const modelResult = await optimizeLPQAModel(report);
    if (modelResult) {
      results.push(modelResult);
    }
  }

  // キャッシュポリシー調整
  if (currentConfig.cachePolicy.enabled) {
    const cacheResult = await optimizeCachePolicy(report);
    if (cacheResult) {
      results.push(cacheResult);
    }
  }

  // API並列化戦略
  if (currentConfig.apiParallelization.enabled) {
    const apiResult = await optimizeAPIParallelization(report);
    if (apiResult) {
      results.push(apiResult);
    }
  }

  return results;
}

/**
 * レンダーコストを最適化
 */
async function optimizeRenderCost(report: DiagnosticReport): Promise<TuningResult | null> {
  const uiHealth = report.metrics.uiHealth;

  if (uiHealth < 70) {
    // UI負荷が高い場合、最適化を強化
    const before = {
      aggressiveness: currentConfig.renderOptimization.aggressiveness,
    };

    let newAggressiveness: 'low' | 'medium' | 'high' = 'medium';
    if (uiHealth < 50) {
      newAggressiveness = 'high';
    } else if (uiHealth < 70) {
      newAggressiveness = 'medium';
    }

    if (newAggressiveness !== currentConfig.renderOptimization.aggressiveness) {
      currentConfig.renderOptimization.aggressiveness = newAggressiveness;

      const after = {
        aggressiveness: newAggressiveness,
      };

      return {
        category: 'render-cost',
        action: `レンダー最適化を${newAggressiveness}に変更`,
        before,
        after,
        expectedImprovement: 20,
        appliedAt: Date.now(),
      };
    }
  } else if (uiHealth > 90) {
    // UI負荷が低い場合、最適化を緩和
    if (currentConfig.renderOptimization.aggressiveness !== 'low') {
      const before = {
        aggressiveness: currentConfig.renderOptimization.aggressiveness,
      };

      currentConfig.renderOptimization.aggressiveness = 'low';

      const after = {
        aggressiveness: 'low',
      };

      return {
        category: 'render-cost',
        action: 'レンダー最適化をlowに変更',
        before,
        after,
        expectedImprovement: 5,
        appliedAt: Date.now(),
      };
    }
  }

  return null;
}

/**
 * LP-QAモデル選択を最適化
 */
async function optimizeLPQAModel(report: DiagnosticReport): Promise<TuningResult | null> {
  const apiHealth = report.metrics.apiHealth;
  const performanceScore = report.metrics.performanceScore;

  // パフォーマンスとAPI健全性に基づいてモデル戦略を調整
  let newStrategy: 'quality' | 'speed' | 'balanced' = 'balanced';

  if (apiHealth < 60 || performanceScore < 60) {
    // パフォーマンスが低い場合、速度優先
    newStrategy = 'speed';
  } else if (apiHealth > 85 && performanceScore > 85) {
    // パフォーマンスが高い場合、品質優先
    newStrategy = 'quality';
  } else {
    // 中間の場合、バランス型
    newStrategy = 'balanced';
  }

  if (newStrategy !== currentConfig.lpqaModelSelection.strategy) {
    const before = {
      strategy: currentConfig.lpqaModelSelection.strategy,
    };

    currentConfig.lpqaModelSelection.strategy = newStrategy;

    const after = {
      strategy: newStrategy,
    };

    return {
      category: 'lpqa-model',
      action: `LP-QAモデル戦略を${newStrategy}に変更`,
      before,
      after,
      expectedImprovement: 15,
      appliedAt: Date.now(),
    };
  }

  return null;
}

/**
 * キャッシュポリシーを最適化
 */
async function optimizeCachePolicy(report: DiagnosticReport): Promise<TuningResult | null> {
  const performanceScore = report.metrics.performanceScore;

  // パフォーマンススコアに基づいてキャッシュTTLを調整
  let newTTL = 3600; // デフォルト1時間

  if (performanceScore < 60) {
    // パフォーマンスが低い場合、キャッシュ時間を延長
    newTTL = 7200; // 2時間
  } else if (performanceScore > 85) {
    // パフォーマンスが高い場合、キャッシュ時間を短縮（新鮮さ優先）
    newTTL = 1800; // 30分
  }

  if (newTTL !== currentConfig.cachePolicy.ttl) {
    const before = {
      ttl: currentConfig.cachePolicy.ttl,
    };

    currentConfig.cachePolicy.ttl = newTTL;

    const after = {
      ttl: newTTL,
    };

    return {
      category: 'cache-policy',
      action: `キャッシュTTLを${newTTL}秒に変更`,
      before,
      after,
      expectedImprovement: 10,
      appliedAt: Date.now(),
    };
  }

  return null;
}

/**
 * API並列化を最適化
 */
async function optimizeAPIParallelization(report: DiagnosticReport): Promise<TuningResult | null> {
  const apiHealth = report.metrics.apiHealth;

  // API健全性に基づいて並列実行数を調整
  let newMaxConcurrent = 5; // デフォルト

  if (apiHealth < 60) {
    // API負荷が高い場合、並列数を削減
    newMaxConcurrent = 3;
  } else if (apiHealth > 85) {
    // API負荷が低い場合、並列数を増加
    newMaxConcurrent = 8;
  }

  if (newMaxConcurrent !== currentConfig.apiParallelization.maxConcurrent) {
    const before = {
      maxConcurrent: currentConfig.apiParallelization.maxConcurrent,
    };

    currentConfig.apiParallelization.maxConcurrent = newMaxConcurrent;

    const after = {
      maxConcurrent: newMaxConcurrent,
    };

    return {
      category: 'api-parallelization',
      action: `API並列実行数を${newMaxConcurrent}に変更`,
      before,
      after,
      expectedImprovement: 12,
      appliedAt: Date.now(),
    };
  }

  return null;
}

/**
 * チューニング設定を取得
 */
export function getTuningConfig(): TuningConfig {
  return { ...currentConfig };
}

/**
 * チューニング設定を更新
 */
export function updateTuningConfig(config: Partial<TuningConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...config,
  };
}

/**
 * チューニング設定をリセット
 */
export function resetTuningConfig(): void {
  currentConfig = { ...defaultConfig };
}
