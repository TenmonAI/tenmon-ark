/**
 * ============================================================
 *  OFFLINE STRUCTURAL GENERATOR — オフライン構文生成エンジン
 * ============================================================
 * 
 * LLM なしで構文を生成（Seed ベース）
 * ============================================================
 */

import type { FractalSeed } from "../../kokuzo/fractal/seedV2";
import type { ReishoSignature } from "../../reisho/reishoKernel";

export interface StructuralOutline {
  sections: Array<{
    title: string;
    content: string;
    seedId?: string;
  }>;
}

export interface SentenceTemplate {
  pattern: string;
  variables: string[];
  style: "formal" | "casual" | "technical" | "creative";
  seedId?: string;
}

export interface OfflineStructuralOutput {
  response: string;
  outline: StructuralOutline;
  usedSeeds: string[];
  usedTemplates: string[];
}

/**
 * オフライン構文生成エンジン
 */
export class OfflineStructuralGenerator {
  private sentenceTemplates: SentenceTemplate[] = [];
  private personaStyle: ReishoSignature | null = null;

  /**
   * Seed からアウトラインを生成
   */
  async generateOutlineFromSeed(seed: FractalSeed): Promise<StructuralOutline> {
    const sections: StructuralOutline["sections"] = [];

    // Seed の mainTags からセクションを生成
    if (seed.mainTags && seed.mainTags.length > 0) {
      for (const tag of seed.mainTags.slice(0, 5)) {
        sections.push({
          title: tag,
          content: this.generateContentFromTag(tag, seed),
          seedId: seed.id,
        });
      }
    } else {
      // タグがない場合はデフォルトセクション
      sections.push({
        title: "Response",
        content: this.generateDefaultContent(seed),
        seedId: seed.id,
      });
    }

    return { sections };
  }

  /**
   * タグからコンテンツを生成
   */
  private generateContentFromTag(tag: string, seed: FractalSeed): string {
    // シンプルなテンプレートベースの生成
    const templates = [
      `このトピック「${tag}」について、重要なポイントがあります。`,
      `「${tag}」に関連して、以下の点が重要です。`,
      `「${tag}」について、現在の理解を共有します。`,
    ];

    const templateIndex = tag.length % templates.length;
    return templates[templateIndex] || templates[0];
  }

  /**
   * デフォルトコンテンツを生成
   */
  private generateDefaultContent(seed: FractalSeed): string {
    return "オフラインモードです。Seed から構文を生成しました。";
  }

  /**
   * 過去の回答とスタイルから文テンプレートを生成
   */
  async generateSentenceTemplatesFromPastAnswers(
    pastAnswers: Array<{ text: string; style: string }>,
    style: string
  ): Promise<SentenceTemplate[]> {
    const templates: SentenceTemplate[] = [];

    // 過去の回答からパターンを抽出
    for (const answer of pastAnswers) {
      if (answer.style === style) {
        // 簡単なパターン抽出（実際の実装ではより高度な処理）
        const pattern = this.extractPattern(answer.text);
        templates.push({
          pattern,
          variables: this.extractVariables(pattern),
          style: style as SentenceTemplate["style"],
        });
      }
    }

    this.sentenceTemplates = templates;
    return templates;
  }

  /**
   * テキストからパターンを抽出
   */
  private extractPattern(text: string): string {
    // 簡単なパターン抽出（実際の実装ではより高度な処理）
    return text.replace(/\{[^}]+\}/g, "{VAR}");
  }

  /**
   * パターンから変数を抽出
   */
  private extractVariables(pattern: string): string[] {
    const matches = pattern.match(/\{([^}]+)\}/g);
    return matches ? matches.map((m) => m.slice(1, -1)) : [];
  }

  /**
   * Reishō Kernel を使用して Persona スタイルオーバーレイを適用
   */
  applyPersonaStyleOverlay(
    outline: StructuralOutline,
    reishoSignature: ReishoSignature
  ): StructuralOutline {
    this.personaStyle = reishoSignature;

    // Reishō シグネチャに基づいてスタイルを調整
    const adjustedSections = outline.sections.map((section) => {
      // Fire/Water バランスに基づいてスタイルを調整
      const fireWaterBalance = reishoSignature.unifiedFireWaterTensor?.[0] || 0.5;
      
      if (fireWaterBalance > 0.6) {
        // Fire 優勢: より積極的・直接的
        section.content = `【重要】${section.content}`;
      } else if (fireWaterBalance < 0.4) {
        // Water 優勢: より柔らかく・丁寧
        section.content = `${section.content}（詳細は後ほど）`;
      }

      return section;
    });

    return { sections: adjustedSections };
  }

  /**
   * オフライン構文を生成（LLM が利用できない場合のフォールバック）
   */
  async generateOfflineStructural(
    message: string,
    seeds: FractalSeed[],
    reishoSignature?: ReishoSignature
  ): Promise<OfflineStructuralOutput> {
    // 最も関連性の高い Seed を選択
    const relevantSeed = this.selectRelevantSeed(message, seeds);

    if (!relevantSeed) {
      // Seed が見つからない場合はデフォルト応答
      return {
        response: "オフラインモードです。関連する Seed が見つかりませんでした。",
        outline: { sections: [] },
        usedSeeds: [],
        usedTemplates: [],
      };
    }

    // アウトラインを生成
    let outline = await this.generateOutlineFromSeed(relevantSeed);

    // Persona スタイルを適用
    if (reishoSignature) {
      outline = this.applyPersonaStyleOverlay(outline, reishoSignature);
    }

    // 応答テキストを生成
    const response = outline.sections
      .map((s) => `${s.title}\n${s.content}`)
      .join("\n\n");

    return {
      response,
      outline,
      usedSeeds: [relevantSeed.id],
      usedTemplates: [],
    };
  }

  /**
   * メッセージに関連する Seed を選択
   */
  private selectRelevantSeed(
    message: string,
    seeds: FractalSeed[]
  ): FractalSeed | null {
    // 簡単なキーワードマッチング（実際の実装ではより高度な処理）
    const messageLower = message.toLowerCase();
    
    for (const seed of seeds) {
      if (seed.mainTags) {
        for (const tag of seed.mainTags) {
          if (messageLower.includes(tag.toLowerCase())) {
            return seed;
          }
        }
      }
    }

    // マッチしない場合は最初の Seed を返す
    return seeds.length > 0 ? seeds[0] : null;
  }
}

export default OfflineStructuralGenerator;

