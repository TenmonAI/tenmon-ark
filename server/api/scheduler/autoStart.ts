/**
 * 🔱 MegaScheduler Auto-Startup API
 * サーバー起動時に自動で NEXT() を実行する
 */

import { Request, Response } from "express";

/**
 * MegaScheduler Auto-Start 状態
 */
let autoStartStatus: {
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  running: boolean;
} = {
  enabled: false,
  running: false,
};

/**
 * Auto-Start を有効化
 */
export function enableAutoStart(): void {
  autoStartStatus.enabled = true;
  console.log("[MegaScheduler] Auto-Start enabled");
}

/**
 * Auto-Start を無効化
 */
export function disableAutoStart(): void {
  autoStartStatus.enabled = false;
  console.log("[MegaScheduler] Auto-Start disabled");
}

/**
 * Auto-Start の状態を取得
 */
export function getAutoStartStatus() {
  return { ...autoStartStatus };
}

/**
 * Auto-Start を実行中としてマーク
 */
export function setAutoStartRunning(running: boolean): void {
  autoStartStatus.running = running;
  if (running) {
    autoStartStatus.lastRun = new Date();
  }
}

/**
 * Auto-Start API エンドポイント
 * GET /api/scheduler/autostart/status
 */
export async function getAutoStartStatusEndpoint(req: Request, res: Response) {
  try {
    res.json({
      success: true,
      status: getAutoStartStatus(),
    });
  } catch (error) {
    console.error("[MegaScheduler] Error getting auto-start status:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Auto-Start API エンドポイント
 * POST /api/scheduler/autostart/enable
 */
export async function enableAutoStartEndpoint(req: Request, res: Response) {
  try {
    enableAutoStart();
    res.json({
      success: true,
      message: "Auto-Start enabled",
      status: getAutoStartStatus(),
    });
  } catch (error) {
    console.error("[MegaScheduler] Error enabling auto-start:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Auto-Start API エンドポイント
 * POST /api/scheduler/autostart/disable
 */
export async function disableAutoStartEndpoint(req: Request, res: Response) {
  try {
    disableAutoStart();
    res.json({
      success: true,
      message: "Auto-Start disabled",
      status: getAutoStartStatus(),
    });
  } catch (error) {
    console.error("[MegaScheduler] Error disabling auto-start:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Auto-Start を実行（サーバー起動時に呼び出される）
 * この関数は /api/scheduler/next を内部で呼び出す
 */
export async function runAutoStart(): Promise<void> {
  if (!autoStartStatus.enabled) {
    console.log("[MegaScheduler] Auto-Start is disabled, skipping");
    return;
  }

  if (autoStartStatus.running) {
    console.log("[MegaScheduler] Auto-Start is already running, skipping");
    return;
  }

  try {
    setAutoStartRunning(true);
    console.log("[MegaScheduler] Auto-Start: Triggering NEXT()...");

    // 内部で /api/scheduler/next を呼び出す
    // 注意: この実装は将来の /api/scheduler/next エンドポイントに依存
    // 現時点ではログのみ出力
    console.log("[MegaScheduler] Auto-Start: NEXT() would be triggered here");

    // TODO: 実際の NEXT() 実装が完成したら、以下を有効化
    // const nextResponse = await fetch("http://localhost:3000/api/scheduler/next", {
    //   method: "POST",
    // });
    // if (!nextResponse.ok) {
    //   throw new Error(`Failed to trigger NEXT(): ${nextResponse.status}`);
    // }

    setAutoStartRunning(false);
    console.log("[MegaScheduler] Auto-Start: NEXT() completed");
  } catch (error) {
    setAutoStartRunning(false);
    console.error("[MegaScheduler] Auto-Start error:", error);
    throw error;
  }
}

