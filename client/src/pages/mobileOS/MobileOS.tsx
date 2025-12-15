/**
 * Mobile OS Page
 * デバイス接続・管理ページ
 */

import { DeviceConnectionPanel } from '@/components/mobile/DeviceConnectionPanel';

export default function MobileOS() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Mobile OS - デバイス接続</h1>
        <DeviceConnectionPanel />
      </div>
    </div>
  );
}

