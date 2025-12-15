/**
 * ============================================================
 *  DEVICE IDENTITY — デバイス識別
 * ============================================================
 * 
 * デバイスIDと優先度の管理
 * ============================================================
 */

import { DEVICE_PRIORITY } from "./conflictResolver";

/**
 * デバイスIDを取得（永続化）
 */
export async function getDeviceId(): Promise<string> {
  if (typeof window === "undefined") {
    // Node.js 環境: サーバーIDを使用
    return "server";
  }

  // ブラウザ環境: LocalStorage から取得または生成
  const STORAGE_KEY = "tenmon_ark_device_id";

  let deviceId = localStorage.getItem(STORAGE_KEY);

  if (!deviceId) {
    // 新規デバイスIDを生成
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(STORAGE_KEY, deviceId);
  }

  return deviceId;
}

/**
 * デバイス優先度を取得
 */
export async function getDevicePriority(): Promise<number> {
  if (typeof window === "undefined") {
    // Node.js 環境: サーバー優先度
    return DEVICE_PRIORITY.SERVER;
  }

  // ブラウザ環境: User Agent から判定
  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    return DEVICE_PRIORITY.MOBILE;
  }

  if (ua.includes("tablet") || ua.includes("ipad")) {
    return DEVICE_PRIORITY.TABLET;
  }

  // デスクトップ
  return DEVICE_PRIORITY.DESKTOP;
}

/**
 * デバイスタイプを取得（ログ用）
 */
export function getDeviceType(): string {
  if (typeof window === "undefined") {
    return "server";
  }

  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    return "mobile";
  }

  if (ua.includes("tablet") || ua.includes("ipad")) {
    return "tablet";
  }

  return "desktop";
}

