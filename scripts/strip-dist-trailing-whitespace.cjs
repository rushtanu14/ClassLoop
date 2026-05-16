const fs = require("fs");
const path = require("path");

const distDir = path.resolve(__dirname, "..", "dist");
const textExtensions = new Set([".css", ".html", ".js", ".json", ".svg", ".webmanifest"]);

function stripFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  const next = original.replace(/[ \t]+$/gm, "");
  if (next !== original) {
    fs.writeFileSync(filePath, next);
  }
}

function walk(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(entryPath);
      continue;
    }
    if (entry.isFile() && textExtensions.has(path.extname(entry.name))) {
      stripFile(entryPath);
    }
  }
}

walk(distDir);
