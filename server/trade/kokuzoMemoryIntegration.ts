/**
 * ============================================================
 *  KOKŪZŌ MEMORY INTEGRATION — 禁止構文保存
 * ============================================================
 * 
 * 制約:
 * - 禁止構文を Kokūzō Memory に保存
 * - Event-Sourcing 対応
 * 
 * フェーズ T-1: 観測のみ（取引命令は送らない）
 * ============================================================
 */

import { createEventLogStore, type KzEvent } from "../kokuzo/offline/eventLogStore";
import { saveSemanticUnit } from "../kokuzo/db/adapter";
import type { SemanticUnit } from "../../drizzle/kokuzoSchema";
import type { InsertSemanticUnit } from "../../drizzle/kokuzoSchema";

/**
 * 禁止構文の種類
 */
export type ProhibitedPatternType =
  | "SATURATION_EXCEEDED"
  | "MARKET_STATE_BROKEN"
  | "LOSS_QUALITY_DANGEROUS"
  | "ENTRY_REJECTED";

/**
 * 禁止構文
 */
export interface ProhibitedPattern {
  type: ProhibitedPatternType;
  symbol: string;
  price: number;
  direction?: "BUY" | "SELL";
  reason: string;
  timestamp: number;
  context?: Record<string, any>;
}

/**
 * Kokūzō Memory Integration
 * 
 * 禁止構文を Kokūzō Memory に保存
 */
export class KokuzoMemoryIntegration {
  private eventStore = createEventLogStore();

  /**
   * 禁止構文を Kokūzō Memory に保存
   */
  async saveProhibitedPattern(
    pattern: ProhibitedPattern
  ): Promise<void> {
    // Event-Sourcing: イベントを記録
    await this.eventStore.append({
      kind: "offlineMutation",
      timestamp: pattern.timestamp,
      data: {
        type: "prohibitedPattern",
        pattern,
      },
    });

    // SemanticUnit として保存
    const semanticUnit: SemanticUnit = {
      id: `prohibited-${pattern.timestamp}-${Math.random().toString(36).substr(2, 9)}`,
      text: this.patternToContent(pattern),
      embedding: undefined,
      metadata: {
        type: "prohibitedPattern",
        kotodamaSignature: this.patternToKotodamaSignature(pattern),
        pattern,
      },
      reishoSignature: undefined,
      importance: 50,
      createdAt: new Date(pattern.timestamp),
      updatedAt: new Date(pattern.timestamp),
    };

    await saveSemanticUnit(semanticUnit);
  }

  /**
   * 禁止構文を Kotodama Signature に変換
   */
  private patternToKotodamaSignature(
    pattern: ProhibitedPattern
  ): string {
    const parts: string[] = [
      pattern.type,
      pattern.symbol,
      pattern.reason,
    ];

    if (pattern.direction) {
      parts.push(pattern.direction);
    }

    return parts.join(":");
  }

  /**
   * 禁止構文をコンテンツに変換
   */
  private patternToContent(pattern: ProhibitedPattern): string {
    const parts: string[] = [
      `禁止構文: ${pattern.type}`,
      `シンボル: ${pattern.symbol}`,
      `価格: ${pattern.price}`,
      `理由: ${pattern.reason}`,
    ];

    if (pattern.direction) {
      parts.push(`方向: ${pattern.direction}`);
    }

    if (pattern.context) {
      parts.push(`コンテキスト: ${JSON.stringify(pattern.context)}`);
    }

    return parts.join("\n");
  }

  /**
   * 禁止構文を検索
   */
  async searchProhibitedPatterns(
    symbol?: string,
    type?: ProhibitedPatternType
  ): Promise<ProhibitedPattern[]> {
    // Event-Sourcing: イベントを再生
    const events = await this.eventStore.replay(0);
    const patterns: ProhibitedPattern[] = [];

    for (const event of events) {
      if (
        event.kind === "offlineMutation" &&
        event.data?.type === "prohibitedPattern"
      ) {
        const pattern = event.data.pattern as ProhibitedPattern;

        if (symbol && pattern.symbol !== symbol) {
          continue;
        }

        if (type && pattern.type !== type) {
          continue;
        }

        patterns.push(pattern);
      }
    }

    return patterns;
  }
}

export default KokuzoMemoryIntegration;

