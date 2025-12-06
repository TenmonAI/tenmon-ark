/**
 * Self-Repair Loop
 * 
 * TENMON-ARK霊核OSの自己修復ループ
 * 
 * 機能:
 * - エラー検知と自動修復の常時実行
 * - 修復失敗時のManus連携
 * - 修復成功率の記録
 */

import { detectErrors, attemptAutoRepair, recordRepairSuccess, requestManusHelp, type ErrorType } from "../self-build/selfHealEngine";

let repairLoopActive = false;
let repairInterval: NodeJS.Timeout | null = null;

/**
 * 自己修復ループを開始
 */
export async function startSelfRepairLoop(
  intervalMs: number = 300000 // デフォルト: 5分ごと
): Promise<void> {
  if (repairLoopActive) {
    console.log("[Self-Repair Loop] Already running");
    return;
  }

  repairLoopActive = true;
  console.log(`[Self-Repair Loop] Starting with interval: ${intervalMs}ms`);

  // 初回実行
  await performSelfRepair();

  // 定期実行
  repairInterval = setInterval(async () => {
    await performSelfRepair();
  }, intervalMs);
}

/**
 * 自己修復ループを停止
 */
export function stopSelfRepairLoop(): void {
  if (repairInterval) {
    clearInterval(repairInterval);
    repairInterval = null;
  }
  repairLoopActive = false;
  console.log("[Self-Repair Loop] Stopped");
}

/**
 * 自己修復を実行
 */
async function performSelfRepair(): Promise<void> {
  try {
    console.log("[Self-Repair Loop] Starting repair cycle");

    // エラー検知
    const errorsResult = await detectErrors({});
    const errors = errorsResult.errors;

    if (errors.length === 0) {
      console.log("[Self-Repair Loop] No errors detected");
      return;
    }

    console.log(`[Self-Repair Loop] Detected ${errors.length} errors`);

    // 各エラーに対して修復を試行
    for (const error of errors) {
      try {
        // エラーオブジェクトを構築
        const errorObj = {
          type: error.type,
          message: error.message,
          severity: error.severity,
          location: "system",
        };

        const repair = await attemptAutoRepair(
          error.type,
          error.message,
          {}
        );

        if (repair.success) {
          console.log(`[Self-Repair Loop] Successfully repaired: ${error.message}`);
          
          // 修復成功を記録
          await recordRepairSuccess(
            error.type,
            true
          );
        } else {
          console.log(`[Self-Repair Loop] Failed to repair: ${error.message}`);
          
          // 重大なエラーの場合はManusに連携
          if (error.severity === "critical" || error.severity === "high") {
            await requestManusHelp(
              error.type,
              error.message,
              {},
              1
            );
            console.log(`[Self-Repair Loop] Requested Manus help for: ${error.message}`);
          }
        }
      } catch (repairError) {
        console.error(`[Self-Repair Loop] Error during repair: ${repairError}`);
      }
    }

    console.log("[Self-Repair Loop] Repair cycle completed");
  } catch (error) {
    console.error("[Self-Repair Loop] Repair cycle failed:", error);
  }
}

/**
 * 自己修復ループの状態を取得
 */
export function getSelfRepairLoopStatus(): {
  active: boolean;
} {
  return {
    active: repairLoopActive,
  };
}
