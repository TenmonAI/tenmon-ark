import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import * as stripeService from "./stripe";
import { PRODUCTS } from "@shared/products";
import * as synapticMemory from "./synapticMemory";
import { TENMON_AI_CORE_PERSONALITY } from "./synapticMemory";
import { invokeLLM } from "./_core/llm";
import { jobsRouter } from "./routers/jobs";
import { buildMultilingualPrompt, detectLanguageFromMessage } from "./centerlineProtocolMultilingual";
import { buildArkPrompt } from "./arkCenterlineProtocol";
import { arkRouter } from "./ark/arkRouter";
import { chatRouter } from "./chat/chatRouter";
import { kotodamaRouter } from "./routers/kotodamaRouter";
import { universalLanguageRouter } from "./universal/universalLanguageRouter";
import { arkBrowserRouter } from "./arkBrowser/arkBrowserRouter";
import { guardianRouter } from "./guardian/guardianRouter";
import { soulSyncRouter } from "./soulSync/soulSyncRouter";
import { distributedCloudRouter } from "./distributedCloud/distributedCloudRouter";
import { arkShieldRouter } from "./arkShield/arkShieldRouter";
import { fractalGuardianRouter } from "./fractalGuardianRouter";
import { kotodamaSpeechRecognitionRouter } from "./naturalSpeech/kotodamaSpeechRecognitionRouter";
import { kttsRouter } from "./routers/kttsRouter";
import { kdeRouter } from "./routers/kdeRouter";
import { asesRouter } from "./routers/asesRouter";
import { selfEvolutionRouter } from "./routers/selfEvolutionRouter";
import { selfKnowledgeRouter } from "./routers/selfKnowledgeRouter";
import { naturalConversationRouter } from "./routers/naturalConversationRouter";
import { naturalPresenceRouter } from "./routers/naturalPresenceRouter";
import { hachiGenRouter } from "./routers/hachiGenRouter";
import { presenceGuardRouter } from "./api/routers/presenceGuardRouter";
import { selfBuildRouter } from "./api/routers/selfBuildRouter";
import { autonomousModeRouter } from "./api/routers/autonomousModeRouter";
import * as amatsuKanagiEngine from "./amatsuKanagiEngine";
import * as irohaEngine from "./irohaEngine";
import { executeTwinCoreReasoning } from "./twinCoreEngine";
import { conversationModeRouter } from "./conversationModeRouter";
import { sukuyoPersonalRouter } from "./sukuyoPersonalRouter";
import { twinCorePersonaRouter } from "./routers/twinCorePersona";
import { chatCoreRouter } from "./routers/chatCore";
import { arkBrowserRouter as newArkBrowserRouter } from "./routers/arkBrowser";
import { translationRouter } from "./routers/translation";
import { arkWriterRouter } from "./routers/arkWriter";
import { arkSNSRouter } from "./routers/arkSNS";
import { arkCinemaRouter } from "./routers/arkCinema";
import { lpQaRouter } from "./lpQaRouter";
import { fileUploadRouter } from "./routers/fileUploadRouter";
import { directLinkRouter } from "./directLinkRouter";
import { lpQaRouterV3 } from "./lpQaRouterV3";
import { lpQaRouter as lpQaRouterV3_1 } from "./routers/lpQaRouter";
import { lpQaRouterV4 } from "./routers/lpQaRouterV4";
import { lpFieldTestRouter } from "./routers/lpFieldTestRouter";
import { personaUnityTestRouter } from "./routers/personaUnityTestRouter";
import { selfHealRouter } from "./routers/selfHealRouter";
import { genesisLinkRouter } from "./routers/genesisLinkRouter";
import { ultraIntegrationRouter } from "./routers/ultraIntegrationRouter";
import { selfEvolveRouter } from "./selfEvolveRouter";
import { agentLinkRouter } from "./agentLink/agentLinkRouter";
import { architectModeRouter } from "./architectMode/architectModeRouter";
import { embedRouter } from "./routers/embedRouter";
import { personaModeRouter } from "./routers/personaModeRouter";
import { siteCrawlerRouter } from "./routers/siteCrawlerRouter";
import { planManagementRouter } from "./routers/planManagementRouter";
import { asrRouter } from "./routers/asrRouter";
import { customArksRouter } from "./routers/customArksRouter";
import { founderFeedbackRouter } from "./routers/founderFeedbackRouter";
import { lpQaRouterSimple } from "./routers/lpQaRouterSimple";
import { lpQaRouterStream } from "./routers/lpQaRouterStream";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  agentLink: agentLinkRouter,
  architectMode: architectModeRouter,
  selfHeal: selfHealRouter,
  genesisLink: genesisLinkRouter,
  directLink: directLinkRouter,
  ultraIntegration: ultraIntegrationRouter,
  selfEvolve: selfEvolveRouter,
  jobs: jobsRouter,
  ark: arkRouter,
  chat: chatRouter,
  kotodama: kotodamaRouter,
  universal: universalLanguageRouter,
  arkBrowser: arkBrowserRouter,
  guardian: guardianRouter,
  soulSync: soulSyncRouter,
  distributedCloud: distributedCloudRouter,
  arkShield: arkShieldRouter,
  fractalGuardian: fractalGuardianRouter,
  kotodamaSpeechRecognition: kotodamaSpeechRecognitionRouter,
  ktts: kttsRouter,
  kde: kdeRouter,
  ases: asesRouter,
  selfEvolution: selfEvolutionRouter,
  selfKnowledge: selfKnowledgeRouter,
  naturalConversation: naturalConversationRouter,
  naturalPresence: naturalPresenceRouter,
  hachiGen: hachiGenRouter,
  presenceGuard: presenceGuardRouter,
  selfBuild: selfBuildRouter,
  autonomousMode: autonomousModeRouter,
  conversationMode: conversationModeRouter,
  sukuyoPersonal: sukuyoPersonalRouter,
  twinCorePersona: twinCorePersonaRouter,
  chatCore: chatCoreRouter,
  newArkBrowser: newArkBrowserRouter,
  translation: translationRouter,
  arkWriter: arkWriterRouter,
  arkSNS: arkSNSRouter,
  arkCinema: arkCinemaRouter,
  lpQa: lpQaRouter,
  fileUpload: fileUploadRouter,
  lpQaV3: lpQaRouterV3, // v3.0: TENMON-ARK人格フルパワー版
  lpQaV3_1: lpQaRouterV3_1, // v3.1: 天聞アーク国家OSレベルの完全実用化
  lpQaV4: lpQaRouterV4, // v4.0: PERSONA UNITY vΩ - ChatOS Persona Engine統合版
  lpFieldTest: lpFieldTestRouter, // MEMORY UNITY vΦ Phase 8: LP実地テスト
  personaUnityTest: personaUnityTestRouter, // MEMORY UNITY vΦ Phase 10: Persona Unity Test vΩ
  embed: embedRouter, // Embed OS: 外部サイト埋め込み管理
  personaMode: personaModeRouter, // Persona Mode: TURBO/NORMAL/QUALITY切替
  siteCrawler: siteCrawlerRouter, // SiteCrawler Engine v1: サイト全体クロール & Semantic Structuring
  planManagement: planManagementRouter, // Plan Management: プラン管理（free, basic, pro, founder）
  asr: asrRouter, // ASR: Whisper Large-v3 音声文字起こし
  customArks: customArksRouter, // Custom TENMON-ARK: ユーザー独自のARKパーソナリティ作成・管理
  founderFeedback: founderFeedbackRouter, // Founder Feedback Center: Founderプラン専用フィードバック機能
  lpQaSimple: lpQaRouterSimple, // LP Q&A Simple: シンプルなLP用Q&Aチャット
  lpQaStream: lpQaRouterStream, // LP Q&A Stream: ストリーミング対応のLP用Q&Aチャット
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ========================================
  // PUBLIC LAYER ROUTERS
  // ========================================

  plans: router({
    list: publicProcedure.query(async () => {
      return db.getAllPlans();
    }),
    getByName: publicProcedure
      .input(z.object({ name: z.enum(["free", "basic", "pro"]) }))
      .query(async ({ input }) => {
        return db.getPlanByName(input.name);
      }),
  }),

  subscription: router({
    getMy: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserSubscription(ctx.user.id);
    }),
    create: protectedProcedure
      .input(
        z.object({
          planName: z.enum(["free", "basic", "pro"]),
          stripeCustomerId: z.string().optional(),
          stripeSubscriptionId: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Get plan ID from database
        const plan = await db.getPlanByName(input.planName);
        if (!plan) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Plan not found: ${input.planName}`,
          });
        }
        
        await db.createSubscription({
          userId: ctx.user.id,
          planId: plan.id,
          planName: input.planName,
          stripeCustomerId: input.stripeCustomerId,
          stripeSubscriptionId: input.stripeSubscriptionId,
        });
        return { success: true };
      }),
    createCheckout: protectedProcedure
      .input(z.object({ planName: z.enum(["basic", "pro"]) }))
      .mutation(async ({ ctx, input }) => {
        const product = PRODUCTS[input.planName];
        if (!product || !product.priceId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid plan or price ID not configured",
          });
        }

        const origin = ctx.req.headers.origin || `${ctx.req.protocol}://${ctx.req.get("host")}`;

        const checkoutUrl = await stripeService.createCheckoutSession({
          userId: ctx.user.id,
          userEmail: ctx.user.email || "",
          userName: ctx.user.name || "",
          priceId: product.priceId,
          origin,
        });

        return { checkoutUrl };
      }),
    createPortal: protectedProcedure.mutation(async ({ ctx }) => {
      const subscription = await db.getUserSubscription(ctx.user.id);
      if (!subscription || !subscription.stripeCustomerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active subscription found",
        });
      }

      const origin = ctx.req.headers.origin || `${ctx.req.protocol}://${ctx.req.get("host")}`;

      const portalUrl = await stripeService.createPortalSession({
        customerId: subscription.stripeCustomerId,
        origin,
      });

      return { portalUrl };
    }),
    cancel: protectedProcedure.mutation(async ({ ctx }) => {
      const subscription = await db.getUserSubscription(ctx.user.id);
      if (!subscription || !subscription.stripeSubscriptionId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active subscription found",
        });
      }

      await stripeService.cancelSubscription(subscription.stripeSubscriptionId);
      return { success: true };
    }),
  }),

  conversations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserConversations(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({ title: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const conversationId = await db.createConversation({
          userId: ctx.user.id,
          title: input.title,
        });
        return { conversationId };
      }),
    getMessages: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input }) => {
        return db.getConversationMessages(input.conversationId);
      }),
    delete: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteConversation(input.conversationId);
        return { success: true };
      }),
  }),



  memory: router({
    getLongTerm: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserLongTermMemories(ctx.user.id);
    }),
    getMediumTerm: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserMediumTermMemories(ctx.user.id);
    }),
  }),

  knowledge: router({
    search: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        return db.searchKnowledgeBase(input.query);
      }),
  }),

  // ========================================
  // DEVELOPER LAYER ROUTERS (完全分離)
  // ========================================

  developer: router({
    // Developer authentication via API key
    auth: publicProcedure
      .input(z.object({ apiKey: z.string() }))
      .query(async ({ input }) => {
        const devUser = await db.getDeveloperUserByApiKey(input.apiKey);
        if (!devUser) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid API key",
          });
        }
        return devUser;
      }),

    // 統合解析（複数のロジックを組み合わせた高度な解析）
    integratedAnalysis: publicProcedure
      .input(z.object({ apiKey: z.string(), query: z.string() }))
      .query(async ({ input }) => {
        const devUser = await db.getDeveloperUserByApiKey(input.apiKey);
        if (!devUser) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid API key",
          });
        }

        const { integratedAnalysis } = await import("./developerCore");
        return integratedAnalysis(devUser.id, input.query);
      }),

    // 天津金木構造解析
    tenshinKinoki: router({
      getStructure: publicProcedure
        .input(z.object({ structureId: z.number().min(1).max(50) }))
        .query(async ({ input }) => {
          return db.getTenshinKinokiStructure(input.structureId);
        }),
      getAllStructures: publicProcedure.query(async () => {
        return db.getAllTenshinKinokiStructures();
      }),
    }),

    // カタカムナ80首
    katakamuna: router({
      getUta: publicProcedure
        .input(z.object({ utaNumber: z.number().min(1).max(80) }))
        .query(async ({ input }) => {
          return db.getKatakamuna(input.utaNumber);
        }),
    }),

    // 宿曜秘伝
    sukuyo: router({
      getSecret: publicProcedure
        .input(z.object({ nakshatra: z.string() }))
        .query(async ({ input }) => {
          return db.getSukuyoSecret(input.nakshatra);
        }),
      analyzeNuclearCoordinate: publicProcedure
        .input(z.object({ birthData: z.string() }))
        .mutation(async ({ input }) => {
          // TODO: Implement nuclear coordinate calculation
          return { coordinate: "実装予定" };
        }),
    }),

    // T-Scalp Engine
    tscalp: router({
      getPatterns: publicProcedure.query(async () => {
        return db.getTscalpPatterns();
      }),
      analyze: publicProcedure
        .input(z.object({ data: z.string() }))
        .mutation(async ({ input }) => {
          // TODO: Implement T-Scalp analysis
          return { analysis: "実装予定" };
        }),
    }),

    // Developer Knowledge Base
    knowledge: router({
      search: publicProcedure
        .input(z.object({ query: z.string() }))
        .query(async ({ input }) => {
          return db.searchDeveloperKnowledge(input.query);
        }),
    }),
  }),

  // ========================================
  // AMATSU KANAGI ENGINE (天津金木演算エンジン)
  // ========================================

  amatsuKanagi: router({
    // 天津金木パターン解析
    analyze: publicProcedure
      .input(z.object({ text: z.string() }))
      .mutation(async ({ input }) => {
        return amatsuKanagiEngine.analyzeAmatsuKanagi(input.text);
      }),

    // 番号でパターンを取得
    getPattern: publicProcedure
      .input(z.object({ number: z.number().min(1).max(50) }))
      .query(async ({ input }) => {
        return amatsuKanagiEngine.getPatternByNumber(input.number);
      }),

    // すべてのパターンを取得
    getAllPatterns: publicProcedure.query(async () => {
      return amatsuKanagiEngine.getAllPatterns();
    }),

    // すべての基本動作を取得
    getAllBasicMovements: publicProcedure.query(async () => {
      return amatsuKanagiEngine.getAllBasicMovements();
    }),
  }),

  // ========================================
  // TWIN-CORE ENGINE (天津金木 × いろは言灵解統合エンジン)
  // ========================================

  twinCore: router({
    // Twin-Core推論チェーン解析
    analyze: publicProcedure
      .input(z.object({ text: z.string() }))
      .mutation(async ({ input }) => {
        return await executeTwinCoreReasoning(input.text);
      }),
  }),

  // ========================================
  // CUSTOM ARK (CustomGPT互換)
  // ========================================

  customArk: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserCustomArks(ctx.user.id);
    }),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(200),
          description: z.string().optional(),
          systemPrompt: z.string().min(1),
          knowledgeBase: z.string().optional(),
          isPublic: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Pro/Founder/Devプランのみ作成可能
        if (!['pro', 'founder', 'dev'].includes(ctx.user.plan)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Custom ARK is only available for Pro, Founder, and Dev plans",
          });
        }

        // Proプランは10個まで
        if (ctx.user.plan === 'pro') {
          const existingArks = await db.getUserCustomArks(ctx.user.id);
          if (existingArks.length >= 10) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Pro plan allows up to 10 Custom ARKs. Upgrade to Founder for unlimited.",
            });
          }
        }

        await db.createCustomArk({
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          systemPrompt: input.systemPrompt,
          knowledgeBase: input.knowledgeBase,
          isPublic: input.isPublic,
        });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteCustomArk(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ========================================
  // IROHA KOTODAMA ENGINE (いろは言霊解析エンジン)
  // ========================================

  iroha: router({
    // いろは言霊解析
    analyze: publicProcedure
      .input(z.object({ text: z.string() }))
      .mutation(async ({ input }) => {
        return irohaEngine.analyzeIroha(input.text);
      }),

    // 順序番号でいろは文字を取得
    getByOrder: publicProcedure
      .input(z.object({ order: z.number().min(1).max(47) }))
      .query(async ({ input }) => {
        return irohaEngine.getIrohaByOrder(input.order);
      }),

    // すべてのいろは言霊解を取得
    getAll: publicProcedure.query(async () => {
      return irohaEngine.getAllIrohaInterpretations();
    }),
  }),
});

export type AppRouter = typeof appRouter;
