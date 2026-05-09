import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, role: "teacher" | "student") {
  await page.goto("/#/dashboard");
  await page.evaluate(() => localStorage.clear());
  if (role === "student") {
    await page.getByRole("button", { name: /student/i }).click();
  }
  await page.getByPlaceholder("name@example.com").fill(role === "teacher" ? "teacher@classloop.demo" : "maya@classloop.demo");
  await page.getByPlaceholder("Enter password").fill(role === "teacher" ? "classloop-teacher" : "classloop-student");
  await page.locator("form.login-form button[type='submit']").click();
}

async function publishGeometrySample(page: Page) {
  await page.getByRole("button", { name: /new session/i }).first().click();
  await page.getByRole("button", { name: /use geometry sample/i }).click();
  await page.getByRole("button", { name: /generate draft/i }).click();
  await expect(page.getByText(/edit the draft before publishing/i)).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: /preview and publish/i }).click();
  await expect(page.getByText(/review the student view/i)).toBeVisible();
  await expect(page.getByText(/student portal preview/i)).toBeVisible();
  await expect(page.getByText(/per-student preview differences/i)).toBeVisible();
  await expect(page.getByText(/publish audit/i)).toBeVisible();
  await expect(page.locator(".preview-diff-row")).toHaveCount(6);
  await page.locator(".preview-diff-row").filter({ hasText: "Aarav" }).click();
  await expect(page.getByLabel(/Preview for Aarav Patel/i)).toBeVisible();
  await page.getByRole("button", { name: /publish to students/i }).click();
  await expect(page.getByText(/save this roster/i)).toBeVisible();
  await page.getByLabel(/roster name/i).fill("Geometry review roster");
  await page.getByRole("button", { name: /save roster/i }).click();
  await expect(page.getByText(/Follow-through tracker/i)).toBeVisible();
}

test("teacher can log in, import a sample, preview publishing, publish, open student view, and access analytics", async ({ page }) => {
  await signIn(page, "teacher");
  await expect(page.getByText("Today in ClassLoop")).toBeVisible();
  await page.waitForTimeout(500);
  const storageState = await page.evaluate(() => ({
    legacyAccounts: localStorage.getItem("classloop:accounts:v1"),
    secureAccounts: localStorage.getItem("classloop:secure:accounts:v1"),
  }));
  expect(storageState.legacyAccounts).toBeNull();
  expect(storageState.secureAccounts).toContain('"encrypted":true');

  await publishGeometrySample(page);

  await page.getByRole("button", { name: /rosters/i }).click();
  await expect(page.getByText("Geometry review roster")).toBeVisible();
  await expect(page.getByText(/6 students/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /export csv/i })).toBeVisible();
  await page.locator('input[accept=".csv,text/csv"]').setInputFiles({
    name: "period-4.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Name,Email,Aliases\nMaya Chen,maya@classloop.demo,Maya iPad\nAarav Patel,aarav@classloop.demo,\n"),
  });
  await expect(page.locator('input[value="Maya iPad"]')).toBeVisible();

  await page.getByRole("button", { name: /classes/i }).click();
  await expect(page.getByText("Geometry review roster")).toBeVisible();
  await expect(page.getByText(/published sessions linked to this class/i)).toBeVisible();

  await page.getByRole("button", { name: /new session/i }).first().click();
  await page.getByRole("button", { name: /math review/i }).click();
  await expect(page.getByLabel(/saved roster/i)).toContainText("Geometry review roster");
  await expect(page.getByLabel(/saved class/i)).toContainText("Geometry review roster");

  await page.getByRole("button", { name: /student view/i }).click();
  await expect(page.getByText(/follow-up dashboard/i)).toBeVisible();

  await page.getByRole("button", { name: /analytics/i }).click();
  await expect(page.getByText(/Participation and follow-through/i)).toBeVisible();

  await page.getByRole("button", { name: /session report/i }).click();
  await expect(page.getByRole("button", { name: /export json/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /export csv/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /print report/i })).toBeVisible();

  await page.getByRole("button", { name: /privacy/i }).click();
  await expect(page.getByText(/Manage retention, recording consent/i)).toBeVisible();
});

test("teacher can choose in-person or online meeting capture without biometric voice ID", async ({ page }) => {
  await signIn(page, "teacher");
  await page.getByRole("button", { name: /new session/i }).first().click();

  await expect(page.getByText(/Use a transcript, in-person capture, or meeting audio/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Transcript/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /In-person class/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Online meeting/i })).toBeVisible();

  await page.getByRole("button", { name: /In-person class/i }).click();
  await expect(page.getByText(/No voiceprints are created/i)).toBeVisible();
  await expect(page.getByText(/unknown voice segments/i)).toBeVisible();
  await expect(page.getByText(/Start capture before discussion/i)).toBeVisible();

  await page.getByRole("button", { name: /Online meeting/i }).click();
  await expect(page.getByText(/Start capture when the call begins/i)).toBeVisible();
  await expect(page.getByText(/platform transcript/i)).toBeVisible();
});

test("students cannot access analytics but can save appearance while logged in, with default theme restored on logout", async ({ page }) => {
  await signIn(page, "student");
  await expect(page.getByRole("button", { name: /analytics/i })).toHaveCount(0);
  await page.getByRole("button", { name: /mark complete/i }).click();
  await expect(page.getByText(/submitted/i).first()).toBeVisible();
  await expect(page.getByText(/since your last visit/i)).toBeVisible();

  await page.getByRole("button", { name: /appearance/i }).click();
  await page.getByRole("button", { name: /Graphite focus/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "graphite");
  await page.getByLabel(/image backdrop url/i).fill("https://example.com/classloop-backdrop.png");
  await expect(page.locator(".live-theme-preview")).toHaveAttribute("style", /classloop-backdrop\.png/);
  const customBackdrop = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--custom-backdrop"),
  );
  expect(customBackdrop).toContain("https://example.com/classloop-backdrop.png");

  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page.getByText(/Sign in to ClassLoop/i)).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "classroom");

  await page.getByRole("button", { name: /student/i }).click();
  await page.getByPlaceholder("name@example.com").fill("maya@classloop.demo");
  await page.getByPlaceholder("Enter password").fill("classloop-student");
  await page.locator("form.login-form button[type='submit']").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "graphite");
});

test("core controls remain usable on a phone-sized viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 });
  await signIn(page, "teacher");
  await expect(page.getByRole("button", { name: /new session/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /appearance/i })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 4);
  expect(hasHorizontalOverflow).toBe(false);
});
