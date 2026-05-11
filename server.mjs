import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { networkInterfaces } from "node:os";
import { execFile } from "node:child_process";

const rootDir = resolve(new URL(".", import.meta.url).pathname);
const distDir = join(rootDir, "dist");
const dataFile = join(rootDir, ".classloop-data.json");
const port = Number(process.env.PORT ?? 5173);

const defaultState = {
  accounts: [],
  sessions: [],
  draft: null,
  demoLoaded: false,
  updatedAt: new Date(0).toISOString(),
};

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

async function readState() {
  if (!existsSync(dataFile)) return defaultState;
  try {
    const raw = await readFile(dataFile, "utf8");
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return defaultState;
  }
}

async function saveState(nextState) {
  const state = {
    accounts: Array.isArray(nextState.accounts) ? nextState.accounts : [],
    sessions: Array.isArray(nextState.sessions) ? nextState.sessions : [],
    draft: nextState.draft ?? null,
    demoLoaded: Boolean(nextState.demoLoaded),
    updatedAt: new Date().toISOString(),
  };
  await writeFile(dataFile, JSON.stringify(state, null, 2));
  return state;
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 5_000_000) {
        rejectBody(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => resolveBody(body));
    req.on("error", rejectBody);
  });
}

async function serveStatic(req, res) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const cleanPath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const requested = cleanPath ? join(distDir, cleanPath) : join(distDir, "index.html");
  const filePath = requested.startsWith(distDir) && existsSync(requested) ? requested : join(distDir, "index.html");
  const ext = extname(filePath);
  const body = await readFile(filePath);
  res.writeHead(200, {
    "Content-Type": contentTypes[ext] ?? "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=31536000, immutable",
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

    if (url.pathname === "/api/state" && req.method === "GET") {
      sendJson(res, 200, await readState());
      return;
    }

    if (url.pathname === "/api/state" && req.method === "PUT") {
      const body = await readBody(req);
      sendJson(res, 200, await saveState(JSON.parse(body || "{}")));
      return;
    }

    if (url.pathname.startsWith("/api/")) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    await serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : "Server error" });
  }
});

function localNetworkUrls() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((item) => item && item.family === "IPv4" && !item.internal)
    .map((item) => `http://${item.address}:${port}/`);
}

server.listen(port, "0.0.0.0", () => {
  const localUrl = `http://127.0.0.1:${port}/`;
  console.log(`ClassLoop shared server running at http://127.0.0.1:${port}/`);
  for (const url of localNetworkUrls()) {
    console.log(`Student/teacher device URL: ${url}`);
  }
  if (process.env.NO_OPEN !== "1") {
    execFile("open", [localUrl], () => {});
  }
});
