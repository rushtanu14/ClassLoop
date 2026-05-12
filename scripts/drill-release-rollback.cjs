const fs = require("fs");
const os = require("os");
const path = require("path");
const asar = require("@electron/asar");

const rootDir = path.resolve(__dirname, "..");
const releaseDir = path.join(rootDir, "release");
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
const version = packageJson.version;
const productName = packageJson.build?.productName || "Relay";
const rollbackTarget = process.argv[2] || process.env.RELAY_ROLLBACK_TARGET_VERSION || "last-known-good";

const requiredArtifacts = [
  { rel: `${productName}-${version}.dmg`, label: "macOS x64 DMG" },
  { rel: `${productName}-${version}-mac.zip`, label: "macOS x64 ZIP" },
  { rel: `${productName}-${version}-arm64.dmg`, label: "macOS arm64 DMG" },
  { rel: `${productName}-${version}-arm64-mac.zip`, label: "macOS arm64 ZIP" },
  { rel: `${productName} Setup ${version}.exe`, label: "Windows x64 NSIS installer" },
  { rel: `${productName}-${version}-win.zip`, label: "Windows x64 ZIP" },
  { rel: `${productName}-${version}-arm64-win.zip`, label: "Windows arm64 ZIP" },
  { rel: `${productName}-${version}.AppImage`, label: "Linux x64 AppImage" },
  { rel: `${productName}-${version}-arm64.AppImage`, label: "Linux arm64 AppImage" },
  { rel: `relay_${version}_amd64.deb`, label: "Linux x64 deb" },
  { rel: `relay_${version}_arm64.deb`, label: "Linux arm64 deb" },
  { rel: "latest-mac.yml", label: "macOS update metadata" },
  { rel: "latest.yml", label: "Windows update metadata" },
  { rel: "latest-linux.yml", label: "Linux x64 update metadata" },
  { rel: "latest-linux-arm64.yml", label: "Linux arm64 update metadata" },
];

const platformTargets = [
  {
    id: "macOS x64",
    executable: path.join("release", "mac", `${productName}.app`, "Contents", "MacOS", productName),
    appAsar: path.join("release", "mac", `${productName}.app`, "Contents", "Resources", "app.asar"),
  },
  {
    id: "macOS arm64",
    executable: path.join("release", "mac-arm64", `${productName}.app`, "Contents", "MacOS", productName),
    appAsar: path.join("release", "mac-arm64", `${productName}.app`, "Contents", "Resources", "app.asar"),
  },
  {
    id: "Windows x64",
    executable: path.join("release", "win-unpacked", `${productName}.exe`),
    appAsar: path.join("release", "win-unpacked", "resources", "app.asar"),
  },
  {
    id: "Windows arm64",
    executable: path.join("release", "win-arm64-unpacked", `${productName}.exe`),
    appAsar: path.join("release", "win-arm64-unpacked", "resources", "app.asar"),
  },
  {
    id: "Linux x64",
    executable: path.join("release", "linux-unpacked", productName.toLowerCase()),
    appAsar: path.join("release", "linux-unpacked", "resources", "app.asar"),
  },
  {
    id: "Linux arm64",
    executable: path.join("release", "linux-arm64-unpacked", productName.toLowerCase()),
    appAsar: path.join("release", "linux-arm64-unpacked", "resources", "app.asar"),
  },
];

function fail(message) {
  throw new Error(message);
}

function requireFile(relPath, label) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) fail(`${label} is missing: ${relPath}`);
  const stat = fs.statSync(fullPath);
  if (!stat.isFile() || stat.size <= 0) fail(`${label} is empty or not a file: ${relPath}`);
  console.log(`PASS ${label}: ${relPath} (${stat.size.toLocaleString()} bytes)`);
  return fullPath;
}

function verifyMetadata(relPath) {
  const fullPath = requireFile(path.join("release", relPath), `${relPath} release metadata`);
  const text = fs.readFileSync(fullPath, "utf8");
  if (!text.includes(version)) fail(`${relPath} does not reference release version ${version}.`);
  console.log(`PASS ${relPath} references ${version}`);
}

function extractJsonFromAsar(appAsar, filePath) {
  const raw = asar.extractFile(appAsar, filePath);
  return JSON.parse(raw.toString("utf8"));
}

function verifyPackagedApp(target) {
  const executable = requireFile(target.executable, `${target.id} packaged executable`);
  fs.accessSync(executable, fs.constants.R_OK);
  const appAsar = requireFile(target.appAsar, `${target.id} app.asar`);
  const packagedPackage = extractJsonFromAsar(appAsar, "package.json");
  const mainFile = packagedPackage.main || "desktop/main.cjs";
  if (packagedPackage.name !== packageJson.name) fail(`${target.id} app.asar package name is ${packagedPackage.name}.`);
  if (packagedPackage.version !== version) fail(`${target.id} app.asar version is ${packagedPackage.version}.`);
  if (mainFile !== packageJson.main) fail(`${target.id} app.asar main is ${mainFile}, expected ${packageJson.main}.`);
  const mainStat = asar.statFile(appAsar, mainFile);
  const distStat = asar.statFile(appAsar, "dist/index.html");
  if (!mainStat?.size) fail(`${target.id} app.asar is missing ${mainFile}.`);
  if (!distStat?.size) fail(`${target.id} app.asar is missing dist/index.html.`);
  console.log(`PASS ${target.id} asar metadata: ${packagedPackage.name}@${packagedPackage.version}, main ${mainFile}`);
}

function writeRollbackSimulation() {
  const drillDir = fs.mkdtempSync(path.join(os.tmpdir(), "relay-rollback-drill-"));
  const timestamp = new Date().toISOString();
  const manifest = {
    generatedAt: timestamp,
    mode: "non-destructive rollback drill",
    badRelease: {
      product: productName,
      version,
      reason: "Simulated bad release for rollback rehearsal.",
      quarantineAction: "Do not upload these artifacts or point public download URLs at them.",
    },
    rollbackTarget: {
      version: rollbackTarget,
      action: "Restore the previous known-good hosted deployment and public installer URLs.",
    },
    publicDownloadEnv: [
      "VITE_RELAY_MAC_DOWNLOAD_URL",
      "VITE_RELAY_WINDOWS_DOWNLOAD_URL",
      "VITE_RELAY_LINUX_DOWNLOAD_URL",
    ],
    verification: [
      "Hosted landing page shows the previous known-good installer link or Packaging pending.",
      "Manual install-over-replace keeps Electron user data in the per-user data directory.",
      "Run npm run test:desktop:first-run on each host OS before re-opening downloads.",
    ],
  };
  const comms = [
    `Relay rollback drill ${timestamp}`,
    "",
    `Bad release quarantined: ${productName} ${version}`,
    `Rollback target: ${rollbackTarget}`,
    "",
    "Teacher-facing status:",
    "We paused the latest desktop download while we validate a replacement build. Existing local Relay data is not affected.",
    "",
    "Internal next steps:",
    "1. Restore the previous Vercel deployment or redeploy main at the known-good commit.",
    "2. Replace bad installer URLs with known-good URLs, or leave them unset so the UI says Packaging pending.",
    "3. Run hosted web smoke and packaged first-run smoke before announcing recovery.",
    "",
  ].join("\n");

  fs.writeFileSync(path.join(drillDir, "rollback-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(drillDir, "teacher-status-draft.txt"), comms);
  console.log(`PASS rollback simulation written to ${drillDir}`);
}

function run() {
  if (!fs.existsSync(releaseDir)) {
    fail("Missing release/. Run npm run package:mac, npm run package:win, and npm run package:linux before this rollback drill.");
  }

  for (const artifact of requiredArtifacts) {
    requireFile(path.join("release", artifact.rel), artifact.label);
  }
  for (const metadata of ["latest-mac.yml", "latest.yml", "latest-linux.yml", "latest-linux-arm64.yml"]) {
    verifyMetadata(metadata);
  }
  for (const target of platformTargets) {
    verifyPackagedApp(target);
  }
  writeRollbackSimulation();

  console.log("Rollback drill passed: release artifacts are inspectable and the bad-release quarantine path was rehearsed.");
}

run();
