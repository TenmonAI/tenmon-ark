/**
 * Device Layout
 * 物理ディスプレイ配置モデル
 */

export interface DeviceLayout {
  deviceId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * デバイスを右側に配置
 */
export function rightOf(baseDevice: DeviceLayout, newDevice: DeviceLayout): DeviceLayout {
  return {
    ...newDevice,
    x: baseDevice.x + baseDevice.width,
    y: baseDevice.y,
  };
}

/**
 * デバイスを左側に配置
 */
export function leftOf(baseDevice: DeviceLayout, newDevice: DeviceLayout): DeviceLayout {
  return {
    ...newDevice,
    x: baseDevice.x - newDevice.width,
    y: baseDevice.y,
  };
}

/**
 * デバイスを上側に配置
 */
export function above(baseDevice: DeviceLayout, newDevice: DeviceLayout): DeviceLayout {
  return {
    ...newDevice,
    x: baseDevice.x,
    y: baseDevice.y - newDevice.height,
  };
}

/**
 * デバイスを下側に配置
 */
export function below(baseDevice: DeviceLayout, newDevice: DeviceLayout): DeviceLayout {
  return {
    ...newDevice,
    x: baseDevice.x,
    y: baseDevice.y + baseDevice.height,
  };
}

