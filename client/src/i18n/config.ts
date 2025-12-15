import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import translation files directly as modules
import * as enTranslation from "./locales/en.json";
import * as jaTranslation from "./locales/ja.json";
import * as koTranslation from "./locales/ko.json";
import * as zhCNTranslation from "./locales/zh-CN.json";
import * as zhTWTranslation from "./locales/zh-TW.json";
import * as frTranslation from "./locales/fr.json";

const resources = {
  en: { translation: enTranslation },
  ja: { translation: jaTranslation },
  ko: { translation: koTranslation },
  "zh-CN": { translation: zhCNTranslation },
  "zh-TW": { translation: zhTWTranslation },
  fr: { translation: frTranslation },
};

i18n
  .use(LanguageDetector) // Auto-detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources,
    fallbackLng: "en", // Default language if detection fails
    supportedLngs: ["en", "ja", "ko", "zh-CN", "zh-TW", "fr"],
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;
