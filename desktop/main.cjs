const { app, BrowserWindow, shell } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
let nodemailer;

function getNodemailer() {
  if (nodemailer) {
    return nodemailer;
  }
  try {
    nodemailer = require("nodemailer");
    return nodemailer;
  } catch (error) {
    return null;
  }
}

const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const dataFileName = ".relay-data.json";
const dataKeyFileName = ".relay-storage-key";
const requestedUserDataDir = process.env.RELAY_USER_DATA_DIR;
if (requestedUserDataDir) {
  app.setPath("userData", path.resolve(requestedUserDataDir));
}
let dataFileReadError = null;

const securityHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(self), display-capture=()",
};

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

function emptyWorkspace() {
  return {
    accounts: [],
    sessions: [],
    draft: null,
    demoLoaded: false,
    classGroups: [],
    rosterTemplates: [],
    privacySettings: undefined,
    auditLog: [],
    billingProfile: undefined,
    updatedAt: new Date().toISOString(),
  };
}

function currentDataFilePath() {
  return app.isPackaged || requestedUserDataDir ? path.join(app.getPath("userData"), dataFileName) : path.join(rootDir, dataFileName);
}

function currentDataKeyPath() {
  return path.join(path.dirname(currentDataFilePath()), dataKeyFileName);
}

function readableDataFilePath() {
  const dataFile = currentDataFilePath();
  if (fs.existsSync(dataFile)) {
    return dataFile;
  }

  const legacyDataFile = path.join(rootDir, dataFileName);
  if (app.isPackaged && legacyDataFile !== dataFile && fs.existsSync(legacyDataFile)) {
    return legacyDataFile;
  }

  return dataFile;
}

function dataReadErrorMessage(error) {
  const detail = error instanceof Error && error.message ? ` ${error.message}` : "";
  return `Unable to read Relay desktop data.${detail}`;
}

function readRelayDataKey(options = {}) {
  const keyPath = currentDataKeyPath();
  if (fs.existsSync(keyPath)) {
    const raw = fs.readFileSync(keyPath, "utf8").trim();
    const parsed = raw.startsWith("{") ? JSON.parse(raw) : { key: raw };
    const key = Buffer.from(parsed.key || "", "base64");
    if (key.length !== 32) {
      throw new Error("Relay desktop storage key is invalid.");
    }
    return key;
  }

  if (options.createIfMissing === false) {
    throw new Error("Relay desktop storage key is missing.");
  }

  const key = crypto.randomBytes(32);
  fs.mkdirSync(path.dirname(keyPath), { recursive: true });
  fs.writeFileSync(
    keyPath,
    `${JSON.stringify({ version: 1, algorithm: "aes-256-gcm", key: key.toString("base64") }, null, 2)}\n`,
    { mode: 0o600 },
  );
  return key;
}

function encryptWorkspaceState(nextState) {
  const key = readRelayDataKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(nextState), "utf8"), cipher.final()]);
  return {
    version: 2,
    encrypted: true,
    algorithm: "aes-256-gcm",
    key: dataKeyFileName,
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    payload: encrypted.toString("base64"),
  };
}

function decryptWorkspaceState(stored) {
  if (stored.algorithm !== "aes-256-gcm" || !stored.iv || !stored.authTag) {
    throw new Error(
      "Relay found an older OS-keychain encrypted data file. To avoid password prompts, Relay will not open it automatically. Keep a backup and move it aside to start fresh.",
    );
  }

  const key = readRelayDataKey({ createIfMissing: false });
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(stored.iv, "base64"));
  decipher.setAuthTag(Buffer.from(stored.authTag, "base64"));
  return JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(stored.payload, "base64")),
      decipher.final(),
    ]).toString("utf8"),
  );
}

function readDataFile(options = {}) {
  try {
    const dataFile = readableDataFilePath();
    if (!fs.existsSync(dataFile)) {
      dataFileReadError = null;
      return emptyWorkspace();
    }

    const stored = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    if (stored.encrypted && stored.payload) {
      dataFileReadError = null;
      return decryptWorkspaceState(stored);
    }
    if (stored.version && stored.payload && stored.encrypted === false) {
      dataFileReadError = null;
      return stored.payload;
    }
    dataFileReadError = null;
    return stored;
  } catch (error) {
    dataFileReadError = dataReadErrorMessage(error);
    if (options.throwOnError) {
      const readError = new Error(dataFileReadError);
      readError.statusCode = 423;
      throw readError;
    }
    return {
      ...emptyWorkspace(),
      readOnly: true,
      readError: dataFileReadError,
    };
  }
}

function withSecurityHeaders(headers = {}) {
  return { ...securityHeaders, ...headers };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, withSecurityHeaders({ "Content-Type": "application/json" }));
  response.end(JSON.stringify(payload));
}

function isTrustedLocalOrigin(origin, host) {
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === "http:" && parsed.host === host && ["127.0.0.1", "localhost"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function isTrustedApiRequest(request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method || "GET") && !request.headers.origin) {
    return true;
  }
  return isTrustedLocalOrigin(request.headers.origin, request.headers.host);
}

function writeDataFile(payload) {
  if (dataFileReadError) {
    const error = new Error(`${dataFileReadError} Fix or export the existing data file before saving new state.`);
    error.statusCode = 423;
    throw error;
  }
  const nextState = {
    accounts: Array.isArray(payload.accounts) ? payload.accounts : [],
    sessions: Array.isArray(payload.sessions) ? payload.sessions : [],
    draft: payload.draft ?? null,
    demoLoaded: Boolean(payload.demoLoaded),
    classGroups: Array.isArray(payload.classGroups) ? payload.classGroups : [],
    rosterTemplates: Array.isArray(payload.rosterTemplates) ? payload.rosterTemplates : [],
    privacySettings: payload.privacySettings,
    auditLog: Array.isArray(payload.auditLog) ? payload.auditLog : [],
    billingProfile: payload.billingProfile,
    updatedAt: new Date().toISOString(),
  };
  const stored = encryptWorkspaceState(nextState);
  const dataFile = currentDataFilePath();
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, `${JSON.stringify(stored, null, 2)}\n`, { mode: 0o600 });
  return nextState;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function studentEmail(student) {
  return normalizeEmail(student.linkedAccountEmail || student.email);
}

function deliverableStudents(session) {
  return Array.isArray(session.students)
    ? session.students.filter((student) => {
        const email = studentEmail(student);
        return email && !email.endsWith("@relay.local");
      })
    : [];
}

function skippedStudents(session) {
  return Array.isArray(session.students)
    ? session.students
        .filter((student) => {
          const email = studentEmail(student);
          return !email || email.endsWith("@relay.local");
        })
        .map((student) => student.name || "Unnamed student")
    : [];
}

function emailConfig() {
  if (process.env.RELAY_SMTP_HOST) {
    const senderEmail = process.env.RELAY_NO_REPLY_EMAIL || process.env.RELAY_SMTP_FROM || process.env.RELAY_SMTP_USER;
    const senderName = process.env.RELAY_NO_REPLY_NAME || "Relay";
    return {
      configured: true,
      provider: process.env.RELAY_SMTP_PROVIDER || (process.env.RELAY_NO_REPLY_EMAIL ? "No-reply SMTP" : "SMTP"),
      from: senderName && senderEmail ? `${senderName} <${senderEmail}>` : senderEmail,
      replyTo: process.env.RELAY_REPLY_TO || undefined,
      transport: {
        host: process.env.RELAY_SMTP_HOST,
        port: Number(process.env.RELAY_SMTP_PORT || 587),
        secure: process.env.RELAY_SMTP_SECURE === "true" || process.env.RELAY_SMTP_PORT === "465",
        auth: process.env.RELAY_SMTP_USER
          ? {
              user: process.env.RELAY_SMTP_USER,
              pass: process.env.RELAY_SMTP_PASS || "",
            }
          : undefined,
      },
    };
  }

  if (process.env.RELAY_GMAIL_USER && process.env.RELAY_GMAIL_APP_PASSWORD) {
    const senderEmail = process.env.RELAY_NO_REPLY_EMAIL || process.env.RELAY_GMAIL_FROM || process.env.RELAY_GMAIL_USER;
    const senderName = process.env.RELAY_NO_REPLY_NAME || "Relay";
    return {
      configured: true,
      provider: process.env.RELAY_NO_REPLY_EMAIL ? "No-reply Gmail SMTP" : "Gmail SMTP",
      from: senderName && senderEmail ? `${senderName} <${senderEmail}>` : senderEmail,
      replyTo: process.env.RELAY_REPLY_TO || undefined,
      transport: {
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.RELAY_GMAIL_USER,
          pass: process.env.RELAY_GMAIL_APP_PASSWORD,
        },
      },
    };
  }

  return {
    configured: false,
    provider: "Not configured",
  };
}

function textForStudentEmail(session, student) {
  const followUp = Array.isArray(session.followUps)
    ? session.followUps.find((item) => item.studentId === student.id)
    : null;
  const resources = Array.isArray(session.resources) ? session.resources : [];
  const tasks = followUp?.tasks?.length ? followUp.tasks : ["Review the session recap and complete the assigned work."];
  return [
    `Hi ${student.name || "there"},`,
    "",
    `Your Relay follow-up is ready for ${session.title || "today's class"}.`,
    "",
    "Recap:",
    session.recap || "A session recap is available in Relay.",
    "",
    "Your next steps:",
    ...tasks.map((task) => `- ${task}`),
    followUp?.reminder ? ["", "Reminder:", followUp.reminder].join("\n") : "",
    followUp?.dueDate ? `\nDue: ${followUp.dueDate}` : "",
    resources.length
      ? ["", "Resources:", ...resources.map((resource) => `- ${resource.title || resource.url}: ${resource.url}`)].join("\n")
      : "",
    "",
    "Open Relay with your roster email to see the full student dashboard.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendRecapEmails(session, options = {}) {
  const config = emailConfig();
  if (!config.configured) {
    const error = new Error("Email is not configured. Set SMTP or Gmail app-password environment variables before sending.");
    error.statusCode = 503;
    throw error;
  }
  if (!config.from) {
    const error = new Error("Email sender is missing. Set RELAY_SMTP_FROM or RELAY_GMAIL_FROM.");
    error.statusCode = 503;
    throw error;
  }

  const mailer = getNodemailer();
  if (!mailer) {
    const error = new Error(
      "Email delivery is currently unavailable because the mailer dependency is not installed. Run `npm install` and restart Relay.",
    );
    error.statusCode = 503;
    throw error;
  }

  const transporter = mailer.createTransport(config.transport);
  const recipients = [];
  const failed = [];
  const onlyEmails = new Set(
    (Array.isArray(options.onlyEmails) ? options.onlyEmails : []).map((email) => normalizeEmail(email)).filter(Boolean),
  );
  const students = deliverableStudents(session).filter((student) => !onlyEmails.size || onlyEmails.has(studentEmail(student)));

  if (onlyEmails.size && !students.length) {
    const error = new Error("No matching failed recipients were found for this published session.");
    error.statusCode = 400;
    throw error;
  }

  for (const student of students) {
    const to = studentEmail(student);
    try {
      await transporter.sendMail({
        from: config.from,
        replyTo: config.replyTo,
        to,
        subject: `Relay recap: ${session.title || "Session follow-up"}`,
        text: textForStudentEmail(session, student),
      });
      recipients.push(to);
    } catch (error) {
      failed.push(`${to}: ${error.message}`);
    }
  }

  if (!recipients.length && failed.length) {
    const error = new Error(`No emails were sent. First failure: ${failed[0]}`);
    error.statusCode = 502;
    throw error;
  }

  return {
    provider: config.provider,
    sentAt: new Date().toISOString(),
    recipients,
    skipped: skippedStudents(session),
    failed,
  };
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 8_000_000) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function handleStateApi(request, response) {
  if (request.method === "GET") {
    const state = readDataFile();
    response.writeHead(dataFileReadError ? 423 : 200, withSecurityHeaders({ "Content-Type": "application/json", "Cache-Control": "no-store" }));
    response.end(JSON.stringify(state));
    return true;
  }

  if (request.method === "PUT") {
    try {
      const body = await readRequestBody(request);
      const state = writeDataFile(JSON.parse(body || "{}"));
      response.writeHead(200, withSecurityHeaders({ "Content-Type": "application/json", "Cache-Control": "no-store" }));
      response.end(JSON.stringify(state));
    } catch (error) {
      response.writeHead(error.statusCode || 400, withSecurityHeaders({ "Content-Type": "application/json", "Cache-Control": "no-store" }));
      response.end(JSON.stringify({ error: error.message || "Unable to save Relay data." }));
    }
    return true;
  }

  response.writeHead(405, withSecurityHeaders({ "Content-Type": "application/json", "Cache-Control": "no-store" }));
  response.end(JSON.stringify({ error: "Method not allowed." }));
  return true;
}

async function handleIntegrationStatusApi(request, response) {
  const config = emailConfig();
  sendJson(response, 200, {
    email: {
      configured: config.configured,
      provider: config.provider,
      from: config.from,
      replyTo: config.replyTo,
    },
  });
  return true;
}

async function handleEmailApi(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed." });
    return true;
  }

  try {
    const body = JSON.parse((await readRequestBody(request)) || "{}");
    const sessionId = String(body.sessionId || "").trim();
    const ownerEmail = normalizeEmail(body.ownerEmail);
    if (!sessionId || !ownerEmail) {
      sendJson(response, 400, { error: "Session id and owner email are required before sending recap emails." });
      return true;
    }

    const state = readDataFile({ throwOnError: true });
    const session = (Array.isArray(state.sessions) ? state.sessions : []).find((item) => item.id === sessionId);
    if (!session) {
      sendJson(response, 404, { error: "Published session was not found." });
      return true;
    }
    if (session.status !== "published") {
      sendJson(response, 409, { error: "Publish the session before sending recap emails." });
      return true;
    }
    if (normalizeEmail(session.ownerEmail) !== ownerEmail) {
      sendJson(response, 403, { error: "Only the teacher who owns this session can send recap emails." });
      return true;
    }

    const result = await sendRecapEmails(session, { onlyEmails: body.recipients });
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, error.statusCode || 500, { error: error.message || "Unable to send student emails." });
  }
  return true;
}

function createStaticServer() {
  const server = http.createServer(async (request, response) => {
    const parsed = new URL(request.url || "/", "http://127.0.0.1");
    if (parsed.pathname.startsWith("/api/") && !isTrustedApiRequest(request)) {
      sendJson(response, 403, { error: "Blocked untrusted local API origin." });
      return;
    }

    if (parsed.pathname === "/api/state") {
      await handleStateApi(request, response);
      return;
    }
    if (parsed.pathname === "/api/integrations/status") {
      await handleIntegrationStatusApi(request, response);
      return;
    }
    if (parsed.pathname === "/api/email/send-recaps") {
      await handleEmailApi(request, response);
      return;
    }
    const filePath = resolveAsset(request.url || "/");

    if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const extension = path.extname(filePath);
    response.writeHead(200, withSecurityHeaders({
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
    }));
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

function logStartupError(error) {
  const message = error && error.stack ? error.stack : error;
  console.error("Relay desktop startup failed:", message);
}

async function createWindow() {
  if (!fs.existsSync(path.join(distDir, "index.html"))) {
    throw new Error("Missing dist/index.html. Relay needs the checked-in app build to run.");
  }

  staticServer = await createStaticServer();

  const window = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 700,
    title: "Relay",
    backgroundColor: "#020817",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.once("ready-to-show", () => window.show());

  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (["https:", "http:", "mailto:"].includes(parsed.protocol)) {
        shell.openExternal(url);
      }
    } catch {
      // Ignore malformed or unsafe external URLs.
    }
    return { action: "deny" };
  });

  window.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const trusted = (() => {
      try {
        const parsed = new URL(webContents.getURL());
        return parsed.protocol === "http:" && ["127.0.0.1", "localhost"].includes(parsed.hostname);
      } catch {
        return false;
      }
    })();
    callback(trusted && permission === "media");
  });

  await window.loadURL(`${staticServer.url}/#/dashboard`);
}

process.on("uncaughtException", (error) => {
  logStartupError(error);
  app.exit(1);
});

process.on("unhandledRejection", (error) => {
  logStartupError(error);
  app.exit(1);
});

app.whenReady().then(createWindow).catch((error) => {
  logStartupError(error);
  app.exit(1);
});

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
