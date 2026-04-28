/**
 * Client-side stub for `ssrLocaleSync.server.ts`.
 *
 * Vite's import-protection plugin redirects `.server.ts` imports to this
 * `.ts` sibling on the client bundle. We intentionally return `null` so
 * `head-i18n.localeFromMatches` falls through to the `govops-locale`
 * cookie read in `document.cookie` after hydration.
 */
export function getSsrLocaleSync(): string | null {
  return null;
}