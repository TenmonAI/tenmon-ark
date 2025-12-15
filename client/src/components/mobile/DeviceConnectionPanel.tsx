/**
 * Device Connection Panel
 * デバイス接続UI
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wifi, Battery, MapPin, Smartphone, X } from 'lucide-react';
import { createDeviceAdapter, type DeviceInfo, type DeviceStatus } from '@/mobileOS/device/deviceAdapter';

export function DeviceConnectionPanel() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adapter] = useState(() => createDeviceAdapter());

  // ステータス更新
  const updateStatus = async () => {
    if (!connected) return;

    try {
      const currentStatus = await adapter.getStatus();
      setStatus(currentStatus);
      setError(null);
    } catch (err) {
      console.warn('Failed to update status:', err);
      setError(err instanceof Error ? err.message : 'Failed to get status');
    }
  };

  // 接続
  const handleConnect = async () => {
    setConnecting(true);
    setError(null);

    try {
      const info = await adapter.connect();
      setDeviceInfo(info);
      setConnected(true);
      await updateStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  };

  // 切断
  const handleDisconnect = async () => {
    try {
      await adapter.disconnect();
      setConnected(false);
      setDeviceInfo(null);
      setStatus(null);
      setError(null);
    } catch (err) {
      console.warn('Error during disconnect:', err);
      // 切断は常に成功とする
      setConnected(false);
      setDeviceInfo(null);
      setStatus(null);
    }
  };

  // 定期的にステータス更新
  useEffect(() => {
    if (!connected) return;

    updateStatus();
    const interval = setInterval(updateStatus, 5000); // 5秒ごとに更新

    return () => clearInterval(interval);
  }, [connected]);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          デバイス接続
        </CardTitle>
        <CardDescription>
          Web環境でのデバイス機能へのアクセス
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 接続/切断ボタン */}
        <div className="flex gap-2">
          {!connected ? (
            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="flex-1"
            >
              {connecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  接続中...
                </>
              ) : (
                '接続'
              )}
            </Button>
          ) : (
            <Button
              onClick={handleDisconnect}
              variant="destructive"
              className="flex-1"
            >
              <X className="mr-2 h-4 w-4" />
              切断
            </Button>
          )}
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* デバイス情報 */}
        {deviceInfo && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">デバイス情報</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">ID:</span> {deviceInfo.id}
              </div>
              <div>
                <span className="text-muted-foreground">プラットフォーム:</span>{' '}
                <Badge variant="outline">{deviceInfo.platform}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">名前:</span> {deviceInfo.name}
              </div>
            </div>

            {/* 機能一覧 */}
            <div className="mt-4">
              <h4 className="font-semibold text-sm mb-2">利用可能な機能</h4>
              <div className="flex flex-wrap gap-2">
                {deviceInfo.capabilities.gps && (
                  <Badge variant="secondary">GPS</Badge>
                )}
                {deviceInfo.capabilities.battery && (
                  <Badge variant="secondary">バッテリー</Badge>
                )}
                {deviceInfo.capabilities.network && (
                  <Badge variant="secondary">ネットワーク</Badge>
                )}
                {deviceInfo.capabilities.sensors && (
                  <Badge variant="secondary">センサー</Badge>
                )}
                {!deviceInfo.capabilities.phone && (
                  <Badge variant="outline" className="opacity-50">電話（未対応）</Badge>
                )}
                {!deviceInfo.capabilities.sms && (
                  <Badge variant="outline" className="opacity-50">SMS（未対応）</Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ステータス表示 */}
        {status && (
          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold text-sm">ステータス</h3>

            {/* バッテリー情報 */}
            {status.battery && (
              <div className="flex items-center gap-2">
                <Battery className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  バッテリー: {Math.round(status.battery.level * 100)}%
                  {status.battery.charging && ' (充電中)'}
                </span>
              </div>
            )}

            {/* ネットワーク情報 */}
            {status.network && (
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  ネットワーク: {status.network.type}
                  {status.network.effectiveType && ` (${status.network.effectiveType})`}
                </span>
              </div>
            )}

            {/* GPS情報 */}
            {status.gps && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  GPS: {status.gps.latitude.toFixed(6)}, {status.gps.longitude.toFixed(6)}
                  {' '}(精度: {Math.round(status.gps.accuracy)}m)
                </span>
              </div>
            )}

            {/* センサー情報 */}
            {status.sensors && (
              <div className="text-sm">
                <span className="text-muted-foreground">センサー:</span>{' '}
                {status.sensors.accelerometer && <Badge variant="outline" className="mr-1">加速度</Badge>}
                {status.sensors.gyroscope && <Badge variant="outline" className="mr-1">ジャイロ</Badge>}
                {status.sensors.magnetometer && <Badge variant="outline" className="mr-1">磁気</Badge>}
                {!status.sensors.accelerometer && !status.sensors.gyroscope && !status.sensors.magnetometer && (
                  <span className="text-muted-foreground">利用不可</span>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

