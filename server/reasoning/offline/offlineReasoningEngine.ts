/**
 * ============================================================
 *  OFFLINE REASONING ENGINE — オフライン推論エンジン
 * ============================================================
 * 
 * オフライン時の推論処理
 * ============================================================
 */

import { executeTwinCoreReasoning } from "../../twinCoreEngine";
import type { FractalSeed } from "../../kokuzo/fractal/seedV2";

export interface OfflineReasoningInput {
  message: string;
  context?: {
    recentSeeds?: FractalSeed[];
    localMemory?: any[];
  };
}

export interface OfflineReasoningOutput {
  response: string;
  reasoning: {
    steps: Array<{
      type: string;
      content: string;
      timestamp: string;
    }>;
    finalThought: string;
  };
  usedLocalLLM: boolean;
  usedTemplate: boolean;
}

/**
 * オフライン推論エンジン
 */
export class OfflineReasoningEngine {
  private isOffline: boolean = false;
  private localLLMAvailable: boolean = false;

  /**
   * オフラインモードを設定
   */
  setOfflineMode(offline: boolean): void {
    this.isOffline = offline;
  }

  /**
   * ローカル LLM の可用性を設定
   */
  setLocalLLMAvailable(available: boolean): void {
    this.localLLMAvailable = available;
  }

  /**
   * オフライン推論を実行
   */
  async executeOfflineReasoning(
    input: OfflineReasoningInput
  ): Promise<OfflineReasoningOutput> {
    // 1. ローカル LLM が利用可能な場合
    if (this.localLLMAvailable) {
      try {
        return await this.executeWithLocalLLM(input);
      } catch (error) {
        console.error("Local LLM failed, falling back to template:", error);
        // フォールバック: テンプレートベース
        return await this.executeWithTemplate(input);
      }
    }

    // 2. テンプレートベースの応答
    return await this.executeWithTemplate(input);
  }

  /**
   * ローカル LLM を使用した推論
   */
  private async executeWithLocalLLM(
    input: OfflineReasoningInput
  ): Promise<OfflineReasoningOutput> {
    // 実際の実装では、ローカル LLM（例: Ollama, LM Studio）を使用
    // ここでは TwinCore と FractalEngine を使用した推論を実行
    
    try {
      const reasoningResult = await executeTwinCoreReasoning({
        message: input.message,
        context: input.context,
      });

      return {
        response: reasoningResult.response || this.generateTemplateResponse(input.message),
        reasoning: {
          steps: reasoningResult.steps || [],
          finalThought: reasoningResult.finalThought || "",
        },
        usedLocalLLM: true,
        usedTemplate: false,
      };
    } catch (error) {
      console.error("TwinCore reasoning failed:", error);
      throw error;
    }
  }

  /**
   * テンプレートベースの応答生成
   */
  private async executeWithTemplate(
    input: OfflineReasoningInput
  ): Promise<OfflineReasoningOutput> {
    const response = this.generateTemplateResponse(input.message);

    return {
      response,
      reasoning: {
        steps: [
          {
            type: "template",
            content: "Using template-based response generation",
            timestamp: new Date().toISOString(),
          },
        ],
        finalThought: "Offline mode: Using template-based response",
      },
      usedLocalLLM: false,
      usedTemplate: true,
    };
  }

  /**
   * テンプレートベースの応答を生成
   */
  private generateTemplateResponse(message: string): string {
    // シンプルなテンプレートベースの応答
    const templates = [
      "オフラインモードです。メッセージを確認しました: " + message,
      "現在オフラインのため、完全な推論はできませんが、メッセージを受け取りました。",
      "オフライン中です。オンライン復帰後に詳細な回答を提供します。",
    ];

    // メッセージの長さや内容に応じてテンプレートを選択
    const templateIndex = message.length % templates.length;
    return templates[templateIndex] || templates[0];
  }

  /**
   * API が到達不能な場合のフォールバック
   */
  async fallbackWhenAPIUnreachable(
    input: OfflineReasoningInput
  ): Promise<OfflineReasoningOutput> {
    this.setOfflineMode(true);
    return await this.executeOfflineReasoning(input);
  }
}

export default OfflineReasoningEngine;

