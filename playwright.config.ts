import { defineConfig, devices } from "@playwright/test";

const testPort = 5177;
const baseURL = `http://127.0.0.1:${testPort}`;

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
    command: `npm run dev -- --port ${testPort} --strictPort`,
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
