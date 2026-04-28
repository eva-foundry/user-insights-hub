/**
 * govops-023 — i18n for `<head>` strings emitted by route `head()` hooks.
 *
 * `head()` runs at route-match time, before the component mounts, so it
 * cannot call `useIntl()`. This helper reads the active locale from the
 * `govops-locale` cookie on the client (where `document.cookie` exists)
 * and falls back to `en` on the SSR pass — the SSR HTML's `<title>` is
 * then immediately re-rendered on the client to reflect the user's locale
 * if it differs from `en`. (TanStack Start re-runs `head()` on locale
 * changes via the same router-level invalidation that drives the
 * `<html lang>` attribute.)
 *
 * Hard rule from the spec: this helper looks up keys against the same
 * static `messages/<locale>.json` catalogs that `IntlProvider` consumes.
 * No new keys are introduced; missing keys log a dev warning and fall
 * back to the English string for the same key, then to the key itself.
 */
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";
import ptBR from "@/messages/pt-BR.json";
import esMX from "@/messages/es-MX.json";
import de from "@/messages/de.json";
import uk from "@/messages/uk.json";

type Catalog = Record<string, string>;

const CATALOGS: Record<string, Catalog> = {
  en: en as Catalog,
  fr: fr as Catalog,
  "pt-BR": ptBR as Catalog,
  "es-MX": esMX as Catalog,
  de: de as Catalog,
  uk: uk as Catalog,
};

const COOKIE_NAME = "govops-locale";

function readLocaleCookie(): string {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(
    new RegExp("(?:^|;\\s*)" + COOKIE_NAME + "=([^;]+)"),
  );
  return m ? decodeURIComponent(m[1]) : "en";
}

/**
 * Resolve a message key against the active locale's catalog. Used by
 * route `head()` hooks for `<title>` and `<meta name="description">`.
 */
export function t(key: string, locale: string = readLocaleCookie()): string {
  const catalog = CATALOGS[locale] ?? CATALOGS.en;
  const hit = catalog[key];
  if (hit && hit.length > 0) return hit;
  const enHit = CATALOGS.en[key];
  if (enHit && enHit.length > 0) {
    if (import.meta.env?.DEV && catalog !== CATALOGS.en) {
      // eslint-disable-next-line no-console
      console.warn(
        `[head-i18n] missing key "${key}" for locale "${locale}", falling back to en`,
      );
    }
    return enHit;
  }
  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.warn(`[head-i18n] missing key "${key}" in every catalog`);
  }
  return key;
}

/**
 * Extract the SSR-resolved locale from a route `head()` ctx.
 *
 * The root loader (`src/routes/__root.tsx`) calls `getSsrLocale()` on every
 * request and exposes the result as `initialLocale`. TanStack Start passes
 * every parent match (including the root) into each child route's `head()`
 * hook via `ctx.matches`, so we can read the SSR-resolved locale here
 * **on the server** — before any client hydration — and use it to localize
 * `<title>` and `<meta name="description">` in the SSR HTML itself.
 *
 * This is the key wiring that makes search-engine indexers, social-share
 * embeds, and human first-paint all see the same localized title.
 */
export function localeFromMatches(
  matches: ReadonlyArray<{ loaderData?: unknown }> | undefined,
): string {
  if (!matches || matches.length === 0) return "en";
  // The root match is always at index 0, but we scan defensively in case
  // the parent ordering ever changes.
  for (const m of matches) {
    const data = m?.loaderData as { initialLocale?: string } | undefined;
    const loc = data?.initialLocale;
    if (loc && CATALOGS[loc]) return loc;
  }
  if (typeof process !== "undefined" && process.env?.DEBUG_HEAD_I18N) {
    // eslint-disable-next-line no-console
    console.warn("[head-i18n] no initialLocale in matches:", JSON.stringify(matches.map((m) => ({ keys: m && Object.keys(m), ld: (m as any)?.loaderData }))).slice(0, 500));
  }
  return "en";
}