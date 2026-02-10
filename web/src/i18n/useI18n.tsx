import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { STRINGS, SUPPORTED_LANGS, type Lang } from "./strings";

type I18nContextValue = {
  lang: Lang;
  setLang: (lang: string) => void;
  t: (key: string) => string;
  supportedLangs: Lang[];
};

const I18N_STORAGE_KEY = "tenmon_lang_v1";

function detectDefaultLang(): Lang {
  if (typeof window !== "undefined" && typeof navigator !== "undefined") {
    const nav = navigator.language || (navigator as any).userLanguage || "";
    if (nav.toLowerCase().startsWith("ja")) return "ja";
  }
  return "en";
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return detectDefaultLang();
    try {
      const stored = window.localStorage.getItem(I18N_STORAGE_KEY) as Lang | null;
      if (stored && SUPPORTED_LANGS.includes(stored)) return stored;
    } catch {
      // ignore
    }
    return detectDefaultLang();
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(I18N_STORAGE_KEY, lang);
    } catch {
      // ignore
    }
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang: (next: string) => {
        const normalized = (SUPPORTED_LANGS.includes(next as Lang) ? next : "en") as Lang;
        setLangState(normalized);
      },
      t: (key: string) => {
        const table = STRINGS[lang] ?? STRINGS.en;
        if (Object.prototype.hasOwnProperty.call(table, key)) return table[key];
        const fallback = STRINGS.en[key];
        return fallback ?? key;
      },
      supportedLangs: SUPPORTED_LANGS,
    }),
    [lang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}

