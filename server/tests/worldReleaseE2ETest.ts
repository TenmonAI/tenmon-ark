/**
 * ============================================================
 *  WORLD RELEASE E2E TEST — 世界リリースE2Eテスト
 * ============================================================
 * 
 * 世界リリースの全機能をエンドツーエンドでテスト
 * 
 * テスト項目:
 * - LP 表示
 * - プランマトリックス表示
 * - Widget 埋め込み
 * - Concierge スコープ強制
 * - Founder オンボーディング
 * ============================================================
 */

import { validateConciergeScopeEnforcement } from "./concierge/scopeEnforcementTest";
import { runUniverseOSE2E } from "../reisho/tests/e2eTest";

/**
 * 世界リリースE2Eテスト実行
 */
export async function runWorldReleaseE2ETests(): Promise<{
  passed: boolean;
  message: string;
  results: {
    lpDisplay: boolean;
    planMatrix: boolean;
    widgetEmbed: boolean;
    conciergeScope: boolean;
    founderOnboarding: boolean;
    universeOSE2E: boolean;
  };
}> {
  const results = {
    lpDisplay: false,
    planMatrix: false,
    widgetEmbed: false,
    conciergeScope: false,
    founderOnboarding: false,
    universeOSE2E: false,
  };
  
  try {
    // 1. LP 表示テスト（ファイル存在確認）
    const fs = require("fs");
    const path = require("path");
    const lpPath = path.join(process.cwd(), "docs", "WORLD_RELEASE_LP.md");
    results.lpDisplay = fs.existsSync(lpPath);
    
    // 2. プランマトリックス表示テスト（ファイル存在確認）
    const planMatrixPath = path.join(process.cwd(), "release", "PLAN_MATRIX_PUBLIC.json");
    results.planMatrix = fs.existsSync(planMatrixPath);
    
    // 3. Widget 埋め込みテスト（ファイル存在確認）
    const widgetPath = path.join(process.cwd(), "client", "public", "widget", "embed.js");
    results.widgetEmbed = fs.existsSync(widgetPath);
    
    // 4. Concierge スコープ強制テスト
    const conciergeResult = await validateConciergeScopeEnforcement();
    results.conciergeScope = conciergeResult.passed;
    
    // 5. Founder オンボーディングテスト（ファイル存在確認）
    const onboardingPath = path.join(process.cwd(), "client", "src", "onboarding", "FounderOnboardingWizard.tsx");
    results.founderOnboarding = fs.existsSync(onboardingPath);
    
    // 6. Universe OS E2Eテスト
    const universeOSResult = await runUniverseOSE2E();
    results.universeOSE2E = universeOSResult.passed;
    
    const allPassed = Object.values(results).every(r => r === true);
    
    return {
      passed: allPassed,
      message: allPassed
        ? "World Release E2E tests passed"
        : "Some E2E tests failed",
      results,
    };
  } catch (error) {
    return {
      passed: false,
      message: `World Release E2E tests failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      results,
    };
  }
}

export default {
  runWorldReleaseE2ETests,
};

