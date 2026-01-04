/**
 * Device Scanner
 * mDNS / LAN スキャンでデバイスを検出する stub
 */

export interface DeviceInfo {
  id: string;
  name: string;
  ip: string;
  type: 'mac' | 'windows' | 'ipad' | 'iphone' | 'android' | 'homepod' | 'iot';
  capabilities: DeviceCapabilities;
  lastSeen: string;
}

export interface DeviceCapabilities {
  cursor: boolean;
  fileTeleport: boolean;
  display: boolean;
  keyboard: boolean;
  gesture: boolean;
}

/**
 * デバイスをスキャン（stub）
 * TODO: mDNS / LAN スキャンを実装
 */
export async function scanDevices(): Promise<DeviceInfo[]> {
  // TODO: mDNS / LAN スキャンを実装
  return [];
}

/**
 * デバイスを検出（stub）
 * TODO: WebRTC handshake の準備
 */
export async function discoverDevice(deviceId: string): Promise<DeviceInfo | null> {
  // TODO: デバイス検出ロジックを実装
  return null;
}

