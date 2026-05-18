const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "test-results");
const outputPath = path.join(outputDir, "deploy-asset-hashes.json");
const defaultBaseUrl = "https://classloop-followup.vercel.app/";
const baseUrl = String(process.env.CLASSLOOP_DEPLOY_URL || process.env.CLASSLOOP_WEB_TEST_URL || defaultBaseUrl);

function fail(message) {
  throw new Error(message);
}

function normalizeBaseUrl(url) {
  const trimmed = url.trim();
  if (!trimmed) return defaultBaseUrl;
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function extractAssetPaths(html) {
  const paths = new Set();
  const regex = /\/assets\/[^"'<> \n\r\t]+/g;
  let match;
  while ((match = regex.exec(html))) {
    const candidate = match[0].split("?")[0].split("#")[0];
    if (candidate) paths.add(candidate);
  }
  return Array.from(paths).sort();
}

async function fetchWithTimeout(url, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { redirect: "follow", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url) {
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    fail(`Fetch failed (${response.status}) for ${url}`);
  }
  return await response.text();
}

async function fetchBuffer(url) {
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    fail(`Fetch failed (${response.status}) for ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    headers: response.headers,
  };
}

async function main() {
  const verifiedAt = new Date().toISOString();
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const indexUrl = new URL("/", normalizedBase).toString();
  const indexHtml = await fetchText(indexUrl);
  const assetPaths = extractAssetPaths(indexHtml);

  const jsAssets = assetPaths.filter((asset) => asset.endsWith(".js"));
  const cssAssets = assetPaths.filter((asset) => asset.endsWith(".css"));
  if (!jsAssets.length || !cssAssets.length) {
    fail(
      `Expected index.html at ${indexUrl} to reference hashed JS and CSS assets under /assets/. ` +
        `Found ${jsAssets.length} JS and ${cssAssets.length} CSS.`,
    );
  }

  const hashedAssets = [...jsAssets, ...cssAssets].filter((asset) => /\/assets\/.+-.+\.(?:js|css)$/.test(asset));
  if (!hashedAssets.length) {
    fail(`Expected hashed /assets/ filenames (e.g. index-<hash>.js). Found: ${[...jsAssets, ...cssAssets].join(", ")}`);
  }

  const results = [];
  for (const assetPath of [...jsAssets, ...cssAssets]) {
    const assetUrl = new URL(assetPath, normalizedBase).toString();
    const { buffer, headers } = await fetchBuffer(assetUrl);
    results.push({
      path: assetPath,
      url: assetUrl,
      sha256: sha256(buffer),
      bytes: buffer.length,
      contentType: headers.get("content-type") || "",
      cacheControl: headers.get("cache-control") || "",
    });
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const payload = {
    verifiedAt,
    baseUrl: normalizedBase,
    indexUrl,
    assets: results,
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);

  console.log(`PASS live asset hashes verified for ${normalizedBase}`);
  console.log(`Wrote ${path.relative(rootDir, outputPath)}`);
  results.forEach((asset) => {
    console.log(`- ${asset.path} sha256=${asset.sha256.slice(0, 12)} bytes=${asset.bytes}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
