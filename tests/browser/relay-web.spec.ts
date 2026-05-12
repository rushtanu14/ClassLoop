import { expect, test } from "@playwright/test";
import { expectContrast, expectNoUnnamedInteractive, expectReadableMobileLayout } from "./accessibility-helpers";

const landingContrastSelectors = [
  ".landing-hero h1",
  ".landing-hero p",
  ".landing-primary",
  ".landing-secondary",
  ".landing-message",
  ".landing-feature-band h2",
  ".landing-feature-band p",
];

test("hosted web landing and sample-only demo are usable", async ({ page }) => {
  await page.goto("/?demoOnly=1");
  await expect(page.getByRole("heading", { name: /^Relay$/i })).toBeVisible();
  const screenshotsButton = page.getByRole("button", { name: /^screenshots$/i });
  const docsButton = page.getByRole("button", { name: /^docs$/i });
  const donateButton = page.getByRole("button", { name: /^donate$/i });
  const isWideViewport = (page.viewportSize()?.width ?? 0) > 920;
  await expect(
    page.locator(".landing-hero .landing-actions").getByRole("button", {
      name: /^(download for macos|macos packaging pending)$/i,
    }),
  ).toBeVisible();
  if (isWideViewport) {
    await expect(screenshotsButton).toBeVisible();
    if (await docsButton.isVisible().catch(() => false)) {
      await expect(docsButton).toBeVisible();
    } else {
      await expect(page.getByRole("button", { name: /^privacy$/i })).toBeVisible();
    }
    if (await donateButton.isVisible().catch(() => false)) {
      await expect(donateButton).toBeVisible();
    } else {
      await expect(page.getByRole("button", { name: /^mobile$/i })).toBeVisible();
    }
    await expect(page.getByRole("button", { name: /^download$/i })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: /open web demo/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /add to phone/i })).toBeVisible();
  await expectNoUnnamedInteractive(page, ".landing-page");
  await expectContrast(page, landingContrastSelectors);
  if ((page.viewportSize()?.width ?? 0) <= 500 && (await page.locator(".landing-route-frame").count())) {
    await expectReadableMobileLayout(page, ".landing-page");
  }

  await page.locator(".landing-hero").getByRole("button", { name: /^add to phone$/i }).click();
  const installMessage = /home screen|install app|install menu|already running|added|share then add to home screen|browser menu/i;
  const statusMessage = page.getByRole("status").filter({ hasText: installMessage });
  if (await statusMessage.isVisible().catch(() => false)) {
    await expect(statusMessage).toBeVisible();
  } else {
    await expect(page.locator("p.landing-message, [role='status']").filter({ hasText: installMessage }).first()).toBeVisible();
  }

  if (await screenshotsButton.isVisible().catch(() => false)) {
    await screenshotsButton.click();
    await expect(page.getByRole("heading", { name: /screenshots: how relay works/i })).toBeVisible();
    await expect(page.getByRole("img", { name: /teacher import and review screen/i })).toBeVisible();
    await expect(page.getByRole("img", { name: /student dashboard/i })).toBeVisible();
    await expect(page.getByRole("img", { name: /teacher analytics screen/i })).toBeVisible();
  }

  if (await docsButton.isVisible().catch(() => false)) {
    await docsButton.click();
    await expect(page.getByRole("heading", { name: /^Relay docs\.$/i })).toBeVisible();
  }

  if (await donateButton.isVisible().catch(() => false)) {
    await donateButton.click();
    await expect(page.getByRole("heading", { name: /support relay development/i })).toBeVisible();
    await page.getByRole("button", { name: /support \$3/i }).click();
    await expect(page.getByRole("status").filter({ hasText: /donation link has not been connected/i })).toBeVisible();
  }

  await page.goto("/?demoOnly=1");
  if (!(await page.locator(".landing-platform-list").count())) {
    await page.goto("/?demoOnly=1#/download");
  }
  const downloadRouteHeading = page.getByRole("heading", { name: /download relay/i });
  if (await downloadRouteHeading.isVisible().catch(() => false)) {
    await expect(downloadRouteHeading).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: /use relay from a browser or add it to your home screen/i })).toBeVisible();
  const platformDownloads = page.locator(".landing-platform-list");
  await expect(platformDownloads.getByRole("button", { name: /windows.*packaging pending/i })).toBeVisible();
  await expect(platformDownloads.getByRole("button", { name: /linux.*packaging pending/i })).toBeVisible();
  await expectContrast(page, [
    ".landing-mobile-card h2",
    ".landing-mobile-card p",
    ".mobile-step span",
    ".landing-download-band h2",
    ".landing-download-band p",
  ]);

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
  await page.locator(".landing-platform-list").getByRole("button", { name: /macos.*packaging pending/i }).click();
  const download = await downloadPromise;
  if (download) {
    await download.cancel().catch(() => undefined);
  } else {
    await expect(page.getByRole("status").filter({ hasText: /macos packaging pending/i })).toBeVisible();
  }

  await page.getByRole("button", { name: /open web demo|open demo/i }).first().click();
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

test("hosted public screenshots and privacy routes expose compliance boundaries", async ({ page }) => {
  await page.goto("/?demoOnly=1#/screenshots");
  await expect(page.getByRole("heading", { name: /screenshots: how relay works/i })).toBeVisible();
  await expect(page.getByRole("img", { name: /teacher import and review screen/i })).toBeVisible();
  await expect(page.getByRole("img", { name: /student dashboard/i })).toBeVisible();
  await expect(page.getByRole("img", { name: /teacher analytics screen/i })).toBeVisible();
  for (const screenshotPath of [
    "/screenshots/relay-import-review.svg",
    "/screenshots/relay-student-dashboard.svg",
    "/screenshots/relay-analytics.svg",
  ]) {
    const response = await page.request.get(screenshotPath);
    expect(response.ok()).toBeTruthy();
  }

  await page.goto("/?demoOnly=1#/privacy");
  await expect(page.getByRole("heading", { name: /privacy controls before polish/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /local desktop data/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /no student-data training claim/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /retention and exports/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /hosted demo boundary/i })).toBeVisible();
  await expect(page.getByText(/sample accounts only/i)).toBeVisible();
  await expect(page.getByPlaceholder("name@example.com")).toHaveCount(0);
  await expect(page.getByPlaceholder("Enter password")).toHaveCount(0);
  await expectNoUnnamedInteractive(page, ".landing-page");
  await expectContrast(page, [
    ".landing-page-header h1",
    ".landing-page-header p",
    ".landing-feature-band h2",
    ".landing-feature-band p",
    ".landing-policy-panel h2",
    ".landing-policy-panel p",
  ]);
});
