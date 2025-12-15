/**
 * Device Information
 * 端末の"個体魂"を取得
 */

import os from "os";
import { v4 as uuidv4 } from "uuid";

export interface DeviceInfo {
  deviceId: string;
  hostname: string;
  platform: string;
  arch: string;
}

/**
 * デバイス情報を取得
 * MVPでは毎回生成でOK（後で永続化する）
 */
export function getDeviceInfo(): DeviceInfo {
  return {
    deviceId: uuidv4(),
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
  };
}

