/**
 * Reasoning Layer 最終実装テスト
 * 
 * IFE v5.6: 高次推論レイヤー（Reasoning Layer）最終実装
 * - 構文→推論の最上位接続
 * - DeepParse と翻訳OS連動
 * - トピック理解
 * - 多領域統合推論
 * - "中心軸推論（ミナカ推論）"
 * 
 * 10テスト以上実装
 */

import { describe, it, expect } from 'vitest';
import {
  executeHighLevelReasoning,
  detectReasoningTaskType,
  applyOSDesignReasoning,
  applyMultiDomainReasoning,
  applyLanguagePhilosophyReasoning,
  applyWorldviewIntegrationReasoning,
  applyIntentAnalysisReasoning,
  applySystemIntegrationReasoning,
  applyMinakaReasoning,
  type ReasoningTaskType,
} from '../lib/intellect/reasoning';
import { preprocessTwinCore } from '../lib/intellect/twinCore/preprocessTwinCore';

describe('Reasoning Layer 最終実装テスト', () => {
  it('テスト1: OS設計推論の適用', async () => {
    const input = 'システムの設計について教えてください。';
    const preprocessResult = await preprocessTwinCore(input);
    const result = applyOSDesignReasoning(input, preprocessResult);

    expect(result.taskType).toBe('os-design');
    expect(result.result.insights).toBeDefined();
    expect(result.result.synthesis).toBeDefined();
    expect(result.result.recommendations).toBeDefined();
    expect(result.metadata.reasoningDepth).toBeDefined();
  });

  it('テスト2: 多領域統合推論の適用', () => {
    const input = 'AIとOSと宇宙の統合について教えてください。';
    const domains = ['AI', 'OS', '宇宙'];
    const result = applyMultiDomainReasoning(input, domains);

    expect(result.taskType).toBe('multi-domain');
    expect(result.result.insights.length).toBeGreaterThan(0);
    expect(result.result.relatedDomains).toEqual(domains);
  });

  it('テスト3: 言語哲学推論の適用', async () => {
    const input = '言霊の本質について教えてください。';
    const preprocessResult = await preprocessTwinCore(input);
    const result = applyLanguagePhilosophyReasoning(input, preprocessResult);

    expect(result.taskType).toBe('language-philosophy');
    expect(result.result.insights).toBeDefined();
    expect(result.result.relatedDomains).toContain('言語哲学');
  });

  it('テスト4: 世界観統合推論の適用', async () => {
    const input = '宇宙の本質とミナカの力について教えてください。';
    const preprocessResult = await preprocessTwinCore(input);
    const result = applyWorldviewIntegrationReasoning(input, preprocessResult);

    expect(result.taskType).toBe('worldview-integration');
    expect(result.metadata.reasoningDepth).toBe('cosmic');
    expect(result.metadata.integrationLevel).toBe(100);
  });

  it('テスト5: 意図解析推論の適用', async () => {
    const input = 'AIの未来について詳しく教えてください。';
    const preprocessResult = await preprocessTwinCore(input);
    const result = applyIntentAnalysisReasoning(input, preprocessResult);

    expect(result.taskType).toBe('intent-analysis');
    expect(result.result.insights).toBeDefined();
    expect(result.result.recommendations).toBeDefined();
  });

  it('テスト6: システム統合推論の適用', () => {
    const input = 'DeepParseと翻訳OSとWriterとSNSの統合について教えてください。';
    const systems: Array<'deep-parse' | 'translation-os' | 'writer' | 'sns'> = [
      'deep-parse',
      'translation-os',
      'writer',
      'sns',
    ];
    const result = applySystemIntegrationReasoning(input, systems);

    expect(result.taskType).toBe('system-integration');
    expect(result.result.insights.length).toBeGreaterThan(0);
    expect(result.result.relatedDomains.length).toBeGreaterThan(0);
  });

  it('テスト7: ミナカ推論の適用', async () => {
    const input = 'ミナカ（中心）の力について教えてください。';
    const preprocessResult = await preprocessTwinCore(input);
    const result = applyMinakaReasoning(input, preprocessResult);

    expect(result.taskType).toBe('minaka-reasoning');
    expect(result.minakaReasoning).toBeDefined();
    expect(result.minakaReasoning?.centerAxisScore).toBeDefined();
    expect(result.minakaReasoning?.deviationDirection).toBeDefined();
    expect(result.minakaReasoning?.waveformResonance).toBeDefined();
  });

  it('テスト8: 推論タスクタイプの自動検出（OS設計）', () => {
    const input = 'システムの設計について教えてください。';
    const taskType = detectReasoningTaskType(input);

    expect(taskType).toBe('os-design');
  });

  it('テスト9: 推論タスクタイプの自動検出（言語哲学）', () => {
    const input = '言霊の本質について教えてください。';
    const taskType = detectReasoningTaskType(input);

    expect(taskType).toBe('language-philosophy');
  });

  it('テスト10: 推論タスクタイプの自動検出（世界観統合）', () => {
    const input = '宇宙の本質とミナカの力について教えてください。';
    const taskType = detectReasoningTaskType(input);

    expect(taskType).toBe('worldview-integration');
  });

  it('テスト11: 推論タスクタイプの自動検出（ミナカ推論）', () => {
    const input = 'ミナカ（中心）の力について教えてください。';
    const taskType = detectReasoningTaskType(input);

    expect(taskType).toBe('minaka-reasoning');
  });

  it('テスト12: executeHighLevelReasoningの統合テスト', async () => {
    const input = 'システムの設計について教えてください。';
    const preprocessResult = await preprocessTwinCore(input);
    const result = await executeHighLevelReasoning(input, 'os-design', preprocessResult);

    expect(result.taskType).toBe('os-design');
    expect(result.result.insights).toBeDefined();
    expect(result.result.synthesis).toBeDefined();
    expect(result.metadata).toBeDefined();
  });

  it('テスト13: トピック理解の解析', async () => {
    const input = 'ミナカの力について教えてください。';
    const preprocessResult = await preprocessTwinCore(input);
    const result = applyMinakaReasoning(input, preprocessResult);

    expect(result.analysis).toBeDefined();
    expect(result.analysis?.topicUnderstanding).toBeDefined();
    expect(result.analysis?.topicUnderstanding).toContain('ミナカ推論');
  });

  it('テスト14: 多領域統合推論の解析', async () => {
    const input = 'ミナカの力について教えてください。';
    const preprocessResult = await preprocessTwinCore(input);
    const result = applyMinakaReasoning(input, preprocessResult);

    expect(result.analysis).toBeDefined();
    expect(result.analysis?.multiDomainIntegration).toBeDefined();
    expect(result.analysis?.multiDomainIntegration.length).toBeGreaterThan(0);
  });

  it('テスト15: DeepParseと翻訳OS連動の解析', async () => {
    const input = 'ミナカの力について教えてください。';
    const preprocessResult = await preprocessTwinCore(input);
    const result = applyMinakaReasoning(input, preprocessResult);

    expect(result.analysis).toBeDefined();
    expect(result.analysis?.deepParseTranslationOSConnection).toBeDefined();
    expect(result.analysis?.deepParseTranslationOSConnection).toContain('深層解析');
    expect(result.analysis?.deepParseTranslationOSConnection).toContain('翻訳OS連動');
  });
});
