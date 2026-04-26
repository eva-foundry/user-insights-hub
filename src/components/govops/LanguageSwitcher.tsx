import { useIntl } from "react-intl";
import { Languages } from "lucide-react";
import { useLocale, type Locale } from "@/lib/i18n";

const LOCALES: Locale[] = ["en", "fr", "es-MX", "pt-BR", "de", "uk"];

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const intl = useIntl();
  const label = intl.formatMessage({ id: "lang.switcher.label" });

  return (
    <label className="inline-flex items-center gap-2 text-sm text-foreground-muted">
      <Languages className="size-4" aria-hidden />
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-foreground transition-colors hover:bg-surface-sunken"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {intl.formatMessage({ id: `lang.${l}` })}
          </option>
        ))}
      </select>
    </label>
  );
}
