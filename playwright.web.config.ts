import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.CLASSLOOP_WEB_TEST_URL || "https://classloop-followup.vercel.app/";
const localWebPort = 5177;
const usesLocalServer = new URL(baseURL).hostname === "127.0.0.1" || new URL(baseURL).hostname === "localhost";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: ["**/classloop-web.spec.ts"],
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: usesLocalServer
    ? {
        command: `env -u FORCE_COLOR -u NO_COLOR npm run dev -- --port ${localWebPort} --strictPort`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 60_000,
      }
    : undefined,
  projects: [
    {
      name: "web-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "web-mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
