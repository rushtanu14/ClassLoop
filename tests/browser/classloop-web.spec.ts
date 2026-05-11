import { expect, test } from "@playwright/test";

test("hosted web landing and sample-only demo are usable", async ({ page }) => {
  await page.goto("/?demoOnly=1");
  await expect(page.getByRole("heading", { name: /^ClassLoop$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /download for macos/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Windows", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Linux", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /open web demo/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /add to phone/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /use classloop from a browser or add it to your home screen/i })).toBeVisible();

  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  const manifestJson = await manifest.json();
  expect(manifestJson.display).toBe("standalone");
  expect(manifestJson.start_url).toContain("source=pwa");
  expect(manifestJson.icons?.[0]?.src).toBe("/classloop-app-icon.svg");

  const serviceWorker = await page.request.get("/sw.js");
  expect(serviceWorker.ok()).toBeTruthy();
  await expect(serviceWorker.text()).resolves.toContain("classloop-mobile-shell");

  const downloadPromise = page.waitForEvent("download", { timeout: 5_000 }).catch(() => null);
  await page.getByRole("button", { name: /download for macos/i }).click();
  const download = await downloadPromise;
  if (download) {
    await download.cancel().catch(() => undefined);
  } else {
    await expect(page.getByText(/macos desktop download is being packaged/i)).toBeVisible();
  }

  await page.getByRole("button", { name: /open web demo/i }).click();
  await expect(page.getByRole("heading", { name: /try classloop as a teacher or student/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /demo teacher side/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /demo student side/i })).toBeVisible();
  await expect(page.getByPlaceholder("name@example.com")).toHaveCount(0);
  await expect(page.getByPlaceholder("Enter password")).toHaveCount(0);

  await page.getByRole("button", { name: /demo teacher side/i }).click();
  await expect(page.getByRole("dialog", { name: /classloop guided walkthrough/i })).toBeVisible();
  await page.getByRole("button", { name: /skip/i }).click();
  await expect(page.getByText(/You are on a demo account/i)).toBeVisible();
});
