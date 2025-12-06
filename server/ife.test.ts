/**
 * Intellect Fusion Engine (IFE) v5.5 テスト
 * 
 * 15個のテストを実装:
 * - Twin-Core前処理テスト (3)
 * - Twin-Core後処理テスト (2)
 * - ルーティングテスト (3)
 * - 意味拡張テスト (2)
 * - 推論テスト (3)
 * - ユーザー同期テスト (2)
 */

import { describe, it, expect } from 'vitest';
import { preprocessTwinCore, preprocessTwinCoreLite } from '../lib/intellect/twinCore/preprocessTwinCore';
import { postprocessTwinCore, postprocessTwinCoreLite, removeTwinCoreTags } from '../lib/intellect/twinCore/postprocessTwinCore';
import { calculateFireWaterBalanceDetail, adjustTextFireWaterBalance, visualizeFireWaterCycle } from '../lib/intellect/twinCore/fireWaterBalance';
import { calculateFiveElementFlowDetail, visualizeFiveElementFlow, applyFiveElementFlowToText } from '../lib/intellect/twinCore/fiveElementFlow';
import { routeToModel, detectTaskType, executeMultiModelRouter } from '../lib/intellect/router';
import { enhanceSemantics, enhanceSemanticLite } from '../lib/intellect/enhance';
import { executeHighLevelReasoning, detectReasoningTaskType } from '../lib/intellect/reasoning';
import { initializeUserProfile, learnFromInteraction, syncWithUser, applyUserSync } from '../lib/intellect/userSync';
import { executeIFE, executeIFELite } from '../lib/intellect/index';

describe('IFE v5.5: Twin-Core前処理テスト', () => {
  it('Twin-Core前処理: 基本的なテキストの解析', async () => {
    const text = '宇宙の本質は調和です。火と水が統合され、ミナカの力が働きます。';
    const result = await preprocessTwinCore(text);
    
    expect(result.original).toBe(text);
    expect(result.fireWater.balance).toBeDefined();
    expect(result.fiveElements.dominant).toBeDefined();
    expect(result.depth.level).toBeDefined();
    expect(result.recommendedStyle.tone).toBeDefined();
  });
  
  it('Twin-Core前処理: 火（外発）傾向のテキスト', async () => {
    const text = '明確です。強い力です。活発に動きます。';
    const result = await preprocessTwinCore(text);
    
    expect(result.fireWater.balance).toBe('fire');
    expect(result.fireWater.fireScore).toBeGreaterThan(result.fireWater.waterScore);
  });
  
  it('Twin-Core前処理Lite: パフォーマンス重視版', async () => {
    const text = '宇宙の本質は調和です。';
    const result = await preprocessTwinCoreLite(text);
    
    expect(result.fireWater).toBeDefined();
    expect(result.depth).toBeDefined();
    expect(result.recommendedStyle).toBeDefined();
  });
});

describe('IFE v5.5: Twin-Core後処理テスト', () => {
  it('Twin-Core後処理: 構文タグの付与と削除', async () => {
    const text = 'これはテストです。';
    const preprocessResult = await preprocessTwinCore(text);
    const result = await postprocessTwinCore(text, preprocessResult);
    
    expect(result.processed).toBeDefined();
    expect(result.transformations.twinCoreTags).toBe(true);
    
    const cleaned = removeTwinCoreTags(result.processed);
    expect(cleaned).not.toContain('<fire>');
    expect(cleaned).not.toContain('<water>');
    expect(cleaned).not.toContain('<minaka>');
  });
  
  it('Twin-Core後処理Lite: パフォーマンス重視版', async () => {
    const text = 'これはテストです。';
    const result = await postprocessTwinCoreLite(text, 'fire');
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });
});

describe('IFE v5.5: ルーティングテスト', () => {
  it('ルーティング: 分析タスクはClaudeを選択', () => {
    const result = routeToModel('analysis');
    
    expect(result.selectedModel).toBe('claude-3.5-sonnet');
    expect(result.taskType).toBe('analysis');
    expect(result.reason).toContain('Claude');
  });
  
  it('ルーティング: 創造タスクはGPTを選択', () => {
    const result = routeToModel('creativity');
    
    expect(result.selectedModel).toBe('gpt-4o');
    expect(result.taskType).toBe('creativity');
    expect(result.reason).toContain('GPT');
  });
  
  it('ルーティング: タスクタイプ自動検出', () => {
    const analysisPrompt = 'このデータを分析してください';
    const analysisTaskType = detectTaskType(analysisPrompt);
    expect(analysisTaskType).toBe('analysis');
    
    const creativityPrompt = 'ストーリーを作成してください';
    const creativityTaskType = detectTaskType(creativityPrompt);
    expect(creativityTaskType).toBe('creativity');
  });
});

describe('IFE v5.5: 意味拡張テスト', () => {
  it('意味拡張: 文脈の深みを追加', async () => {
    const text = 'これはテストです。';
    const preprocessResult = await preprocessTwinCore(text);
    const result = await enhanceSemantics(text, preprocessResult);
    
    expect(result.augmented).toBeDefined();
    expect(result.enhancements.contextDepth).toBe(true);
    expect(result.metadata.depthScore).toBeGreaterThanOrEqual(0);
    expect(result.metadata.harmonyScore).toBeGreaterThanOrEqual(0);
  });
  
  it('意味拡張Lite: パフォーマンス重視版', async () => {
    const text = 'これはテストです。';
    const result = await enhanceSemanticLite(text, 'fire');
    
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });
});

describe('IFE v5.5: 推論テスト', () => {
  it('推論: OS設計能力を適用', async () => {
    const input = 'システムの設計を考えています';
    const result = await executeHighLevelReasoning(input, 'os-design');
    
    expect(result.taskType).toBe('os-design');
    expect(result.result.insights.length).toBeGreaterThan(0);
    expect(result.result.synthesis).toBeDefined();
    expect(result.result.recommendations.length).toBeGreaterThan(0);
  });
  
  it('推論: 意図解析を適用', async () => {
    const input = 'これについて教えてください';
    const result = await executeHighLevelReasoning(input, 'intent-analysis');
    
    expect(result.taskType).toBe('intent-analysis');
    expect(result.result.insights.length).toBeGreaterThan(0);
  });
  
  it('推論: 推論タスクタイプ自動検出', () => {
    const osDesignInput = 'システムの設計を考えています';
    const osDesignTaskType = detectReasoningTaskType(osDesignInput);
    expect(osDesignTaskType).toBe('os-design');
    
    const integrationInput = '複数のシステムを統合したい';
    const integrationTaskType = detectReasoningTaskType(integrationInput);
    expect(integrationTaskType).toBe('system-integration');
  });
});

describe('IFE v5.5: ユーザー同期テスト', () => {
  it('ユーザー同期: プロファイル初期化と学習', () => {
    const profile = initializeUserProfile(1);
    
    expect(profile.userId).toBe(1);
    expect(profile.thinkingPattern.logical).toBe(50);
    expect(profile.fireWaterTendency.dominantTendency).toBe('balanced');
    
    const updatedProfile = learnFromInteraction(profile, {
      userMessage: 'なぜこうなるのか理由を教えてください',
      assistantMessage: '理由は以下の通りです',
      feedback: 'positive',
    });
    
    expect(updatedProfile.thinkingPattern.logical).toBeGreaterThan(50);
    expect(updatedProfile.learningData.totalInteractions).toBe(1);
    expect(updatedProfile.learningData.feedbackScore).toBeGreaterThan(50);
  });
  
  it('ユーザー同期: 推奨スタイルの決定と適用', () => {
    const profile = initializeUserProfile(1);
    profile.fireWaterTendency.fire = 80;
    profile.fireWaterTendency.water = 30;
    profile.fireWaterTendency.dominantTendency = 'fire';
    
    const syncResult = syncWithUser(profile);
    
    expect(syncResult.recommendedStyle.fireWaterBalance).toBe('fire');
    
    const text = 'これはテストです。';
    const adjusted = applyUserSync(text, syncResult);
    
    expect(adjusted).toBeDefined();
  });
});

describe('IFE v5.5: 統合テスト', () => {
  it('IFE統合: 完全パイプライン実行', async () => {
    const input = '宇宙の本質は調和です。';
    const result = await executeIFE(input, {
      liteMode: false,
      enableReasoning: true,
      enableUserSync: false,
    });
    
    expect(result.output).toBeDefined();
    expect(result.preprocessing).toBeDefined();
    expect(result.routing).toBeDefined();
    expect(result.metadata.processingTime).toBeGreaterThan(0);
  }, 30000); // 30秒タイムアウト
  
  it('IFE統合Lite: パフォーマンス重視版', async () => {
    const input = '宇宙の本質は調和です。';
    const result = await executeIFELite(input);
    
    expect(result.output).toBeDefined();
    expect(result.routing).toBeDefined();
    expect(result.metadata.liteMode).toBe(true);
  }, 30000); // 30秒タイムアウト
});

describe('IFE v5.5: 火水バランステスト', () => {
  it('火水バランス: 詳細計算', () => {
    const text = '明確です。強い力です。活発に動きます。';
    const result = calculateFireWaterBalanceDetail(text);
    
    expect(result.balance).toBe('fire');
    expect(result.fireScore).toBeGreaterThan(result.waterScore);
    expect(result.analysis.fireElements.length).toBeGreaterThan(0);
  });
  
  it('火水バランス: テキスト調整', () => {
    const text = 'これはテストです。明確です。';
    const adjusted = adjustTextFireWaterBalance(text, 'water', 'medium');
    
    expect(adjusted).toBeDefined();
    expect(adjusted).not.toBe(text);
  });
  
  it('火水バランス: 可視化', () => {
    const text = '明確です。強い力です。';
    const detail = calculateFireWaterBalanceDetail(text);
    const visualization = visualizeFireWaterCycle(detail);
    
    expect(visualization).toContain('火水循環ビジュアライゼーション');
    expect(visualization).toContain('火（外発）');
    expect(visualization).toContain('水（内集）');
  });
});

describe('IFE v5.5: 五相フローテスト', () => {
  it('五相フロー: 詳細計算', () => {
    const text = '宇宙の本質は調和です。火と水が統合され、風が循環します。';
    const result = calculateFiveElementFlowDetail(text);
    
    expect(result.dominant).toBeDefined();
    expect(result.distribution.heaven).toBeGreaterThanOrEqual(0);
    expect(result.flow.length).toBe(5);
  });
  
  it('五相フロー: 可視化', () => {
    const text = '宇宙の本質は調和です。';
    const detail = calculateFiveElementFlowDetail(text);
    const visualization = visualizeFiveElementFlow(detail);
    
    expect(visualization).toContain('五相フロービジュアライゼーション');
    expect(visualization).toContain('天');
    expect(visualization).toContain('火');
  });
  
  it('五相フロー: テキストへの適用', () => {
    const text = 'これはテストです。\n\n次の段落です。';
    const applied = applyFiveElementFlowToText(text);
    
    expect(applied).toBeDefined();
  });
});
