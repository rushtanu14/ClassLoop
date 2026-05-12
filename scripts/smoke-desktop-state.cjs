const fs = require("fs");
const os = require("os");
const path = require("path");
const { _electron: electron } = require("playwright");

const rootDir = path.resolve(__dirname, "..");
const dataFileName = ".relay-data.json";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForFile(filePath, timeoutMs = 8_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (fs.existsSync(filePath)) return;
    await wait(150);
  }
  throw new Error(`Timed out waiting for ${filePath}`);
}

async function close(app) {
  if (app) {
    await app.close().catch(() => undefined);
  }
}

async function launchRelay(userDataDir) {
  const app = await electron.launch({
    args: [rootDir],
    cwd: rootDir,
    env: {
      ...process.env,
      RELAY_USER_DATA_DIR: userDataDir,
    },
  });
  const page = await app.firstWindow();
  await page.getByPlaceholder("name@example.com").waitFor({ timeout: 20_000 });
  return { app, page };
}

async function apiState(page, method = "GET", payload) {
  return page.evaluate(
    async ({ method: requestMethod, payload: requestPayload }) => {
      const response = await fetch("/api/state", {
        method: requestMethod,
        headers: { "Content-Type": "application/json" },
        body: requestPayload === undefined ? undefined : JSON.stringify(requestPayload),
      });
      const body = await response.json();
      return { status: response.status, body };
    },
    { method, payload },
  );
}

async function waitForSessionTitle(page, title, timeoutMs = 5_000) {
  const startedAt = Date.now();
  let lastRead;
  while (Date.now() - startedAt < timeoutMs) {
    lastRead = await apiState(page);
    if (lastRead.status === 200 && lastRead.body.sessions?.[0]?.title === title) {
      return lastRead;
    }
    await wait(150);
  }
  return lastRead;
}

function sampleState() {
  const now = new Date().toISOString();
  return {
    accounts: [
      {
        id: "desktop-state-teacher",
        role: "teacher",
        email: "desktop-state@relay.test",
        name: "Desktop State Teacher",
        passwordHash: "not-a-real-password-hash",
        createdAt: now,
      },
    ],
    sessions: [
      {
        id: "desktop-state-session",
        ownerEmail: "desktop-state@relay.test",
        title: "Encrypted Desktop State Smoke",
        type: "General classroom",
        date: now.slice(0, 10),
        status: "published",
        students: [
          {
            id: "desktop-state-student",
            name: "State Student",
            email: "state-student@relay.test",
            avatarColor: "#0f766e",
          },
        ],
        transcript: "State Student: I can see the restored follow-up.",
        notes: "Desktop state smoke fixture.",
        recap: "State smoke recap.",
        essentialQuestions: ["Can Relay restore encrypted desktop state?"],
        attendance: { "desktop-state-student": "present" },
        resources: [],
        actionItems: [],
        participationEvents: [],
        followUps: [
          {
            studentId: "desktop-state-student",
            reminder: "Verify restore.",
            catchUp: "The restored state should still be readable.",
            tasks: ["Confirm encrypted backup restore"],
            dueDate: now.slice(0, 10),
            status: "todo",
            score: 80,
          },
        ],
        submissions: [],
      },
    ],
    draft: null,
    demoLoaded: false,
    classGroups: [],
    rosterTemplates: [],
    privacySettings: undefined,
    auditLog: [],
    billingProfile: undefined,
  };
}

async function run() {
  const distIndex = path.join(rootDir, "dist", "index.html");
  if (!fs.existsSync(distIndex)) {
    throw new Error("Missing dist/index.html. Run `npm run build` before `npm run test:desktop:state`.");
  }

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "relay-desktop-state-"));
  const dataFile = path.join(userDataDir, dataFileName);
  const backupFile = path.join(userDataDir, `${dataFileName}.backup`);
  const expected = sampleState();
  let relay;

  try {
    relay = await launchRelay(userDataDir);
    const emptyRead = await apiState(relay.page);
    if (emptyRead.status !== 200 || !Array.isArray(emptyRead.body.sessions) || emptyRead.body.sessions.length !== 0) {
      throw new Error(`Expected an empty initial workspace, got status ${emptyRead.status}.`);
    }

    const writeResult = await apiState(relay.page, "PUT", expected);
    if (writeResult.status !== 200 || writeResult.body.sessions?.[0]?.title !== expected.sessions[0].title) {
      throw new Error(`Expected state write to succeed, got status ${writeResult.status}.`);
    }
    await waitForFile(dataFile);

    const storedText = fs.readFileSync(dataFile, "utf8");
    const stored = JSON.parse(storedText);
    if (!stored.encrypted || typeof stored.payload !== "string") {
      throw new Error("Desktop state was not written as an encrypted safeStorage payload.");
    }
    if (storedText.includes(expected.accounts[0].email) || storedText.includes(expected.sessions[0].title)) {
      throw new Error("Encrypted desktop state file contains plaintext account or session data.");
    }

    const decryptedRead = await apiState(relay.page);
    if (decryptedRead.status !== 200 || decryptedRead.body.sessions?.[0]?.title !== expected.sessions[0].title) {
      throw new Error(`Expected encrypted state to decrypt through /api/state, got status ${decryptedRead.status}.`);
    }
    await close(relay.app);
    relay = null;

    fs.copyFileSync(dataFile, backupFile);

    relay = await launchRelay(userDataDir);
    const relaunchRead = await waitForSessionTitle(relay.page, expected.sessions[0].title);
    if (relaunchRead.status !== 200 || relaunchRead.body.sessions?.[0]?.title !== expected.sessions[0].title) {
      throw new Error(`Relaunch did not recover the encrypted desktop state: ${JSON.stringify(relaunchRead.body)}`);
    }
    await close(relay.app);
    relay = null;

    fs.writeFileSync(dataFile, '{"version":1,"encrypted":true,"payload":"truncated', { mode: 0o600 });
    relay = await launchRelay(userDataDir);
    const corruptRead = await apiState(relay.page);
    if (corruptRead.status !== 423 || !corruptRead.body.readOnly || !corruptRead.body.readError) {
      throw new Error(`Corrupt desktop state should surface read-only 423, got ${corruptRead.status}.`);
    }
    const blockedWrite = await apiState(relay.page, "PUT", sampleState());
    if (blockedWrite.status !== 423) {
      throw new Error(`Corrupt desktop state should block overwrite with 423, got ${blockedWrite.status}.`);
    }
    await close(relay.app);
    relay = null;

    fs.copyFileSync(backupFile, dataFile);
    relay = await launchRelay(userDataDir);
    const restoredRead = await waitForSessionTitle(relay.page, expected.sessions[0].title);
    if (restoredRead.status !== 200 || restoredRead.body.sessions?.[0]?.title !== expected.sessions[0].title) {
      throw new Error(`Restored encrypted backup did not load correctly: ${JSON.stringify(restoredRead.body)}`);
    }

    console.log("Desktop state smoke passed: encrypted write/read, crash-corrupt read-only lock, and backup restore.");
  } finally {
    await close(relay?.app);
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
