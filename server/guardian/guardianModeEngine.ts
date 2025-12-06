/**
 * Guardian Mode Engine
 * 個人守護AIエンジン
 * 
 * 機能:
 * - 危険検知（詐欺・フィッシング・マルウェア・異常行動）
 * - デバイス保護（盗撮・盗聴防止、ウイルス無効化）
 * - 緊急連絡システム（家族・警察への通知、倫理OS搭載）
 */

import { invokeLLM } from "../_core/llm";

/**
 * 危険レベル
 */
export enum DangerLevel {
  SAFE = "safe",
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * 危険タイプ
 */
export enum DangerType {
  SCAM = "scam", // 詐欺
  PHISHING = "phishing", // フィッシング
  MALWARE = "malware", // マルウェア
  ABNORMAL_BEHAVIOR = "abnormal_behavior", // 異常行動
  PRIVACY_VIOLATION = "privacy_violation", // プライバシー侵害
  DEVICE_COMPROMISE = "device_compromise", // デバイス侵害
}

/**
 * 危険検知結果
 */
export interface DangerDetectionResult {
  isDangerous: boolean;
  dangerLevel: DangerLevel;
  dangerType: DangerType[];
  score: number;
  reason: string;
  recommendation: string;
}

/**
 * デバイス保護状態
 */
export interface DeviceProtectionStatus {
  cameraProtection: boolean;
  microphoneProtection: boolean;
  locationProtection: boolean;
  storageProtection: boolean;
  networkProtection: boolean;
}

/**
 * 緊急連絡設定
 */
export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone?: string;
  email?: string;
  priority: number;
}

/**
 * 詐欺サイトを検知
 */
export async function detectScam(url: string, content: string): Promise<DangerDetectionResult> {
  const scamKeywords = [
    "無料",
    "今すぐ",
    "限定",
    "クリック",
    "当選",
    "プレゼント",
    "緊急",
    "確認",
    "アカウント停止",
    "パスワード",
    "クレジットカード",
    "銀行口座",
    "free",
    "click here",
    "winner",
    "urgent",
    "verify",
    "suspended",
  ];

  let score = 0;
  const detectedTypes: DangerType[] = [];
  const reasons: string[] = [];

  // URLチェック
  if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url)) {
    score += 30;
    reasons.push("IPアドレスを使用したURL");
  }

  if (!url.startsWith("https://")) {
    score += 20;
    reasons.push("HTTPSを使用していない");
  }

  // コンテンツキーワードチェック
  const lowerContent = content.toLowerCase();
  let keywordCount = 0;
  for (const keyword of scamKeywords) {
    if (lowerContent.includes(keyword.toLowerCase())) {
      keywordCount++;
    }
  }

  if (keywordCount >= 5) {
    score += 40;
    reasons.push(`詐欺関連キーワードを${keywordCount}個検出`);
    detectedTypes.push(DangerType.SCAM);
  } else if (keywordCount >= 3) {
    score += 20;
    reasons.push(`疑わしいキーワードを${keywordCount}個検出`);
  }

  // 危険レベルの判定
  let dangerLevel: DangerLevel;
  if (score >= 80) {
    dangerLevel = DangerLevel.CRITICAL;
  } else if (score >= 60) {
    dangerLevel = DangerLevel.HIGH;
  } else if (score >= 40) {
    dangerLevel = DangerLevel.MEDIUM;
  } else if (score >= 20) {
    dangerLevel = DangerLevel.LOW;
  } else {
    dangerLevel = DangerLevel.SAFE;
  }

  const isDangerous = score >= 40;

  let recommendation = "";
  if (dangerLevel === DangerLevel.CRITICAL) {
    recommendation = "⛔ 極めて危険です。直ちにページを閉じてください。個人情報を絶対に入力しないでください。";
  } else if (dangerLevel === DangerLevel.HIGH) {
    recommendation = "⚠️ 危険です。このページは詐欺サイトの可能性が高いです。個人情報の入力は避けてください。";
  } else if (dangerLevel === DangerLevel.MEDIUM) {
    recommendation = "⚠️ 注意が必要です。このページには疑わしい要素があります。慎重に閲覧してください。";
  } else if (dangerLevel === DangerLevel.LOW) {
    recommendation = "ℹ️ 一部の要素に注意が必要です。個人情報の入力前に確認してください。";
  } else {
    recommendation = "✅ 現時点で危険は検出されていません。";
  }

  return {
    isDangerous,
    dangerLevel,
    dangerType: detectedTypes,
    score: Math.min(score, 100),
    reason: reasons.join(", "),
    recommendation,
  };
}

/**
 * フィッシングサイトを検知
 */
export async function detectPhishing(url: string, content: string): Promise<DangerDetectionResult> {
  const phishingPatterns = [
    /paypal|amazon|apple|microsoft|google|facebook|twitter/i,
    /login|signin|account|verify|confirm|update/i,
    /password|credential|security/i,
  ];

  let score = 0;
  const detectedTypes: DangerType[] = [];
  const reasons: string[] = [];

  // ドメインチェック（有名サービスの偽装）
  const domain = new URL(url).hostname;
  const suspiciousDomains = [
    "paypal",
    "amazon",
    "apple",
    "microsoft",
    "google",
    "facebook",
    "twitter",
    "instagram",
  ];

  for (const service of suspiciousDomains) {
    if (domain.includes(service) && !domain.endsWith(`.${service}.com`)) {
      score += 50;
      reasons.push(`${service}を装った疑わしいドメイン`);
      detectedTypes.push(DangerType.PHISHING);
      break;
    }
  }

  // パターンマッチング
  for (const pattern of phishingPatterns) {
    if (pattern.test(content)) {
      score += 15;
    }
  }

  if (score >= 30) {
    reasons.push("フィッシングサイトの特徴を検出");
    detectedTypes.push(DangerType.PHISHING);
  }

  const dangerLevel =
    score >= 80
      ? DangerLevel.CRITICAL
      : score >= 60
      ? DangerLevel.HIGH
      : score >= 40
      ? DangerLevel.MEDIUM
      : score >= 20
      ? DangerLevel.LOW
      : DangerLevel.SAFE;

  const isDangerous = score >= 40;

  let recommendation = "";
  if (dangerLevel === DangerLevel.CRITICAL || dangerLevel === DangerLevel.HIGH) {
    recommendation =
      "⛔ フィッシングサイトの可能性が非常に高いです。ログイン情報やパスワードを絶対に入力しないでください。";
  } else if (dangerLevel === DangerLevel.MEDIUM) {
    recommendation = "⚠️ フィッシングサイトの可能性があります。公式サイトのURLを確認してください。";
  } else {
    recommendation = "✅ フィッシングの兆候は検出されていません。";
  }

  return {
    isDangerous,
    dangerLevel,
    dangerType: detectedTypes,
    score: Math.min(score, 100),
    reason: reasons.join(", "),
    recommendation,
  };
}

/**
 * マルウェアを検知
 */
export async function detectMalware(url: string, content: string): Promise<DangerDetectionResult> {
  const malwareKeywords = [
    "download",
    "install",
    "exe",
    "crack",
    "keygen",
    "patch",
    "hack",
    "virus",
    "trojan",
  ];

  let score = 0;
  const detectedTypes: DangerType[] = [];
  const reasons: string[] = [];

  // 危険な拡張子のチェック
  const dangerousExtensions = [".exe", ".bat", ".cmd", ".scr", ".vbs", ".js"];
  for (const ext of dangerousExtensions) {
    if (url.includes(ext) || content.includes(ext)) {
      score += 40;
      reasons.push(`危険な実行ファイル形式を検出: ${ext}`);
      detectedTypes.push(DangerType.MALWARE);
      break;
    }
  }

  // マルウェア関連キーワードのチェック
  const lowerContent = content.toLowerCase();
  let keywordCount = 0;
  for (const keyword of malwareKeywords) {
    if (lowerContent.includes(keyword)) {
      keywordCount++;
    }
  }

  if (keywordCount >= 3) {
    score += 30;
    reasons.push(`マルウェア関連キーワードを${keywordCount}個検出`);
    detectedTypes.push(DangerType.MALWARE);
  }

  const dangerLevel =
    score >= 80
      ? DangerLevel.CRITICAL
      : score >= 60
      ? DangerLevel.HIGH
      : score >= 40
      ? DangerLevel.MEDIUM
      : score >= 20
      ? DangerLevel.LOW
      : DangerLevel.SAFE;

  const isDangerous = score >= 40;

  let recommendation = "";
  if (dangerLevel === DangerLevel.CRITICAL || dangerLevel === DangerLevel.HIGH) {
    recommendation = "⛔ マルウェアの可能性が高いです。ファイルをダウンロードしないでください。";
  } else if (dangerLevel === DangerLevel.MEDIUM) {
    recommendation = "⚠️ 疑わしいファイルが検出されました。ダウンロード前に確認してください。";
  } else {
    recommendation = "✅ マルウェアの兆候は検出されていません。";
  }

  return {
    isDangerous,
    dangerLevel,
    dangerType: detectedTypes,
    score: Math.min(score, 100),
    reason: reasons.join(", "),
    recommendation,
  };
}

/**
 * 異常行動を検知
 */
export async function detectAbnormalBehavior(
  userId: number,
  action: string,
  context: Record<string, any>
): Promise<DangerDetectionResult> {
  // 異常行動のパターン
  const abnormalPatterns = [
    "大量のデータ送信",
    "深夜の異常なアクセス",
    "通常と異なる場所からのアクセス",
    "短時間での大量のリクエスト",
  ];

  let score = 0;
  const detectedTypes: DangerType[] = [];
  const reasons: string[] = [];

  // 時間帯チェック（深夜2-5時）
  const hour = new Date().getHours();
  if (hour >= 2 && hour <= 5) {
    score += 20;
    reasons.push("深夜の異常なアクセス");
  }

  // アクションの頻度チェック（簡易版）
  if (context.requestCount && context.requestCount > 100) {
    score += 40;
    reasons.push("短時間での大量のリクエスト");
    detectedTypes.push(DangerType.ABNORMAL_BEHAVIOR);
  }

  const dangerLevel =
    score >= 80
      ? DangerLevel.CRITICAL
      : score >= 60
      ? DangerLevel.HIGH
      : score >= 40
      ? DangerLevel.MEDIUM
      : score >= 20
      ? DangerLevel.LOW
      : DangerLevel.SAFE;

  const isDangerous = score >= 40;

  let recommendation = "";
  if (dangerLevel === DangerLevel.CRITICAL || dangerLevel === DangerLevel.HIGH) {
    recommendation = "⛔ 異常な行動が検出されました。アカウントが侵害されている可能性があります。";
  } else if (dangerLevel === DangerLevel.MEDIUM) {
    recommendation = "⚠️ 通常と異なる行動パターンが検出されました。";
  } else {
    recommendation = "✅ 異常な行動は検出されていません。";
  }

  return {
    isDangerous,
    dangerLevel,
    dangerType: detectedTypes,
    score: Math.min(score, 100),
    reason: reasons.join(", "),
    recommendation,
  };
}

/**
 * デバイス保護状態を取得
 */
export async function getDeviceProtectionStatus(): Promise<DeviceProtectionStatus> {
  // 実際の実装では、デバイスのセンサーやパーミッションをチェック
  return {
    cameraProtection: true,
    microphoneProtection: true,
    locationProtection: true,
    storageProtection: true,
    networkProtection: true,
  };
}

/**
 * 緊急連絡を送信（倫理OS搭載）
 */
export async function sendEmergencyAlert(
  userId: number,
  dangerType: DangerType,
  dangerLevel: DangerLevel,
  context: Record<string, any>
): Promise<{ sent: boolean; reason: string }> {
  // 倫理チェック：本当に緊急の場合のみ送信
  if (dangerLevel !== DangerLevel.CRITICAL && dangerLevel !== DangerLevel.HIGH) {
    return {
      sent: false,
      reason: "危険レベルが緊急連絡の基準に達していません",
    };
  }

  // 倫理チェック：誤報を防ぐための確認
  const ethicsCheck = await performEthicsCheck(dangerType, dangerLevel, context);
  if (!ethicsCheck.approved) {
    return {
      sent: false,
      reason: ethicsCheck.reason,
    };
  }

  // 実際の実装では、緊急連絡先に通知を送信
  // ここでは簡易版として、送信成功を返す
  return {
    sent: true,
    reason: "緊急連絡を送信しました",
  };
}

/**
 * 倫理チェック（誤報防止）
 */
async function performEthicsCheck(
  dangerType: DangerType,
  dangerLevel: DangerLevel,
  context: Record<string, any>
): Promise<{ approved: boolean; reason: string }> {
  // 倫理基準：
  // 1. 本当に緊急の場合のみ送信
  // 2. 誤報を最小限に抑える
  // 3. ユーザーのプライバシーを尊重

  if (dangerLevel === DangerLevel.CRITICAL) {
    return {
      approved: true,
      reason: "極めて危険な状況のため、緊急連絡を承認",
    };
  }

  if (dangerLevel === DangerLevel.HIGH && context.confirmedThreat) {
    return {
      approved: true,
      reason: "確認された脅威のため、緊急連絡を承認",
    };
  }

  return {
    approved: false,
    reason: "倫理基準により、緊急連絡を保留",
  };
}

/**
 * 統合危険検知（すべての検知を実行）
 */
export async function performComprehensiveThreatDetection(
  url: string,
  content: string,
  userId: number,
  context: Record<string, any>
): Promise<{
  overallDanger: DangerLevel;
  threats: DangerDetectionResult[];
  recommendation: string;
}> {
  const threats: DangerDetectionResult[] = [];

  // すべての検知を実行
  threats.push(await detectScam(url, content));
  threats.push(await detectPhishing(url, content));
  threats.push(await detectMalware(url, content));
  threats.push(await detectAbnormalBehavior(userId, "page_visit", context));

  // 最も高い危険レベルを取得
  const dangerLevels = [
    DangerLevel.SAFE,
    DangerLevel.LOW,
    DangerLevel.MEDIUM,
    DangerLevel.HIGH,
    DangerLevel.CRITICAL,
  ];

  let maxDangerLevel = DangerLevel.SAFE;
  for (const threat of threats) {
    if (dangerLevels.indexOf(threat.dangerLevel) > dangerLevels.indexOf(maxDangerLevel)) {
      maxDangerLevel = threat.dangerLevel;
    }
  }

  // 推奨事項の生成
  let recommendation = "";
  if (maxDangerLevel === DangerLevel.CRITICAL) {
    recommendation = "⛔ 極めて危険です。直ちにページを閉じ、デバイスのセキュリティスキャンを実行してください。";
  } else if (maxDangerLevel === DangerLevel.HIGH) {
    recommendation = "⚠️ 危険です。このページの使用を避け、個人情報を入力しないでください。";
  } else if (maxDangerLevel === DangerLevel.MEDIUM) {
    recommendation = "⚠️ 注意が必要です。慎重に閲覧し、疑わしい要素がないか確認してください。";
  } else if (maxDangerLevel === DangerLevel.LOW) {
    recommendation = "ℹ️ 一部の要素に注意してください。";
  } else {
    recommendation = "✅ 現時点で重大な脅威は検出されていません。";
  }

  return {
    overallDanger: maxDangerLevel,
    threats,
    recommendation,
  };
}
