/**
 * Capability Detector
 * デバイス能力判定
 */

export interface DeviceCapabilities {
  os: 'mac' | 'windows' | 'android' | 'ios' | 'unknown';
  resolution: { width: number; height: number } | null;
  gpu: boolean;
  pointerInjection: boolean;
  fileWrite: boolean;
  webrtc: boolean;
  bluetooth: boolean;
  cursorHost: boolean;
  fileHost: boolean;
  displayUnit: boolean;
  audioUnit: boolean;
}

/**
 * OS種別を検出
 */
export function detectOS(): 'mac' | 'windows' | 'android' | 'ios' | 'unknown' {
  if (typeof window === 'undefined') {
    return 'unknown';
  }

  const userAgent = window.navigator.userAgent.toLowerCase();

  if (userAgent.includes('mac')) {
    return 'mac';
  } else if (userAgent.includes('win')) {
    return 'windows';
  } else if (userAgent.includes('android')) {
    return 'android';
  } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
    return 'ios';
  }

  return 'unknown';
}

/**
 * 解像度を取得
 */
export function getResolution(): { width: number; height: number } | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return {
    width: window.screen.width,
    height: window.screen.height,
  };
}

/**
 * GPU有無を検出
 */
export function detectGPU(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  return gl !== null;
}

/**
 * Pointer injection可否を検出
 */
export function detectPointerInjection(): boolean {
  // TODO: Pointer injection が可能かどうかを検出
  return false;
}

/**
 * ファイル書き込み可否を検出
 */
export function detectFileWrite(): boolean {
  // TODO: ファイル書き込みが可能かどうかを検出
  return false;
}

/**
 * WebRTC可否を検出
 */
export function detectWebRTC(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return !!(window.RTCPeerConnection || (window as any).webkitRTCPeerConnection || (window as any).mozRTCPeerConnection);
}

/**
 * Bluetooth可否を検出
 */
export function detectBluetooth(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return 'bluetooth' in navigator;
}

/**
 * デバイス能力を検出
 */
export function detectCapabilities(): DeviceCapabilities {
  const os = detectOS();
  const resolution = getResolution();
  const gpu = detectGPU();
  const pointerInjection = detectPointerInjection();
  const fileWrite = detectFileWrite();
  const webrtc = detectWebRTC();
  const bluetooth = detectBluetooth();

  // カーソルホスト可能かどうか
  const cursorHost = (os === 'mac' || os === 'windows') && pointerInjection;

  // ファイルホスト可能かどうか
  const fileHost = fileWrite && webrtc;

  // ディスプレイユニットかどうか
  const displayUnit = resolution !== null && gpu;

  // オーディオユニットかどうか
  const audioUnit = webrtc;

  return {
    os,
    resolution,
    gpu,
    pointerInjection,
    fileWrite,
    webrtc,
    bluetooth,
    cursorHost,
    fileHost,
    displayUnit,
    audioUnit,
  };
}

