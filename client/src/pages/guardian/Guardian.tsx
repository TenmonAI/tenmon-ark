/**
 * Guardian Mode UI
 * 個人守護AI画面
 */

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

export default function Guardian() {
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const { data: deviceStatus, refetch: refetchDevice } = trpc.guardian.scanDevice.useQuery();


  useEffect(() => {
    // 10秒ごとに自動更新
    const interval = setInterval(() => {
      refetchDevice();
    }, 10000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [refetchDevice]);

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case "safe":
        return "bg-green-500";
      case "low":
        return "bg-yellow-500";
      case "medium":
        return "bg-orange-500";
      case "high":
        return "bg-red-500";
      case "critical":
        return "bg-red-700";
      default:
        return "bg-gray-500";
    }
  };

  const getThreatLevelText = (level: string) => {
    switch (level) {
      case "safe":
        return "安全";
      case "low":
        return "低";
      case "medium":
        return "中";
      case "high":
        return "高";
      case "critical":
        return "極めて危険";
      default:
        return "不明";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🛡️ Guardian Mode</h1>
          <p className="text-muted-foreground">個人守護AI - デバイスとネットワークを保護</p>
        </div>
        <Button onClick={() => refetchDevice()} variant="outline">
          <Shield className="h-4 w-4 mr-2" />
          再スキャン
        </Button>
      </div>

      {/* デバイス保護ダッシュボード */}
      <Card>
        <CardHeader>
          <CardTitle>デバイス保護ステータス</CardTitle>
          <CardDescription>現在のデバイスの安全性</CardDescription>
        </CardHeader>
        <CardContent>
          {deviceStatus ? (
            <div className="space-y-4">
              {/* 保護ステータス */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">保護ステータス</span>
                  <Badge className="bg-green-500">有効</Badge>
                </div>
              </div>

              {/* 保護機能 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  {deviceStatus.cameraProtection ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">カメラ保護</span>
                </div>
                <div className="flex items-center gap-2">
                  {deviceStatus.microphoneProtection ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">マイク保護</span>
                </div>
                <div className="flex items-center gap-2">
                  {deviceStatus.locationProtection ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">位置情報保護</span>
                </div>
                <div className="flex items-center gap-2">
                  {deviceStatus.networkProtection ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm">ネットワーク保護</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
}
