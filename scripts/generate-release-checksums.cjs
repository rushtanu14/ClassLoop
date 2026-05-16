const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const releaseDir = path.join(rootDir, "release");
const outputPath = path.join(releaseDir, "SHA256SUMS.txt");
const artifactPattern = /\.(?:AppImage|deb|dmg|exe|zip|yml)$/i;

function fail(message) {
  throw new Error(message);
}

if (!fs.existsSync(releaseDir)) {
  fail("Missing release/. Run a package script before generating checksums.");
}

const files = fs
  .readdirSync(releaseDir)
  .filter((name) => artifactPattern.test(name))
  .filter((name) => fs.statSync(path.join(releaseDir, name)).isFile())
  .sort();

if (!files.length) {
  fail("No release artifacts found for checksum generation.");
}

const lines = files.map((name) => {
  const fullPath = path.join(releaseDir, name);
  const hash = crypto.createHash("sha256").update(fs.readFileSync(fullPath)).digest("hex");
  return `${hash}  ${name}`;
});

fs.writeFileSync(outputPath, `${lines.join("\n")}\n`);
console.log(`Wrote ${path.relative(rootDir, outputPath)} with ${files.length} artifact checksums.`);
