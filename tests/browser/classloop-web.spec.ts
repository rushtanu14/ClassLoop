import { expect, test } from "@playwright/test";

test("hosted web landing and sample-only demo are usable", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^ClassLoop$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /download for macos/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /windows/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /linux/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /open web demo/i })).toBeVisible();

  const downloadPromise = page.waitForEvent("download", { timeout: 5_000 }).catch(() => null);
  await page.getByRole("button", { name: /download for macos/i }).click();
  const download = await downloadPromise;
  if (download) {
    await download.cancel().catch(() => undefined);
  } else {
    await expect(page.getByText(/macos desktop download|web demo/i)).toBeVisible();
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
