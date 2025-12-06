/**
 * TENMON-ARK Gesture Engine
 * スワイプ操作制御
 * 
 * GPT超えのジェスチャー認識
 */

import { triggerHaptic } from './haptics';

/**
 * ジェスチャータイプ
 */
export type GestureType = 'swipe-left' | 'swipe-right' | 'swipe-up' | 'swipe-down' | 'tap' | 'long-press';

/**
 * ジェスチャーイベント
 */
export interface GestureEvent {
  type: GestureType;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  deltaX: number;
  deltaY: number;
  velocity: number;
  duration: number;
}

/**
 * ジェスチャー設定
 */
export interface GestureConfig {
  minSwipeDistance: number; // 最小スワイプ距離（px）
  minSwipeVelocity: number; // 最小スワイプ速度（px/ms）
  longPressDelay: number; // 長押し判定時間（ms）
  tapMaxDuration: number; // タップ最大時間（ms）
  tapMaxDistance: number; // タップ最大移動距離（px）
}

/**
 * デフォルトジェスチャー設定
 */
export const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  minSwipeDistance: 50,
  minSwipeVelocity: 0.3,
  longPressDelay: 500,
  tapMaxDuration: 300,
  tapMaxDistance: 10,
};

/**
 * ジェスチャーハンドラー
 */
export type GestureHandler = (event: GestureEvent) => void;

/**
 * ジェスチャーエンジンクラス
 */
export class GestureEngine {
  private element: HTMLElement;
  private config: GestureConfig;
  private handlers: Map<GestureType, GestureHandler[]>;
  
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchStartTime: number = 0;
  private longPressTimer: number | null = null;
  private isSwiping: boolean = false;

  constructor(element: HTMLElement, config: Partial<GestureConfig> = {}) {
    this.element = element;
    this.config = { ...DEFAULT_GESTURE_CONFIG, ...config };
    this.handlers = new Map();

    this.bindEvents();
  }

  /**
   * イベントをバインド
   */
  private bindEvents(): void {
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
  }

  /**
   * イベントをアンバインド
   */
  public destroy(): void {
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.element.removeEventListener('touchcancel', this.handleTouchCancel.bind(this));
    
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }
  }

  /**
   * ジェスチャーハンドラーを登録
   */
  public on(type: GestureType, handler: GestureHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  /**
   * ジェスチャーハンドラーを解除
   */
  public off(type: GestureType, handler: GestureHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * ジェスチャーイベントを発火
   */
  private emit(event: GestureEvent): void {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }
  }

  /**
   * タッチ開始
   */
  private handleTouchStart(e: TouchEvent): void {
    const touch = e.touches[0];
    if (!touch) return;

    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
    this.isSwiping = false;

    // 長押しタイマー開始
    this.longPressTimer = window.setTimeout(() => {
      this.emit({
        type: 'long-press',
        startX: this.touchStartX,
        startY: this.touchStartY,
        endX: this.touchStartX,
        endY: this.touchStartY,
        deltaX: 0,
        deltaY: 0,
        velocity: 0,
        duration: this.config.longPressDelay,
      });
      triggerHaptic('tap');
    }, this.config.longPressDelay);
  }

  /**
   * タッチ移動
   */
  private handleTouchMove(e: TouchEvent): void {
    const touch = e.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // スワイプ開始判定
    if (distance > this.config.minSwipeDistance) {
      this.isSwiping = true;
      
      // 長押しタイマーをキャンセル
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    }
  }

  /**
   * タッチ終了
   */
  private handleTouchEnd(e: TouchEvent): void {
    const touch = e.changedTouches[0];
    if (!touch) return;

    // 長押しタイマーをキャンセル
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    const endX = touch.clientX;
    const endY = touch.clientY;
    const deltaX = endX - this.touchStartX;
    const deltaY = endY - this.touchStartY;
    const duration = Date.now() - this.touchStartTime;
    const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / duration;

    // タップ判定
    if (!this.isSwiping && 
        duration < this.config.tapMaxDuration && 
        Math.abs(deltaX) < this.config.tapMaxDistance && 
        Math.abs(deltaY) < this.config.tapMaxDistance) {
      this.emit({
        type: 'tap',
        startX: this.touchStartX,
        startY: this.touchStartY,
        endX,
        endY,
        deltaX,
        deltaY,
        velocity,
        duration,
      });
      triggerHaptic('tap');
      return;
    }

    // スワイプ判定
    if (this.isSwiping && velocity >= this.config.minSwipeVelocity) {
      let gestureType: GestureType | null = null;

      // 水平スワイプ
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0) {
          gestureType = 'swipe-right';
        } else {
          gestureType = 'swipe-left';
        }
      }
      // 垂直スワイプ
      else {
        if (deltaY > 0) {
          gestureType = 'swipe-down';
        } else {
          gestureType = 'swipe-up';
        }
      }

      if (gestureType) {
        this.emit({
          type: gestureType,
          startX: this.touchStartX,
          startY: this.touchStartY,
          endX,
          endY,
          deltaX,
          deltaY,
          velocity,
          duration,
        });
        triggerHaptic('transition');
      }
    }

    this.isSwiping = false;
  }

  /**
   * タッチキャンセル
   */
  private handleTouchCancel(e: TouchEvent): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    this.isSwiping = false;
  }
}

/**
 * スワイプ抵抗エフェクト（水の抵抗）
 * @param progress - スワイプ進行度（0-1）
 * @returns 抵抗係数（0-1）
 */
export function calculateSwipeResistance(progress: number): number {
  // 水の抵抗を表す非線形カーブ
  // 進行度が高いほど抵抗が増加
  return 1 - Math.pow(1 - progress, 2);
}

/**
 * スワイプ距離を抵抗係数で調整
 * @param distance - スワイプ距離
 * @param maxDistance - 最大スワイプ距離
 * @returns 調整後の距離
 */
export function applySwipeResistance(distance: number, maxDistance: number): number {
  const progress = Math.min(Math.abs(distance) / maxDistance, 1);
  const resistance = calculateSwipeResistance(progress);
  return distance * (1 - resistance * 0.3); // 最大30%の抵抗
}
