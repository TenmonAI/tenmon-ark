/**
 * 🔱 DeviceCluster Status Panel
 * MegaScheduler の進行状況を DeviceCluster OS に統合
 * 
 * 機能:
 * - フェーズ別進行状況表示（PHASE 3.x, 4.x, 5.x）
 * - latencyProbe、deviceStatus、cursorBridge readiness の統合
 * - リアルタイム更新
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { megaSchedulerClient, type SchedulerTask, type SchedulerState } from "@/lib/scheduler/megaSchedulerClient";
import { getAllLatencies } from "../sync/latencyMap";
import { Activity, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { watchAnimationState, updateAnimationCSS } from "./animations";
import "@/styles/deviceCluster.css";

interface ClusterStatus {
  latencyProbe: {
    average: number;
    max: number;
    min: number;
    devices: number;
  };
  deviceStatus: {
    total: number;
    connected: number;
    ready: number;
  };
  cursorBridge: {
    ready: boolean;
    connectedDevices: number;
  };
}

export function ClusterStatusPanel() {
  const [schedulerState, setSchedulerState] = useState<SchedulerState | null>(null);
  const [clusterStatus, setClusterStatus] = useState<ClusterStatus | null>(null);

  // スケジューラー状態を取得
  useEffect(() => {
    const fetchSchedulerState = async () => {
      await megaSchedulerClient.fetchTasks();
      setSchedulerState(megaSchedulerClient.getState());
    };

    fetchSchedulerState();

    const unsubscribe = megaSchedulerClient.onChange(() => {
      setSchedulerState(megaSchedulerClient.getState());
    });

    // ポーリングを開始（5秒間隔）
    megaSchedulerClient.startPolling(5000);

    return () => {
      unsubscribe();
      megaSchedulerClient.stopPolling();
    };
  }, []);

  // アニメーション状態を監視・更新
  useEffect(() => {
    const unsubscribe = watchAnimationState((state) => {
      updateAnimationCSS(state);
    }, 500);

    return () => {
      unsubscribe();
    };
  }, []);

  // クラスター状態を更新
  useEffect(() => {
    const updateClusterStatus = () => {
      // Latency Probe
      const latencies = getAllLatencies();
      const latencyValues = latencies.map((l) => l.latency);
      const latencyProbe = {
        average: latencyValues.length > 0
          ? Math.round(latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length)
          : 0,
        max: latencyValues.length > 0 ? Math.max(...latencyValues) : 0,
        min: latencyValues.length > 0 ? Math.min(...latencyValues) : 0,
        devices: latencies.length,
      };

      // Device Status（TODO: 実際のデバイス状態を取得）
      const deviceStatus = {
        total: 0, // TODO: 実際のデバイス数を取得
        connected: 0, // TODO: 接続中のデバイス数を取得
        ready: 0, // TODO: 準備完了のデバイス数を取得
      };

      // Cursor Bridge（TODO: 実際のCursorBridge状態を取得）
      const cursorBridge = {
        ready: false, // TODO: CursorBridgeの準備状態を取得
        connectedDevices: 0, // TODO: 接続中のデバイス数を取得
      };

      setClusterStatus({
        latencyProbe,
        deviceStatus,
        cursorBridge,
      });
    };

    updateClusterStatus();
    const interval = setInterval(updateClusterStatus, 2000); // 2秒間隔

    return () => clearInterval(interval);
  }, []);

  // フェーズ別にタスクをグループ化
  const getTasksByPhase = (phasePrefix: string): SchedulerTask[] => {
    if (!schedulerState) return [];
    return schedulerState.tasks.filter((task) => task.phase.startsWith(phasePrefix));
  };

  const phase3Tasks = getTasksByPhase("PHASE_3");
  const phase4Tasks = getTasksByPhase("PHASE_4");
  const phase5Tasks = getTasksByPhase("PHASE_5");

  const getPhaseProgress = (tasks: SchedulerTask[]): number => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter((t) => t.completed).length;
    return Math.round((completed / tasks.length) * 100);
  };

  return (
    <Card className="border-blue-200 dc-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          DeviceCluster Progress & Status
        </CardTitle>
        <CardDescription>
          MegaScheduler 進行状況と DeviceCluster 状態の統合表示
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 全体進行状況 */}
        {schedulerState && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">全体の進捗</span>
              <span className="font-semibold">
                {schedulerState.completedTasks} / {schedulerState.totalTasks} タスク完了 ({schedulerState.progress}%)
              </span>
            </div>
            <Progress value={schedulerState.progress} className="h-2" />
          </div>
        )}

        {/* フェーズ別進行状況 */}
        <div className="space-y-4">
          {/* PHASE 3.x */}
          {phase3Tasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">PHASE 3.x (DeviceCluster OS)</h3>
                <Badge variant="outline" className="text-xs">
                  {phase3Tasks.filter((t) => t.completed).length} / {phase3Tasks.length}
                </Badge>
              </div>
              <Progress value={getPhaseProgress(phase3Tasks)} className="h-1" />
            </div>
          )}

          {/* PHASE 4.x */}
          {phase4Tasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">PHASE 4.x (Release OS)</h3>
                <Badge variant="outline" className="text-xs">
                  {phase4Tasks.filter((t) => t.completed).length} / {phase4Tasks.length}
                </Badge>
              </div>
              <Progress value={getPhaseProgress(phase4Tasks)} className="h-1" />
            </div>
          )}

          {/* PHASE 5.x */}
          {phase5Tasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">PHASE 5.x (WorldLaunch OS)</h3>
                <Badge variant="outline" className="text-xs">
                  {phase5Tasks.filter((t) => t.completed).length} / {phase5Tasks.length}
                </Badge>
              </div>
              <Progress value={getPhaseProgress(phase5Tasks)} className="h-1" />
            </div>
          )}
        </div>

        {/* Cluster Status */}
        {clusterStatus && (
          <div className="space-y-4 pt-4 border-t">
            {/* Latency Probe */}
            <div className={`space-y-2 ${clusterStatus && clusterStatus.latencyProbe.average > 100 ? 'dc-latency-pulse' : ''}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Latency Probe
                </h3>
                <Badge variant="outline" className="text-xs">
                  {clusterStatus.latencyProbe.devices} devices
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2 bg-muted rounded">
                  <p className="text-muted-foreground">平均</p>
                  <p className="font-semibold">{clusterStatus.latencyProbe.average}ms</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-muted-foreground">最小</p>
                  <p className="font-semibold">{clusterStatus.latencyProbe.min}ms</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-muted-foreground">最大</p>
                  <p className="font-semibold">{clusterStatus.latencyProbe.max}ms</p>
                </div>
              </div>
            </div>

            {/* Device Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Device Status
                </h3>
                <Badge variant="outline" className="text-xs">
                  {clusterStatus.deviceStatus.connected} / {clusterStatus.deviceStatus.total} connected
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2 bg-muted rounded">
                  <p className="text-muted-foreground">総数</p>
                  <p className="font-semibold">{clusterStatus.deviceStatus.total}</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-muted-foreground">接続中</p>
                  <p className="font-semibold">{clusterStatus.deviceStatus.connected}</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-muted-foreground">準備完了</p>
                  <p className="font-semibold">{clusterStatus.deviceStatus.ready}</p>
                </div>
              </div>
            </div>

            {/* Cursor Bridge */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  {clusterStatus.cursorBridge.ready ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  )}
                  Cursor Bridge
                </h3>
                <Badge
                  variant={clusterStatus.cursorBridge.ready ? "default" : "outline"}
                  className={clusterStatus.cursorBridge.ready ? "bg-green-100 text-green-800 dc-cursor-bridge-ready" : ""}
                >
                  {clusterStatus.cursorBridge.ready ? "Ready" : "Not Ready"}
                </Badge>
              </div>
              <div className="p-2 bg-muted rounded text-xs">
                <p className="text-muted-foreground">接続デバイス数</p>
                <p className="font-semibold">{clusterStatus.cursorBridge.connectedDevices}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

