/**
 * Device Adapter
 * デバイスAPIの抽象化レイヤー
 * Web環境、Android、iOSに対応
 */

export interface DeviceInfo {
  id: string;
  name: string;
  platform: 'web' | 'android' | 'ios';
  capabilities: DeviceCapabilities;
}

export interface DeviceStatus {
  connected: boolean;
  battery?: {
    level: number; // 0-1
    charging: boolean;
  };
  network?: {
    type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
    effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
    downlink?: number;
  };
  gps?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  sensors?: {
    accelerometer: boolean;
    gyroscope: boolean;
    magnetometer: boolean;
  };
}

export interface DeviceCapabilities {
  gps: boolean;
  battery: boolean;
  network: boolean;
  phone: boolean;
  sms: boolean;
  bluetooth: boolean;
  sensors: boolean;
}

export interface DeviceAdapter {
  connect(): Promise<DeviceInfo>;
  disconnect(): Promise<void>;
  getStatus(): Promise<DeviceStatus>;
  makeCall(phoneNumber: string): Promise<{ success: boolean; error?: string }>;
  sendSMS(phoneNumber: string, message: string): Promise<{ success: boolean; error?: string }>;
  getGPS(): Promise<{ latitude: number; longitude: number; accuracy: number } | null>;
  getSensors(): Promise<DeviceStatus['sensors'] | null>;
}

/**
 * Web環境用Device Adapter
 */
export class WebDeviceAdapter implements DeviceAdapter {
  private connected = false;
  private deviceId: string | null = null;
  private watchId: number | null = null;

  async connect(): Promise<DeviceInfo> {
    if (this.connected) {
      return this.getDeviceInfo();
    }

    try {
      // デバイスIDを生成（セッションごと）
      this.deviceId = `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      this.connected = true;

      return this.getDeviceInfo();
    } catch (error) {
      throw new Error(`Failed to connect device: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      // GPS監視を停止
      if (this.watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
      }

      this.connected = false;
      this.deviceId = null;
    } catch (error) {
      console.warn('Error during disconnect:', error);
      // 切断は常に成功とする
    }
  }

  async getStatus(): Promise<DeviceStatus> {
    if (!this.connected) {
      throw new Error('Device not connected');
    }

    const status: DeviceStatus = {
      connected: true,
    };

    // バッテリー情報取得（エラーハンドリング統一）
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        status.battery = {
          level: battery.level,
          charging: battery.charging,
        };
      }
    } catch (error) {
      console.warn('Failed to get battery status:', error);
      // バッテリー情報はオプション
    }

    // ネットワーク情報取得（エラーハンドリング統一）
    try {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (connection) {
          status.network = {
            type: connection.type || 'unknown',
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
          };
        }
      }
    } catch (error) {
      console.warn('Failed to get network status:', error);
      // ネットワーク情報はオプション
    }

    // GPS情報取得（エラーハンドリング統一）
    try {
      const gps = await this.getGPS();
      if (gps) {
        status.gps = gps;
      }
    } catch (error) {
      console.warn('Failed to get GPS status:', error);
      // GPS情報はオプション
    }

    // センサー情報（Web環境では限定的）
    status.sensors = {
      accelerometer: 'DeviceMotionEvent' in window,
      gyroscope: 'DeviceOrientationEvent' in window,
      magnetometer: false, // Web環境では利用不可
    };

    return status;
  }

  async makeCall(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    // Web環境では電話発信不可
    return {
      success: false,
      error: 'Phone calls are not supported in web environment. Native app required.',
    };
  }

  async sendSMS(phoneNumber: string, message: string): Promise<{ success: boolean; error?: string }> {
    // Web環境ではSMS送信不可
    return {
      success: false,
      error: 'SMS sending is not supported in web environment. Native app required.',
    };
  }

  async getGPS(): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
    if (!navigator.geolocation) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('GPS request timeout'));
      }, 10000); // 10秒タイムアウト

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeout);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          clearTimeout(timeout);
          // エラーハンドリング統一：ユーザーが拒否した場合もnullを返す
          if (error.code === error.PERMISSION_DENIED) {
            resolve(null);
          } else {
            reject(new Error(`GPS error: ${error.message}`));
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000, // 1分間キャッシュ
        }
      );
    });
  }

  async getSensors(): Promise<DeviceStatus['sensors'] | null> {
    // Web環境ではセンサー情報は限定的
    return {
      accelerometer: 'DeviceMotionEvent' in window,
      gyroscope: 'DeviceOrientationEvent' in window,
      magnetometer: false,
    };
  }

  private getDeviceInfo(): DeviceInfo {
    return {
      id: this.deviceId || 'unknown',
      name: 'Web Device',
      platform: 'web',
      capabilities: {
        gps: 'geolocation' in navigator,
        battery: 'getBattery' in navigator,
        network: 'connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator,
        phone: false,
        sms: false,
        bluetooth: false,
        sensors: 'DeviceMotionEvent' in window || 'DeviceOrientationEvent' in window,
      },
    };
  }
}

/**
 * 環境に応じて適切なAdapterを返す
 */
export function createDeviceAdapter(): DeviceAdapter {
  // 現在はWeb環境のみサポート
  return new WebDeviceAdapter();
}

