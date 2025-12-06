/**
 * DirectLink v2.0 Tests
 * 
 * TENMON-ARK と Manus の直接連携機能のテスト
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

describe('DirectLink v2.0', () => {
  beforeAll(async () => {
    // Shared Memory を初期化
    await initializeSharedMemory();
  });

  describe('Self-Diagnostics', () => {
    it('システム全体の診断を実行できる', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const report = await caller.directLink.runDiagnostics();

      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.timestamp).toBeGreaterThan(0);
      expect(report.systemHealth).toBeDefined();
      expect(report.systemHealth.score).toBeGreaterThanOrEqual(0);
      expect(report.systemHealth.score).toBeLessThanOrEqual(100);
      expect(report.systemHealth.status).toMatch(/^(healthy|warning|critical)$/);
      expect(report.issues).toBeInstanceOf(Array);
      expect(report.metrics).toBeDefined();
      expect(report.metrics.apiHealth).toBeGreaterThanOrEqual(0);
      expect(report.metrics.uiHealth).toBeGreaterThanOrEqual(0);
      expect(report.metrics.buildHealth).toBeGreaterThanOrEqual(0);
      expect(report.metrics.sslHealth).toBeGreaterThanOrEqual(0);
      expect(report.metrics.performanceScore).toBeGreaterThanOrEqual(0);
    });

    it('特定カテゴリーの診断を実行できる', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.directLink.runCategoryDiagnostics({
        category: 'api',
      });

      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.issues).toBeInstanceOf(Array);
    });

    it('最新の診断レポートを取得できる', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // まず診断を実行
      await caller.directLink.runDiagnostics();

      // 最新のレポートを取得
      const report = await caller.directLink.getLatestDiagnosticReport();

      expect(report).toBeDefined();
      if (report) {
        expect(report.id).toBeDefined();
        expect(report.timestamp).toBeGreaterThan(0);
      }
    });

    it('すべての診断レポートを取得できる', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const reports = await caller.directLink.getAllDiagnosticReports();

      expect(reports).toBeInstanceOf(Array);
      expect(reports.length).toBeGreaterThan(0);
    });
  });

  describe('Manus連携', () => {
    it('診断レポートをManusに送信できる', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // まず診断を実行
      await caller.directLink.runDiagnostics();

      // Manusに送信
      const result = await caller.directLink.sendDiagnosticsToManus();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.reportId).toBeDefined();
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('パッチ意図を受信して適用できる', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // まず診断を実行して問題を取得
      const report = await caller.directLink.runDiagnostics();
      const issue = report.issues[0];

      if (!issue) {
        // 問題がない場合はスキップ
        return;
      }

      // パッチ意図を受信
      const result = await caller.directLink.receivePatchIntent({
        source: 'manus',
        targetIssueId: issue.id,
        patchType: 'code-fix',
        description: 'テスト用のパッチ',
        changes: [
          {
            file: 'test.ts',
            action: 'update',
            content: '// テストコード',
          },
        ],
        validation: {
          required: false,
          criteria: [],
        },
      });

      expect(result).toBeDefined();
      expect(result.patchId).toBeDefined();
    });

    it('パッチ意図を取得できる', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // すべてのパッチを取得
      const patches = await caller.directLink.getAllPatchIntents();

      expect(patches).toBeInstanceOf(Array);
    });
  });

  describe('Self-Heal', () => {
    it('Self-Healサイクルを実行できる', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // まず診断を実行して問題を取得
      const report = await caller.directLink.runDiagnostics();
      const issue = report.issues.find(i => i.severity !== 'low');

      if (!issue) {
        // 修復対象の問題がない場合はスキップ
        return;
      }

      // Self-Healを実行
      const cycle = await caller.directLink.executeSelfHeal({
        issueId: issue.id,
      });

      expect(cycle).toBeDefined();
      expect(cycle.id).toBeDefined();
      expect(cycle.timestamp).toBeGreaterThan(0);
      expect(cycle.trigger).toBe('diagnostic');
      expect(cycle.issueId).toBe(issue.id);
      expect(cycle.steps).toBeInstanceOf(Array);
      expect(cycle.steps.length).toBeGreaterThan(0);
      expect(cycle.outcome).toMatch(/^(healed|partially-healed|failed|escalated-to-manus)$/);
    });

    it('バッチSelf-Healを実行できる', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // まず診断を実行
      await caller.directLink.runDiagnostics();

      // バッチSelf-Healを実行
      const cycles = await caller.directLink.executeBatchSelfHeal();

      expect(cycles).toBeInstanceOf(Array);
      // low severity の問題はスキップされるため、0個の場合もある
      cycles.forEach(cycle => {
        expect(cycle.id).toBeDefined();
        expect(cycle.outcome).toMatch(/^(healed|partially-healed|failed|escalated-to-manus)$/);
      });
    });

    it('すべてのSelf-Healサイクルを取得できる', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const cycles = await caller.directLink.getAllSelfHealCycles();

      expect(cycles).toBeInstanceOf(Array);
    });
  });

  describe('System State', () => {
    it('システム状態を取得できる', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const state = await caller.directLink.getSystemState();

      expect(state).toBeDefined();
      expect(state.lastUpdated).toBeGreaterThan(0);
      expect(state.version).toBeDefined();
      expect(state.uptime).toBeGreaterThanOrEqual(0);
      expect(state.diagnostics).toBeDefined();
      expect(state.selfHeal).toBeDefined();
      expect(state.manus).toBeDefined();
    });

    it('Shared Memoryの健全性を確認できる', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const health = await caller.directLink.checkSharedMemoryHealth();

      expect(health).toBeDefined();
      expect(health.healthy).toBe(true);
      expect(health.state).toBeDefined();
      expect(health.stats).toBeDefined();
      expect(health.stats.totalReports).toBeGreaterThanOrEqual(0);
      expect(health.stats.totalPatches).toBeGreaterThanOrEqual(0);
      expect(health.stats.totalCycles).toBeGreaterThanOrEqual(0);
    });
  });
});
