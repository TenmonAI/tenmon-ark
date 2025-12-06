/**
 * Mobile-ARK V2: Mobile UI Tests
 * - UI Flow
 * - スワイプ
 * - タップ
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordTap,
  getTapHistory,
  getTapHeatmap,
  calculateMissRate,
  clearTapHistory,
} from './tapLearning';
import {
  recordSwipe,
  getSwipeHistory,
  getGestureProfile,
  detectSwipeDirection,
  getSwipeStatistics,
  clearSwipeHistory,
} from './gestureLearning';

describe('Mobile UI: Tap Learning', () => {
  beforeEach(() => {
    clearTapHistory();
  });

  it('should record tap events', () => {
    recordTap({ x: 100, y: 200, targetId: 'button1', isMiss: false });
    const history = getTapHistory();
    expect(history).toHaveLength(1);
    expect(history[0].x).toBe(100);
    expect(history[0].y).toBe(200);
    expect(history[0].targetId).toBe('button1');
  });

  it('should calculate miss rate', () => {
    recordTap({ x: 100, y: 200, targetId: 'button1', isMiss: false });
    recordTap({ x: 105, y: 205, targetId: 'button1', isMiss: true });
    recordTap({ x: 102, y: 198, targetId: 'button1', isMiss: false });

    const missRate = calculateMissRate('button1');
    expect(missRate).toBeCloseTo(33.33, 1);
  });

  it('should create tap heatmap', () => {
    recordTap({ x: 100, y: 200, targetId: 'button1', isMiss: false });
    recordTap({ x: 105, y: 205, targetId: 'button1', isMiss: true });

    const heatmap = getTapHeatmap();
    expect(heatmap.button1).toBeDefined();
    expect(heatmap.button1.hits).toHaveLength(1);
    expect(heatmap.button1.misses).toHaveLength(1);
  });

  it('should limit history size', () => {
    // 履歴サイズ制限のテスト（MAX_HISTORY_SIZE = 1000）
    for (let i = 0; i < 1100; i++) {
      recordTap({ x: i, y: i, targetId: 'button1', isMiss: false });
    }

    const history = getTapHistory();
    expect(history.length).toBeLessThanOrEqual(1000);
  });
});

describe('Mobile UI: Swipe Learning', () => {
  beforeEach(() => {
    clearSwipeHistory();
  });

  it('should record swipe events', () => {
    recordSwipe({
      startX: 0,
      startY: 0,
      endX: 100,
      endY: 0,
      duration: 200,
    });

    const history = getSwipeHistory();
    expect(history).toHaveLength(1);
    expect(history[0].velocity).toBeGreaterThan(0);
  });

  it('should detect swipe direction', () => {
    const rightSwipe = detectSwipeDirection({
      startX: 0,
      startY: 0,
      endX: 100,
      endY: 0,
    });
    expect(rightSwipe).toBe('right');

    const leftSwipe = detectSwipeDirection({
      startX: 100,
      startY: 0,
      endX: 0,
      endY: 0,
    });
    expect(leftSwipe).toBe('left');

    const upSwipe = detectSwipeDirection({
      startX: 0,
      startY: 100,
      endX: 0,
      endY: 0,
    });
    expect(upSwipe).toBe('up');

    const downSwipe = detectSwipeDirection({
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 100,
    });
    expect(downSwipe).toBe('down');
  });

  it('should update gesture profile', () => {
    // 複数のスワイプを記録
    for (let i = 0; i < 15; i++) {
      recordSwipe({
        startX: 0,
        startY: 0,
        endX: 100,
        endY: 0,
        duration: 200,
      });
    }

    const profile = getGestureProfile();
    expect(profile.averageSwipeVelocity).toBeGreaterThan(0);
    expect(profile.gestureStyle).toMatch(/slow|medium|fast/);
  });

  it('should calculate swipe statistics', () => {
    recordSwipe({
      startX: 0,
      startY: 0,
      endX: 100,
      endY: 0,
      duration: 200,
    });
    recordSwipe({
      startX: 100,
      startY: 0,
      endX: 0,
      endY: 0,
      duration: 200,
    });

    const stats = getSwipeStatistics();
    expect(stats.totalSwipes).toBe(2);
    expect(stats.directionCounts.right).toBe(1);
    expect(stats.directionCounts.left).toBe(1);
  });
});

describe('Mobile UI: Haptics', () => {
  it('should check haptics support', () => {
    const isSupported = 'vibrate' in navigator;
    expect(typeof isSupported).toBe('boolean');
  });
});
