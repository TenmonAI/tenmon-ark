/**
 * Dashboard v13 Status Panel
 * Memory / Device / Reasoning の状態を可視化
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Cpu, Database, Brain, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';

interface StatusPanelProps {
  className?: string;
}

interface SystemStatus {
  memory: {
    stm: number;
    mtm: number;
    ltm: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  device: {
    connected: number;
    total: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  reasoning: {
    active: number;
    queue: number;
    status: 'healthy' | 'warning' | 'critical';
  };
}

export function StatusPanel({ className = '' }: StatusPanelProps) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // スロットリング状態を取得（Atlas Chat）
  const { data: throttleStatus } = trpc.atlasChat.getThrottleStatus.useQuery(undefined, {
    refetchInterval: 5000, // 5秒ごとに更新
  });

  useEffect(() => {
    // システム状態を取得（簡易版）
    const fetchStatus = async () => {
      try {
        // TODO: 実際のAPIから状態を取得
        // 現在はモックデータ
        setStatus({
          memory: {
            stm: 10,
            mtm: 25,
            ltm: 100,
            status: 'healthy',
          },
          device: {
            connected: 3,
            total: 5,
            status: 'healthy',
          },
          reasoning: {
            active: throttleStatus?.running || 0,
            queue: throttleStatus?.waiting || 0,
            status: (throttleStatus?.running || 0) < 3 ? 'healthy' : 'warning',
          },
        });
      } catch (error) {
        console.error('[StatusPanel] Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // 10秒ごとに更新

    return () => clearInterval(interval);
  }, [throttleStatus]);

  if (isLoading || !status) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <Activity className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Healthy</Badge>;
      case 'warning':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Warning</Badge>;
      case 'critical':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Critical</Badge>;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          System Status
        </CardTitle>
        <CardDescription>Memory / Device / Reasoning の状態</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Memory Status */}
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-blue-500" />
            <div>
              <div className="font-semibold text-sm">Memory Kernel</div>
              <div className="text-xs text-muted-foreground">
                STM: {status.memory.stm} | MTM: {status.memory.mtm} | LTM: {status.memory.ltm}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(status.memory.status)}
            {getStatusBadge(status.memory.status)}
          </div>
        </div>

        {/* Device Status */}
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-purple-500" />
            <div>
              <div className="font-semibold text-sm">Device Cluster</div>
              <div className="text-xs text-muted-foreground">
                {status.device.connected} / {status.device.total} devices connected
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(status.device.status)}
            {getStatusBadge(status.device.status)}
          </div>
        </div>

        {/* Reasoning Status */}
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-orange-500" />
            <div>
              <div className="font-semibold text-sm">Reasoning Core</div>
              <div className="text-xs text-muted-foreground">
                Active: {status.reasoning.active} | Queue: {status.reasoning.queue}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(status.reasoning.status)}
            {getStatusBadge(status.reasoning.status)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

