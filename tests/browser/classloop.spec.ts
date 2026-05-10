import { expect, test, type Download, type Page } from "@playwright/test";

const teacherEmail = "teacher@classloop.demo";
const teacherPassword = "classloop-teacher";
const studentEmail = "maya@classloop.demo";
const studentPassword = "classloop-student";

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
  const dialog = page.getByRole("dialog", { name: /classloop guided walkthrough/i });
  await dialog.waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined);
  if (await dialog.isVisible().catch(() => false)) {
    await dialog.getByRole("button", { name: /skip/i }).click();
  }
}

async function signIn(page: Page, role: "teacher" | "student", reset = true, closeWalkthrough = true) {
  if (reset) await resetBrowser(page);
  if (role === "student") {
    await page.getByRole("button", { name: /student/i }).click();
  }
  await page.getByPlaceholder("name@example.com").fill(role === "teacher" ? teacherEmail : studentEmail);
  await page.getByPlaceholder("Enter password").fill(role === "teacher" ? teacherPassword : studentPassword);
  await page.locator("form.login-form button[type='submit']").click();
  if (closeWalkthrough) await skipAutoWalkthrough(page);
}

async function expectDownloaded(downloadPromise: Promise<Download>, filenamePattern: RegExp) {
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(filenamePattern);
}

test("public root shows landing page and can enter the app demo", async ({ page }) => {
  await page.goto("/#features");
  await expect(page.getByRole("heading", { name: /^ClassLoop$/i })).toBeVisible();
  await expect(page.getByText(/Import class records/i)).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /^ClassLoop$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /download for macos/i })).toBeVisible();
  await page.getByRole("button", { name: /open web demo/i }).click();
  await expect(page.getByPlaceholder("name@example.com")).toBeVisible();
});

test("hosted demo mode uses sample accounts only and does not persist demo workspace data", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto("/?demoOnly=1#/dashboard");

  await expect(page.getByRole("heading", { name: /try classloop as a teacher or student/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /demo teacher side/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /demo student side/i })).toBeVisible();
  await expect(page.getByPlaceholder("name@example.com")).toHaveCount(0);
  await expect(page.getByPlaceholder("Enter password")).toHaveCount(0);

  await page.getByRole("button", { name: /demo teacher side/i }).click();
  await expect(page.getByRole("dialog", { name: /classloop guided walkthrough/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /start on the dashboard/i })).toBeVisible();
  await page.getByRole("button", { name: /skip/i }).click();
  await expect(page.getByText(/You are on a demo account/i)).toBeVisible();
  await expect(page.getByText(/Please download the app to create your own account/i)).toBeVisible();
  await page.waitForTimeout(500);
  const persistedSessions = await page.evaluate(() => localStorage.getItem("classloop:secure:sessions:v3"));
  expect(persistedSessions).toBeNull();

  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page.getByRole("heading", { name: /try classloop as a teacher or student/i })).toBeVisible();
});

async function publishGeometrySample(page: Page) {
  await page.getByRole("button", { name: /new session/i }).first().click();
  await expect(page.getByText(/session template/i)).toBeVisible();
  await page.getByLabel(/session template/i).selectOption("CS workshop");
  await expect(page.getByText(/project or repo/i)).toBeVisible();
  await page.getByRole("button", { name: /use geometry sample/i }).click();
  await expect(page.getByText(/practice problems/i)).toBeVisible();
  await page.getByRole("button", { name: /generate draft/i }).click();
  await expect(page.getByText(/edit the draft before publishing/i)).toBeVisible({ timeout: 10_000 });

  await page.getByRole("tab", { name: /roster & matching/i }).click();
  await expect(page.getByText(/all transcript speakers match the roster/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /import csv/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /export csv/i })).toBeVisible();
  await page.locator('input[accept=".csv,text/csv"]').setInputFiles({
    name: "main-roster.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Name,Email,Aliases\nMaya Chen,maya@classloop.demo,Maya iPad\nAarav Patel,aarav@classloop.demo,\n"),
  });
  await expect(page.locator('input[value="Maya iPad"]')).toBeVisible();
  await page.locator(".roster-attendance-field select").first().selectOption("late");
  await page.getByRole("button", { name: /^link$/i }).first().click();
  await expect(page.getByText(/linked to maya@classloop.demo/i)).toBeVisible();

  await page.getByRole("tab", { name: /class recap/i }).click();
  await page.getByLabel(/approved recap/i).fill("Edited recap: similar triangles, proportional reasoning, and student support checks.");
  await page.getByLabel(/essential question 1/i).fill("How do proportional sides prove triangles are similar?");

  await page.getByRole("tab", { name: /follow-up/i }).click();
  await page.locator(".editable-item input").first().fill("Edited similar triangles practice");
  await page.locator(".editable-item select").first().selectOption("in_progress");
  await page.locator(".followup-card select").first().selectOption("overdue");
  await expect(page.getByText(/participation signals/i)).toBeVisible();

  await page.getByRole("button", { name: /preview and publish/i }).click();
  await expect(page.getByText(/review the student view/i)).toBeVisible();
  await expect(page.getByText(/student portal preview/i)).toBeVisible();
  await expect(page.getByText(/per-student preview differences/i)).toBeVisible();
  await expect(page.getByText(/publish audit/i)).toBeVisible();
  expect(await page.locator(".preview-diff-row").count()).toBeGreaterThanOrEqual(2);
  await page.locator(".preview-diff-row").filter({ hasText: "Aarav" }).click();
  await expect(page.getByLabel(/Preview for Aarav Patel/i)).toBeVisible();
  await page.getByRole("button", { name: /add task/i }).click();
  await page.locator(".editable-line input").last().fill("Bring one corrected proportion to class");
  await page.getByRole("button", { name: /add resource/i }).click();
  await page.locator(".resource-edit-row input").last().fill("Teacher-added review link");
  await expect(page.getByText(/bring one corrected proportion to class/i)).toBeVisible();
  await page.getByRole("button", { name: /publish to students/i }).click();
  await expect(page.getByText(/save this roster/i)).toBeVisible();
  await page.getByLabel(/roster name/i).fill("Geometry review roster");
  await page.getByRole("button", { name: /save roster/i }).click();
  await expect(page.getByText(/Follow-through tracker/i)).toBeVisible();
}

test("account creation, settings, and password reset work", async ({ page }) => {
  await resetBrowser(page);
  const uniqueEmail = `teacher-${Date.now()}@classloop.test`;
  const originalPassword = "classloop-new-teacher";
  const resetPassword = "classloop-reset-teacher";

  await page.getByRole("button", { name: /create account/i }).click();
  await page.getByLabel(/^name$/i).fill("Test Teacher");
  await page.getByPlaceholder("name@example.com").fill(uniqueEmail);
  await page.locator('input[placeholder="Enter password"]').fill(originalPassword);
  await page.locator('input[placeholder="Re-enter password"]').fill(originalPassword);
  await page.locator("form.login-form button[type='submit']").click();
  await expect(page.getByRole("dialog", { name: /classloop guided walkthrough/i })).toBeVisible();
  await page.getByRole("button", { name: /skip/i }).click();
  await expect(page.getByText("Today in ClassLoop")).toBeVisible();

  await page.getByRole("button", { name: /test teacher/i }).click();
  await page.locator(".profile-menu").getByLabel(/^name$/i).fill("Test Teacher Updated");
  await page.locator(".profile-menu button[type='submit']").click();
  await expect(page.getByText(/settings saved/i)).toBeVisible();
  await page.getByRole("button", { name: /done/i }).click();
  await expect(page.getByRole("button", { name: /test teacher updated/i })).toBeVisible();
  await page.getByRole("button", { name: /sign out/i }).click();

  await page.getByPlaceholder("name@example.com").fill(uniqueEmail);
  await page.getByRole("button", { name: /forgot password/i }).click();
  await page.getByRole("button", { name: /get reset code/i }).click();
  const resetCode = (await page.locator(".reset-code-card button").textContent())?.trim() ?? "";
  expect(resetCode).toMatch(/^\d{6}$/);
  await page.getByPlaceholder("6-digit code").fill(resetCode);
  await page.locator('input[placeholder="New password"]').fill(resetPassword);
  await page.locator('input[placeholder="Confirm new password"]').fill(resetPassword);
  await page.getByRole("button", { name: /^reset password$/i }).click();
  await expect(page.getByText(/password reset/i)).toBeVisible();
  await page.getByPlaceholder("Enter password").fill(resetPassword);
  await page.locator("form.login-form button[type='submit']").click();
  await expect(page.getByText("Today in ClassLoop")).toBeVisible();
});

test("teacher can log in, import a sample, preview publishing, publish, open student view, and access analytics", async ({ page }) => {
  await signIn(page, "teacher");
  await expect(page.getByText("Today in ClassLoop")).toBeVisible();
  await page.waitForTimeout(500);
  const storageState = await page.evaluate(() => ({
    legacyAccounts: localStorage.getItem("classloop:accounts:v1"),
    secureAccounts: localStorage.getItem("classloop:secure:accounts:v1"),
  }));
  expect(storageState.legacyAccounts).toBeNull();
  expect(storageState.secureAccounts).toBeNull();

  await publishGeometrySample(page);
  const reportActionHeights = await page
    .locator(".report-actions > button, .report-actions > .report-export > button")
    .evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
  expect(Math.max(...reportActionHeights)).toBeLessThan(80);

  const jsonDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /^export$/i }).click();
  await expect(page.getByRole("menu", { name: /export options/i })).toBeVisible();
  await page.getByRole("menuitem", { name: /download json/i }).click();
  await expectDownloaded(jsonDownload, /geometry-review.*\.json/i);
  const csvDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /^export$/i }).click();
  await page.getByRole("menuitem", { name: /download csv/i }).click();
  await expectDownloaded(csvDownload, /geometry-review.*\.csv/i);
  await page.getByRole("button", { name: /^export$/i }).click();
  await expect(page.getByRole("menuitem", { name: /print report/i })).toBeVisible();

  await page.getByRole("button", { name: /rosters/i }).click();
  await expect(page.getByText("Geometry review roster")).toBeVisible();
  await expect(page.getByText(/2 students/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /export csv/i }).first()).toBeVisible();
  await page.locator('input[accept=".csv,text/csv"]').last().setInputFiles({
    name: "period-4.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Name,Email,Aliases\nMaya Chen,maya@classloop.demo,Maya iPad\nAarav Patel,aarav@classloop.demo,\n"),
  });
  await expect(page.locator('input[value="Maya iPad"]')).toBeVisible();

  await page.getByRole("button", { name: /classes/i }).click();
  await expect(page.getByText("Geometry review roster")).toBeVisible();
  await expect(page.getByText(/published sessions linked to this class/i)).toBeVisible();

  await page.getByRole("button", { name: /new session/i }).first().click();
  await page.getByLabel(/session template/i).selectOption("Math review");
  await expect(page.getByLabel(/preload saved roster/i)).toContainText("Geometry review roster");
  await expect(page.getByLabel(/preload class roster/i)).toContainText("Geometry review roster");

  await page.getByRole("button", { name: /student view/i }).click();
  await expect(page.getByText(/follow-up dashboard/i)).toBeVisible();
  await page.getByRole("button", { name: /mark complete/i }).click();
  await expect(page.getByText(/submitted/i).first()).toBeVisible();
  await page.getByRole("button", { name: /open detail/i }).click();
  await expect(page.getByText(/what happened/i)).toBeVisible();
  await page.getByRole("button", { name: /mark reviewed/i }).click();
  await expect(page.getByText(/reviewed/i).first()).toBeVisible();

  await page.getByRole("button", { name: /analytics/i }).click();
  await expect(page.getByText(/Participation and follow-through/i)).toBeVisible();
  await expect(page.getByText(/teacher action queue/i)).toBeVisible();

  await page.getByRole("button", { name: /session report/i }).click();
  await expect(page.getByRole("button", { name: /^export$/i })).toBeVisible();
  await page.getByRole("button", { name: /^export$/i }).click();
  await expect(page.getByRole("menuitem", { name: /download json/i })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: /download csv/i })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: /print report/i })).toBeVisible();

  await page.getByRole("button", { name: /privacy/i }).click();
  await expect(page.getByText(/Manage retention, recording consent/i)).toBeVisible();

  await page.getByRole("button", { name: /session report/i }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /delete session/i }).click();
  await expect(page.getByText("Today in ClassLoop")).toBeVisible();
});

test("privacy, sync billing, appearance, and tutorial controls are usable", async ({ page }) => {
  await signIn(page, "teacher");

  await page.getByRole("button", { name: /appearance/i }).click();
  await expect(page.getByText(/experience settings/i)).toBeVisible();
  await page.getByRole("button", { name: /graphite focus/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "graphite");
  await page.getByLabel(/custom accent/i).fill("#2563eb");
  await page.getByLabel(/image backdrop url/i).fill("https://example.com/classroom.jpg");
  await expect(page.locator(".live-theme-preview")).toHaveAttribute("style", /classroom\.jpg/);
  await page.getByRole("button", { name: /remove image/i }).click();
  await page.getByRole("button", { name: /^reset$/i }).click();

  await expect(page.locator(".topbar-actions").getByRole("button", { name: /student preview/i })).toHaveCount(0);
  await page.getByRole("button", { name: /open interactive walkthrough/i }).click();
  await expect(page.getByRole("dialog", { name: /classloop guided walkthrough/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /start on the dashboard/i })).toBeVisible();
  if ((page.viewportSize()?.width ?? 0) > 920) {
    const firstStepTarget = await page.locator('[data-tour="dashboard-hero"]').boundingBox();
    const firstStepPopover = await page.locator(".tour-popover").boundingBox();
    expect(firstStepTarget).not.toBeNull();
    expect(firstStepPopover).not.toBeNull();
    if (firstStepTarget && firstStepPopover) {
      const overlapsTarget = !(
        firstStepPopover.x + firstStepPopover.width <= firstStepTarget.x ||
        firstStepPopover.x >= firstStepTarget.x + firstStepTarget.width ||
        firstStepPopover.y + firstStepPopover.height <= firstStepTarget.y ||
        firstStepPopover.y >= firstStepTarget.y + firstStepTarget.height
      );
      expect(overlapsTarget).toBe(false);
    }
  }
  const tourBackdropFilter = await page
    .locator(".guided-tour")
    .evaluate((element) => getComputedStyle(element).backdropFilter);
  expect(["", "none"].includes(tourBackdropFilter)).toBe(true);
  await page.getByRole("button", { name: /^next/i }).click();
  await expect(page.getByRole("heading", { name: /create the session/i })).toBeVisible();
  await expect(page.locator(".tour-backdrop-piece")).toHaveCount(4);
  await expect(page.locator(".tour-corner-mask")).toHaveCount(4);
  if ((page.viewportSize()?.width ?? 0) > 920) {
    await expect.poll(async () => (await page.locator(".tour-highlight").boundingBox())?.height ?? 999).toBeLessThan(90);
  }
  await page.getByRole("button", { name: /skip/i }).click();
  await expect(page.getByText("Today in ClassLoop")).toBeVisible();

  await page.getByRole("button", { name: /^plan options$/i }).click();
  await expect(page.getByRole("heading", { name: /save time on every class follow-up/i })).toBeVisible();
  await expect(page.getByText(/plan options/i).first()).toBeVisible();
  await expect(page.getByText(/why teachers upgrade/i)).toBeVisible();
  await expect(page.getByPlaceholder("you@school.org")).toHaveCount(0);
  await expect(page.getByText(/school pilot/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /keep free/i })).toHaveCount(0);
  await page.getByRole("button", { name: /upgrade to pro/i }).click();
  await expect(page.getByRole("button", { name: /downgrade to free/i })).toBeVisible();
  await expect(page.getByText(/normal login vs cloud email/i)).toBeVisible();
  await page.getByPlaceholder("you@school.org").fill("teacher@example.edu");
  await page.locator('input[type="password"]').fill("cloud-password");
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await expect(page.locator(".settings-message").filter({ hasText: /supabase keys|cloud sync connected|invalid login|unable|email|password/i })).toBeVisible();

  await page.getByRole("button", { name: /^privacy$/i }).click();
  await expect(page.getByText(/manage retention, recording consent/i)).toBeVisible();
  await page.getByLabel(/keep class session data/i).fill("180");
  await page.getByLabel(/require confirmation before live audio notes/i).uncheck();
  await page.getByLabel(/allow student-specific data exports/i).uncheck();
  await page.getByLabel(/no training on student data/i).check();
  const workspaceDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /export workspace data/i }).click();
  await expectDownloaded(workspaceDownload, /classloop-export-.*\.json/i);
  await expect(page.getByText(/You are on a demo account/i)).toBeVisible();
});

test("live capture modes are visible but Pro-gated for Free accounts", async ({ page }) => {
  await signIn(page, "teacher");
  await page.getByRole("button", { name: /new session/i }).first().click();

  await expect(page.getByText(/Use a transcript, in-person capture, or meeting audio/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Transcript\s*Upload or paste/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /In-person class/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Online meeting/i })).toBeVisible();
  await expect(page.getByText(/Pro only/i).first()).toBeVisible();

  await page.getByRole("button", { name: /In-person class/i }).click();
  await expect(page.getByText(/In-person live capture is available with Pro/i)).toBeVisible();

  await page.getByRole("button", { name: /^plan options$/i }).click();
  await page.getByRole("button", { name: /upgrade to pro/i }).click();
  await page.getByRole("button", { name: /new session/i }).first().click();
  await expect(page.getByText(/Pro only/i)).toHaveCount(0);
  await page.getByRole("button", { name: /In-person class/i }).click();
  await expect(page.getByText(/No voiceprints are created/i)).toBeVisible();
  await expect(page.getByText(/unknown voice segments/i)).toBeVisible();
  await expect(page.getByText(/Start capture before discussion/i)).toBeVisible();

  await page.getByRole("button", { name: /Online meeting/i }).click();
  await expect(page.getByText(/Start capture when the call begins/i)).toBeVisible();
  await expect(page.getByRole("dialog", { name: /share the meeting tab or window with audio/i })).toBeVisible();
  await expect(page.getByText(/Paste the platform transcript after class/i)).toBeVisible();
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
  await expect(page.locator("html")).toHaveAttribute("data-theme", "classroom");
  await expect(page.getByText(/You are on a demo account/i)).toBeVisible();
});

test("core controls remain usable on a phone-sized viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 });
  await signIn(page, "teacher");
  await expect(page.getByRole("button", { name: /new session/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /appearance/i })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 4);
  expect(hasHorizontalOverflow).toBe(false);
});
