import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.CLASSLOOP_WEB_TEST_URL || "https://class-loop-ten.vercel.app";

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
