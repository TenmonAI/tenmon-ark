/**
 * Safety Guard
 * 
 * TENMON-ARK霊核OSの安全ガード
 * 
 * 機能:
 * - 自律動作の安全性チェック
 * - 危険な操作の検知と防止
 * - 天聞承認が必要な操作の識別
 * - 緊急停止機能
 */

import { detectUnauthorizedChange } from "../presence-guard/presenceThresholdGuard";

export interface SafetyCheckResult {
  safe: boolean;
  reason?: string;
  requiresApproval: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
}

export interface DangerousOperation {
  type: string;
  description: string;
  impact: string;
  requiresApproval: boolean;
}

// 危険な操作のリスト
const dangerousOperations: DangerousOperation[] = [
  {
    type: "threshold_change",
    description: "Presence OS閾値の変更",
    impact: "システムの存在感判定に影響",
    requiresApproval: true,
  },
  {
    type: "system_restart",
    description: "システム全体の再起動",
    impact: "サービスの一時停止",
    requiresApproval: true,
  },
  {
    type: "database_migration",
    description: "データベーススキーマの変更",
    impact: "データ整合性に影響",
    requiresApproval: true,
  },
  {
    type: "code_deployment",
    description: "コードの自動デプロイ",
    impact: "システム動作の変更",
    requiresApproval: true,
  },
  {
    type: "user_data_deletion",
    description: "ユーザーデータの削除",
    impact: "データの永久削除",
    requiresApproval: true,
  },
];

/**
 * 操作の安全性をチェック
 */
export async function checkOperationSafety(
  operationType: string,
  operationDetails: Record<string, unknown>
): Promise<SafetyCheckResult> {
  // 危険な操作かどうかをチェック
  const dangerousOp = dangerousOperations.find(op => op.type === operationType);

  if (!dangerousOp) {
    // 危険な操作ではない場合は安全
    return {
      safe: true,
      requiresApproval: false,
      riskLevel: "low",
    };
  }

  // 危険な操作の場合は承認が必要
  return {
    safe: false,
    reason: `${dangerousOp.description}: ${dangerousOp.impact}`,
    requiresApproval: dangerousOp.requiresApproval,
    riskLevel: getRiskLevel(operationType),
  };
}

/**
 * リスクレベルを取得
 */
function getRiskLevel(operationType: string): "low" | "medium" | "high" | "critical" {
  switch (operationType) {
    case "user_data_deletion":
    case "database_migration":
      return "critical";
    case "system_restart":
    case "code_deployment":
      return "high";
    case "threshold_change":
      return "medium";
    default:
      return "low";
  }
}

/**
 * 閾値変更の安全性をチェック
 */
export async function checkThresholdChangeSafety(
  thresholdPath: string,
  oldValue: number,
  newValue: number
): Promise<SafetyCheckResult> {
  // 閾値変更の検知
  const unauthorized = await detectUnauthorizedChange(thresholdPath, newValue);

  if (unauthorized) {
    return {
      safe: false,
      reason: "承認されていない閾値変更が検知されました",
      requiresApproval: true,
      riskLevel: "high",
    };
  }

  // 閾値変更の幅をチェック
  const changeRatio = Math.abs(newValue - oldValue) / oldValue;

  if (changeRatio > 0.5) {
    // 50%以上の変更は危険
    return {
      safe: false,
      reason: "閾値の変更幅が大きすぎます",
      requiresApproval: true,
      riskLevel: "high",
    };
  } else if (changeRatio > 0.2) {
    // 20%以上の変更は要注意
    return {
      safe: false,
      reason: "閾値の変更幅が大きいです",
      requiresApproval: true,
      riskLevel: "medium",
    };
  }

  return {
    safe: true,
    requiresApproval: false,
    riskLevel: "low",
  };
}

/**
 * 緊急停止
 */
export async function emergencyStop(reason: string): Promise<void> {
  console.error(`[Safety Guard] EMERGENCY STOP: ${reason}`);

  // TODO: すべての自律ループを停止
  // TODO: 天聞に緊急通知を送信
  // TODO: システムを安全な状態に移行

  throw new Error(`Emergency stop triggered: ${reason}`);
}

/**
 * 天聞承認を要求
 */
export async function requestTenmonApproval(
  operationType: string,
  operationDetails: Record<string, unknown>,
  reason: string
): Promise<boolean> {
  console.log(`[Safety Guard] Requesting Tenmon approval for ${operationType}`);
  console.log(`Reason: ${reason}`);
  console.log(`Details: ${JSON.stringify(operationDetails, null, 2)}`);

  // TODO: 天聞に承認要求を送信
  // TODO: 承認結果を待機

  // 現在は常に承認が必要として false を返す
  return false;
}

/**
 * 安全ガードの状態を取得
 */
export function getSafetyGuardStatus(): {
  active: boolean;
  dangerousOperationsCount: number;
} {
  return {
    active: true,
    dangerousOperationsCount: dangerousOperations.length,
  };
}
