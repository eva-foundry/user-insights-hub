import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { IntlProvider } from "react-intl";

import en from "@/messages/en.json";
import fr from "@/messages/fr.json";
import ar from "@/messages/ar.json";

export type Locale = "en" | "fr" | "ar";

const messagesByLocale: Record<Locale, Record<string, string>> = { en, fr, ar };
const RTL_LOCALES: Locale[] = ["ar"];
const STORAGE_KEY = "govops-locale";

type LocaleContext = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  dir: "ltr" | "rtl";
};

const LocaleCtx = createContext<LocaleContext | null>(null);

function detectInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && stored in messagesByLocale) return stored;
  const nav = window.navigator.language.slice(0, 2).toLowerCase();
  if (nav === "fr" || nav === "ar") return nav;
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Initialize on client (avoid SSR hydration mismatch by reading after mount)
  useEffect(() => {
    setLocaleState(detectInitialLocale());
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const dir = RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale]);

  const value = useMemo<LocaleContext>(
    () => ({
      locale,
      dir: RTL_LOCALES.includes(locale) ? "rtl" : "ltr",
      setLocale: (l) => {
        setLocaleState(l);
        if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, l);
      },
    }),
    [locale],
  );

  return (
    <LocaleCtx.Provider value={value}>
      <IntlProvider locale={locale} defaultLocale="en" messages={messagesByLocale[locale]}>
        {children}
      </IntlProvider>
    </LocaleCtx.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleCtx);
  if (!ctx) throw new Error("useLocale must be used within I18nProvider");
  return ctx;
}
