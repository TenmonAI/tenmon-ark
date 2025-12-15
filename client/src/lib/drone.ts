/**
 * ============================================================
 *  DRONE — 低周波ドローン
 * ============================================================
 * 
 * 地球が回る音
 * Web Audio API による低周波ドローン
 * 音響同期対応（NTP同期）
 * ============================================================
 */

import { getAudioContext, syncNTP, startDriftCorrection } from './audioSync';

let ctx: AudioContext | null = null;
let osc: OscillatorNode | null = null;
let gain: GainNode | null = null;

/**
 * ドローンを開始
 * 
 * @param serverTimestamp サーバー時刻（NTP同期用、省略可）
 */
export function startDrone(serverTimestamp?: number): void {
  if (ctx) return; // 既に開始済み

  try {
    // NTP同期（サーバー時刻が提供された場合）
    if (serverTimestamp) {
      syncNTP(serverTimestamp);
    }

    ctx = getAudioContext();
    osc = ctx.createOscillator();
    gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 48; // 地球的ドローン（低周波）
    gain.gain.value = 0.03; // 控えめな音量

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    // ドリフト補正はWebSocket経由で実装（別途実装）
  } catch (error) {
    console.warn('[Drone] Failed to start drone:', error);
  }
}

/**
 * ドローンを停止
 */
export function stopDrone(): void {
  try {
    osc?.stop();
    ctx?.close();
    ctx = null;
    osc = null;
    gain = null;
  } catch (error) {
    console.warn('[Drone] Failed to stop drone:', error);
  }
}

/**
 * ドローン状態を取得
 */
export function isDroneActive(): boolean {
  return ctx !== null && ctx.state === 'running';
}

