const fs = require("fs");
const os = require("os");
const path = require("path");
const { _electron: electron } = require("playwright");

const appName = "Relay";

function defaultExecutablePath() {
  if (process.platform === "darwin") {
    const archDir = process.arch === "arm64" ? "mac-arm64" : "mac";
    return path.join("release", archDir, `${appName}.app`, "Contents", "MacOS", appName);
  }
  if (process.platform === "win32") {
    const archDir = process.arch === "arm64" ? "win-arm64-unpacked" : "win-unpacked";
    return path.join("release", archDir, `${appName}.exe`);
  }
  if (process.platform === "linux") {
    const archDir = process.arch === "arm64" ? "linux-arm64-unpacked" : "linux-unpacked";
    return path.join("release", archDir, appName.toLowerCase());
  }
  throw new Error(`Unsupported platform for packaged smoke test: ${process.platform}`);
}

function resolveExecutable() {
  return path.resolve(process.argv[2] || defaultExecutablePath());
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(message) {
  console.log(`[packaged-smoke] ${message}`);
}

async function waitForFile(filePath, timeoutMs = 8_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (fs.existsSync(filePath)) return;
    await wait(200);
  }
  throw new Error(`Timed out waiting for ${filePath}`);
}

async function close(app) {
  if (app) {
    const process = app.process?.();
    await Promise.race([
      app.close().catch(() => undefined),
      wait(5_000).then(() => {
        process?.kill("SIGKILL");
      }),
    ]);
  }
}

async function run() {
  const executablePath = resolveExecutable();
  if (!fs.existsSync(executablePath)) {
    throw new Error(`Packaged executable was not found: ${executablePath}`);
  }

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "relay-first-run-"));
  const dataFile = path.join(userDataDir, ".relay-data.json");
  const email = `packaged-${Date.now()}@relay.test`;
  const password = "relay-packaged-smoke";
  const launchOptions = {
    executablePath,
    env: {
      ...process.env,
      RELAY_USER_DATA_DIR: userDataDir,
    },
  };

  let firstRun;
  let secondRun;
  let passed = false;
  try {
    log(`Launching ${executablePath}`);
    firstRun = await electron.launch(launchOptions);
    const firstPage = await firstRun.firstWindow();
    firstPage.setDefaultTimeout(20_000);
    log("Waiting for first-run sign-in screen");
    await firstPage.getByPlaceholder("name@example.com").waitFor({ timeout: 20_000 });
    log("Creating a clean teacher account");
    await firstPage.getByRole("button", { name: /create account/i }).click();
    await firstPage.getByLabel(/^name$/i).fill("Packaged Smoke Teacher");
    await firstPage.getByPlaceholder("name@example.com").fill(email);
    await firstPage.locator('input[placeholder="Enter password"]').fill(password);
    await firstPage.locator('input[placeholder="Re-enter password"]').fill(password);
    await firstPage.locator("form.login-form button[type='submit']").click();
    log("Waiting for teacher dashboard");
    await firstPage.getByText("Today in Relay").waitFor({ timeout: 20_000 });
    const walkthrough = firstPage.getByRole("dialog", { name: /relay guided walkthrough/i });
    if (await walkthrough.isVisible().catch(() => false)) {
      await walkthrough.getByRole("button", { name: /skip/i }).click();
    }
    log("Waiting for encrypted desktop state file");
    await waitForFile(dataFile);
    const stored = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    if (!stored || typeof stored !== "object" || !("payload" in stored)) {
      throw new Error("Packaged first-run data file was created without the expected payload wrapper.");
    }
    await close(firstRun);
    firstRun = null;

    log("Relaunching from the same clean profile");
    secondRun = await electron.launch(launchOptions);
    const secondPage = await secondRun.firstWindow();
    secondPage.setDefaultTimeout(20_000);
    await secondPage.getByPlaceholder("name@example.com").waitFor({ timeout: 20_000 });
    await secondPage.getByPlaceholder("name@example.com").fill(email);
    await secondPage.getByPlaceholder("Enter password").fill(password);
    await secondPage.locator("form.login-form button[type='submit']").click();
    await secondPage.getByText("Today in Relay").waitFor({ timeout: 20_000 });

    console.log(`Packaged first-run smoke passed for ${executablePath}`);
    console.log(`Clean user data dir: ${userDataDir}`);
    passed = true;
  } finally {
    await close(secondRun);
    await close(firstRun);
    if (passed) {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } else {
      console.error(`Packaged first-run smoke failed. Preserved clean user data dir: ${userDataDir}`);
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
