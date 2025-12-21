// 改竄検知カーネル（Tai-Freeze）
// 躰（Tai）の改竄を検知し、SafeMode に落とす

import { createHash } from "crypto";
import { TAI_CONSTRAINTS } from "./taiConstraints.js";

/**
 * 起動時のハッシュ値（改竄検知の基準）
 */
let bootHash = "";

/**
 * SafeMode フラグ
 */
let safeMode = false;

/**
 * 躰制約のハッシュ値を計算
 */
function computeHash(): string {
  const raw = Object.keys(TAI_CONSTRAINTS)
    .sort()
    .map((k) => `${k}:${(TAI_CONSTRAINTS as any)[k]}`)
    .join("|");
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * 起動時整合性チェック
 * 
 * サーバー起動時に一度だけ実行される
 * 躰制約のハッシュ値を計算し、保存する
 */
export function bootIntegrityCheck(): void {
  try {
    bootHash = computeHash();
    console.log("[TAI-FREEZE] Boot Hash:", bootHash);
    console.log("[TAI-FREEZE] Integrity check passed at boot");
  } catch (e) {
    triggerSafeMode("BOOT_INTEGRITY_FAILED", e);
  }
}

/**
 * 実行時整合性検証
 * 
 * 各リクエスト処理前に呼び出される
 * 躰制約が改竄されていないか検証する
 * 
 * @returns 整合性が保たれている場合 true
 */
export function verifyRuntimeIntegrity(): boolean {
  if (safeMode) {
    return false;
  }

  try {
    const current = computeHash();
    if (current !== bootHash) {
      triggerSafeMode("RUNTIME_TAMPER_DETECTED", {
        bootHash,
        current,
        message: "Tai constraints have been modified",
      });
      return false;
    }
    return true;
  } catch (e) {
    triggerSafeMode("RUNTIME_INTEGRITY_CHECK_FAILED", e);
    return false;
  }
}

/**
 * SafeMode をトリガー
 * 
 * 躰制約の改竄が検知された場合、システムを SafeMode に落とす
 * 
 * @param reason 改竄検知の理由
 * @param detail 詳細情報
 */
export function triggerSafeMode(reason: string, detail?: unknown): void {
  safeMode = true;
  console.error("[TAI-ALERT] SafeMode triggered:", reason);
  if (detail) {
    console.error("[TAI-ALERT] Detail:", detail);
  }
  console.error(
    "[TAI-ALERT] System is now in SafeMode. All requests will be rejected."
  );
}

/**
 * 躰状態を取得
 * 
 * @returns 躰状態（SafeMode、ハッシュ値、整合性検証結果）
 */
export function getTaiStatus(): {
  safeMode: boolean;
  taiHash: string;
  integrityVerified: boolean;
} {
  return {
    safeMode,
    taiHash: bootHash,
    integrityVerified: !safeMode,
  };
}

/**
 * SafeMode 状態を取得
 * 
 * @returns SafeMode の場合 true
 */
export function isSafeMode(): boolean {
  return safeMode;
}

