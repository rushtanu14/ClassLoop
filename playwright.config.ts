import { defineConfig, devices } from "@playwright/test";

const testPort = 5177;
const baseURL = `http://127.0.0.1:${testPort}`;
const browserTestEnv =
  "VITE_SUPABASE_URL=https://classloop-playwright.supabase.co " +
  "VITE_SUPABASE_ANON_KEY=classloop-playwright-anon-key " +
  "VITE_STRIPE_PRO_PRICE_ID=price_classloop_playwright " +
  "VITE_STRIPE_PUBLISHABLE_KEY=pk_test_classloop_playwright";

export default defineConfig({
  testDir: "./tests/browser",
  testIgnore: ["**/classloop-web.spec.ts"],
  timeout: 45_000,
  expect: {
    timeout: 8_000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `env -u FORCE_COLOR -u NO_COLOR ${browserTestEnv} npm run dev -- --port ${testPort} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
