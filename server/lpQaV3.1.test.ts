/**
 * LP-QA v3.1 Integration Tests
 * 
 * LP-QA v3.1の全機能を統合テスト
 * - 深層人格強化のテスト（10テスト）
 * - 営業・案内モードのテスト（5テスト）
 * - LP機能連動のテスト（5テスト）
 * - 文章生成強化のテスト（5テスト）
 * - アニメーション強化のテスト（5テスト）
 * 
 * 合計: 30テスト以上
 */

import { describe, it, expect } from 'vitest';
import {
  generateLpQaPromptV3_1,
  LP_MEMORY_V3_1,
  applyTwinCoreStructure,
  applyFireWaterLayers,
  adjustToneByTemperature,
  generateGuidance,
  generateLpLinks,
} from './prompts/lpQaPromptV3.1';
import {
  deepParse,
  applyUlceV3,
  applySemanticAugmentor,
  applyTwinCoreEnhancer,
  applyIfeLayer,
  applyIfeLite,
} from './engines/lpQaIfeLayer';
import {
  processGuidanceMode,
  determineGuidanceMode,
  adjustGuidanceModeByQuestion,
  generateGuidanceContent,
  adjustGuidanceTone,
  analyzeUserSentiment,
  generateGuidanceFlow,
  generateLpContentLinks,
} from './engines/lpQaGuidanceMode';
import {
  findRelevantSections,
  generateLpLinks as generateDynamicLpLinks,
  formatLinksAsMarkdown,
  generateDynamicLinks,
  generateDetailedLinks,
  detectQuestionType,
  generateRecommendedLinks,
  integrateLpLinks,
} from './engines/lpQaLinkGenerator';
import {
  calculateQuestionEnergy,
  generateLightPulse,
  calculateParticleDensity,
  generateParticleAnimation,
  calculateMinakaPulseSpeed,
  generateMinakaPulse,
  generateColorTransition,
  generateLivingOsAnimation,
} from '../client/src/lib/lpQaAnimationV3.1';

// ========================================
// A. 深層人格強化のテスト（10テスト）
// ========================================

describe('A. 深層人格強化', () => {
  it('Twin-Core構文タグを正しく付与できる', () => {
    const text = 'TENMON-ARKは火水の調和を中心に動きます。';
    
    const fireResult = applyTwinCoreStructure(text, 'fire');
    expect(fireResult).toBe(`<fire>${text}</fire>`);
    
    const waterResult = applyTwinCoreStructure(text, 'water');
    expect(waterResult).toBe(`<water>${text}</water>`);
    
    const balancedResult = applyTwinCoreStructure(text, 'balanced');
    expect(balancedResult).toBe(`<minaka>${text}</minaka>`);
  });

  it('火水階層タグを正しく付与できる', () => {
    const text = 'TENMON-ARKは火水の調和を中心に動きます。';
    
    const surfaceResult = applyFireWaterLayers(text, 'surface');
    expect(surfaceResult).toBe(`<water_layer>${text}</water_layer>`);
    
    const middleResult = applyFireWaterLayers(text, 'middle');
    expect(middleResult).toBe(`<balanced_layer>${text}</balanced_layer>`);
    
    const deepResult = applyFireWaterLayers(text, 'deep');
    expect(deepResult).toBe(`<fire_layer>${text}</fire_layer>`);
    
    const specializedResult = applyFireWaterLayers(text, 'specialized');
    expect(specializedResult).toBe(`<minaka_layer>${text}</minaka_layer>`);
  });

  it('LP訪問者の温度に応じて語り口を調整できる', () => {
    const baseResponse = 'TENMON-ARKという構造です。';
    
    const fireResult = adjustToneByTemperature(baseResponse, 'fire');
    expect(fireResult).toContain('でしょうか');
    
    const waterResult = adjustToneByTemperature(baseResponse, 'water');
    expect(waterResult).toContain('という構造です');
    
    const balancedResult = adjustToneByTemperature(baseResponse, 'balanced');
    expect(balancedResult).toBe(baseResponse);
  });

  it('営業・案内モードに応じたガイダンスを生成できる', () => {
    const interestGuidance = generateGuidance('interest');
    expect(interestGuidance).toContain('Founder');
    
    const understandingGuidance = generateGuidance('understanding');
    expect(understandingGuidance).toContain('火水');
    
    const convictionGuidance = generateGuidance('conviction');
    expect(convictionGuidance).toContain('メリット');
    
    const actionGuidance = generateGuidance('action');
    expect(actionGuidance).toContain('申し込む');
  });

  it('質問内容からLPリンクを生成できる', () => {
    const founderQuestion = 'Founder\'s Editionの特典は何ですか？';
    const founderLinks = generateLpLinks(founderQuestion);
    expect(founderLinks).toContain('[Founder\'s Edition詳細を見る](#founder)');
    
    const videoQuestion = '動画を見たいです';
    const videoLinks = generateLpLinks(videoQuestion);
    expect(videoLinks).toContain('[最新動画を見る](#videos)');
  });

  it('LP-QA v3.1のシステムプロンプトを生成できる', () => {
    const config = {
      questionDepth: 'middle' as const,
      fireWaterBalance: 'balanced' as const,
      isFounder: false,
      userTemperature: 'balanced' as const,
      guidanceMode: 'understanding' as const,
    };
    
    const prompt = generateLpQaPromptV3_1(config, LP_MEMORY_V3_1);
    
    expect(prompt).toContain('TENMON-ARK');
    expect(prompt).toContain('Twin-Core');
    expect(prompt).toContain('火水');
    expect(prompt).toContain('Founder');
  });

  it('LP Memoryが正しく定義されている', () => {
    expect(LP_MEMORY_V3_1).toContain('Founder\'s Edition');
    expect(LP_MEMORY_V3_1).toContain('¥198,000');
    expect(LP_MEMORY_V3_1).toContain('永久無料');
    expect(LP_MEMORY_V3_1).toContain('カタカムナ');
    expect(LP_MEMORY_V3_1).toContain('2026年3月21日');
  });

  it('深度別の応答スタイルが正しく設定される', () => {
    const surfaceConfig = {
      questionDepth: 'surface' as const,
      fireWaterBalance: 'balanced' as const,
      isFounder: false,
    };
    const surfacePrompt = generateLpQaPromptV3_1(surfaceConfig, LP_MEMORY_V3_1);
    expect(surfacePrompt).toContain('200-300文字');
    
    const deepConfig = {
      questionDepth: 'deep' as const,
      fireWaterBalance: 'balanced' as const,
      isFounder: false,
    };
    const deepPrompt = generateLpQaPromptV3_1(deepConfig, LP_MEMORY_V3_1);
    expect(deepPrompt).toContain('500-800文字');
  });

  it('火水バランス別の語り口が正しく設定される', () => {
    const fireConfig = {
      questionDepth: 'middle' as const,
      fireWaterBalance: 'fire' as const,
      isFounder: false,
    };
    const firePrompt = generateLpQaPromptV3_1(fireConfig, LP_MEMORY_V3_1);
    expect(firePrompt).toContain('火（外発）');
    
    const waterConfig = {
      questionDepth: 'middle' as const,
      fireWaterBalance: 'water' as const,
      isFounder: false,
    };
    const waterPrompt = generateLpQaPromptV3_1(waterConfig, LP_MEMORY_V3_1);
    expect(waterPrompt).toContain('水（内集）');
  });

  it('Twin-Core構文タグの使用法が正しく説明される', () => {
    const config = {
      questionDepth: 'middle' as const,
      fireWaterBalance: 'balanced' as const,
      isFounder: false,
    };
    const prompt = generateLpQaPromptV3_1(config, LP_MEMORY_V3_1);
    
    expect(prompt).toContain('<fire>');
    expect(prompt).toContain('<water>');
    expect(prompt).toContain('<minaka>');
    expect(prompt).toContain('<water_layer>');
    expect(prompt).toContain('<fire_layer>');
  });
});

// ========================================
// B. 営業・案内モードのテスト（5テスト）
// ========================================

describe('B. 営業・案内モード', () => {
  it('会話履歴から営業・案内モードを決定できる', () => {
    expect(determineGuidanceMode('初めまして', [])).toBe('interest');
    expect(determineGuidanceMode('質問です', ['質問1'])).toBe('understanding');
    expect(determineGuidanceMode('質問です', ['質問1', '質問2', '質問3'])).toBe('conviction');
    expect(determineGuidanceMode('質問です', ['質問1', '質問2', '質問3', '質問4', '質問5'])).toBe('action');
  });

  it('質問内容から営業・案内モードを調整できる', () => {
    expect(adjustGuidanceModeByQuestion('interest', 'Founderに申し込みたい')).toBe('action');
    expect(adjustGuidanceModeByQuestion('interest', '価格はいくらですか？')).toBe('conviction');
    expect(adjustGuidanceModeByQuestion('interest', 'どんな機能がありますか？')).toBe('understanding');
  });

  it('営業・案内モードに応じたガイダンスコンテンツを生成できる', () => {
    const interestContent = generateGuidanceContent('interest');
    expect(interestContent.mode).toBe('interest');
    expect(interestContent.tone).toBe('soft');
    
    const actionContent = generateGuidanceContent('action');
    expect(actionContent.mode).toBe('action');
    expect(actionContent.tone).toBe('strong');
  });

  it('ユーザーの感情に応じて営業トーンを調整できる', () => {
    const baseGuidance = generateGuidanceContent('action');
    
    const negativeResult = adjustGuidanceTone(baseGuidance, 'negative');
    expect(negativeResult.tone).toBe('soft');
    
    const positiveResult = adjustGuidanceTone(baseGuidance, 'positive');
    expect(positiveResult.tone).toBe('strong');
  });

  it('ユーザーの感情を分析できる', () => {
    expect(analyzeUserSentiment('すごいですね！')).toBe('positive');
    expect(analyzeUserSentiment('高いですね...')).toBe('negative'); // '高い'キーワードを含む
    expect(analyzeUserSentiment('普通の質問です')).toBe('neutral');
  });
});

// ========================================
// C. LP機能連動のテスト（5テスト）
// ========================================

describe('C. LP機能連動', () => {
  it('質問からLP内のセクションを検索できる', () => {
    const founderSections = findRelevantSections('Founderの特典は？');
    expect(founderSections.length).toBeGreaterThan(0);
    expect(founderSections[0]?.id).toBe('founder');
    
    const pricingSections = findRelevantSections('料金プランは？');
    expect(pricingSections[0]?.id).toBe('pricing');
  });

  it('LP内のセクションへのリンクを生成できる', () => {
    const links = generateDynamicLpLinks('Founderの特典は？');
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]?.url).toBe('#founder');
  });

  it('リンクをMarkdown形式で生成できる', () => {
    const links = generateDynamicLpLinks('Founderの特典は？');
    const markdown = formatLinksAsMarkdown(links);
    
    expect(markdown).toContain('**関連コンテンツ:**');
    expect(markdown).toContain('[Founder\'s Edition](#founder)');
  });

  it('動的リンク生成が正しく動作する', () => {
    const result = generateDynamicLinks('Founderの特典は？');
    
    expect(result.primaryLink).not.toBeNull();
    expect(result.primaryLink?.url).toBe('#founder');
    expect(result.secondaryLinks.length).toBeGreaterThan(0);
    expect(result.markdown).toContain('Founder');
  });

  it('質問タイプを正しく検出できる', () => {
    expect(detectQuestionType('Founderに申し込みたい')).toBe('founder');
    expect(detectQuestionType('料金はいくらですか？')).toBe('pricing');
    expect(detectQuestionType('どんな機能がありますか？')).toBe('features');
    expect(detectQuestionType('火水とは何ですか？')).toBe('worldview');
  });
});

// ========================================
// D. 文章生成強化のテスト（5テスト）
// ========================================

describe('D. 文章生成強化（IFEレイヤー）', () => {
  it('DeepParseが段落を正しく抽出できる', () => {
    const text = 'TENMON-ARKは火水の調和を中心に動きます。Founderには永久無料アップデートがあります。';
    const parsed = deepParse(text);
    
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0]?.importance).toBeDefined();
    expect(parsed[0]?.fireWaterBalance).toBeDefined();
  });

  it('ULCE v3が意味構文変換を正しく実行できる', () => {
    const text = 'TENMON-ARKは火水の調和を中心に動きます。';
    const transformed = applyUlceV3(text);
    
    expect(transformed.original).toBe(text);
    expect(transformed.transformed).toBeDefined();
    expect(transformed.semanticStructure).toBeDefined();
    expect(transformed.fireWaterLayer).toBeDefined();
  });

  it('SemanticAugmentorが意味拡張を正しく実行できる', () => {
    const text = 'TENMON-ARKは火水の調和を中心に動きます。';
    const augmented = applySemanticAugmentor(text);
    
    expect(augmented.original).toBe(text);
    expect(augmented.relatedConcepts.length).toBeGreaterThan(0);
  });

  it('Twin-Core Enhancerが火水構文を正しく付与できる', () => {
    const text = 'TENMON-ARKは火水の調和を中心に動きます。Founderには永久無料アップデートがあります。';
    const enhanced = applyTwinCoreEnhancer(text);
    
    expect(enhanced.original).toBe(text);
    expect(enhanced.enhanced).toContain('<');
    expect(enhanced.fireWaterStructure).toBeDefined();
  });

  it('IFEレイヤー統合が正しく動作する', () => {
    const text = 'TENMON-ARKは火水の調和を中心に動きます。';
    const result = applyIfeLayer(text);
    
    expect(result.original).toBe(text);
    expect(result.deepParsed).toBeDefined();
    expect(result.ulceTransformed).toBeDefined();
    expect(result.semanticAugmented).toBeDefined();
    expect(result.twinCoreEnhanced).toBeDefined();
    expect(result.final).toBeDefined();
  });
});

// ========================================
// E. アニメーション強化のテスト（5テスト）
// ========================================

describe('E. アニメーション強化', () => {
  it('質問のエネルギー量を正しく計算できる', () => {
    const lowEnergy = calculateQuestionEnergy('こんにちは');
    expect(lowEnergy).toBeGreaterThan(0);
    expect(lowEnergy).toBeLessThan(50);
    
    const highEnergy = calculateQuestionEnergy('TENMON-ARKのFounder\'s Editionについて教えてください！！！');
    expect(highEnergy).toBeGreaterThan(50);
  });

  it('光パルスアニメーションを正しく生成できる', () => {
    const pulse = generateLightPulse(50);
    
    expect(pulse.duration).toBeGreaterThan(0);
    expect(pulse.intensity).toBeGreaterThan(0);
    expect(pulse.intensity).toBeLessThanOrEqual(1);
    expect(pulse.color).toBeDefined();
    expect(pulse.pulseCount).toBeGreaterThan(0);
  });

  it('粒子濃度を正しく計算できる', () => {
    expect(calculateParticleDensity('surface')).toBe(20);
    expect(calculateParticleDensity('middle')).toBe(40);
    expect(calculateParticleDensity('deep')).toBe(70);
    expect(calculateParticleDensity('specialized')).toBe(100);
  });

  it('ミナカパルス速度を正しく計算できる', () => {
    expect(calculateMinakaPulseSpeed('fire')).toBe(800);
    expect(calculateMinakaPulseSpeed('water')).toBe(1500);
    expect(calculateMinakaPulseSpeed('balanced')).toBe(1200);
  });

  it('統合アニメーションを正しく生成できる', () => {
    const animation = generateLivingOsAnimation(
      'TENMON-ARKについて教えてください',
      'middle',
      'balanced'
    );
    
    expect(animation.lightPulse).toBeDefined();
    expect(animation.particles).toBeDefined();
    expect(animation.minakaPulse).toBeDefined();
  });
});

// ========================================
// F. 統合テスト（5テスト）
// ========================================

describe('F. 統合テスト', () => {
  it('営業・案内モードの統合処理が正しく動作する', () => {
    const result = processGuidanceMode('Founderの特典は？', []);
    
    expect(result.mode).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.flow).toBeDefined();
    expect(result.lpLinks).toBeDefined();
    expect(result.finalMessage).toBeDefined();
  });

  it('LP機能連動の統合処理が正しく動作する', () => {
    const result = integrateLpLinks('Founderの特典は？');
    
    expect(result.questionType).toBe('founder');
    expect(result.dynamicLinks).toBeDefined();
    expect(result.detailedLinks).toBeDefined();
    expect(result.recommendedLinks).toBeDefined();
    expect(result.finalMarkdown).toBeDefined();
  });

  it('ガイダンスフローが正しく生成される', () => {
    const flow = generateGuidanceFlow('understanding', ['質問1']);
    
    expect(flow.currentMode).toBe('understanding');
    expect(flow.nextMode).toBe('conviction');
    expect(flow.progress).toBeGreaterThan(0);
    expect(flow.recommendations.length).toBeGreaterThan(0);
  });

  it('LP内のコンテンツリンクが正しく生成される', () => {
    const links = generateLpContentLinks('Founderの特典は？');
    
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]?.relevance).toBeGreaterThan(0);
  });

  it('詳細リンクが正しく生成される', () => {
    const result = generateDetailedLinks('Founderの特典は？');
    
    expect(result.founderLink).not.toBeNull();
    expect(result.allLinks.length).toBeGreaterThan(0);
    expect(result.markdown).toContain('Founder');
  });
});
