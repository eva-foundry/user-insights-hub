import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { IntlProvider } from "react-intl";

import en from "@/messages/en.json";
import fr from "@/messages/fr.json";
import esMX from "@/messages/es-MX.json";
import ptBR from "@/messages/pt-BR.json";
import de from "@/messages/de.json";
import uk from "@/messages/uk.json";

export type Locale = "en" | "fr" | "es-MX" | "pt-BR" | "de" | "uk";

const messagesByLocale: Record<Locale, Record<string, string>> = {
  en,
  fr,
  "es-MX": esMX,
  "pt-BR": ptBR,
  de,
  uk,
};
const RTL_LOCALES: Locale[] = []; // none of the supported locales are RTL
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
  const navFull = window.navigator.language; // e.g. "es-MX", "pt-BR", "de-DE"
  const nav2 = navFull.slice(0, 2).toLowerCase();
  // Exact match first (handles es-MX, pt-BR), then 2-letter fallback.
  if (navFull in messagesByLocale) return navFull as Locale;
  if (nav2 === "es") return "es-MX";
  if (nav2 === "pt") return "pt-BR";
  if (nav2 === "fr") return "fr";
  if (nav2 === "de") return "de";
  if (nav2 === "uk") return "uk";
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
