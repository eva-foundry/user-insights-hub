import { expect, test } from "@playwright/test";

/**
 * govops-023 — SSR `<head>` smoke assertions.
 *
 * Verifies that:
 *  1. Every Phase-6 route's `head()` hook resolves to a non-empty `<title>`
 *     in the SSR HTML (i.e. the i18n helper actually returns a real string,
 *     not the bare key, on the server-rendered pass).
 *  2. The `govops-locale` cookie is honored at SSR time, not just after
 *     client hydration. If this regresses, search-engine indexers and
 *     social-share embeds will see English titles regardless of the
 *     visitor's locale, and human readers will see a first-paint flash.
 *
 * Both checks deliberately read raw SSR HTML via `request.get(...)` instead
 * of letting the browser hydrate the page, so any client-side title flip
 * does NOT mask a server-side bug.
 */

const PHASE_6_ROUTES = [
  "/config",
  "/authority",
  "/encode",
  "/impact",
  "/about",
  "/cases",
  "/admin",
  "/admin/federation",
] as const;

for (const route of PHASE_6_ROUTES) {
  test(`SSR head: ${route} renders a non-empty <title>`, async ({ page }) => {
    const r = await page.request.get(route);
    const html = await r.text();
    const m = html.match(/<title>([^<]*)<\/title>/i);
    expect(m, `no <title> in SSR HTML for ${route}`).not.toBeNull();
    expect(
      m![1].trim().length,
      `empty <title> in SSR HTML for ${route}`,
    ).toBeGreaterThan(0);
  });
}

test("SSR head: <title> reflects govops-locale cookie at SSR time, not after hydration", async ({
  browser,
  baseURL,
}) => {
  const ctx = await browser.newContext();
  await ctx.addCookies([
    {
      name: "govops-locale",
      value: "fr",
      url: baseURL ?? "http://127.0.0.1:8080/",
    },
  ]);
  const r = await ctx.request.get("/about");
  const html = await r.text();
  const m = html.match(/<title>([^<]*)<\/title>/i);
  expect(m, "no <title> in SSR HTML for /about").not.toBeNull();
  // The FR title for /about is "À propos de GovOps". Match case-insensitively
  // and tolerate accent stripping by checking for the substring "propos".
  // If this assertion fails, item 4's getSsrLocale wiring regressed —
  // the SSR HTML is being rendered in English even though the visitor's
  // cookie says fr.
  expect(
    m![1],
    "SSR <title> for /about did not localize to fr (cookie ignored on server)",
  ).toMatch(/propos/i);
  await ctx.close();
});