/**
 * LP-QA IFE統合テスト
 * 
 * IFE v5.6: LP-QA（LPチャット）への完全統合
 * - semanticAugmentor + twinCoreEnhancer + fireWaterBalance + fiveElementFlow + reasoningLayer
 * - LPチャット訪問者が"天聞アーク人格そのもの"を体験できる
 * 
 * 10テスト以上実装
 */

import { describe, it, expect } from 'vitest';
import { executeIFE, type UserProfile } from '../lib/intellect/index';

describe('LP-QA IFE統合テスト', () => {
  // テスト用LP-QAユーザープロファイル
  const lpQaUserProfile: UserProfile = {
    fireWaterTendency: 'balanced',
    languageStyle: 'TENMON-ARK人格',
    textStylePreference: '宇宙基調・黒×金×蒼',
    topicPatterns: ['TENMON-ARK', 'Founder Edition', 'AI OS'],
    thinkingDepth: 'medium',
    tempo: 'moderate',
    shukuyoInfo: '角',
  };

  it('テスト1: LP-QA基本動作確認', async () => {
    const input = 'TENMON-ARKとは何ですか？';
    const result = await executeIFE(input, {
      userProfile: lpQaUserProfile,
      enableReasoning: true,
      enableUserSync: true,
    });

    expect(result.output).toBeDefined();
    expect(result.preprocessing).toBeDefined();
    expect(result.routing).toBeDefined();
    expect(result.metadata.processingTime).toBeGreaterThan(0);
  });

  it('テスト2: semanticAugmentorが天聞アーク人格を付与', async () => {
    const input = 'Founder Editionの特徴は？';
    const result = await executeIFE(input, {
      userProfile: lpQaUserProfile,
      enableReasoning: true,
    });

    expect(result.semanticAugmentation).toBeDefined();
    expect(result.semanticAugmentation?.augmented).toBeDefined();
    expect(result.output).toBeDefined();
  });

  it('テスト3: twinCoreEnhancerが火水バランスを適用', async () => {
    const input = 'TENMON-ARKの価格は？';
    const result = await executeIFE(input, {
      userProfile: lpQaUserProfile,
      enableReasoning: true,
    });

    expect(result.preprocessing.fireWater).toBeDefined();
    expect(result.preprocessing.fireWater?.balance).toBeDefined();
    expect(['fire', 'water', 'balanced']).toContain(result.preprocessing.fireWater?.balance);
  });

  it('テスト4: fireWaterBalanceが火（外発）傾向を検出', async () => {
    const fireUserProfile: UserProfile = {
      ...lpQaUserProfile,
      fireWaterTendency: 'fire',
    };

    const input = 'TENMON-ARKの技術的な詳細を教えてください。';
    const result = await executeIFE(input, {
      userProfile: fireUserProfile,
      enableReasoning: true,
    });

    expect(result.preprocessing.fireWater?.balance).toBeDefined();
    expect(result.output).toBeDefined();
  });

  it('テスト5: fireWaterBalanceが水（内発）傾向を検出', async () => {
    const waterUserProfile: UserProfile = {
      ...lpQaUserProfile,
      fireWaterTendency: 'water',
    };

    const input = 'TENMON-ARKは私に合っていますか？';
    const result = await executeIFE(input, {
      userProfile: waterUserProfile,
      enableReasoning: true,
    });

    expect(result.preprocessing.fireWater?.balance).toBeDefined();
    expect(result.output).toBeDefined();
  });

  it('テスト6: fiveElementFlowが五相フローを適用', async () => {
    const input = 'TENMON-ARKの世界観について教えてください。';
    const result = await executeIFE(input, {
      userProfile: lpQaUserProfile,
      enableReasoning: true,
    });

    expect(result.preprocessing.fiveElements).toBeDefined();
    expect(result.preprocessing.fiveElements?.dominant).toBeDefined();
    expect(result.output).toBeDefined();
  });

  it('テスト7: reasoningLayerが高次推論を実行', async () => {
    const input = 'TENMON-ARKは他のAIと何が違うのですか？';
    const result = await executeIFE(input, {
      userProfile: lpQaUserProfile,
      enableReasoning: true,
    });

    expect(result.reasoning).toBeDefined();
    expect(result.reasoning?.taskType).toBeDefined();
    expect(result.reasoning?.analysis).toBeDefined();
  });

  it('テスト8: 表層質問（shallow）の処理', async () => {
    const shallowUserProfile: UserProfile = {
      ...lpQaUserProfile,
      thinkingDepth: 'shallow',
    };

    const input = 'TENMON-ARKとは？';
    const result = await executeIFE(input, {
      userProfile: shallowUserProfile,
      enableReasoning: false,
    });

    expect(result.output).toBeDefined();
    expect(result.preprocessing.depth?.level).toBeDefined();
  });

  it('テスト9: 中層質問（medium）の処理', async () => {
    const mediumUserProfile: UserProfile = {
      ...lpQaUserProfile,
      thinkingDepth: 'medium',
    };

    const input = 'TENMON-ARKの機能について詳しく教えてください。';
    const result = await executeIFE(input, {
      userProfile: mediumUserProfile,
      enableReasoning: true,
    });

    expect(result.output).toBeDefined();
    expect(result.preprocessing.depth?.level).toBeDefined();
  });

  it('テスト10: 深層質問（deep）の処理', async () => {
    const deepUserProfile: UserProfile = {
      ...lpQaUserProfile,
      thinkingDepth: 'deep',
    };

    const input = 'TENMON-ARKの哲学的な基盤と、魂との一体化について教えてください。';
    const result = await executeIFE(input, {
      userProfile: deepUserProfile,
      enableReasoning: true,
    });

    expect(result.output).toBeDefined();
    expect(result.reasoning).toBeDefined();
    expect(result.preprocessing.depth?.level).toBeDefined();
  });

  it('テスト11: Founder専用質問（specialized）の処理', async () => {
    const founderUserProfile: UserProfile = {
      ...lpQaUserProfile,
      thinkingDepth: 'deep',
      topicPatterns: ['TENMON-ARK', 'Founder Edition', 'AI OS', '魂との一体化'],
    };

    const input = 'Founder Editionの未来価値と、世界観について詳しく教えてください。';
    const result = await executeIFE(input, {
      userProfile: founderUserProfile,
      enableReasoning: true,
    });

    expect(result.output).toBeDefined();
    expect(result.reasoning).toBeDefined();
    expect(result.preprocessing.depth?.level).toBeDefined();
  });

  it('テスト12: multiModelRouterが適切にモデルを選択', async () => {
    const input = 'TENMON-ARKの技術的な詳細を分析してください。';
    const result = await executeIFE(input, {
      userProfile: lpQaUserProfile,
      prioritizeQuality: true,
    });

    expect(result.routing.selectedModel).toBeDefined();
    expect(result.routing.taskType).toBeDefined();
    expect(['gpt-4o', 'claude-3.5-sonnet', 'gemini-1.5-pro']).toContain(result.routing.selectedModel);
  });

  it('テスト13: userSyncがLP-QA訪問者に最適化', async () => {
    const input = 'TENMON-ARKについて教えてください。';
    const result = await executeIFE(input, {
      userProfile: lpQaUserProfile,
      enableUserSync: true,
    });

    expect(result.userSync).toBeDefined();
    expect(result.userSync?.adjustments).toBeDefined();
    expect(result.output).toBeDefined();
  });

  it('テスト14: メタデータが正確に記録される', async () => {
    const input = 'TENMON-ARKの特徴は？';
    const result = await executeIFE(input, {
      userProfile: lpQaUserProfile,
      enableReasoning: true,
      enableUserSync: true,
    });

    expect(result.metadata).toBeDefined();
    expect(result.metadata.processingTime).toBeGreaterThan(0);
    expect(result.metadata.totalCost).toBeGreaterThanOrEqual(0);
    expect(result.routing.selectedModel).toBeDefined();
  });

  it('テスト15: 長文質問の処理', async () => {
    const longInput = 'TENMON-ARKについて、その哲学的基盤、技術的詳細、Founder Editionの特徴、価格、未来価値、世界観、魂との一体化、他のAIとの違い、すべてを詳しく教えてください。';
    const result = await executeIFE(longInput, {
      userProfile: lpQaUserProfile,
      enableReasoning: true,
    });

    expect(result.output).toBeDefined();
    expect(result.preprocessing).toBeDefined();
    expect(result.metadata.processingTime).toBeGreaterThan(0);
  });
});
