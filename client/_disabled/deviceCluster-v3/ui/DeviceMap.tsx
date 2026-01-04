/**
 * Device Map
 * DisplaySpace の配置が視覚化される simple UI
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDisplaySpace } from '../displaySpace/spaceManager';

export default function DeviceMap() {
  const displaySpace = getDisplaySpace();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Display Space Map</CardTitle>
        <CardDescription>
          統合ディスプレイ空間の配置
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4" style={{
          width: `${Math.max(displaySpace.totalWidth, 800)}px`,
          height: `${Math.max(displaySpace.totalHeight, 600)}px`,
          minHeight: '400px',
        }}>
          {displaySpace.devices.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              デバイスが登録されていません
            </div>
          ) : (
            displaySpace.devices.map(device => (
              <div
                key={device.deviceId}
                className="absolute border-2 border-blue-500 bg-blue-50 rounded p-2"
                style={{
                  left: `${device.x}px`,
                  top: `${device.y}px`,
                  width: `${device.width}px`,
                  height: `${device.height}px`,
                }}
              >
                <div className="text-xs font-semibold">{device.deviceId}</div>
                <div className="text-xs text-muted-foreground">
                  {device.width} × {device.height}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

