import { expect, test, type Page } from "@playwright/test";
import {
  expectContrast,
  expectKeyboardFocusOrder,
  expectNoUnnamedInteractive,
  expectReadableMobileLayout,
} from "./accessibility-helpers";

const teacherEmail = "teacher@relay.demo";
const teacherPassword = "relay-teacher";
const studentEmail = "maya@relay.demo";
const studentPassword = "relay-student";

const landingContrastSelectors = [
  ".landing-hero h1",
  ".landing-hero p",
  ".landing-primary",
  ".landing-secondary",
  ".landing-message",
  ".landing-feature-band h2",
  ".landing-feature-band p",
];

const loginContrastSelectors = [
  ".login-panel h1",
  ".login-copy p",
  ".field > span",
  ".role-tabs button.active",
  ".primary-button",
  ".text-button",
  ".login-help span",
  ".security-card p",
];

async function resetBrowser(page: Page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto("/#/dashboard");
  await expect(page.getByPlaceholder("name@example.com")).toBeVisible();
}

async function skipAutoWalkthrough(page: Page) {
  const dialog = page.getByRole("dialog", { name: /relay guided walkthrough/i });
  await dialog.waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined);
  if (await dialog.isVisible().catch(() => false)) {
    await dialog.getByRole("button", { name: /skip/i }).click();
  }
}

async function signIn(page: Page, role: "teacher" | "student") {
  await resetBrowser(page);
  if (role === "student") {
    await page.getByRole("tab", { name: /student/i }).click();
  }
  await page.getByPlaceholder("name@example.com").fill(role === "teacher" ? teacherEmail : studentEmail);
  await page.getByPlaceholder("Enter password").fill(role === "teacher" ? teacherPassword : studentPassword);
  await page.locator("form.login-form button[type='submit']").click();
  await skipAutoWalkthrough(page);
}

test.describe("WCAG-targeted accessibility checks", () => {
  test("login and student completion support keyboard navigation, focus order, labels, contrast, and announcements", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Runs once on desktop; PWA/mobile WCAG checks run in their own tests.");

    await resetBrowser(page);
    await expectNoUnnamedInteractive(page, ".login-panel");
    await expect(
      page.getByRole("tablist", { name: /choose account type/i }).getByRole("tab", { name: /teacher/i }),
    ).toHaveAttribute("aria-selected", "true");
    await expectKeyboardFocusOrder(page, [
      /^Sign in$/,
      /^Create account$/,
      /^Teacher$/,
      /^Student$/,
      /Email name@example.com/,
      /Password Enter password/,
      /^Show password$/,
      /^Forgot password\?$/,
      /^Sign in$/,
    ]);
    await expectContrast(page, loginContrastSelectors);

    await signIn(page, "student");
    await expectNoUnnamedInteractive(page, ".app-shell");
    await page.getByRole("button", { name: /open detail/i }).first().click();
    const liveRegion = page.locator(".checkin-celebration[aria-live='polite']");
    await expect(liveRegion).toBeVisible();
    const checkInButton = liveRegion.getByRole("button", { name: /complete check-in|completed/i });
    if (!/completed/i.test((await checkInButton.textContent()) ?? "")) {
      await checkInButton.click();
    }
    await expect(liveRegion.getByRole("button", { name: /completed/i })).toBeVisible();
  });

  test("landing PWA install controls expose names, contrast, and screen-reader status announcements", async ({ page }) => {
    await page.goto("/?demoOnly=1");
    await expect(page.getByRole("heading", { name: /^Relay$/i })).toBeVisible();
    if ((page.viewportSize()?.width ?? 0) > 920) {
      await expect(page.getByRole("button", { name: /^docs$/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /^donate$/i })).toBeVisible();
    }

    await expectNoUnnamedInteractive(page, ".landing-page");
    await expectContrast(page, landingContrastSelectors);

    await page.locator(".landing-hero").getByRole("button", { name: /^add to phone$/i }).click();
    await expect(
      page.getByRole("status").filter({ hasText: /home screen|install app|install menu|already running|added/i }),
    ).toBeVisible();
  });

  test("PWA and add-to-home-screen layout stays readable on a phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 850 });
    await page.goto("/#/download");
    await expect(page.getByRole("heading", { name: /use relay from a browser or add it to your home screen/i })).toBeVisible();

    await expectReadableMobileLayout(page, ".landing-page");
    await expectContrast(page, [
      ".landing-mobile-card h2",
      ".landing-mobile-card p",
      ".mobile-step span",
      ".landing-download-band h2",
      ".landing-download-band p",
      ".landing-primary",
      ".landing-secondary",
      ".landing-message",
    ]);
    await page.locator(".landing-mobile-band").getByRole("button", { name: /add to phone/i }).click();
    await expect(
      page.getByRole("status").filter({ hasText: /home screen|install app|install menu|already running|added/i }),
    ).toBeVisible();
    await expectReadableMobileLayout(page, ".landing-page");
  });
});
