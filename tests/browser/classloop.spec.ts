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
  await expect(page.getByText(/student portal preview/i)).toBeVisible();
  await expect(page.getByText(/why this is assigned/i)).toBeVisible();
  await page.getByRole("button", { name: /publish to students/i }).click();
  await expect(page.getByText(/Follow-through tracker/i)).toBeVisible();
}

test("teacher can import, preview, publish, export, and open analytics", async ({ page }) => {
  await signIn(page, "teacher");
  await expect(page.getByText("Today in ClassLoop")).toBeVisible();
  await publishGeometrySample(page);

  await expect(page.getByRole("button", { name: /export json/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /export csv/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /print report/i })).toBeVisible();

  await page.getByRole("button", { name: /edit draft/i }).click();
  await page.getByRole("tab", { name: /roster & matching/i }).click();
  await expect(page.getByRole("button", { name: /import csv/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /export csv/i })).toBeVisible();
  await page.locator('input[accept=".csv,text/csv"]').setInputFiles({
    name: "main-roster.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Name,Email,Aliases\nMaya Chen,maya@classloop.demo,Maya iPad\nAarav Patel,aarav@classloop.demo,\n"),
  });
  await expect(page.locator('input[value="Maya iPad"]')).toBeVisible();

  await page.getByRole("button", { name: /student view/i }).click();
  await expect(page.getByText(/follow-up dashboard/i)).toBeVisible();

  await page.getByRole("button", { name: /analytics/i }).click();
  await expect(page.getByText(/Participation and follow-through/i)).toBeVisible();
});

test("student navigation hides teacher analytics", async ({ page }) => {
  await signIn(page, "student");
  await expect(page.getByRole("button", { name: /analytics/i })).toHaveCount(0);
  await expect(page.getByText(/follow-up dashboard/i)).toBeVisible();
});

test("core controls stay usable on a phone-sized viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 });
  await signIn(page, "teacher");
  await expect(page.getByRole("button", { name: /new session/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /appearance/i })).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 4);
  expect(hasHorizontalOverflow).toBe(false);
});
