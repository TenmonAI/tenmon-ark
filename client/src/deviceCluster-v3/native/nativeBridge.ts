/**
 * Native Bridge
 * ネイティブエージェントとのブリッジ
 */

export interface NativeCapabilities {
  cursor: boolean;
  keyboard: boolean;
  fileTunnel: boolean;
  display: boolean;
  gesture: boolean;
  bluetooth: boolean;
  webrtc: boolean;
}

export interface NativeDeviceInfo {
  deviceId: string;
  platform: 'macos' | 'windows' | 'android' | 'ios';
  capabilities: NativeCapabilities;
  connected: boolean;
}

/**
 * ネイティブエージェントに接続（stub）
 * TODO: 実装
 */
export async function connectNativeAgent(deviceId: string): Promise<NativeDeviceInfo | null> {
  // TODO: ネイティブエージェントに接続
  return null;
}

/**
 * ネイティブエージェントから切断（stub）
 */
export async function disconnectNativeAgent(deviceId: string): Promise<void> {
  // TODO: ネイティブエージェントから切断
}

