import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { I18nProvider, type Locale } from "@/lib/i18n";
import { StorageKeys } from "@/lib/storageKeys";
import { ThemeProvider } from "@/lib/theme";
import { Masthead } from "@/components/govops/Masthead";
import { SkipToContent } from "@/components/govops/SkipToContent";
import { Toaster } from "@/components/ui/sonner";
import { RouteError } from "@/components/govops/RouteError";

const SUPPORTED_LOCALES: Locale[] = ["en", "fr", "es-MX", "pt-BR", "de", "uk"];

function pickLocale(input: string | undefined): Locale {
  if (!input) return "en";
  if ((SUPPORTED_LOCALES as string[]).includes(input)) return input as Locale;
  const head = input.split(",")[0]?.trim() ?? "";
  if ((SUPPORTED_LOCALES as string[]).includes(head)) return head as Locale;
  const two = head.slice(0, 2).toLowerCase();
  if (two === "es") return "es-MX";
  if (two === "pt") return "pt-BR";
  if (two === "fr") return "fr";
  if (two === "de") return "de";
  if (two === "uk") return "uk";
  return "en";
}

/**
 * Server-only locale resolution: prefer the persisted cookie, then the
 * browser's Accept-Language. Wrapped in a try/catch so client navigations
 * (where the request APIs throw) silently fall back to "en".
 */
async function resolveSsrLocale(): Promise<Locale> {
  if (typeof window !== "undefined") return "en";
  try {
    const { getCookie, getRequestHeader } = await import(
      "@tanstack/react-start/server"
    );
    const cookieLocale = getCookie(StorageKeys.locale);
    if (cookieLocale) return pickLocale(cookieLocale);
    const accept = getRequestHeader("accept-language");
    return pickLocale(accept);
  } catch {
    return "en";
  }
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-foreground-muted">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  loader: async () => ({ initialLocale: await resolveSsrLocale() }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GovOps — Law as code, with provenance you can read" },
      {
        name: "description",
        content:
          "GovOps is an agentic, multilingual platform for law-as-code: drafted by agents, ratified by humans, auditable by citizens.",
      },
      { name: "author", content: "GovOps" },
      { property: "og:title", content: "GovOps — Law as code" },
      {
        property: "og:description",
        content: "Agentic, multilingual law-as-code with readable provenance.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/govops-wordmark.png" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:image", content: "/govops-wordmark.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/govops-symbol.png" },
      { rel: "apple-touch-icon", href: "/govops-symbol.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ({ error, reset }) => (
    <main id="main" className="mx-auto max-w-5xl px-6 py-10">
      <RouteError error={error as Error} reset={reset} />
    </main>
  ),
});

function RootShell({ children }: { children: React.ReactNode }) {
  const data = Route.useLoaderData();
  const lang = data?.initialLocale ?? "en";
  return (
    <html lang={lang}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { initialLocale } = Route.useLoaderData();
  return (
    <ThemeProvider>
      <I18nProvider initialLocale={initialLocale}>
        <SkipToContent />
        <Masthead />
        <main id="main" className="mx-auto max-w-5xl px-6 py-10">
          <Outlet />
        </main>
        <footer
          role="contentinfo"
          className="mx-auto max-w-5xl px-6 py-8 text-xs text-foreground-subtle"
        >
          <span style={{ fontFamily: "var(--font-mono)" }}>govops · spec govops-008</span>
        </footer>
        <Toaster />
      </I18nProvider>
    </ThemeProvider>
  );
}
