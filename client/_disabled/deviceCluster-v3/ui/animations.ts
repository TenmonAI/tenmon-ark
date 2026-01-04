/**
 * 🔱 DeviceCluster Animations
 * alphaFlow連動アニメーションシステム
 * 
 * 機能:
 * - scheduler.currentTask に連動したグローアニメーション
 * - リアルタイム latencyPulse エフェクト
 * - alphaFlow設定に基づくアニメーション速度制御
 */

import { megaSchedulerClient, type SchedulerTask } from "@/lib/scheduler/megaSchedulerClient";
import { getAllLatencies } from "../sync/latencyMap";

/**
 * alphaFlow設定（デフォルト値）
 */
export const ALPHA_FLOW_CONFIG = {
  transitionDuration: 300, // ms
  pulseInterval: 1000, // ms
  glowIntensity: 0.8, // 0-1
  latencyPulseThreshold: 100, // ms（この値を超えるとパルスが速くなる）
} as const;

/**
 * 現在のタスクに基づくアニメーション状態
 */
export interface AnimationState {
  currentTask: SchedulerTask | null;
  glowIntensity: number; // 0-1
  pulseSpeed: number; // 0-1（0=停止、1=最大速度）
  latencyPulse: boolean;
  averageLatency: number;
}

/**
 * アニメーション状態を取得
 */
export function getAnimationState(): AnimationState {
  const currentTask = megaSchedulerClient.getCurrentTask();
  const tasks = megaSchedulerClient.getTasks();
  const latencies = getAllLatencies();
  const latencyValues = latencies.map((l) => l.latency);
  const averageLatency = latencyValues.length > 0
    ? latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length
    : 0;

  // グロー強度: 実行中のタスクがある場合は高く、完了に近づくほど低く
  let glowIntensity = 0;
  if (currentTask) {
    const completedTasks = tasks.filter((t) => t.completed).length;
    const totalTasks = tasks.length;
    const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;
    // 実行中は強く、完了に近づくほど弱く
    glowIntensity = currentTask ? ALPHA_FLOW_CONFIG.glowIntensity * (1 - progress * 0.5) : 0;
  }

  // パルス速度: レイテンシが高いほど速く
  const pulseSpeed = averageLatency > ALPHA_FLOW_CONFIG.latencyPulseThreshold
    ? Math.min(1, averageLatency / (ALPHA_FLOW_CONFIG.latencyPulseThreshold * 2))
    : 0.5;

  // レイテンシパルス: レイテンシが高い場合に有効
  const latencyPulse = averageLatency > ALPHA_FLOW_CONFIG.latencyPulseThreshold;

  return {
    currentTask,
    glowIntensity,
    pulseSpeed,
    latencyPulse,
    averageLatency,
  };
}

/**
 * アニメーション状態の変更を監視
 */
export function watchAnimationState(
  callback: (state: AnimationState) => void,
  interval: number = 500 // 500ms間隔
): () => void {
  let isRunning = true;

  const update = () => {
    if (!isRunning) return;
    const state = getAnimationState();
    callback(state);
  };

  // 初回実行
  update();

  // 定期更新
  const intervalId = setInterval(update, interval);

  // スケジューラー変更リスナー
  const unsubscribe = megaSchedulerClient.onChange(() => {
    update();
  });

  // クリーンアップ関数
  return () => {
    isRunning = false;
    clearInterval(intervalId);
    unsubscribe();
  };
}

/**
 * CSS変数を更新（アニメーション状態を反映）
 */
export function updateAnimationCSS(state: AnimationState): void {
  const root = document.documentElement;
  
  // グロー強度
  root.style.setProperty('--dc-glow-intensity', state.glowIntensity.toString());
  
  // パルス速度（アニメーション継続時間として使用）
  const pulseDuration = ALPHA_FLOW_CONFIG.pulseInterval / (1 + state.pulseSpeed);
  root.style.setProperty('--dc-pulse-duration', `${pulseDuration}ms`);
  
  // レイテンシパルス
  root.style.setProperty('--dc-latency-pulse', state.latencyPulse ? '1' : '0');
  
  // 平均レイテンシ
  root.style.setProperty('--dc-average-latency', `${state.averageLatency}ms`);
}

