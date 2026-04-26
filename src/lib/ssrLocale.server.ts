/**
 * Server-only locale resolver. Lives in a `.server.ts` file so the
 * TanStack Start import-protection plugin keeps the `@tanstack/react-start/server`
 * dependency out of the client bundle.
 */
import { getCookie, getRequestHeader } from "@tanstack/react-start/server";
import type { Locale } from "@/lib/i18n";
import { StorageKeys } from "@/lib/storageKeys";

const SUPPORTED: Locale[] = ["en", "fr", "es-MX", "pt-BR", "de", "uk"];

function pickLocale(input: string | undefined): Locale {
  if (!input) return "en";
  if ((SUPPORTED as string[]).includes(input)) return input as Locale;
  const head = input.split(",")[0]?.trim() ?? "";
  if ((SUPPORTED as string[]).includes(head)) return head as Locale;
  const two = head.slice(0, 2).toLowerCase();
  if (two === "es") return "es-MX";
  if (two === "pt") return "pt-BR";
  if (two === "fr") return "fr";
  if (two === "de") return "de";
  if (two === "uk") return "uk";
  return "en";
}

export function resolveSsrLocale(): Locale {
  try {
    const cookieLocale = getCookie(StorageKeys.locale);
    if (cookieLocale) return pickLocale(cookieLocale);
    const accept = getRequestHeader("accept-language");
    return pickLocale(accept);
  } catch {
    return "en";
  }
}
