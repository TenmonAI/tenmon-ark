/**
 * Device Cluster Dashboard
 * デバイスクラスター管理UI
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, MousePointer, Upload, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/_core/hooks/useAuth';
import { move, click } from '../cursorBridge/cursorClient';
import { teleportFile } from '../fileTeleport/teleportSender';
import { getLatency, getAllLatencies } from '../sync/latencyMap';
import { syncTime } from '../sync/timeSync';
import { connectNativeAgent } from '../native/nativeBridge';
import { detectCapabilities } from '../native/capabilityDetector';
import { transferFile } from '../fastlane/arkQuicClient';
import { getAverageSpeed, getMaxSpeed } from '../fastlane/speedMeter';
import { ClusterStatusPanel } from './ClusterStatusPanel';

interface DeviceInfo {
  id: string;
  name: string;
  ip: string;
  type: 'mac' | 'windows' | 'ipad' | 'iphone' | 'android' | 'homepod' | 'iot';
  capabilities: {
    cursor: boolean;
    fileTeleport: boolean;
    display: boolean;
    keyboard: boolean;
    gesture: boolean;
  };
  lastSeen: string;
}

export default function DeviceClusterDashboard() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [latencies, setLatencies] = useState<Map<string, number>>(new Map());
  const [capabilities, setCapabilities] = useState<any>(null);
  const [fastLaneSpeed, setFastLaneSpeed] = useState<number | null>(null);

  const isFounder = user && (user.plan === 'founder' || user.plan === 'dev');

  useEffect(() => {
    if (isFounder) {
      loadDevices();
      syncTime();
      // デバイス能力を検出
      const caps = detectCapabilities();
      setCapabilities(caps);
    }
  }, [isFounder]);

  const loadDevices = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/deviceCluster-v3/registry/list');
      if (response.ok) {
        const data = await response.json() as { devices: DeviceInfo[] };
        setDevices(data.devices);
      }
    } catch (error) {
      console.error('[Device Cluster] Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const response = await fetch('/api/deviceCluster-v3/discovery/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        await loadDevices();
      }
    } catch (error) {
      console.error('[Device Cluster] Scan error:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleTestCursor = async (deviceId: string) => {
    try {
      await move(100, 100, deviceId);
      await click('left', 100, 100, deviceId);
    } catch (error) {
      console.error('[Device Cluster] Cursor test error:', error);
    }
  };

  const handleTestTeleport = async (deviceId: string) => {
    try {
      // テスト用のダミーファイルを作成
      const blob = new Blob(['Test file content'], { type: 'text/plain' });
      const file = new File([blob], 'test.txt', { type: 'text/plain' });
      await teleportFile({ file, targetDeviceId: deviceId });
    } catch (error) {
      console.error('[Device Cluster] Teleport test error:', error);
    }
  };

  const handleTestNativeConnection = async (deviceId: string) => {
    try {
      await connectNativeAgent(deviceId);
      await loadDevices();
    } catch (error) {
      console.error('[Device Cluster] Native connection test error:', error);
    }
  };

  const handleFastLaneSpeedTest = async () => {
    try {
      // テスト用のダミーファイルを作成（100MB）
      const testData = new Uint8Array(100 * 1024 * 1024);
      const blob = new Blob([testData], { type: 'application/octet-stream' });
      const file = new File([blob], 'speedtest.bin', { type: 'application/octet-stream' });

      const startTime = Date.now();
      await transferFile(file, {
        serverUrl: '/api/deviceCluster-v3/fastlane',
        deviceId: 'local',
      }, (progress) => {
        setFastLaneSpeed(progress.speed);
      });
      const endTime = Date.now();

      const avgSpeed = getAverageSpeed();
      const maxSpeed = getMaxSpeed();
      console.log('FastLane Speed Test:', { avgSpeed, maxSpeed });
    } catch (error) {
      console.error('[Device Cluster] FastLane speed test error:', error);
    }
  };

  const updateLatencies = () => {
    const allLatencies = getAllLatencies();
    const latencyMap = new Map<string, number>();
    allLatencies.forEach(record => {
      latencyMap.set(record.deviceId, record.latency);
    });
    setLatencies(latencyMap);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      updateLatencies();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isFounder) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">この機能はFounder/Devプランのみ利用可能です</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">DeviceCluster OS v3 (β)</h1>
        <p className="text-muted-foreground">
          すべてのデバイスを統合・制御
        </p>
      </div>

      {/* Cluster Status Panel (MegaScheduler統合) */}
      <ClusterStatusPanel />

      {/* スキャンボタン */}
      <Card>
        <CardHeader>
          <CardTitle>デバイス検出</CardTitle>
          <CardDescription>
            ネットワーク上のデバイスをスキャン
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                スキャン中...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                デバイスをスキャン
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* デバイス能力マップ */}
      {capabilities && (
        <Card>
          <CardHeader>
            <CardTitle>デバイス能力</CardTitle>
            <CardDescription>
              現在のデバイスの能力
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">OS</p>
                <p className="text-sm font-semibold">{capabilities.os}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">解像度</p>
                <p className="text-sm font-semibold">
                  {capabilities.resolution ? `${capabilities.resolution.width} × ${capabilities.resolution.height}` : 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">GPU</p>
                <p className="text-sm font-semibold">{capabilities.gpu ? '有' : '無'}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">WebRTC</p>
                <p className="text-sm font-semibold">{capabilities.webrtc ? '有' : '無'}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">カーソルホスト</p>
                <p className="text-sm font-semibold">{capabilities.cursorHost ? '可能' : '不可'}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">ファイルホスト</p>
                <p className="text-sm font-semibold">{capabilities.fileHost ? '可能' : '不可'}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">ディスプレイユニット</p>
                <p className="text-sm font-semibold">{capabilities.displayUnit ? '有' : '無'}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">オーディオユニット</p>
                <p className="text-sm font-semibold">{capabilities.audioUnit ? '有' : '無'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FastLane Speed Test */}
      <Card>
        <CardHeader>
          <CardTitle>FastLane Engine</CardTitle>
          <CardDescription>
            超高速転送プロトコル（1〜5Gbps想定）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleFastLaneSpeedTest}
            variant="outline"
          >
            ArkQuic SpeedTest
          </Button>
          {fastLaneSpeed !== null && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">転送速度</p>
              <p className="text-sm font-semibold">
                {(fastLaneSpeed / (1024 * 1024)).toFixed(2)} MB/s
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* デバイス一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>接続デバイス</CardTitle>
          <CardDescription>
            検出されたデバイス一覧
          </CardDescription>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              デバイスが検出されていません
            </p>
          ) : (
            <div className="space-y-2">
              {devices.map(device => (
                <div
                  key={device.id}
                  className="p-3 border rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{device.name}</span>
                        <Badge>{device.type}</Badge>
                        <Badge variant="outline">{device.ip}</Badge>
                        {latencies.has(device.id) && (
                          <Badge className="bg-blue-100 text-blue-800">
                            {latencies.get(device.id)}ms
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {device.capabilities.cursor && <Badge variant="outline">Cursor</Badge>}
                        {device.capabilities.fileTeleport && <Badge variant="outline">Teleport</Badge>}
                        {device.capabilities.display && <Badge variant="outline">Display</Badge>}
                        {device.capabilities.keyboard && <Badge variant="outline">Keyboard</Badge>}
                        {device.capabilities.gesture && <Badge variant="outline">Gesture</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        最終確認: {new Date(device.lastSeen).toLocaleString('ja-JP')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {device.capabilities.cursor && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestCursor(device.id)}
                        >
                          <MousePointer className="w-4 h-4 mr-1" />
                          カーソルテスト
                        </Button>
                      )}
                      {device.capabilities.fileTeleport && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestTeleport(device.id)}
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          テレポートテスト
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestNativeConnection(device.id)}
                      >
                        <Wifi className="w-4 h-4 mr-1" />
                        ネイティブ接続テスト
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

