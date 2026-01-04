/**
 * Display Space Manager
 * 統合ディスプレイ空間を管理
 */

export interface DeviceLayout {
  deviceId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DisplaySpace {
  devices: DeviceLayout[];
  totalWidth: number;
  totalHeight: number;
}

const displaySpace: DisplaySpace = {
  devices: [],
  totalWidth: 0,
  totalHeight: 0,
};

/**
 * デバイスを登録
 */
export function registerDevice(deviceInfo: {
  deviceId: string;
  width: number;
  height: number;
}): void {
  const layout: DeviceLayout = {
    deviceId: deviceInfo.deviceId,
    x: 0,
    y: 0,
    width: deviceInfo.width,
    height: deviceInfo.height,
  };

  displaySpace.devices.push(layout);
  updateTotalDimensions();
}

/**
 * 絶対位置を計算
 */
export function computeAbsolutePosition(deviceId: string, localX: number, localY: number): { x: number; y: number } | null {
  const device = displaySpace.devices.find(d => d.deviceId === deviceId);
  if (!device) {
    return null;
  }

  return {
    x: device.x + localX,
    y: device.y + localY,
  };
}

/**
 * 総寸法を更新
 */
function updateTotalDimensions(): void {
  if (displaySpace.devices.length === 0) {
    displaySpace.totalWidth = 0;
    displaySpace.totalHeight = 0;
    return;
  }

  const maxX = Math.max(...displaySpace.devices.map(d => d.x + d.width));
  const maxY = Math.max(...displaySpace.devices.map(d => d.y + d.height));

  displaySpace.totalWidth = maxX;
  displaySpace.totalHeight = maxY;
}

/**
 * ディスプレイ空間を取得
 */
export function getDisplaySpace(): DisplaySpace {
  return { ...displaySpace };
}

