import { expect, test, type Page } from "@playwright/test";

const teacherEmail = "teacher@relay.demo";
const teacherPassword = "relay-teacher";

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

async function signInTeacher(page: Page) {
  await resetBrowser(page);
  await page.getByPlaceholder("name@example.com").fill(teacherEmail);
  await page.getByPlaceholder("Enter password").fill(teacherPassword);
  await page.locator("form.login-form button[type='submit']").click();
  await skipAutoWalkthrough(page);
}

function privateLogPattern() {
  return /maya@relay\.test|jordan@relay\.test|teacher@relay\.demo|proportional reasoning|short reflection|not-a-url|study-guide/i;
}

test.describe("user-visible error states and recovery", () => {
  test("bad transcript format and malformed resource URLs show recoverable warnings without leaking private text to logs", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Runs once on desktop; mobile coverage focuses on layout and PWA checks.");
    const runtimeMessages: string[] = [];
    page.on("console", (message) => {
      if (["error", "warning", "info", "log", "debug"].includes(message.type())) runtimeMessages.push(message.text());
    });

    await signInTeacher(page);
    await page.getByRole("button", { name: /new session/i }).first().click();
    await page.getByLabel(/session title/i).fill("Recover malformed import inputs");
    await page.getByLabel(/paste transcript text/i).fill(
      "This export lost speaker labels.\n" +
        "The class reviewed proportional reasoning and the teacher assigned a short reflection due Friday.\n" +
        "Malformed links should not break parsing: not-a-url, www.example without protocol, https://example.com/reflection-guide.",
    );
    const summary = page.locator(".summary-input-card");
    await summary.getByLabel(/^Roster$/i).fill("Maya Chen, maya@relay.test\nJordan Lee, jordan@relay.test");
    await summary.getByLabel(/^Meeting notes$/i).fill("Maya needs a check-in; Jordan should redo one proportion.");
    await summary.getByLabel(/^Resources$/i).fill(
      "not a url\n" + "www.example without protocol\n" + "https://example.com/study-guide).",
    );

    await expect(page.getByRole("status").filter({ hasText: /no speaker labels were detected/i })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: /resource .*http:\/\/ or https:\/\//i })).toBeVisible();

    await page.getByRole("button", { name: /generate draft/i }).click();
    await expect(page.getByText(/edit the draft before publishing/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/all transcript speakers match the roster/i)).toBeVisible();

    await page.getByRole("tab", { name: /follow-up/i }).click();
    await expect(page.locator('input[value="https://example.com/study-guide"]')).toBeVisible();
    await expect(page.getByText("not a url")).toHaveCount(0);

    expect(runtimeMessages.join("\n")).not.toMatch(privateLogPattern());
  });

  test("shared sync API outage falls back to usable local browser state with visible recovery copy", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Runs once because it intentionally intercepts shared-state API calls.");
    const runtimeMessages: string[] = [];
    page.on("console", (message) => {
      if (["error", "warning", "info", "log", "debug"].includes(message.type())) runtimeMessages.push(message.text());
    });
    await page.route("**/api/state", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Shared sync API unavailable for outage drill." }),
      });
    });

    await page.goto("/#/dashboard");
    await expect(page.getByPlaceholder("name@example.com")).toBeVisible();
    await page.getByPlaceholder("name@example.com").fill(teacherEmail);
    await page.getByPlaceholder("Enter password").fill(teacherPassword);
    await page.locator("form.login-form button[type='submit']").click();
    await skipAutoWalkthrough(page);
    await expect(page.getByText("Today in Relay")).toBeVisible();

    await page.getByRole("button", { name: /ms\. rivera/i }).click();
    await expect(page.locator(".profile-menu")).toContainText(/Saved in this browser/i);
    expect(runtimeMessages.join("\n")).not.toMatch(privateLogPattern());
  });
});
