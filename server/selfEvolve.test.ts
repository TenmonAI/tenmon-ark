/**
 * Self-Evolve v2 Tests
 * 
 * TENMON-ARK の自己進化エンジン v2 のテスト
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';
import { initializeSharedMemory } from '../shared/sharedMemory';

// テスト用のコンテキストを作成
function createTestContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
      loginMethod: 'manus',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {} as TrpcContext['res'],
  };
}

describe('Self-Evolve v2', () => {
  beforeAll(async () => {
    // Shared Memory を初期化
    await initializeSharedMemory();
  });

  describe('Predictive Optimization', () => {
    it('未来予測分析を実行できる', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // まず診断を実行してデータを準備
      await caller.directLink.runDiagnostics();
      await caller.directLink.runDiagnostics();
      await caller.directLink.runDiagnostics();

      const predictions = await caller.selfEvolve.runPredictiveAnalysis();

      expect(predictions).toBeInstanceOf(Array);
      // 予測結果がある場合、構造を検証
      if (predictions.length > 0) {
        const prediction = predictions[0];
        expect(prediction.category).toMatch(/^(ui-load|api-latency|cache-corruption|react-tree-anomaly)$/);
        expect(prediction.severity).toMatch(/^(low|medium|high|critical)$/);
        expect(prediction.probability).toBeGreaterThanOrEqual(0);
        expect(prediction.probability).toBeLessThanOrEqual(100);
        expect(prediction.recommendations).toBeInstanceOf(Array);
      }
    });

    it('最適化提案を生成できる', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const mockPredictions = [
        {
          category: 'ui-load' as const,
          severity: 'medium' as const,
          probability: 70,
          predictedAt: Date.now(),
          estimatedOccurrence: Date.now() + 24 * 60 * 60 * 1000,
          description: 'Test prediction',
          recommendations: ['Test recommendation'],
        },
      ];

      const suggestions = await caller.selfEvolve.generateOptimizationSuggestions({
        predictions: mockPredictions,
      });

      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);

      const suggestion = suggestions[0];
      expect(suggestion.id).toBeDefined();
      expect(suggestion.category).toMatch(/^(performance|reliability|security|ux)$/);
      expect(suggestion.impact).toMatch(/^(low|medium|high)$/);
      expect(suggestion.effort).toMatch(/^(low|medium|high)$/);
      expect(suggestion.priority).toBeGreaterThanOrEqual(0);
      expect(suggestion.priority).toBeLessThanOrEqual(100);
      expect(suggestion.actions).toBeInstanceOf(Array);
    });
  });

  describe('Auto-Tuning', () => {
    it('自動チューニングを実行できる', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // まず診断を実行
      await caller.directLink.runDiagnostics();

      const results = await caller.selfEvolve.runAutoTuning();

      expect(results).toBeInstanceOf(Array);
      // チューニング結果がある場合、構造を検証
      if (results.length > 0) {
        const result = results[0];
        expect(result.category).toMatch(/^(render-cost|lpqa-model|cache-policy|api-parallelization)$/);
        expect(result.action).toBeDefined();
        expect(result.before).toBeDefined();
        expect(result.after).toBeDefined();
        expect(result.expectedImprovement).toBeGreaterThanOrEqual(0);
        expect(result.expectedImprovement).toBeLessThanOrEqual(100);
      }
    });

    it('チューニング設定を取得できる', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const config = await caller.selfEvolve.getTuningConfig();

      expect(config).toBeDefined();
      expect(config.renderOptimization).toBeDefined();
      expect(config.lpqaModelSelection).toBeDefined();
      expect(config.cachePolicy).toBeDefined();
      expect(config.apiParallelization).toBeDefined();
    });

    it('チューニング設定を更新できる', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.selfEvolve.updateTuningConfig({
        renderOptimization: {
          enabled: true,
          aggressiveness: 'high',
        },
      });

      expect(result.success).toBe(true);

      const config = await caller.selfEvolve.getTuningConfig();
      expect(config.renderOptimization.aggressiveness).toBe('high');
    });

    it('チューニング設定をリセットできる', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.selfEvolve.resetTuningConfig();

      expect(result.success).toBe(true);
    });
  });

  describe('Evolution Log', () => {
    it('進化エントリーを記録できる', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const entry = await caller.selfEvolve.logEvolution({
        newAbility: 'Test Ability',
        description: 'Test evolution entry',
        metricsImproved: [
          {
            category: 'performance',
            before: 70,
            after: 85,
            improvement: 21.4,
          },
        ],
        relatedChanges: ['Change 1', 'Change 2'],
        impact: 'medium',
      });

      expect(entry).toBeDefined();
      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeGreaterThan(0);
      expect(entry.newAbility).toBe('Test Ability');
    });

    it('すべての進化エントリーを取得できる', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const evolutions = await caller.selfEvolve.getAllEvolutions();

      expect(evolutions).toBeInstanceOf(Array);
    });

    it('最新の進化エントリーを取得できる', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const evolution = await caller.selfEvolve.getLatestEvolution();

      // 進化エントリーが存在する場合のみ検証
      if (evolution) {
        expect(evolution.id).toBeDefined();
        expect(evolution.timestamp).toBeGreaterThan(0);
      }
    });

    it('進化統計を取得できる', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const stats = await caller.selfEvolve.getEvolutionStats();

      expect(stats).toBeDefined();
      expect(stats.totalEvolutions).toBeGreaterThanOrEqual(0);
      expect(stats.abilities).toBeInstanceOf(Array);
      expect(stats.averageImprovement).toBeGreaterThanOrEqual(0);
      expect(stats.impactDistribution).toBeDefined();
    });
  });

  describe('Model-Fusion', () => {
    it('モデル融合を実行できる', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.selfEvolve.executeFusion({
        context: 'Test context',
        models: ['gpt', 'autonomous'],
        task: 'Test task',
        priority: 'medium',
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeGreaterThan(0);
      expect(result.responses).toBeInstanceOf(Array);
      expect(result.fusedDecision).toBeDefined();
      expect(result.reasoning).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }, 30000); // タイムアウトを30秒に延長（LLM呼び出しのため）
  });

  describe('Integrated Workflows', () => {
    it('完全な自己進化サイクルを実行できる', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // まず診断を実行してデータを準備
      await caller.directLink.runDiagnostics();
      await caller.directLink.runDiagnostics();
      await caller.directLink.runDiagnostics();

      const result = await caller.selfEvolve.runFullEvolutionCycle();

      expect(result).toBeDefined();
      expect(result.predictions).toBeInstanceOf(Array);
      expect(result.tuningResults).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
      expect(result.timestamp).toBeGreaterThan(0);
    }, 30000); // タイムアウトを30秒に延長
  });
});
