/**
 * Persona Unity Test Router
 * 
 * 🌕 MEMORY UNITY vΦ Phase 10 実装
 * 
 * Persona Unity Test vΩ を実行するためのルーターです。
 */

import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import {
  runPersonaUnityTest,
  generatePersonaUnityTestReport,
} from '../engines/personaUnityTest';

/**
 * Persona Unity Test Router
 */
export const personaUnityTestRouter = router({
  /**
   * Persona Unity Test vΩ を実行
   */
  runTest: publicProcedure
    .input(
      z.object({
        apiKey: z.string().min(1), // API Key 必須
      })
    )
    .mutation(async ({ input }) => {
      const { apiKey } = input;

      // API認証チェック（arkPublicKey）
      const expectedApiKey = process.env.ARK_PUBLIC_KEY;
      if (expectedApiKey && apiKey !== expectedApiKey) {
        throw new Error('Invalid API key');
      }

      // Persona Unity Test を実行
      const result = await runPersonaUnityTest();

      // Markdownレポートを生成
      const markdown = generatePersonaUnityTestReport(result);

      return {
        result,
        markdown,
      };
    }),
});
