/**
 * LP Field Test Router
 * 
 * 🌕 MEMORY UNITY vΦ Phase 8 実装
 * 
 * LP実地テスト自動実行機能を提供します。
 */

import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import {
  runFieldTest,
  generateTestReportMarkdown,
  fetchLpQaLogs,
} from '../engines/lpFieldTestEngine';

/**
 * LP Field Test Router
 */
export const lpFieldTestRouter = router({
  /**
   * LP実地テストを実行
   */
  runTest: publicProcedure
    .input(
      z.object({
        testCount: z.number().min(1).max(50).optional().default(10),
        apiKey: z.string().min(1), // API Key 必須
      })
    )
    .mutation(async ({ input }) => {
      const { testCount, apiKey } = input;

      // API認証チェック（arkPublicKey）
      const expectedApiKey = process.env.ARK_PUBLIC_KEY;
      if (expectedApiKey && apiKey !== expectedApiKey) {
        throw new Error('Invalid API key');
      }

      // フィールドテストを実行
      const report = await runFieldTest(testCount);

      // Markdownレポートを生成
      const markdown = generateTestReportMarkdown(report);

      return {
        report,
        markdown,
      };
    }),

  /**
   * LP-QA ログを取得
   */
  getLogs: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(10),
        apiKey: z.string().min(1), // API Key 必須
      })
    )
    .query(async ({ input }) => {
      const { limit, apiKey } = input;

      // API認証チェック（arkPublicKey）
      const expectedApiKey = process.env.ARK_PUBLIC_KEY;
      if (expectedApiKey && apiKey !== expectedApiKey) {
        throw new Error('Invalid API key');
      }

      const logs = await fetchLpQaLogs(limit);

      return {
        logs,
        total: logs.length,
      };
    }),
});
