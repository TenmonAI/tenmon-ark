/**
 * 🔱 TENMON-ARK i18n Core (Client-side)
 * クライアントサイド多言語対応コア
 * 
 * 機能:
 * - React Hook for i18n
 * - 翻訳関数
 * - 日付フォーマット
 * - 通貨フォーマット
 */

import { useTranslation } from "react-i18next";
import i18n from "./config";

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
 * i18n React Hook
 * 
 * 使用例:
 * ```tsx
 * const { t, language, changeLanguage } = useI18n();
 * return <div>{t('welcome')}</div>;
 * ```
 */
export function useI18n() {
  const { t, i18n } = useTranslation();
  
  return {
    /**
     * 翻訳関数
     */
    t: (key: string, params?: Record<string, string | number>) => {
      return t(key, params);
    },
    
    /**
     * 現在の言語コード
     */
    language: i18n.language as SupportedLanguage,
    
    /**
     * 言語を変更
     */
    changeLanguage: (lang: SupportedLanguage) => {
      i18n.changeLanguage(lang);
      // localStorageに保存（既にi18nextが自動保存）
    },
    
    /**
     * サポートされている言語かチェック
     */
    isSupportedLanguage: (lang: string): lang is SupportedLanguage => {
      return lang in SUPPORTED_LANGUAGES;
    },
  };
}

/**
 * 翻訳関数（Hook外で使用可能）
 * 
 * 使用例:
 * ```ts
 * const text = translate('welcome', { name: 'Tenmon' });
 * ```
 */
export function translate(
  key: string,
  params?: Record<string, string | number>
): string {
  return i18n.t(key, params);
}

/**
 * 日付を言語別にフォーマット
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const lang = i18n.language as SupportedLanguage;
  
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

  return new Intl.DateTimeFormat(localeMap[lang] || localeMap[DEFAULT_LANGUAGE], options).format(dateObj);
}

/**
 * 日時を言語別にフォーマット
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const lang = i18n.language as SupportedLanguage;
  
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

  return new Intl.DateTimeFormat(localeMap[lang] || localeMap[DEFAULT_LANGUAGE], options).format(dateObj);
}

/**
 * 通貨を言語別にフォーマット
 */
export function formatCurrency(amount: number, currency: string = "USD"): string {
  const lang = i18n.language as SupportedLanguage;
  
  const localeMap: Record<SupportedLanguage, string> = {
    en: "en-US",
    ja: "ja-JP",
    ko: "ko-KR",
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
    fr: "fr-FR",
  };

  return new Intl.NumberFormat(localeMap[lang] || localeMap[DEFAULT_LANGUAGE], {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * 数値を言語別にフォーマット
 */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  const lang = i18n.language as SupportedLanguage;
  
  const localeMap: Record<SupportedLanguage, string> = {
    en: "en-US",
    ja: "ja-JP",
    ko: "ko-KR",
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
    fr: "fr-FR",
  };

  return new Intl.NumberFormat(localeMap[lang] || localeMap[DEFAULT_LANGUAGE], options).format(value);
}

/**
 * 相対時間を言語別にフォーマット（例: "2時間前"）
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  const lang = i18n.language as SupportedLanguage;
  
  const localeMap: Record<SupportedLanguage, string> = {
    en: "en-US",
    ja: "ja-JP",
    ko: "ko-KR",
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
    fr: "fr-FR",
  };

  const rtf = new Intl.RelativeTimeFormat(localeMap[lang] || localeMap[DEFAULT_LANGUAGE], { numeric: "auto" });

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

/**
 * 現在の言語コードを取得
 */
export function getCurrentLanguage(): SupportedLanguage {
  return (i18n.language as SupportedLanguage) || DEFAULT_LANGUAGE;
}

/**
 * 言語を変更
 */
export function changeLanguage(lang: SupportedLanguage): Promise<void> {
  return i18n.changeLanguage(lang);
}

