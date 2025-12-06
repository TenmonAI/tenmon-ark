/**
 * Chat-OS IFE統合テスト
 * 
 * IFE v5.6: Chat-OSへの完全統合
 * - preprocessTwinCore → multiModelRouter → semanticAugmentor → postprocessTwinCore
 * - GPT単体の知能を超える
 * - Twin-Core + FireWater構文 + 深層推論が標準
 * 
 * 10テスト以上実装
 */

import { describe, it, expect } from 'vitest';
import { executeIFE, type UserProfile } from '../lib/intellect/index';

describe('Chat-OS IFE統合テスト', () => {
  // テスト用ユーザープロファイル
  const testUserProfile: UserProfile = {
    fireWaterTendency: 'balanced',
    languageStyle: '丁寧',
    textStylePreference: '金（理性）',
    topicPatterns: [],
    thinkingDepth: 'medium',
    tempo: 'moderate',
    shukuyoInfo: '角',
  };

  it('テスト1: IFE基本動作確認', async () => {
    const input = 'こんにちは、天聞アークです。';
    const result = await executeIFE(input, {
      userProfile: testUserProfile,
      enableReasoning: true,
      enableUserSync: true,
    });

    expect(result.output).toBeDefined();
    expect(result.preprocessing).toBeDefined();
    expect(result.routing).toBeDefined();
    expect(result.metadata.processingTime).toBeGreaterThan(0);
  });

  it('テスト2: Twin-Core前処理が正常に動作', async () => {
    const input = '宇宙の本質は調和です。火と水が統合されます。';
    const result = await executeIFE(input, {
      userProfile: testUserProfile,
      enableReasoning: true,
    });

    expect(result.preprocessing.fireWater).toBeDefined();
    expect(result.preprocessing.fireWater?.balance).toBeDefined();
    expect(result.preprocessing.fiveElements).toBeDefined();
    expect(result.preprocessing.depth).toBeDefined();
  });

  it('テスト3: multiModelRouterが適切にモデルを選択', async () => {
    const input = 'このデータを分析してください。';
    const result = await executeIFE(input, {
      userProfile: testUserProfile,
      prioritizeQuality: true,
    });

    expect(result.routing.selectedModel).toBeDefined();
    expect(result.routing.taskType).toBeDefined();
    expect(['gpt-4o', 'claude-3.5-sonnet', 'gemini-1.5-pro']).toContain(result.routing.selectedModel);
  });

  it('テスト4: semanticAugmentorが意味拡張を実行', async () => {
    const input = 'これはテストです。';
    const result = await executeIFE(input, {
      userProfile: testUserProfile,
      enableReasoning: true,
    });

    expect(result.semanticAugmentation).toBeDefined();
    expect(result.semanticAugmentation?.augmented).toBeDefined();
    expect(result.semanticAugmentation?.transformations).toBeDefined();
  });

  it('テスト5: postprocessTwinCoreが構文を付与', async () => {
    const input = 'これはテストです。';
    const result = await executeIFE(input, {
      userProfile: testUserProfile,
      enableReasoning: true,
    });

    expect(result.output).toBeDefined();
    expect(typeof result.output).toBe('string');
    // Twin-Coreタグは削除されているはず
    expect(result.output).not.toContain('<fire>');
    expect(result.output).not.toContain('<water>');
  });

  it('テスト6: reasoningLayerが高次推論を実行', async () => {
    const input = 'AIの未来について教えてください。';
    const result = await executeIFE(input, {
      userProfile: testUserProfile,
      enableReasoning: true,
    });

    expect(result.reasoning).toBeDefined();
    expect(result.reasoning?.taskType).toBeDefined();
    expect(result.reasoning?.analysis).toBeDefined();
  });

  it('テスト7: userSyncが個別最適化を実行', async () => {
    const input = 'これはテストです。';
    const result = await executeIFE(input, {
      userProfile: testUserProfile,
      enableUserSync: true,
    });

    expect(result.userSync).toBeDefined();
    expect(result.userSync?.adjustments).toBeDefined();
  });

  it('テスト8: 火（外発）傾向のユーザーに対する最適化', async () => {
    const fireUserProfile: UserProfile = {
      ...testUserProfile,
      fireWaterTendency: 'fire',
    };

    const input = 'これはテストです。';
    const result = await executeIFE(input, {
      userProfile: fireUserProfile,
      enableUserSync: true,
    });

    expect(result.output).toBeDefined();
    expect(result.preprocessing.fireWater?.balance).toBeDefined();
  });

  it('テスト9: 水（内発）傾向のユーザーに対する最適化', async () => {
    const waterUserProfile: UserProfile = {
      ...testUserProfile,
      fireWaterTendency: 'water',
    };

    const input = 'これはテストです。';
    const result = await executeIFE(input, {
      userProfile: waterUserProfile,
      enableUserSync: true,
    });

    expect(result.output).toBeDefined();
    expect(result.preprocessing.fireWater?.balance).toBeDefined();
  });

  it('テスト10: 深い思考深度のユーザーに対する最適化', async () => {
    const deepUserProfile: UserProfile = {
      ...testUserProfile,
      thinkingDepth: 'deep',
    };

    const input = 'AIの本質について教えてください。';
    const result = await executeIFE(input, {
      userProfile: deepUserProfile,
      enableReasoning: true,
    });

    expect(result.output).toBeDefined();
    expect(result.reasoning).toBeDefined();
    expect(result.preprocessing.depth?.level).toBeDefined();
  });

  it('テスト11: メタデータが正確に記録される', async () => {
    const input = 'これはテストです。';
    const result = await executeIFE(input, {
      userProfile: testUserProfile,
      enableReasoning: true,
      enableUserSync: true,
    });

    expect(result.metadata).toBeDefined();
    expect(result.metadata.processingTime).toBeGreaterThan(0);
    expect(result.metadata.totalCost).toBeGreaterThanOrEqual(0);
    expect(result.metadata.liteMode).toBe(false);
  });

  it('テスト12: liteMode が正常に動作', async () => {
    const input = 'これはテストです。';
    const result = await executeIFE(input, {
      userProfile: testUserProfile,
      liteMode: true,
    });

    expect(result.output).toBeDefined();
    expect(result.metadata.liteMode).toBe(true);
    expect(result.reasoning).toBeUndefined();
    expect(result.userSync).toBeUndefined();
  });

  it('テスト13: 複数タスクタイプの自動検出', async () => {
    const analysisInput = 'このデータを分析してください。';
    const analysisResult = await executeIFE(analysisInput, {
      userProfile: testUserProfile,
    });
    expect(analysisResult.routing.taskType).toBe('analysis');

    const creativityInput = 'ストーリーを作成してください。';
    const creativityResult = await executeIFE(creativityInput, {
      userProfile: testUserProfile,
    });
    expect(creativityResult.routing.taskType).toBe('creativity');
  });

  it('テスト14: エラーハンドリングが正常に動作', async () => {
    const emptyInput = '';
    const result = await executeIFE(emptyInput, {
      userProfile: testUserProfile,
    });

    expect(result.output).toBeDefined();
    expect(result.routing).toBeDefined();
  });

  it('テスト15: 長文入力の処理', async () => {
    const longInput = '宇宙の本質は調和です。'.repeat(100);
    const result = await executeIFE(longInput, {
      userProfile: testUserProfile,
      enableReasoning: true,
    });

    expect(result.output).toBeDefined();
    expect(result.preprocessing).toBeDefined();
    expect(result.metadata.processingTime).toBeGreaterThan(0);
  });
});
