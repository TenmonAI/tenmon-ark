/**
 * DirectLink v2.0 Router
 * 
 * TENMON-ARK と Manus の直接連携API
 * 自己診断レポート送信、修正案受信、共有メモリアクセス
 */

import { z } from 'zod';
import { publicProcedure, router } from './_core/trpc';
import { runSystemDiagnostics, runCategoryDiagnostics } from './selfDiagnostics';
import { executeSelfHealCycle, executeBatchSelfHeal } from './selfHealEngine';
import {
  initializeSharedMemory,
  getLatestDiagnosticReport,
  getAllDiagnosticReports,
  savePatchIntent,
  updatePatchIntent,
  getPatchIntent,
  getAllPatchIntents,
  getAllSelfHealCycles,
  getSystemState,
  updateSystemState,
} from '../shared/sharedMemory';

// Shared Memory の初期化
initializeSharedMemory().catch(error => {
  console.error('[DirectLink] Failed to initialize shared memory:', error);
});

export const directLinkRouter = router({
  /**
   * システム全体の診断を実行
   */
  runDiagnostics: publicProcedure.mutation(async () => {
    const report = await runSystemDiagnostics();
    return report;
  }),

  /**
   * 特定カテゴリーの診断を実行
   */
  runCategoryDiagnostics: publicProcedure
    .input(
      z.object({
        category: z.enum(['api', 'ui', 'build', 'ssl', 'performance', 'security']),
      })
    )
    .mutation(async ({ input }) => {
      const result = await runCategoryDiagnostics(input.category);
      return result;
    }),

  /**
   * 最新の診断レポートを取得
   */
  getLatestDiagnosticReport: publicProcedure.query(async () => {
    const report = await getLatestDiagnosticReport();
    return report;
  }),

  /**
   * すべての診断レポートを取得
   */
  getAllDiagnosticReports: publicProcedure.query(async () => {
    const reports = await getAllDiagnosticReports();
    return reports;
  }),

  /**
   * 診断レポートを Manus に送信（POST /manus/self-diagnostics）
   */
  sendDiagnosticsToManus: publicProcedure.mutation(async () => {
    const report = await getLatestDiagnosticReport();
    
    if (!report) {
      throw new Error('診断レポートが見つかりません');
    }

    // Manus への送信
    // TODO: 実際の Manus API エンドポイントに送信
    // 現時点では共有メモリに保存済みなので、Manus 側から読み取り可能
    
    await updateSystemState({
      manus: {
        lastSync: Date.now(),
        connectionStatus: 'connected',
      },
    });

    return {
      success: true,
      reportId: report.id,
      timestamp: Date.now(),
    };
  }),

  /**
   * パッチ意図を受信（POST /tenmon/patch-intent）
   */
  receivePatchIntent: publicProcedure
    .input(
      z.object({
        source: z.enum(['manus', 'tenmon-ark', 'external-ai']),
        targetIssueId: z.string(),
        patchType: z.enum(['code-fix', 'config-change', 'dependency-update', 'optimization']),
        description: z.string(),
        changes: z.array(
          z.object({
            file: z.string(),
            action: z.enum(['create', 'update', 'delete']),
            content: z.string().optional(),
          })
        ),
        validation: z.object({
          required: z.boolean(),
          criteria: z.array(z.string()),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const patchId = `patch-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      const patch = {
        id: patchId,
        timestamp: Date.now(),
        source: input.source,
        targetIssueId: input.targetIssueId,
        patchType: input.patchType,
        description: input.description,
        changes: input.changes,
        validation: input.validation,
        status: 'pending' as const,
      };

      await savePatchIntent(patch);

      // パッチの妥当性検証
      if (input.validation.required) {
        await updatePatchIntent(patchId, { status: 'validating' });
        
        const validationResult = await validatePatch(patch);
        
        if (validationResult.valid) {
          await updatePatchIntent(patchId, { status: 'approved' });
        } else {
          await updatePatchIntent(patchId, { 
            status: 'rejected',
            result: {
              success: false,
              message: `検証失敗: ${validationResult.reason}`,
              appliedAt: Date.now(),
            },
          });
          
          return {
            success: false,
            patchId,
            message: `パッチが検証に失敗しました: ${validationResult.reason}`,
          };
        }
      } else {
        await updatePatchIntent(patchId, { status: 'approved' });
      }

      // パッチを適用
      try {
        await applyPatch(patch);
        
        await updatePatchIntent(patchId, {
          status: 'applied',
          result: {
            success: true,
            message: 'パッチが正常に適用されました',
            appliedAt: Date.now(),
          },
        });

        // 自己修復サイクルを再実行
        const latestReport = await getLatestDiagnosticReport();
        if (latestReport) {
          const targetIssue = latestReport.issues.find(i => i.id === input.targetIssueId);
          if (targetIssue) {
            await executeSelfHealCycle(targetIssue);
          }
        }

        return {
          success: true,
          patchId,
          message: 'パッチが正常に適用されました',
        };
      } catch (error) {
        await updatePatchIntent(patchId, {
          status: 'failed',
          result: {
            success: false,
            message: `適用失敗: ${error instanceof Error ? error.message : '不明なエラー'}`,
            appliedAt: Date.now(),
          },
        });

        return {
          success: false,
          patchId,
          message: `パッチの適用に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        };
      }
    }),

  /**
   * パッチ意図を取得
   */
  getPatchIntent: publicProcedure
    .input(z.object({ patchId: z.string() }))
    .query(async ({ input }) => {
      const patch = await getPatchIntent(input.patchId);
      return patch;
    }),

  /**
   * すべてのパッチ意図を取得
   */
  getAllPatchIntents: publicProcedure.query(async () => {
    const patches = await getAllPatchIntents();
    return patches;
  }),

  /**
   * Self-Heal サイクルを実行
   */
  executeSelfHeal: publicProcedure
    .input(z.object({ issueId: z.string() }))
    .mutation(async ({ input }) => {
      const latestReport = await getLatestDiagnosticReport();
      
      if (!latestReport) {
        throw new Error('診断レポートが見つかりません');
      }

      const issue = latestReport.issues.find(i => i.id === input.issueId);
      
      if (!issue) {
        throw new Error(`問題が見つかりません: ${input.issueId}`);
      }

      const cycle = await executeSelfHealCycle(issue);
      return cycle;
    }),

  /**
   * バッチ Self-Heal を実行
   */
  executeBatchSelfHeal: publicProcedure.mutation(async () => {
    const latestReport = await getLatestDiagnosticReport();
    
    if (!latestReport) {
      throw new Error('診断レポートが見つかりません');
    }

    const cycles = await executeBatchSelfHeal(latestReport.issues);
    return cycles;
  }),

  /**
   * すべての Self-Heal サイクルを取得
   */
  getAllSelfHealCycles: publicProcedure.query(async () => {
    const cycles = await getAllSelfHealCycles();
    return cycles;
  }),

  /**
   * システム状態を取得
   */
  getSystemState: publicProcedure.query(async () => {
    const state = await getSystemState();
    return state;
  }),

  /**
   * Shared Memory の健全性を確認
   */
  checkSharedMemoryHealth: publicProcedure.query(async () => {
    try {
      const state = await getSystemState();
      const latestReport = await getLatestDiagnosticReport();
      const patches = await getAllPatchIntents();
      const cycles = await getAllSelfHealCycles();

      return {
        healthy: true,
        state,
        stats: {
          totalReports: latestReport ? 1 : 0,
          totalPatches: patches.length,
          totalCycles: cycles.length,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }),
});

/**
 * パッチの妥当性を検証
 */
async function validatePatch(patch: {
  changes: Array<{ file: string; action: string; content?: string }>;
  validation: { criteria: string[] };
}): Promise<{ valid: boolean; reason?: string }> {
  try {
    // 基本的な検証
    for (const change of patch.changes) {
      // ファイルパスの検証
      if (!change.file || change.file.includes('..')) {
        return {
          valid: false,
          reason: '不正なファイルパスが含まれています',
        };
      }

      // アクションの検証
      if (change.action === 'create' || change.action === 'update') {
        if (!change.content) {
          return {
            valid: false,
            reason: 'create/update アクションにはコンテンツが必要です',
          };
        }
      }
    }

    // カスタム検証基準のチェック
    // TODO: 実際の検証ロジックを実装
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      reason: error instanceof Error ? error.message : '検証エラー',
    };
  }
}

/**
 * パッチを適用
 */
async function applyPatch(patch: {
  changes: Array<{ file: string; action: string; content?: string }>;
}): Promise<void> {
  // TODO: 実際のパッチ適用ロジックを実装
  // ファイルの作成・更新・削除を実行
  
  // 現時点では模擬的な処理
  console.log('[DirectLink] Applying patch:', patch);
}
