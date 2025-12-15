/**
 * ============================================================
 *  PLAN MATRIX — プラン別機能マッピング
 * ============================================================
 * 
 * プラン別の機能マトリックスを生成
 * 
 * プラン:
 * - Free: 基本機能
 * - Basic: 標準機能
 * - Pro: 全機能
 * - Founder: 特別機能
 * ============================================================
 */

export interface PlanFeature {
  id: string;
  name: string;
  description: string;
  category: "core" | "advanced" | "enterprise" | "founder";
}

export interface PlanMatrix {
  planId: string;
  planName: string;
  price: number;
  features: PlanFeature[];
  limits: {
    dailyMessages: number | null;
    fileUploads: number | null;
    fileStorageBytes: number | null;
    conversations: number | null;
    memoryItems: number | null;
  };
  flags: {
    canUseFileUpload: boolean;
    canUseMemorySave: boolean;
    canUseKnowledgeEngine: boolean;
    canUseULCE: boolean;
    canUseArkBrowser: boolean;
    canUseMT5Trading: boolean;
    canUseFounderFeatures: boolean;
    canUseUniverseOS: boolean;
    canUseReishoPipeline: boolean;
    canUseConsciousMesh: boolean;
    canUseFractalOvercompression: boolean;
  };
  performance: {
    responseSpeedMultiplier: number;
    thinkingDepthLevel: number;
    twinCoreAnalysisDepth: number;
  };
}

/**
 * プランマトリックスを生成
 */
export function generatePlanMatrix(): Record<string, PlanMatrix> {
  return {
    free: {
      planId: "free",
      planName: "Free",
      price: 0,
      features: [
        { id: "chat", name: "基本的なチャット機能", description: "月30メッセージまで", category: "core" },
        { id: "kotodama-light", name: "言靈モード", description: "基本的な言靈解析", category: "core" },
        { id: "twin-core-light", name: "Twin-Core Light", description: "軽量推論エンジン", category: "core" },
      ],
      limits: {
        dailyMessages: 3,
        fileUploads: 0,
        fileStorageBytes: 0,
        conversations: 10,
        memoryItems: 50,
      },
      flags: {
        canUseFileUpload: false,
        canUseMemorySave: false,
        canUseKnowledgeEngine: false,
        canUseULCE: false,
        canUseArkBrowser: false,
        canUseMT5Trading: false,
        canUseFounderFeatures: false,
        canUseUniverseOS: false,
        canUseReishoPipeline: false,
        canUseConsciousMesh: false,
        canUseFractalOvercompression: false,
      },
      performance: {
        responseSpeedMultiplier: 100,
        thinkingDepthLevel: 1,
        twinCoreAnalysisDepth: 1,
      },
    },
    basic: {
      planId: "basic",
      planName: "Basic",
      price: 6000,
      features: [
        { id: "chat-unlimited", name: "チャット無制限", description: "無制限のチャット機能", category: "core" },
        { id: "twin-core-advanced", name: "Twin-Core Advanced", description: "高度な推論エンジン", category: "advanced" },
        { id: "kotodama-full", name: "言靈解析フル解放", description: "完全な言靈解析", category: "advanced" },
        { id: "sukuyo-full", name: "宿曜解析フル解放", description: "完全な宿曜解析", category: "advanced" },
        { id: "external-integration", name: "外部アプリ連携", description: "WordPress/Slack/Notion連携", category: "advanced" },
        { id: "universe-os", name: "Universe OS", description: "Universe OS 基本機能", category: "advanced" },
        { id: "reisho-pipeline", name: "Reishō Pipeline", description: "Reishō Pipeline 基本機能", category: "advanced" },
      ],
      limits: {
        dailyMessages: null,
        fileUploads: 100,
        fileStorageBytes: 10 * 1024 * 1024 * 1024, // 10GB
        conversations: null,
        memoryItems: 1000,
      },
      flags: {
        canUseFileUpload: true,
        canUseMemorySave: true,
        canUseKnowledgeEngine: true,
        canUseULCE: false,
        canUseArkBrowser: false,
        canUseMT5Trading: false,
        canUseFounderFeatures: false,
        canUseUniverseOS: true,
        canUseReishoPipeline: true,
        canUseConsciousMesh: false,
        canUseFractalOvercompression: false,
      },
      performance: {
        responseSpeedMultiplier: 120,
        thinkingDepthLevel: 2,
        twinCoreAnalysisDepth: 2,
      },
    },
    pro: {
      planId: "pro",
      planName: "Pro",
      price: 29800,
      features: [
        { id: "all-basic", name: "Basic機能すべて", description: "Basicプランの全機能", category: "core" },
        { id: "video-generation", name: "動画生成", description: "AI動画生成機能", category: "enterprise" },
        { id: "music-generation", name: "音楽生成", description: "AI音楽生成機能", category: "enterprise" },
        { id: "auto-posting", name: "自動投稿", description: "SNS自動投稿機能", category: "enterprise" },
        { id: "sns-management", name: "SNS運用", description: "SNS運用管理機能", category: "enterprise" },
        { id: "trading-module", name: "Tradingモジュール", description: "MT5/市場分析", category: "enterprise" },
        { id: "ulce", name: "ULCE", description: "Universal Language Engine", category: "enterprise" },
        { id: "fractal-os", name: "FractalOS", description: "Fractal OS 完全解放", category: "enterprise" },
        { id: "soul-sync", name: "SoulSync", description: "Soul Sync 完全解放", category: "enterprise" },
        { id: "universe-os-full", name: "Universe OS 完全機能", description: "Universe OS 全機能", category: "enterprise" },
        { id: "conscious-mesh", name: "Conscious Mesh", description: "Conscious Mesh 機能", category: "enterprise" },
        { id: "fractal-overcompression", name: "Fractal Overcompression", description: "Fractal 過圧縮機能", category: "enterprise" },
      ],
      limits: {
        dailyMessages: null,
        fileUploads: null,
        fileStorageBytes: null,
        conversations: null,
        memoryItems: null,
      },
      flags: {
        canUseFileUpload: true,
        canUseMemorySave: true,
        canUseKnowledgeEngine: true,
        canUseULCE: true,
        canUseArkBrowser: true,
        canUseMT5Trading: true,
        canUseFounderFeatures: false,
        canUseUniverseOS: true,
        canUseReishoPipeline: true,
        canUseConsciousMesh: true,
        canUseFractalOvercompression: true,
      },
      performance: {
        responseSpeedMultiplier: 150,
        thinkingDepthLevel: 4,
        twinCoreAnalysisDepth: 4,
      },
    },
    founder: {
      planId: "founder",
      planName: "Founder's Edition",
      price: 0, // 特別価格
      features: [
        { id: "all-pro", name: "Pro機能すべて", description: "Proプランの全機能", category: "core" },
        { id: "founder-features", name: "Founder専用機能", description: "Founder専用の特別機能", category: "founder" },
        { id: "early-access", name: "早期アクセス", description: "新機能への早期アクセス", category: "founder" },
        { id: "priority-support", name: "優先サポート", description: "優先的なサポート", category: "founder" },
        { id: "universe-os-extension", name: "Universe OS Extension", description: "Universe OS 拡張機能", category: "founder" },
        { id: "quantum-memory", name: "Quantum Memory v3", description: "Quantum Memory v3", category: "founder" },
        { id: "hyperseed-generator", name: "Hyperseed Generator", description: "Hyperseed Generator", category: "founder" },
      ],
      limits: {
        dailyMessages: null,
        fileUploads: null,
        fileStorageBytes: null,
        conversations: null,
        memoryItems: null,
      },
      flags: {
        canUseFileUpload: true,
        canUseMemorySave: true,
        canUseKnowledgeEngine: true,
        canUseULCE: true,
        canUseArkBrowser: true,
        canUseMT5Trading: true,
        canUseFounderFeatures: true,
        canUseUniverseOS: true,
        canUseReishoPipeline: true,
        canUseConsciousMesh: true,
        canUseFractalOvercompression: true,
      },
      performance: {
        responseSpeedMultiplier: 200,
        thinkingDepthLevel: 5,
        twinCoreAnalysisDepth: 5,
      },
    },
  };
}

/**
 * プランマトリックスをJSON形式でエクスポート
 */
export function exportPlanMatrixForLP(): string {
  const matrix = generatePlanMatrix();
  return JSON.stringify(matrix, null, 2);
}

export default {
  generatePlanMatrix,
  exportPlanMatrixForLP,
};

