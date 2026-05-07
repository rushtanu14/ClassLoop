const { app, BrowserWindow, shell, safeStorage } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const dataFile = path.join(rootDir, ".classloop-data.json");

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

function readDataFile() {
  try {
    if (!fs.existsSync(dataFile)) {
      return {
        accounts: [],
        sessions: [],
        draft: null,
        demoLoaded: false,
        rosterTemplates: [],
        updatedAt: new Date().toISOString(),
      };
    }

    const stored = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    if (stored.encrypted && stored.payload) {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error("Local ClassLoop data encryption is not available.");
      }
      return JSON.parse(safeStorage.decryptString(Buffer.from(stored.payload, "base64")));
    }
    if (stored.version && stored.payload && stored.encrypted === false) {
      return stored.payload;
    }
    return stored;
  } catch {
    return {
      accounts: [],
      sessions: [],
      draft: null,
      demoLoaded: false,
      rosterTemplates: [],
      privacySettings: undefined,
      auditLog: [],
      updatedAt: new Date().toISOString(),
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
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === "http:" && parsed.host === host && ["127.0.0.1", "localhost"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function isTrustedApiRequest(request) {
  return isTrustedLocalOrigin(request.headers.origin, request.headers.host);
}

function writeDataFile(payload) {
  const nextState = {
    accounts: Array.isArray(payload.accounts) ? payload.accounts : [],
    sessions: Array.isArray(payload.sessions) ? payload.sessions : [],
    draft: payload.draft ?? null,
    demoLoaded: Boolean(payload.demoLoaded),
    rosterTemplates: Array.isArray(payload.rosterTemplates) ? payload.rosterTemplates : [],
    privacySettings: payload.privacySettings,
    auditLog: Array.isArray(payload.auditLog) ? payload.auditLog : [],
    updatedAt: new Date().toISOString(),
  };
  const stored = safeStorage.isEncryptionAvailable()
    ? {
        version: 1,
        encrypted: true,
        payload: safeStorage.encryptString(JSON.stringify(nextState)).toString("base64"),
      }
    : {
        version: 1,
        encrypted: false,
        payload: nextState,
      };
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
        return email && !email.endsWith("@classloop.local");
      })
    : [];
}

function skippedStudents(session) {
  return Array.isArray(session.students)
    ? session.students
        .filter((student) => {
          const email = studentEmail(student);
          return !email || email.endsWith("@classloop.local");
        })
        .map((student) => student.name || "Unnamed student")
    : [];
}

function emailConfig() {
  if (process.env.CLASSLOOP_SMTP_HOST) {
    const senderEmail = process.env.CLASSLOOP_NO_REPLY_EMAIL || process.env.CLASSLOOP_SMTP_FROM || process.env.CLASSLOOP_SMTP_USER;
    const senderName = process.env.CLASSLOOP_NO_REPLY_NAME || "ClassLoop";
    return {
      configured: true,
      provider: process.env.CLASSLOOP_SMTP_PROVIDER || (process.env.CLASSLOOP_NO_REPLY_EMAIL ? "No-reply SMTP" : "SMTP"),
      from: senderName && senderEmail ? `${senderName} <${senderEmail}>` : senderEmail,
      replyTo: process.env.CLASSLOOP_REPLY_TO || undefined,
      transport: {
        host: process.env.CLASSLOOP_SMTP_HOST,
        port: Number(process.env.CLASSLOOP_SMTP_PORT || 587),
        secure: process.env.CLASSLOOP_SMTP_SECURE === "true" || process.env.CLASSLOOP_SMTP_PORT === "465",
        auth: process.env.CLASSLOOP_SMTP_USER
          ? {
              user: process.env.CLASSLOOP_SMTP_USER,
              pass: process.env.CLASSLOOP_SMTP_PASS || "",
            }
          : undefined,
      },
    };
  }

  if (process.env.CLASSLOOP_GMAIL_USER && process.env.CLASSLOOP_GMAIL_APP_PASSWORD) {
    const senderEmail = process.env.CLASSLOOP_NO_REPLY_EMAIL || process.env.CLASSLOOP_GMAIL_FROM || process.env.CLASSLOOP_GMAIL_USER;
    const senderName = process.env.CLASSLOOP_NO_REPLY_NAME || "ClassLoop";
    return {
      configured: true,
      provider: process.env.CLASSLOOP_NO_REPLY_EMAIL ? "No-reply Gmail SMTP" : "Gmail SMTP",
      from: senderName && senderEmail ? `${senderName} <${senderEmail}>` : senderEmail,
      replyTo: process.env.CLASSLOOP_REPLY_TO || undefined,
      transport: {
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.CLASSLOOP_GMAIL_USER,
          pass: process.env.CLASSLOOP_GMAIL_APP_PASSWORD,
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
    `Your ClassLoop follow-up is ready for ${session.title || "today's class"}.`,
    "",
    "Recap:",
    session.recap || "A session recap is available in ClassLoop.",
    "",
    "Your next steps:",
    ...tasks.map((task) => `- ${task}`),
    followUp?.reminder ? ["", "Reminder:", followUp.reminder].join("\n") : "",
    followUp?.dueDate ? `\nDue: ${followUp.dueDate}` : "",
    resources.length
      ? ["", "Resources:", ...resources.map((resource) => `- ${resource.title || resource.url}: ${resource.url}`)].join("\n")
      : "",
    "",
    "Open ClassLoop with your roster email to see the full student dashboard.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendRecapEmails(session) {
  const config = emailConfig();
  if (!config.configured) {
    const error = new Error("Email is not configured. Set SMTP or Gmail app-password environment variables before sending.");
    error.statusCode = 503;
    throw error;
  }
  if (!config.from) {
    const error = new Error("Email sender is missing. Set CLASSLOOP_SMTP_FROM or CLASSLOOP_GMAIL_FROM.");
    error.statusCode = 503;
    throw error;
  }

  const transporter = nodemailer.createTransport(config.transport);
  const recipients = [];
  const failed = [];
  const students = deliverableStudents(session);

  for (const student of students) {
    const to = studentEmail(student);
    try {
      await transporter.sendMail({
        from: config.from,
        replyTo: config.replyTo,
        to,
        subject: `ClassLoop recap: ${session.title || "Session follow-up"}`,
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
    response.writeHead(200, withSecurityHeaders({ "Content-Type": "application/json", "Cache-Control": "no-store" }));
    response.end(JSON.stringify(readDataFile()));
    return true;
  }

  if (request.method === "PUT") {
    try {
      const body = await readRequestBody(request);
      const state = writeDataFile(JSON.parse(body || "{}"));
      response.writeHead(200, withSecurityHeaders({ "Content-Type": "application/json", "Cache-Control": "no-store" }));
      response.end(JSON.stringify(state));
    } catch {
      response.writeHead(400, withSecurityHeaders({ "Content-Type": "application/json", "Cache-Control": "no-store" }));
      response.end(JSON.stringify({ error: "Unable to save ClassLoop data." }));
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
    const result = await sendRecapEmails(body.session || {});
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
    callback(trusted && ["media", "display-capture"].includes(permission));
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
