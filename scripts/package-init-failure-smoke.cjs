const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const packagedSmoke = path.join(rootDir, "scripts", "smoke-packaged-first-run.cjs");

function fail(message) {
  throw new Error(message);
}

function assertPrivacySafe(output, label) {
  const risky = /@relay\.test|relay-teacher|relay-student|passwordHash|transcript|payload|student follow-up|class recap/i;
  if (risky.test(output)) {
    fail(label + " leaked account, transcript, payload, or classroom terms in package-init logs.");
  }
}

function main() {
  const missingExecutable = path.join(os.tmpdir(), "relay-missing-package-init", "Relay");
  const result = spawnSync(process.execPath, [packagedSmoke, missingExecutable], {
    cwd: rootDir,
    encoding: "utf8",
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n");

  if (result.status === 0) {
    fail("Missing packaged executable should fail package-init smoke.");
  }
  if (!/Packaged executable was not found/.test(output)) {
    fail("Missing executable failure did not explain which packaged executable was absent.");
  }
  assertPrivacySafe(output, "Missing executable failure");

  const desktopSource = fs.readFileSync(path.join(rootDir, "desktop", "main.cjs"), "utf8");
  if (!/Missing dist\/index\.html/.test(desktopSource)) {
    fail("Desktop startup does not explain how to recover from a missing app build.");
  }
  if (!/Relay desktop startup failed:/.test(desktopSource)) {
    fail("Desktop startup failures should be logged with a stable Relay prefix for support triage.");
  }

  console.log("Package init failure smoke passed: missing executable/build failures are actionable and privacy-safe.");
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
