/**
 * ============================================================
 *  ONLINE TO OFFLINE BRIDGE — オンライン→オフライン橋渡し
 * ============================================================
 * 
 * LLM 応答を構文化して再利用可能にする
 * ============================================================
 */

import type { FractalSeed } from "../kokuzo/fractal/seedV2";
import { createSemanticUnit } from "../kokuzo/db/schema/semanticUnit";
import { createFractalSeed } from "../kokuzo/fractal/seedV2";

export interface LLMResponse {
  text: string;
  timestamp: number;
  context?: {
    message: string;
    persona?: string;
    reishoSignature?: any;
  };
}

export interface MicroSeed {
  id: string;
  text: string;
  semanticUnitId: string;
  pattern: string;
  style: string;
  reusable: boolean;
  createdAt: number;
}

/**
 * オンライン→オフライン橋渡し
 */
export class OnlineToOfflineBridge {
  private localKokuzoKernel: any;

  constructor(localKokuzoKernel: any) {
    this.localKokuzoKernel = localKokuzoKernel;
  }

  /**
   * LLM 応答をフックして構文化
   */
  async hookLLMResponse(response: LLMResponse): Promise<void> {
    // 1. Semantic Engine を通す
    const semanticUnit = await this.pipeThroughSemanticEngine(response);

    // 2. Fractal Engine を通す
    const microSeed = await this.pipeThroughFractalEngine(semanticUnit, response);

    // 3. ローカル Kokūzō Seed Bundle に保存
    await this.storeMicroSeedInLocalKokuzo(microSeed);

    // 4. 再利用可能なパターンとしてマーク
    await this.markAsReusableOfflinePattern(microSeed);
  }

  /**
   * Semantic Engine を通す
   */
  private async pipeThroughSemanticEngine(
    response: LLMResponse
  ): Promise<any> {
    const semanticUnit = createSemanticUnit({
      id: `unit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: response.text,
      metadata: {
        source: "llm_response",
        sourceId: `response-${response.timestamp}`,
        position: { start: 0, end: response.text.length },
        tags: this.extractTags(response.text),
      },
    });

    // ローカル Kokūzō Kernel に保存
    await this.localKokuzoKernel.saveSemanticUnit(semanticUnit);

    return semanticUnit;
  }

  /**
   * Fractal Engine を通す
   */
  private async pipeThroughFractalEngine(
    semanticUnit: any,
    response: LLMResponse
  ): Promise<MicroSeed> {
    // マイクロシードを生成
    const microSeed: MicroSeed = {
      id: `micro-seed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: response.text,
      semanticUnitId: semanticUnit.id,
      pattern: this.extractPattern(response.text),
      style: response.context?.persona || "default",
      reusable: true,
      createdAt: Date.now(),
    };

    return microSeed;
  }

  /**
   * ローカル Kokūzō Seed Bundle に保存
   */
  private async storeMicroSeedInLocalKokuzo(microSeed: MicroSeed): Promise<void> {
    // 実際の実装では、ローカル Kokūzō Kernel にマイクロシードを保存
    // await this.localKokuzoKernel.saveMicroSeed(microSeed);
  }

  /**
   * 再利用可能なオフラインパターンとしてマーク
   */
  private async markAsReusableOfflinePattern(microSeed: MicroSeed): Promise<void> {
    // 実際の実装では、再利用可能なパターンとしてマーク
    // await this.localKokuzoKernel.markAsReusablePattern(microSeed.id);
  }

  /**
   * テキストからタグを抽出
   */
  private extractTags(text: string): string[] {
    // 簡単なタグ抽出（実際の実装ではより高度な処理）
    const words = text.split(/\s+/);
    return words.filter((w) => w.length > 3).slice(0, 5);
  }

  /**
   * テキストからパターンを抽出
   */
  private extractPattern(text: string): string {
    // 簡単なパターン抽出（実際の実装ではより高度な処理）
    return text.replace(/\{[^}]+\}/g, "{VAR}");
  }
}

/**
 * Atlas Router にフックを追加
 */
export function addLLMResponseHookToAtlasRouter(
  bridge: OnlineToOfflineBridge
): void {
  // 実際の実装では、Atlas Router の応答生成後にフックを呼び出す
  // atlasChatRouter.chat.mutation(async ({ ctx, input }) => {
  //   const response = await originalChatLogic(ctx, input);
  //   await bridge.hookLLMResponse({
  //     text: response.text,
  //     timestamp: Date.now(),
  //     context: {
  //       message: input.message,
  //       persona: input.persona,
  //     },
  //   });
  //   return response;
  // });
}

export default OnlineToOfflineBridge;

