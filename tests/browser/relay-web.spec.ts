import { expect, test } from "@playwright/test";

test("hosted web landing and sample-only demo are usable", async ({ page }) => {
  await page.goto("/?demoOnly=1");
  await expect(page.getByRole("heading", { name: /^Relay$/i })).toBeVisible();
  await expect(
    page.locator(".landing-hero > .landing-actions").getByRole("button", {
      name: /^(download for macos|macos packaging pending)$/i,
    }),
  ).toBeVisible();
  await expect(page.locator(".landing-download-band").getByRole("button", { name: /windows( pending)?$/i })).toBeVisible();
  await expect(page.locator(".landing-download-band").getByRole("button", { name: /linux( pending)?$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /open web demo/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /add to phone/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /use relay from a browser or add it to your home screen/i })).toBeVisible();

  const platformDownloads = page.locator(".landing-platform-list");
  const readyDownloads = await platformDownloads.getByText(/download ready/i).count();
  if (!readyDownloads) {
    await expect(platformDownloads.getByRole("button", { name: /macos.*packaging pending/i })).toBeVisible();
    await expect(platformDownloads.getByRole("button", { name: /windows.*packaging pending/i })).toBeVisible();
    await expect(platformDownloads.getByRole("button", { name: /linux.*packaging pending/i })).toBeVisible();
  }

  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  const manifestJson = await manifest.json();
  expect(manifestJson.display).toBe("standalone");
  expect(manifestJson.start_url).toContain("source=pwa");
  expect(manifestJson.icons?.map((icon: { src: string }) => icon.src)).toContain("/relay-app-icon-512.png");

  const serviceWorker = await page.request.get("/sw.js");
  expect(serviceWorker.ok()).toBeTruthy();
  await expect(serviceWorker.text()).resolves.toContain("relay-mobile-shell");

  const downloadPromise = page.waitForEvent("download", { timeout: 5_000 }).catch(() => null);
  await page
    .locator(".landing-hero > .landing-actions")
    .getByRole("button", { name: /^(download for macos|macos packaging pending)$/i })
    .click();
  const download = await downloadPromise;
  if (download) {
    await download.cancel().catch(() => undefined);
  } else {
    await expect(page.getByRole("status").filter({ hasText: /macos packaging pending/i })).toBeVisible();
  }

  await page.getByRole("button", { name: /open web demo/i }).click();
  await expect(page.getByRole("heading", { name: /try relay as a teacher or student/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /demo teacher side/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /demo student side/i })).toBeVisible();
  await expect(page.getByPlaceholder("name@example.com")).toHaveCount(0);
  await expect(page.getByPlaceholder("Enter password")).toHaveCount(0);

  await page.getByRole("button", { name: /demo teacher side/i }).click();
  await expect(page.getByRole("dialog", { name: /relay guided walkthrough/i })).toBeVisible();
  await page.getByRole("button", { name: /skip/i }).click();
  await expect(page.getByText(/You are on a demo account/i)).toBeVisible();
});
