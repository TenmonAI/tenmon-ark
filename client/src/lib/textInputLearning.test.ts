/**
 * User-Sync Evolution: Text Input Learning Tests
 * - 次単語予測
 * - 入力パターン分析
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordInput,
  getInputHistory,
  predictNextWord,
  predictFromInput,
  getPredictionConfidence,
  getTopWords,
  analyzeInputPattern,
  clearInputHistory,
} from './textInputLearning';

describe('Text Input Learning', () => {
  beforeEach(() => {
    clearInputHistory();
  });

  it('should record input text', () => {
    recordInput('こんにちは 世界');
    const history = getInputHistory();
    expect(history).toHaveLength(1);
    expect(history[0].text).toBe('こんにちは 世界');
  });

  it('should learn word pairs', () => {
    recordInput('こんにちは 世界');
    recordInput('こんにちは 世界');
    recordInput('こんにちは 天聞');

    const predictions = predictNextWord('こんにちは');
    expect(predictions).toContain('世界');
  });

  it('should predict next word from input', () => {
    recordInput('今日は 良い 天気');
    recordInput('今日は 良い 天気');
    recordInput('今日は 悪い 天気');

    const predictions = predictFromInput('今日は');
    expect(predictions.length).toBeGreaterThan(0);
  });

  it('should calculate prediction confidence', () => {
    recordInput('こんにちは 世界');
    recordInput('こんにちは 世界');
    recordInput('こんにちは 天聞');

    const confidence = getPredictionConfidence('こんにちは', '世界');
    expect(confidence).toBeGreaterThan(0);
    expect(confidence).toBeLessThanOrEqual(100);
  });

  it('should get top words', () => {
    recordInput('こんにちは 世界');
    recordInput('こんにちは 天聞');
    recordInput('さようなら 世界');

    const topWords = getTopWords(3);
    expect(topWords.length).toBeGreaterThan(0);
    expect(topWords[0]).toHaveProperty('word');
    expect(topWords[0]).toHaveProperty('count');
  });

  it('should analyze input pattern', () => {
    recordInput('こんにちは 世界');
    recordInput('さようなら 世界');

    const analysis = analyzeInputPattern();
    expect(analysis.totalInputs).toBe(2);
    expect(analysis.averageLength).toBeGreaterThan(0);
    expect(analysis.uniqueWords).toBeGreaterThan(0);
  });

  it('should limit history size', () => {
    // 履歴サイズ制限のテスト（MAX_HISTORY_SIZE = 1000）
    for (let i = 0; i < 1100; i++) {
      recordInput(`テスト ${i}`);
    }

    const history = getInputHistory();
    expect(history.length).toBeLessThanOrEqual(1000);
  });
});
