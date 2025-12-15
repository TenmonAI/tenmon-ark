/**
 * Native Registry
 * ネイティブデバイスのレジストリ
 */

import type { DeviceInfo, DeviceCapabilities } from '../registry/deviceRegistry';

export interface NativeDeviceInfo extends DeviceInfo {
  nativeAgentConnected: boolean;
  secureLinkEstablished: boolean;
  capabilities: DeviceCapabilities & {
    cursorHost: boolean;
    fileHost: boolean;
    displayUnit: boolean;
    audioUnit: boolean;
  };
}

// ネイティブデバイスレジストリ（in-memory）
const nativeDevices: Map<string, NativeDeviceInfo> = new Map();

/**
 * ネイティブエージェントを登録
 */
export function registerNativeAgent(device: NativeDeviceInfo): void {
  nativeDevices.set(device.id, {
    ...device,
    nativeAgentConnected: true,
    lastSeen: new Date().toISOString(),
  });
}

/**
 * ネイティブリンク状態を更新
 */
export function updateNativeLinkStatus(deviceId: string, secureLinkEstablished: boolean): void {
  const device = nativeDevices.get(deviceId);
  if (device) {
    nativeDevices.set(deviceId, {
      ...device,
      secureLinkEstablished,
      lastSeen: new Date().toISOString(),
    });
  }
}

/**
 * 能力をマージ
 */
export function mergeCapabilities(deviceId: string, newCapabilities: Partial<NativeDeviceInfo['capabilities']>): void {
  const device = nativeDevices.get(deviceId);
  if (device) {
    nativeDevices.set(deviceId, {
      ...device,
      capabilities: {
        ...device.capabilities,
        ...newCapabilities,
      },
      lastSeen: new Date().toISOString(),
    });
  }
}

/**
 * ネイティブデバイス一覧を取得
 */
export function listNativeDevices(): NativeDeviceInfo[] {
  return Array.from(nativeDevices.values());
}

/**
 * ネイティブデバイスを取得
 */
export function getNativeDevice(deviceId: string): NativeDeviceInfo | undefined {
  return nativeDevices.get(deviceId);
}

