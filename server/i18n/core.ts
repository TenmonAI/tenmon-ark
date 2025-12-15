/**
 * 🔱 TENMON-ARK i18n Core (Server-side)
 * サーバーサイド多言語対応コア
 * 
 * 機能:
 * - サポート言語リスト取得
 * - リクエストから言語検出
 * - 翻訳取得（将来拡張用）
 * - 日付フォーマット
 * - 通貨フォーマット
 */

import { Request } from "express";

/**
 * サポートされている言語コード
 */
export const SUPPORTED_LANGUAGES = {
  en: "English",
  ja: "日本語",
  ko: "한국어",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  fr: "Français",
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

/**
 * デフォルト言語
 */
export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

/**
 * サポートされている言語のリストを取得
 */
export function getSupportedLanguages(): Array<{ code: SupportedLanguage; name: string }> {
  return Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => ({
    code: code as SupportedLanguage,
    name,
  }));
}

/**
 * リクエストからユーザーの言語を検出
 * 
 * 検出順序:
 * 1. Accept-Language ヘッダー
 * 2. Cookie (preferredLanguage)
 * 3. デフォルト言語
 */
export function detectUserLanguage(req: Request): SupportedLanguage {
  // 1. Cookieから取得
  const cookieLanguage = req.cookies?.preferredLanguage;
  if (cookieLanguage && isValidLanguage(cookieLanguage)) {
    return cookieLanguage as SupportedLanguage;
  }

  // 2. Accept-Language ヘッダーから取得
  const acceptLanguage = req.headers["accept-language"];
  if (acceptLanguage) {
    const detected = parseAcceptLanguage(acceptLanguage);
    if (detected) {
      return detected;
    }
  }

  // 3. デフォルト言語を返す
  return DEFAULT_LANGUAGE;
}

/**
 * Accept-Language ヘッダーをパースして言語を検出
 */
function parseAcceptLanguage(acceptLanguage: string): SupportedLanguage | null {
  // Accept-Language: "en-US,en;q=0.9,ja;q=0.8"
  const languages = acceptLanguage
    .split(",")
    .map((lang) => {
      const [code, q] = lang.trim().split(";");
      const quality = q ? parseFloat(q.replace("q=", "")) : 1.0;
      return { code: code.split("-")[0], quality };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const lang of languages) {
    // 完全一致を優先
    if (isValidLanguage(lang.code)) {
      return lang.code as SupportedLanguage;
    }
    // 部分一致（en-US → en）
    const baseCode = lang.code.toLowerCase();
    if (baseCode === "en") return "en";
    if (baseCode === "ja") return "ja";
    if (baseCode === "ko") return "ko";
    if (baseCode === "zh") return "zh-CN"; // デフォルトは簡体字
    if (baseCode === "fr") return "fr";
  }

  return null;
}

/**
 * 言語コードが有効かチェック
 */
function isValidLanguage(code: string): code is SupportedLanguage {
  return code in SUPPORTED_LANGUAGES;
}

/**
 * 日付を言語別にフォーマット
 */
export function formatDate(date: Date | string, lang: SupportedLanguage = DEFAULT_LANGUAGE): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  const localeMap: Record<SupportedLanguage, string> = {
    en: "en-US",
    ja: "ja-JP",
    ko: "ko-KR",
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
    fr: "fr-FR",
  };

  return new Intl.DateTimeFormat(localeMap[lang], options).format(dateObj);
}

/**
 * 日時を言語別にフォーマット
 */
export function formatDateTime(
  date: Date | string,
  lang: SupportedLanguage = DEFAULT_LANGUAGE
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  const localeMap: Record<SupportedLanguage, string> = {
    en: "en-US",
    ja: "ja-JP",
    ko: "ko-KR",
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
    fr: "fr-FR",
  };

  return new Intl.DateTimeFormat(localeMap[lang], options).format(dateObj);
}

/**
 * 通貨を言語別にフォーマット
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  lang: SupportedLanguage = DEFAULT_LANGUAGE
): string {
  const localeMap: Record<SupportedLanguage, string> = {
    en: "en-US",
    ja: "ja-JP",
    ko: "ko-KR",
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
    fr: "fr-FR",
  };

  return new Intl.NumberFormat(localeMap[lang], {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * 数値を言語別にフォーマット
 */
export function formatNumber(
  value: number,
  lang: SupportedLanguage = DEFAULT_LANGUAGE,
  options?: Intl.NumberFormatOptions
): string {
  const localeMap: Record<SupportedLanguage, string> = {
    en: "en-US",
    ja: "ja-JP",
    ko: "ko-KR",
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
    fr: "fr-FR",
  };

  return new Intl.NumberFormat(localeMap[lang], options).format(value);
}

/**
 * 相対時間を言語別にフォーマット（例: "2時間前"）
 */
export function formatRelativeTime(
  date: Date | string,
  lang: SupportedLanguage = DEFAULT_LANGUAGE
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  const localeMap: Record<SupportedLanguage, string> = {
    en: "en-US",
    ja: "ja-JP",
    ko: "ko-KR",
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
    fr: "fr-FR",
  };

  const rtf = new Intl.RelativeTimeFormat(localeMap[lang], { numeric: "auto" });

  if (diffDays > 0) {
    return rtf.format(-diffDays, "day");
  } else if (diffHours > 0) {
    return rtf.format(-diffHours, "hour");
  } else if (diffMinutes > 0) {
    return rtf.format(-diffMinutes, "minute");
  } else {
    return rtf.format(-diffSeconds, "second");
  }
}

