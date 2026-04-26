import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for citizen-surface E2E (govops-015b privacy assertions).
 * Runs against the Vite dev server in mock mode so no backend is needed.
 * Browsers must be installed once: `bunx playwright install chromium`.
 */
const PORT = Number(process.env.PORT ?? 8080);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run dev",
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { VITE_USE_MOCK_API: "true" },
  },
});