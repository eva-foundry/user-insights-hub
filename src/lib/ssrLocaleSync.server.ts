/**
 * Synchronous SSR-only locale resolver.
 *
 * `getSsrLocale` (in `ssrLocale.ts`) is exposed as a `createServerFn` RPC,
 * which makes it asynchronous and therefore unusable from inside route
 * `head()` hooks (TanStack expects a sync return). This file lives in a
 * `.server.ts` module so the import-protection plugin keeps the
 * `@tanstack/react-start/server` request APIs out of the client bundle,
 * and exports the same cookie/Accept-Language resolution logic as a plain
 * synchronous function suitable for SSR `head()` calls.
 *
 * On the client (post-hydration), this module is replaced with the stub
 * in `ssrLocaleSync.client.ts` which always returns `null` so callers
 * fall back to the cookie read in `head-i18n.ts`.
 */
import { getCookie, getRequestHeader } from "@tanstack/react-start/server";
import { StorageKeys } from "@/lib/storageKeys";

const SUPPORTED = ["en", "fr", "es-MX", "pt-BR", "de", "uk"] as const;
type Locale = (typeof SUPPORTED)[number];

function pick(input: string | undefined): Locale | null {
  if (!input) return null;
  if ((SUPPORTED as readonly string[]).includes(input)) return input as Locale;
  const head = input.split(",")[0]?.trim() ?? "";
  if ((SUPPORTED as readonly string[]).includes(head)) return head as Locale;
  const two = head.slice(0, 2).toLowerCase();
  if (two === "es") return "es-MX";
  if (two === "pt") return "pt-BR";
  if (two === "fr") return "fr";
  if (two === "de") return "de";
  if (two === "uk") return "uk";
  return null;
}

export function getSsrLocaleSync(): string | null {
  try {
    const cookieLocale = getCookie(StorageKeys.locale);
    const fromCookie = pick(cookieLocale);
    if (fromCookie) return fromCookie;
    const accept = getRequestHeader("accept-language");
    return pick(accept);
  } catch {
    return null;
  }
}