/**
 * ============================================================
 *  AUDIT LOG — 監査ログ（不可逆）
 * ============================================================
 * 
 * すべての mutation は auditLog() 必須
 * auditLog は削除不可
 * ============================================================
 */

export type AuditAction =
  | "PHASE_CHANGE"
  | "EMERGENCY_STOP"
  | "LOT_OVERRIDE"
  | "SYSTEM_CONFIG_CHANGE";

export interface AuditLogEntry {
  timestamp: number;
  action: AuditAction;
  userId: string;
  details: Record<string, unknown>;
  ipAddress?: string;
}

// 監査ログ（メモリ内、実運用では DB に保存）
const auditLogs: AuditLogEntry[] = [];

/**
 * 監査ログを記録
 */
export function auditLog(
  action: AuditAction,
  details: Record<string, unknown>,
  userId: string = "TENMON",
  ipAddress?: string
): void {
  const entry: AuditLogEntry = {
    timestamp: Date.now(),
    action,
    userId,
    details,
    ipAddress,
  };

  auditLogs.push(entry);

  // コンソールに出力（実運用では DB に保存）
  console.log("[AUDIT]", JSON.stringify(entry, null, 2));

  // 最新1000件のみ保持（実運用では DB に保存）
  if (auditLogs.length > 1000) {
    auditLogs.shift();
  }
}

/**
 * 監査ログを取得（管理者専用）
 */
export function getAuditLogs(limit: number = 100): AuditLogEntry[] {
  return auditLogs.slice(-limit).reverse();
}

export default {
  auditLog,
  getAuditLogs,
};

