/**
 * ============================================================
 *  CONCIERGE SCOPE ENFORCEMENT TEST — Concierge スコープ強制の検証
 * ============================================================
 * 
 * Concierge Persona がサイトスコープを正しく強制しているか検証
 * 
 * 検証項目:
 * - 外部知識の遮断
 * - サイト内知識のみの使用
 * - スコープ外の質問への適切な応答
 * ============================================================
 */

import { buildConciergePrompt } from "../../chat/conciergePersona";
import type { SearchResult } from "../../concierge/semantic/index";

/**
 * Concierge スコープ強制の検証
 */
export async function validateConciergeScopeEnforcement(): Promise<{
  passed: boolean;
  message: string;
  tests: {
    externalKnowledgeBlocked: boolean;
    siteKnowledgeOnly: boolean;
    outOfScopeResponse: boolean;
    promptIsolation: boolean;
  };
}> {
  const tests = {
    externalKnowledgeBlocked: false,
    siteKnowledgeOnly: false,
    outOfScopeResponse: false,
    promptIsolation: false,
  };
  
  try {
    // モック検索結果（サイト内知識のみ）
    const mockSearchResults: SearchResult[] = [
      {
        document: {
          text: "このサイトは TENMON-ARK について説明しています。",
          id: "doc-1",
          siteId: "test-site",
        },
        score: 0.9,
      },
    ];
    
    // Concierge プロンプトを生成
    const prompt = buildConciergePrompt("TENMON-ARKとは何ですか？", mockSearchResults);
    
    // 1. 外部知識の遮断を確認
    tests.externalKnowledgeBlocked = 
      prompt.includes("You MUST ONLY use information from the search results below") &&
      prompt.includes("Do NOT use external knowledge");
    
    // 2. サイト内知識のみの使用を確認
    tests.siteKnowledgeOnly = 
      prompt.includes("site-specific") &&
      prompt.includes("ONLY answers using the content of this website");
    
    // 3. スコープ外の質問への適切な応答を確認
    tests.outOfScopeResponse = 
      prompt.includes("このサイト内には該当情報がありません") ||
      prompt.includes("information is not found on this website");
    
    // 4. プロンプトの隔離を確認
    tests.promptIsolation = 
      !prompt.includes("general knowledge") &&
      !prompt.includes("external information");
    
    const allPassed = Object.values(tests).every(t => t === true);
    
    return {
      passed: allPassed,
      message: allPassed
        ? "Concierge Scope Enforcement validation passed"
        : "Some scope enforcement tests failed",
      tests,
    };
  } catch (error) {
    return {
      passed: false,
      message: `Concierge Scope Enforcement validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      tests,
    };
  }
}

export default {
  validateConciergeScopeEnforcement,
};

