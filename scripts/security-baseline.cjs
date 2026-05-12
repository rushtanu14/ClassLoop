const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");

function fail(message) {
  throw new Error(message);
}

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: rootDir,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    fail(`git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function isIgnored(filePath) {
  return spawnSync("git", ["check-ignore", "-q", filePath], { cwd: rootDir }).status === 0;
}

function trackedFiles() {
  return runGit(["ls-files", "-z"]).split("\0").filter(Boolean);
}

function readText(relPath) {
  return fs.readFileSync(path.join(rootDir, relPath), "utf8");
}

function trackedTextFiles(files) {
  const binaryExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".ico", ".icns", ".dmg", ".exe", ".zip", ".AppImage", ".deb"]);
  return files.filter((relPath) => {
    if (binaryExtensions.has(path.extname(relPath))) return false;
    const fullPath = path.join(rootDir, relPath);
    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).size > 2_000_000) return false;
    return true;
  });
}

function verifyIgnoredLocalFiles(files) {
  files.forEach((filePath) => {
    if (runGit(["ls-files", filePath]).trim()) {
      fail(`${filePath} is tracked. Remove it from git and keep it local-only.`);
    }
    if (!isIgnored(filePath)) {
      fail(`${filePath} is not ignored by git.`);
    }
  });
}

function verifyNoHighConfidenceSecrets(files) {
  const patterns = [
    { name: "Stripe secret key", pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/ },
    { name: "Stripe webhook secret", pattern: /\bwhsec_[A-Za-z0-9]{16,}\b/ },
    { name: "private key block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
    { name: "GitHub token", pattern: /\bgh[opsu]_[A-Za-z0-9_]{30,}\b/ },
    { name: "OpenAI API key", pattern: /\bsk-proj-[A-Za-z0-9_-]{20,}\b|\bsk-[A-Za-z0-9]{32,}\b/ },
    {
      name: "non-empty server secret env assignment",
      pattern:
        /^(?:SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|RELAY_GMAIL_APP_PASSWORD|RELAY_SMTP_PASS)[^\S\r\n]*=[^\S\r\n]*(?!(?:replace-me|your-16-character-app-password)?[^\S\r\n]*$)[^\r\n]+/im,
    },
  ];

  const findings = [];
  files.forEach((relPath) => {
    const text = readText(relPath);
    patterns.forEach(({ name, pattern }) => {
      if (pattern.test(text)) findings.push(`${relPath}: ${name}`);
    });
  });

  if (findings.length) {
    fail(`High-confidence secret patterns found in tracked files:\n${findings.join("\n")}`);
  }
}

function verifyLocalStorageSecurity() {
  const appSource = readText("src/App.tsx");
  const cloudSource = readText("src/cloud.ts");

  const secureBlock = appSource.match(/const secureLocalKeys = \{([\s\S]*?)\};/);
  if (!secureBlock) fail("secureLocalKeys block was not found.");
  const insecureSecureKeys = Array.from(secureBlock[1].matchAll(/"([^"]+)"/g))
    .map((match) => match[1])
    .filter((key) => !key.startsWith("relay:secure:"));
  if (insecureSecureKeys.length) {
    fail(`secureLocalKeys contains non-secure keys: ${insecureSecureKeys.join(", ")}`);
  }

  const requiredStorageControls = [
    ["AES-GCM browser fallback encryption", /crypto\.subtle\.encrypt\(\{ name: "AES-GCM"/],
    ["legacy plaintext migration removal", /localStorage\.removeItem\(legacyKey\)/],
    ["demo sessions filtered from persistence", /sessions: state\.sessions\.filter\(\(session\) => !isDemoOwnedSession\(session\)\)/],
    ["offline queue is Relay-namespaced", /const offlineQueueKey = "relay:cloud-offline-queue:v1"/],
  ];
  requiredStorageControls.forEach(([label, pattern]) => {
    if (!pattern.test(label === "offline queue is Relay-namespaced" ? cloudSource : appSource)) {
      fail(`Missing storage control: ${label}`);
    }
  });
}

function verifyDesktopAndHostedSecurity() {
  const desktop = readText("desktop/main.cjs");
  const shared = readText("api/_shared.js");
  const profile = readText("api/profile.js");
  const webhook = readText("api/billing/webhook.js");
  const schema = readText("supabase/schema.sql");

  const checks = [
    ["desktop uses current Relay data filename", desktop, /const dataFileName = "\.relay-data\.json"/],
    ["desktop uses prompt-free Relay storage key", desktop, /const dataKeyFileName = "\.relay-storage-key"/],
    ["desktop encrypts state with AES-GCM", desktop, /crypto\.createCipheriv\("aes-256-gcm"/],
    ["desktop writes restrictive data-file permissions", desktop, /mode: 0o600/],
    ["desktop blocks untrusted mutating local API origins", desktop, /Blocked untrusted local API origin/],
    ["desktop blocks writes after unreadable encrypted state", desktop, /if \(dataFileReadError\)/],
    ["email send reloads state server-side by session id", desktop, /const state = readDataFile\(\{ throwOnError: true \}\)/],
    ["hosted APIs require bearer Supabase auth", shared, /Sign in with Supabase before using hosted sync/],
    ["server-only Supabase key stays server-side", shared, /SUPABASE_SERVICE_ROLE_KEY/],
    ["profile patch ignores paid entitlement fields", profile, /profilePatchColumns/],
    ["Stripe webhook verifies raw signed body", webhook, /constructEvent\(rawBody, signature, requiredEnv\("STRIPE_WEBHOOK_SECRET"\)\)/],
    ["workspace RLS enabled", schema, /alter table public\.relay_workspace_state enable row level security/i],
    ["workspace own-record policy exists", schema, /workspace_state_select_own/i],
  ];

  checks.forEach(([label, source, pattern]) => {
    if (!pattern.test(source)) fail(`Missing security control: ${label}`);
  });
}

function verifyRuntimeLogging() {
  const files = ["src/App.tsx", "src/cloud.ts", "desktop/main.cjs", "api/_shared.js", "api/cloud-state.js", "api/profile.js", "api/feedback.js"];
  const noisyLogs = [];
  files.forEach((relPath) => {
    const text = readText(relPath);
    const matches = text.match(/console\.(log|debug|info)\(/g) ?? [];
    if (matches.length) noisyLogs.push(relPath);
  });
  if (noisyLogs.length) {
    fail(`Runtime files contain debug/info logs that may leak user data: ${noisyLogs.join(", ")}`);
  }
}

function verifyLegalBaseline() {
  const legalPath = path.join(rootDir, "LEGAL.md");
  if (!fs.existsSync(legalPath)) fail("LEGAL.md is missing.");
  const legal = fs.readFileSync(legalPath, "utf8");
  const appSource = readText("src/App.tsx");
  const requiredLegalLanguage = [
    ["not legal advice disclaimer", /not legal advice/i],
    ["public signup status", /Public Signup Status/i],
    ["sample-only hosted demo boundary", /sample accounts/i],
    ["Terms", /Terms/i],
    ["Privacy", /Privacy/i],
    ["EULA", /EULA/i],
    ["Support", /Support/i],
    ["support contact", /relay\.donotreply@gmail\.com/i],
    ["Data retention", /Data Retention/i],
    ["local desktop encryption", /Desktop data is local-first/i],
    ["manual install-over-replace updates", /manual install-over-replace/i],
    ["no-training default", /no-training/i],
    ["gradebook boundary", /not an official gradebook/i],
    ["Child-appropriate safety", /Child-Appropriate Safety/i],
    ["school privacy laws", /COPPA/i],
    ["education records law", /FERPA/i],
  ];
  requiredLegalLanguage.forEach(([label, pattern]) => {
    if (!pattern.test(legal)) fail(`LEGAL.md is missing ${label} baseline language.`);
  });
  const requiredPublicCopy = [
    ["public privacy route", /Privacy controls before polish/i],
    ["hosted demo boundary", /Hosted demo boundary/i],
    ["sample-only hosted demo copy", /Public hosted demos use sample accounts only/i],
    ["local desktop data copy", /Desktop state is encrypted locally/i],
    ["no student-data training copy", /No student-data training claim/i],
  ];
  requiredPublicCopy.forEach(([label, pattern]) => {
    if (!pattern.test(appSource)) fail(`Public app copy is missing ${label}.`);
  });
}

function main() {
  const files = trackedFiles();
  verifyIgnoredLocalFiles([".env.local", ".env.test.local", ".relay-data.json", ".relay-storage-key", ".classloop-data.json"]);
  verifyNoHighConfidenceSecrets(trackedTextFiles(files));
  verifyLocalStorageSecurity();
  verifyDesktopAndHostedSecurity();
  verifyRuntimeLogging();
  verifyLegalBaseline();
  console.log("Security baseline passed: secrets, local data tracking, storage encryption, hosted auth, logging, and legal baseline checks are in place.");
}

main();
