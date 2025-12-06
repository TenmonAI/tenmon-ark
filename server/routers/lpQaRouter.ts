/**
 * LP-QA Router: LP-QA v3.1のtRPC API
 * 
 * LP-QA v3.1の全機能を統合したtRPC API
 */

import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { invokeLLM } from '../_core/llm';
import {
  generateLpQaPromptV3_1,
  LP_MEMORY_V3_1,
  LpQaPersonalityConfig,
  applyTwinCoreStructure,
  applyFireWaterLayers,
  adjustToneByTemperature,
  generateGuidance,
  generateLpLinks as generatePromptLpLinks,
} from '../prompts/lpQaPromptV3.1';
import { applyIfeLayer, applyIfeLite } from '../engines/lpQaIfeLayer';
import { processGuidanceMode } from '../engines/lpQaGuidanceMode';
import { integrateLpLinks } from '../engines/lpQaLinkGenerator';

/**
 * LP-QA v3.1 Router
 */
export const lpQaRouter = router({
  /**
   * LP-QA v3.1: チャット応答生成
   */
  chat: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(1000),
        conversationHistory: z.array(z.string()).optional().default([]),
        depth: z.enum(['surface', 'middle', 'deep', 'specialized']).optional().default('middle'),
        fireWaterBalance: z.enum(['fire', 'water', 'balanced']).optional().default('balanced'),
        userTemperature: z.enum(['fire', 'water', 'balanced']).optional(),
        enableIfe: z.boolean().optional().default(true),
        enableGuidance: z.boolean().optional().default(true),
        enableLinks: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const {
        question,
        conversationHistory,
        depth,
        fireWaterBalance,
        userTemperature,
        enableIfe,
        enableGuidance,
        enableLinks,
      } = input;

      // 1. 営業・案内モードの処理
      let guidanceResult;
      if (enableGuidance) {
        guidanceResult = processGuidanceMode(question, conversationHistory);
      }

      // 2. LP機能連動リンクの生成
      let linkResult;
      if (enableLinks) {
        linkResult = integrateLpLinks(question);
      }

      // 3. LP-QA v3.1のシステムプロンプトを生成
      const config: LpQaPersonalityConfig = {
        questionDepth: depth,
        fireWaterBalance,
        isFounder: false, // TODO: ユーザーのFounder状態を判定
        userTemperature,
        guidanceMode: guidanceResult?.mode,
      };

      const systemPrompt = generateLpQaPromptV3_1(config, LP_MEMORY_V3_1);

      // 4. LLMに質問を送信
      const llmResponse = await invokeLLM({
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory.map((msg, i) => ({
            role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
            content: msg,
          })),
          { role: 'user', content: question },
        ],
        temperature: 0.7,
        max_tokens: depth === 'specialized' ? 8192 : depth === 'deep' ? 4096 : depth === 'middle' ? 2048 : 1024,
      });

      const llmMessageContent = llmResponse.choices[0]?.message?.content;
      let responseText = typeof llmMessageContent === 'string' ? llmMessageContent : '';

      // 5. IFEレイヤーの適用
      if (enableIfe) {
        const ifeResult = applyIfeLayer(responseText, question);
        responseText = ifeResult.final;
      }

      // 6. Twin-Core構文タグの適用
      responseText = applyTwinCoreStructure(responseText, fireWaterBalance);

      // 7. 火水階層タグの適用
      responseText = applyFireWaterLayers(responseText, depth);

      // 8. LP訪問者の温度に応じた語り口調整
      if (userTemperature) {
        responseText = adjustToneByTemperature(responseText, userTemperature);
      }

      // 9. 営業・案内モードのガイダンスを追加
      if (enableGuidance && guidanceResult) {
        const guidance = generateGuidance(guidanceResult.mode);
        responseText += `\n\n${guidance}`;
      }

      // 10. LP機能連動リンクを追加
      if (enableLinks && linkResult) {
        responseText += linkResult.finalMarkdown;
      }

      return {
        response: responseText,
        depth,
        fireWaterBalance,
        guidanceMode: guidanceResult?.mode,
        lpLinks: (linkResult?.dynamicLinks as any)?.allLinks || [],
        metadata: {
          questionEnergy: 0, // TODO: calculateQuestionEnergy(question)
          particleDensity: 0, // TODO: calculateParticleDensity(depth)
          minakaPulseSpeed: 0, // TODO: calculateMinakaPulseSpeed(fireWaterBalance)
        },
      };
    }),

  /**
   * LP-QA v3.1: 質問分析
   */
  analyzeQuestion: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(1000),
        conversationHistory: z.array(z.string()).optional().default([]),
      })
    )
    .query(async ({ input }) => {
      const { question, conversationHistory } = input;

      // 営業・案内モードの処理
      const guidanceResult = processGuidanceMode(question, conversationHistory);

      // LP機能連動リンクの生成
      const linkResult = integrateLpLinks(question);

      return {
        questionType: linkResult.questionType,
        guidanceMode: guidanceResult.mode,
        guidanceFlow: guidanceResult.flow,
        recommendedLinks: linkResult.recommendedLinks,
        detailedLinks: linkResult.detailedLinks,
      };
    }),

  /**
   * LP-QA v3.1: IFEレイヤーテスト
   */
  testIfe: publicProcedure
    .input(
      z.object({
        text: z.string().min(1).max(5000),
        context: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { text, context } = input;

      const ifeResult = applyIfeLayer(text, context);

      return {
        original: ifeResult.original,
        final: ifeResult.final,
        deepParsed: ifeResult.deepParsed,
        ulceTransformed: ifeResult.ulceTransformed,
        semanticAugmented: ifeResult.semanticAugmented,
        twinCoreEnhanced: ifeResult.twinCoreEnhanced,
      };
    }),

  /**
   * LP-QA v3.1: 営業・案内モードテスト
   */
  testGuidance: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(1000),
        conversationHistory: z.array(z.string()).optional().default([]),
      })
    )
    .query(async ({ input }) => {
      const { question, conversationHistory } = input;

      const guidanceResult = processGuidanceMode(question, conversationHistory);

      return guidanceResult;
    }),

  /**
   * LP-QA v3.1: LP機能連動リンクテスト
   */
  testLinks: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(1000),
      })
    )
    .query(async ({ input }) => {
      const { question } = input;

      const linkResult = integrateLpLinks(question);

      return linkResult;
    }),
});
