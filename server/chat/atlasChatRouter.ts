/**
 * Atlas Chat Router
 * 天聞アーク人格の脳 - Atlas Chat API統合
 * 
 * 処理フロー:
 * 1. 認証・プランチェック
 * 2. Persona Engine で人格を取得
 * 3. Memory Kernel でコンテキストを取得
 * 4. Reasoning Core で推論を実行
 * 5. LLMを呼び出し（Persona + Reasoning + Memory を統合）
 * 6. Memory Kernel に保存
 * 7. レスポンスを構築
 * 
 * スロットリング: maxConcurrent=3（同時実行数を制限）
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { subscriptions, plans, uploadedFiles } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import type { MemoryContext } from '../synapticMemory';
import type { ReasoningChainResult } from '../twinCoreEngine';
import type { InvokeResult, TextContent } from '../_core/llm';
import { computeReishoSignature, applyReishoToReasoning } from '../reisho/reishoKernel';
import { getReishoMemoryContext } from '../synapticMemory';

/**
 * Atlas Chat スロットリング（同時実行数制限）
 * maxConcurrent=3: 同時に3つのリクエストまで処理可能
 */
class AtlasChatThrottle {
  private running = 0;
  private maxConcurrent = 3;
  private queue: Array<{
    resolve: () => void;
    reject: (error: Error) => void;
  }> = [];

  /**
   * スロットを取得（同時実行数が上限に達している場合は待機）
   */
  async acquire(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.running < this.maxConcurrent) {
        this.running++;
        resolve();
      } else {
        this.queue.push({ resolve, reject });
      }
    });
  }

  /**
   * スロットを解放（次のリクエストを処理可能に）
   */
  release(): void {
    this.running--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        this.running++;
        next.resolve();
      }
    }
  }

  /**
   * 現在の実行数と待機数を取得
   */
  getStatus(): { running: number; waiting: number; maxConcurrent: number } {
    return {
      running: this.running,
      waiting: this.queue.length,
      maxConcurrent: this.maxConcurrent,
    };
  }
}

const atlasChatThrottle = new AtlasChatThrottle();

const chatInputSchema = z.object({
  message: z.string().min(1),
  language: z.string().default('ja'),
  model: z.enum(['gpt-4o', 'gpt-4.1', 'gpt-o3']).optional(),
  conversationId: z.number().optional(),
  persona: z.enum(['architect', 'guardian', 'companion', 'silent']).optional(),
  siteMode: z.boolean().optional().default(false), // サイト専用モード（外部知識シャットアウト）
  siteId: z.string().optional(), // サイトID（siteMode=trueの場合に必須）
});

/**
 * Atlas Chat API レスポンス型
 */
export interface AtlasChatResponse {
  success: boolean;
  role: 'assistant';
  text: string;
  reasoning: {
    steps: Array<{
      type: string;
      content: string;
      timestamp: string;
    }>;
    finalThought: string;
  };
  persona: {
    id: string;
    name: string;
    tone: string;
  };
  memory: {
    retrieved: number;
    stored: boolean;
  };
  /** Reishō シグネチャ（入力） */
  reishoInput?: any;
  /** Reishō シグネチャ（出力） */
  reishoOutput?: any;
  /** 使用されたKokūzō Seeds */
  usedSeeds?: Array<{
    seedId: string;
    title?: string;
    weight: number;
    projectId?: number | null; // プロジェクトID（メタデータ）
  }>;
  /** 使用されたファイル */
  usedFiles?: Array<{
    fileId: string;
    name: string;
    projectId?: number | null; // プロジェクトID（メタデータ）
  }>;
}

export const atlasChatRouter = router({
  /**
   * Atlas Chat API
   * 天聞アーク人格の脳によるチャット応答生成
   */
  chat: protectedProcedure
    .input(chatInputSchema)
    .mutation(async ({ ctx, input }) => {
      // 0. スロットリング: 同時実行数制限
      try {
        await atlasChatThrottle.acquire();
      } catch (error) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Atlas Chat is currently busy. Please try again later.',
        });
      }

      try {
        // 0. Universe OS 経由で処理（Reishō Pipeline）
        const { routeRequestThroughReishoPipeline } = await import("../reisho/universeOSIntegration");
        
        // Universe OS が有効な場合は Reishō Pipeline 経由で処理
        const useUniverseOS = process.env.ENABLE_UNIVERSE_OS !== "false"; // デフォルトで有効
        
        if (useUniverseOS) {
          try {
            const reishoOutput = await routeRequestThroughReishoPipeline({
              message: input.message,
              userId: ctx.user.id,
              conversationId: input.conversationId,
              existingSeeds: [], // 実際の実装では既存シードを取得
            });
            
            // Kokūzō / Fractal 実行後に抽出（既存結果を横取り）
            const currentProjectId = input.projectId || null;
            
            // Seed 参照時に weight を増加（GAP-C）
            const { increaseSeedWeight, filterUsableSeeds } = await import("../kokuzo/offline/seedLifecycleManager");
            const { getFractalSeed, updateFractalSeed } = await import("../kokuzo/db/adapter");
            
            const rawSeeds = reishoOutput.memoryContext?.seeds || [];
            const usableSeeds = filterUsableSeeds(rawSeeds); // weight >= threshold のみ
            
            // 参照された Seed の weight を増加（非同期、エラーは無視）
            usableSeeds.forEach(async (seed: any) => {
              try {
                const seedId = seed.id || seed.seedId;
                if (!seedId) return;
                
                // データベースから Seed を取得
                const dbSeed = await getFractalSeed(seedId);
                if (dbSeed) {
                  // Weight を増加
                  const updated = increaseSeedWeight(dbSeed);
                  // データベースを更新（非同期、エラーは無視）
                  updateFractalSeed(updated).catch(() => {});
                }
              } catch {
                // エラーは無視（UIに影響しない）
              }
            });
            
            const usedSeeds = usableSeeds.map((seed: any) => ({
              seedId: seed.id || seed.seedId || '',
              title: seed.mainTags?.[0] || seed.title || seed.name,
              weight: seed.lifecycle?.weight || seed.compressedRepresentation?.seedWeight || seed.seedWeight || seed.weight || 0.5,
              projectId: seed.metadata?.projectId || null, // プロジェクトIDをメタデータから取得
            }));

            const usedFiles = (reishoOutput.memoryContext?.files || []).map((file: any) => {
              // metadataからprojectIdを取得
              let fileProjectId: number | null = null;
              if (file.metadata) {
                try {
                  const metadata = typeof file.metadata === 'string' ? JSON.parse(file.metadata) : file.metadata;
                  fileProjectId = metadata.projectId || null;
                } catch (e) {
                  // パースエラーは無視
                }
              }
              
              return {
                fileId: file.id || file.fileId || '',
                name: file.originalName || file.name || file.fileName || '',
                projectId: fileProjectId, // プロジェクトIDをメタデータから取得
              };
            });

            // Reishō Pipeline の出力を Atlas Chat レスポンスに変換
            return {
              success: true,
              role: "assistant",
              text: reishoOutput.response,
              reasoning: {
                steps: reishoOutput.reasoning.steps || [],
                finalThought: reishoOutput.reasoning.finalThought || "",
              },
              persona: {
                id: reishoOutput.phaseState.personaMapping.architect > 0.5 ? "architect" :
                    reishoOutput.phaseState.personaMapping.guardian > 0.5 ? "guardian" :
                    reishoOutput.phaseState.personaMapping.companion > 0.5 ? "companion" : "silent",
                name: "TENMON-ARK",
                tone: "spiritual",
              },
              memory: {
                retrieved: reishoOutput.memoryContext.retrievedSeeds,
                stored: true,
              },
              reishoInput: reishoOutput.reishoInput,
              reishoOutput: reishoOutput.reishoOutput,
              usedSeeds,
              usedFiles,
            };
          } catch (reishoError) {
            // Reishō Pipeline エラー時は従来の処理にフォールバック
            console.warn("Reishō Pipeline error, falling back to traditional processing:", reishoError);
          }
        }
        
        // 1. 認証・プランチェック
        const db = await getDb();
        if (!db) {
          atlasChatThrottle.release();
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database not available',
          });
        }

        // プランチェック（Basicプラン以上）
        const userSubscriptions = await db
          .select()
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.userId, ctx.user.id),
              eq(subscriptions.status, 'active')
            )
          )
          .limit(1);

        const subscription = userSubscriptions[0];
        let planId = 1; // Freeプラン
        if (subscription) {
          planId = subscription.planId;
        }

        const userPlans = await db
          .select()
          .from(plans)
          .where(eq(plans.id, planId))
          .limit(1);

        const plan = userPlans[0];
        if (!plan) {
          atlasChatThrottle.release();
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Plan not found',
          });
        }

        // Basicプラン以上で利用可能
        const allowedPlans = ['basic', 'pro', 'promax', 'founder'];
        if (!allowedPlans.includes(plan.name.toLowerCase())) {
          atlasChatThrottle.release();
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'This feature requires Basic plan or higher',
          });
        }

        // siteMode=true の場合、完全隔離されたSite-Knowledge Sandboxを使用
        if (input.siteMode === true && input.siteId) {
          // 外部知識完全遮断モード
          // - Atlas Memory 禁止
          // - Global Memory 禁止
          // - 推論深度を制限（外部知識参照をゼロにする）
          // - Concierge Persona を完全にサイトスコープ化

          const { semanticSearch } = await import("../concierge/semantic/index");
          const { buildConciergePrompt } = await import("./conciergePersona");

          // サイト専用Semantic Indexから検索（外部知識は一切参照しない）
          const searchResults = await semanticSearch(input.message, 5, { siteId: input.siteId });

          // Concierge Personaでプロンプトを構築（外部知識遮断を強化）
          const prompt = buildConciergePrompt(input.message, searchResults);

          // LLMを呼び出し（推論深度を制限、外部知識参照を禁止）
          const { invokeLLM } = await import("../_core/llm");
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "You are a site-specific AI assistant. You MUST ONLY use the information provided in the user's message. Do NOT use any external knowledge, general knowledge, or information not explicitly provided. If the information is not in the provided context, you MUST reply that the information is not available on this website.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            model: input.model || "gpt-4o",
          });

          const text = extractResponseText(response);

          // Kokūzō / Fractal 実行後に抽出（siteModeでは空配列）
          const usedSeeds: Array<{ seedId: string; title?: string; weight: number; projectId?: number | null }> = [];
          const usedFiles: Array<{ fileId: string; name: string; projectId?: number | null }> = [];

          atlasChatThrottle.release();
          return {
            success: true,
            role: "assistant" as const,
            text,
            reasoning: {
              steps: [
                {
                  type: "site-sandbox",
                  content: "Site-Knowledge Sandbox mode: External knowledge completely blocked",
                  timestamp: new Date().toISOString(),
                },
              ],
              finalThought: "Site-specific mode: Only using website content. External knowledge, memory, and deep reasoning are disabled.",
            },
            persona: {
              id: "concierge",
              name: "Concierge",
              tone: "polite",
            },
            memory: {
              retrieved: searchResults.length,
              stored: false, // siteModeではMemoryに保存しない（完全隔離）
            },
            usedSeeds,
            usedFiles,
          };
        }

        try {
        // 2. Persona Engine で人格を取得
        const { getCenterlinePersona } = await import('./centerlineProtocol');
        // リクエストで指定されたpersonaがある場合はそれを使用、なければデフォルト
        const personaMode = input.persona || 'companion';
        const persona = getCenterlinePersona(input.language, personaMode, true, true);

        // 3. Memory Kernel でコンテキストを取得
        const { getUserMemoryContext } = await import('../synapticMemory');
        const conversationId = input.conversationId || 0; // デフォルトは0（新規会話）
        const memoryContext = await getUserMemoryContext(ctx.user.id, conversationId, 10);
        
        // 3.5. Reishō Memory Context を取得
        const reishoMemoryContext = await getReishoMemoryContext(ctx.user.id, 5);

        // 3.6. Kokūzō コンテキストを取得（既存結果を横取り）
        // 現時点では空配列を返す（将来的にKokūzōコンテキストが提供されたときに抽出可能）
        let kokuzoSeeds: any[] = [];
        let kokuzoFiles: any[] = [];
        try {
          // アップロードされたファイルを取得（会話単位）
          const files = await db
            .select()
            .from(uploadedFiles)
            .where(
              and(
                eq(uploadedFiles.userId, ctx.user.id),
                conversationId ? eq(uploadedFiles.conversationId, conversationId) : undefined
              )
            )
            .limit(10);
          kokuzoFiles = files || [];
          
          // TODO: Kokūzō Seedsを取得（既存のKokūzōコンテキストから抽出）
          // 現時点では空配列（将来的に実装）
        } catch (error) {
          // Kokūzō取得エラーは無視（空配列のまま）
          console.warn('[AtlasChat] Failed to get Kokūzō context:', error);
        }

        // 4. Reasoning Core で推論を実行
        const { executeTwinCoreReasoning } = await import('../twinCoreEngine');
        const reasoningResult = await executeTwinCoreReasoning(input.message);
        
        // 4.5. Reishō シグネチャを入力に添付
        const reishoInputSignature = computeReishoSignature(input.message);
        
        // 4.6. 推論結果に Reishō を適用
        const reishoModulatedReasoning = applyReishoToReasoning(reasoningResult, reishoInputSignature);

        // 5. LLMを呼び出し（Persona + Reasoning + Memory を統合）
        const { invokeLLM } = await import('../_core/llm');
        
        // システムプロンプト構築（Reishō統合）
        const systemPrompt = buildSystemPrompt(persona, memoryContext, reishoModulatedReasoning, reishoMemoryContext);
        
        // ユーザープロンプト + Reasoning Steps統合（Reishō統合）
        const userPrompt = buildUserPrompt(input.message, reishoModulatedReasoning, reishoInputSignature);

        // モデルマッピング
        const model = mapModel(input.model || 'gpt-4o');

        const llmResponse = await invokeLLM({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          model,
        });

        const responseText = extractResponseText(llmResponse);
        
        // 5.5. Reishō シグネチャを出力に添付
        const reishoOutputSignature = computeReishoSignature(responseText);

        // 6. Memory Kernel に保存
        let memoryStored = false;
        try {
          const { saveMemory } = await import('../synapticMemory');
          await saveMemory(
            ctx.user.id,
            `User: ${input.message}\nAssistant: ${responseText}`,
            'normal',
            'conversation_recent'
          );
          memoryStored = true;
        } catch (error) {
          // Memory保存エラーは警告のみ（チャットは成功）
          console.warn('Failed to save memory:', error);
        }

        // 7. レスポンスを構築
        const personaNameMap: Record<string, string> = {
          architect: 'Architect',
          guardian: 'Guardian',
          companion: 'TENMON-ARK',
          silent: 'Silent',
        };
        
        const personaToneMap: Record<string, string> = {
          architect: 'analytical',
          guardian: 'protective',
          companion: 'spiritual',
          silent: 'minimal',
        };

          // Kokūzō / Fractal 実行後に抽出（既存結果を横取り）
          const currentProjectId = input.projectId || null;
          
          const usedSeeds = kokuzoSeeds.map((seed: any) => ({
            seedId: seed.id || '',
            title: seed.compressedRepresentation?.mainTags?.[0] || seed.title || '',
            weight: seed.compressedRepresentation?.seedWeight || seed.weight || 0.5,
            projectId: seed.metadata?.projectId || null, // プロジェクトIDをメタデータから取得
          }));

          const usedFiles = kokuzoFiles.map((file: any) => {
            // metadataからprojectIdを取得
            let fileProjectId: number | null = null;
            if (file.metadata) {
              try {
                const metadata = typeof file.metadata === 'string' ? JSON.parse(file.metadata) : file.metadata;
                fileProjectId = metadata.projectId || null;
              } catch (e) {
                // パースエラーは無視
              }
            }
            
            return {
              fileId: String(file.id || ''),
              name: file.fileName || file.name || '',
              projectId: fileProjectId, // プロジェクトIDをメタデータから取得
            };
          });

          return {
            success: true,
            role: 'assistant',
            text: responseText,
            reasoning: {
              steps: buildReasoningSteps(reishoModulatedReasoning),
              finalThought: reishoModulatedReasoning.finalInterpretation?.unifiedInterpretation || '',
            },
            persona: {
              id: personaMode,
              name: personaNameMap[personaMode] || 'TENMON-ARK',
              tone: personaToneMap[personaMode] || 'spiritual',
            },
            memory: {
              retrieved: memoryContext.ltm.length + memoryContext.mtm.length + memoryContext.stm.length + reishoMemoryContext.reishoMemories.length,
              stored: memoryStored,
            },
            reishoInput: reishoInputSignature,
            reishoOutput: reishoOutputSignature,
            usedSeeds,
            usedFiles,
          };
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Chat generation failed',
          });
        } finally {
          // スロットを解放（エラー時も必ず解放）
          atlasChatThrottle.release();
        }
      } catch (error) {
        // スロットリングエラー以外のエラー
        atlasChatThrottle.release();
        throw error;
      }
    }),

  /**
   * Atlas Chat スロットリング状態を取得
   */
  getThrottleStatus: protectedProcedure.query(async () => {
    return atlasChatThrottle.getStatus();
  }),
});

/**
 * システムプロンプトを構築（Reishō統合）
 */
function buildSystemPrompt(
  persona: string,
  memoryContext: MemoryContext,
  reasoningResult: ReasoningChainResult,
  reishoMemoryContext?: { reishoMemories: string[]; reishoSignature?: any }
): string {
  let prompt = `${persona}\n\n`;

  // Memoryコンテキストを追加
  const relevantMemories = [...memoryContext.ltm, ...memoryContext.mtm];
  if (relevantMemories.length > 0) {
    prompt += 'Relevant Memories:\n';
    relevantMemories.forEach((mem, idx) => {
      prompt += `${idx + 1}. ${mem}\n`;
    });
    prompt += '\n';
  }
  
  // Reishō Memoryコンテキストを追加
  if (reishoMemoryContext && reishoMemoryContext.reishoMemories.length > 0) {
    prompt += 'Reishō Structural Memories:\n';
    reishoMemoryContext.reishoMemories.forEach((mem, idx) => {
      prompt += `${idx + 1}. ${mem}\n`;
    });
    prompt += '\n';
  }

  return prompt;
}

/**
 * ユーザープロンプトを構築（Reasoning Steps統合 + Reishō統合）
 */
function buildUserPrompt(
  message: string,
  reasoningResult: ReasoningChainResult,
  reishoSignature?: any
): string {
  let prompt = message;

  // Reasoning Stepsを追加
  if (reasoningResult.finalInterpretation) {
    prompt += `\n\n[Reasoning Analysis]\n`;
    prompt += `Fire-Water Balance: ${reasoningResult.fireWater?.dominantElement || 'N/A'}\n`;
    prompt += `Interpretation: ${reasoningResult.finalInterpretation.unifiedInterpretation || ''}\n`;
  }
  
  // Reishō シグネチャを追加
  if (reishoSignature) {
    prompt += `\n\n[Reishō Signature]\n`;
    prompt += `Reishō Value: ${reishoSignature.reishoValue.toFixed(4)}\n`;
    prompt += `Kanagi Phase: ${reishoSignature.kanagiPhaseTensor[0]?.[0]?.toFixed(2) || 'N/A'}\n`;
  }

  return prompt;
}

/**
 * モデルマッピング
 */
function mapModel(model: string): string {
  const modelMap: Record<string, string> = {
    'gpt-4o': 'gpt-4o',
    'gpt-4.1': 'gpt-4-turbo-preview',
    'gpt-o3': 'gpt-4o', // プレースホルダー
  };
  return modelMap[model] || 'gpt-4o';
}

/**
 * LLMレスポンスからテキストを抽出
 */
function extractResponseText(response: InvokeResult): string {
  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from LLM');
  }

  if (typeof content === 'string') {
    return content;
  }

  // 配列の場合はテキストを抽出
  if (Array.isArray(content)) {
    const textContent = content
      .filter((item): item is TextContent => item.type === 'text')
      .map((item) => item.text)
      .join('\n');
    return textContent || '';
  }

  return '';
}

/**
 * Reasoning Stepsを構築
 */
function buildReasoningSteps(reasoningResult: ReasoningChainResult): Array<{ type: string; content: string; timestamp: string }> {
  const steps: Array<{ type: string; content: string; timestamp: string }> = [];
  const timestamp = new Date().toISOString();

  if (reasoningResult.fireWater) {
    steps.push({
      type: 'fire_water_analysis',
      content: `Fire-Water Balance: ${reasoningResult.fireWater.dominantElement}`,
      timestamp,
    });
  }

  if (reasoningResult.finalInterpretation) {
    steps.push({
      type: 'final_interpretation',
      content: reasoningResult.finalInterpretation.unifiedInterpretation || '',
      timestamp,
    });
  }

  return steps;
}

