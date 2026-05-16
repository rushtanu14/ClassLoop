const path = require("path");
const { notarize } = require("@electron/notarize");

function requiresReleaseSigning() {
  return ["1", "true", "yes"].includes(String(process.env.CLASSLOOP_REQUIRE_MAC_RELEASE_SIGNING || "").toLowerCase());
}

module.exports = async function notarizeMac(context) {
  if (context.electronPlatformName !== "darwin") return;

  const appName = context.packager.appInfo.productFilename;
  const appBundleId = context.packager.appInfo.appId;
  const appPath = path.join(context.appOutDir, `${appName}.app`);
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD || process.env.APPLE_ID_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;
  const missing = [
    ["APPLE_ID", appleId],
    ["APPLE_APP_SPECIFIC_PASSWORD", appleIdPassword],
    ["APPLE_TEAM_ID", teamId],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) {
    const message =
      `Skipping macOS notarization because ${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} not set. ` +
      "Set CLASSLOOP_REQUIRE_MAC_RELEASE_SIGNING=true for release packaging so missing notarization credentials fail the build.";
    if (requiresReleaseSigning()) throw new Error(message);
    console.warn(`[classloop-notarize] ${message}`);
    return;
  }

  console.log(`[classloop-notarize] Submitting ${appPath} for Apple notarization.`);
  await notarize({
    appBundleId,
    appPath,
    appleId,
    appleIdPassword,
    teamId,
  });
};
