/**
 * Device Registry
 * デバイス一覧を保持する registry（in-memory）
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
  cursorHost: boolean; // カーソルホスト可能
  fileHost: boolean; // ファイルホスト可能
  displayUnit: boolean; // ディスプレイユニット
  audioUnit: boolean; // オーディオユニット
}

/**
 * DeviceCluster の安全停止フラグ
 * デバイス異常時にクラスタ全体が落ちないようにする
 */
export interface DeviceClusterSafetyState {
  isSafeShutdown: boolean; // 安全停止フラグ
  shutdownReason?: string; // 停止理由
  shutdownAt?: string; // 停止時刻
  emergencyStop: boolean; // 緊急停止フラグ
  emergencyReason?: string; // 緊急停止理由
}

// デバイスレジストリ（in-memory）
const devices: Map<string, DeviceInfo> = new Map();

// 安全停止フラグ（グローバル）
let safetyState: DeviceClusterSafetyState = {
  isSafeShutdown: false,
  emergencyStop: false,
};

/**
 * 安全停止フラグを設定
 * 
 * @param reason 停止理由
 */
export function setSafeShutdown(reason?: string): void {
  safetyState = {
    isSafeShutdown: true,
    shutdownReason: reason || "Manual shutdown",
    shutdownAt: new Date().toISOString(),
    emergencyStop: false,
  };
  console.log(`[DeviceCluster] Safe shutdown activated: ${reason || "Manual shutdown"}`);
}

/**
 * 安全停止フラグを解除
 */
export function clearSafeShutdown(): void {
  safetyState = {
    isSafeShutdown: false,
    emergencyStop: false,
  };
  console.log("[DeviceCluster] Safe shutdown cleared");
}

/**
 * 緊急停止フラグを設定
 * 
 * @param reason 緊急停止理由
 */
export function setEmergencyStop(reason: string): void {
  safetyState = {
    isSafeShutdown: true,
    emergencyStop: true,
    emergencyReason: reason,
    shutdownAt: new Date().toISOString(),
  };
  console.error(`[DeviceCluster] EMERGENCY STOP activated: ${reason}`);
}

/**
 * 安全停止状態を取得
 */
export function getSafetyState(): DeviceClusterSafetyState {
  return { ...safetyState };
}

/**
 * 安全停止チェック
 * 安全停止フラグが立っている場合は操作を拒否
 * 
 * @param operation 操作名
 * @returns 操作が許可されるか
 */
export function checkSafetyState(operation: string): { allowed: boolean; reason?: string } {
  if (safetyState.emergencyStop) {
    return {
      allowed: false,
      reason: `Emergency stop active: ${safetyState.emergencyReason || "Unknown reason"}`,
    };
  }

  if (safetyState.isSafeShutdown) {
    return {
      allowed: false,
      reason: `Safe shutdown active: ${safetyState.shutdownReason || "Unknown reason"}`,
    };
  }

  return { allowed: true };
}

/**
 * デバイスを登録
 */
export function register(device: DeviceInfo): void {
  // 安全停止チェック
  const safetyCheck = checkSafetyState("register");
  if (!safetyCheck.allowed) {
    throw new Error(`Device registration blocked: ${safetyCheck.reason}`);
  }

  devices.set(device.id, {
    ...device,
    lastSeen: new Date().toISOString(),
  });
}

/**
 * デバイス情報を更新
 */
export function update(deviceId: string, updates: Partial<DeviceInfo>): void {
  // 安全停止チェック
  const safetyCheck = checkSafetyState("update");
  if (!safetyCheck.allowed) {
    throw new Error(`Device update blocked: ${safetyCheck.reason}`);
  }

  const device = devices.get(deviceId);
  if (device) {
    devices.set(deviceId, {
      ...device,
      ...updates,
      lastSeen: new Date().toISOString(),
    });
  }
}

/**
 * デバイス一覧を取得
 */
export function list(): DeviceInfo[] {
  return Array.from(devices.values());
}

/**
 * デバイスを取得
 */
export function get(deviceId: string): DeviceInfo | undefined {
  return devices.get(deviceId);
}

/**
 * デバイスを削除
 */
export function remove(deviceId: string): void {
  // 安全停止チェック
  const safetyCheck = checkSafetyState("remove");
  if (!safetyCheck.allowed) {
    throw new Error(`Device removal blocked: ${safetyCheck.reason}`);
  }

  devices.delete(deviceId);
}

