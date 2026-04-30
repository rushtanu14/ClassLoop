const { app, BrowserWindow, shell } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");

const mimeTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function resolveAsset(requestUrl) {
  const parsed = new URL(requestUrl, "http://127.0.0.1");
  const pathname = decodeURIComponent(parsed.pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.normalize(path.join(distDir, relativePath));

  if (!filePath.startsWith(distDir)) {
    return null;
  }

  return filePath;
}

function createStaticServer() {
  const server = http.createServer((request, response) => {
    const filePath = resolveAsset(request.url || "/");

    if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const extension = path.extname(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(filePath).pipe(response);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        close: () => server.close(),
        url: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

let staticServer;

async function createWindow() {
  if (!fs.existsSync(path.join(distDir, "index.html"))) {
    throw new Error("Missing dist/index.html. ClassLoop needs the checked-in app build to run.");
  }

  staticServer = await createStaticServer();

  const window = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 700,
    title: "ClassLoop",
    backgroundColor: "#020817",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.once("ready-to-show", () => window.show());

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  await window.loadURL(`${staticServer.url}/#/dashboard`);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (staticServer) {
    staticServer.close();
  }

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
