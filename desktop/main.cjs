const { app, BrowserWindow, shell, safeStorage } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const dataFile = path.join(rootDir, ".classloop-data.json");
const integrationsFile = path.join(rootDir, ".classloop-integrations.json");
let googleOauthState = "";

const securityHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(self), display-capture=(self)",
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

function readIntegrationFile() {
  try {
    if (!fs.existsSync(integrationsFile)) return {};
    const stored = JSON.parse(fs.readFileSync(integrationsFile, "utf8"));
    if (stored.encrypted && stored.payload) {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error("Local integration token encryption is not available.");
      }
      return JSON.parse(safeStorage.decryptString(Buffer.from(stored.payload, "base64")));
    }
    return stored;
  } catch {
    return {};
  }
}

function writeIntegrationFile(payload) {
  const stored = safeStorage.isEncryptionAvailable()
    ? {
        version: 1,
        encrypted: true,
        payload: safeStorage.encryptString(JSON.stringify(payload)).toString("base64"),
      }
    : {
        version: 1,
        encrypted: false,
        payload,
      };
  fs.writeFileSync(integrationsFile, `${JSON.stringify(stored, null, 2)}\n`, { mode: 0o600 });
  return payload;
}

function withSecurityHeaders(headers = {}) {
  return { ...securityHeaders, ...headers };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, withSecurityHeaders({ "Content-Type": "application/json" }));
  response.end(JSON.stringify(payload));
}

function sendHtml(response, statusCode, html) {
  response.writeHead(statusCode, withSecurityHeaders({ "Content-Type": "text/html; charset=utf-8" }));
  response.end(html);
}

function baseUrlFromRequest(request) {
  return `http://${request.headers.host}`;
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

function googleConfig(request) {
  return {
    clientId: process.env.CLASSLOOP_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.CLASSLOOP_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    redirectUri:
      process.env.CLASSLOOP_GOOGLE_REDIRECT_URI ||
      `${baseUrlFromRequest(request)}/api/google-classroom/callback`,
  };
}

function googleStatus(request) {
  const config = googleConfig(request);
  const integrations = readIntegrationFile();
  return {
    configured: Boolean(config.clientId && config.clientSecret),
    connected: Boolean(integrations.googleClassroom?.refresh_token || integrations.googleClassroom?.access_token),
  };
}

async function exchangeGoogleToken(params) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || "Google OAuth token exchange failed.");
  }
  return data;
}

async function googleAccessToken(request) {
  const config = googleConfig(request);
  const integrations = readIntegrationFile();
  const token = integrations.googleClassroom;
  if (!token) throw new Error("Google Classroom is not connected.");
  if (token.access_token && token.expiry_date && token.expiry_date > Date.now() + 60_000) {
    return token.access_token;
  }
  if (!token.refresh_token) throw new Error("Google Classroom needs to be reconnected.");

  const refreshed = await exchangeGoogleToken({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: token.refresh_token,
    grant_type: "refresh_token",
  });
  const nextToken = {
    ...token,
    ...refreshed,
    refresh_token: refreshed.refresh_token || token.refresh_token,
    expiry_date: Date.now() + Number(refreshed.expires_in || 3600) * 1000,
  };
  writeIntegrationFile({
    ...integrations,
    googleClassroom: nextToken,
  });
  return nextToken.access_token;
}

async function googleApi(request, url, options = {}) {
  const accessToken = await googleAccessToken(request);
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || data.error || "Google Classroom request failed.");
  }
  return data;
}

function lmsConfig() {
  return {
    provider: (process.env.CLASSLOOP_LMS_PROVIDER || "canvas").toLowerCase(),
    baseUrl: (process.env.CLASSLOOP_LMS_BASE_URL || "").replace(/\/+$/, ""),
    token: process.env.CLASSLOOP_LMS_TOKEN || "",
    postUrl: process.env.CLASSLOOP_LMS_POST_URL || "",
  };
}

function lmsStatus() {
  const config = lmsConfig();
  return {
    configured: Boolean((config.baseUrl && config.token) || config.postUrl),
    connected: Boolean((config.baseUrl && config.token) || config.postUrl),
    provider: config.provider,
    baseUrl: config.baseUrl,
  };
}

async function lmsFetch(pathname, options = {}) {
  const config = lmsConfig();
  if (!config.baseUrl || !config.token) {
    throw new Error("LMS is not configured. Set CLASSLOOP_LMS_BASE_URL and CLASSLOOP_LMS_TOKEN.");
  }
  const response = await fetch(`${config.baseUrl}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.token}`,
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || "LMS request failed.");
  }
  return data;
}

async function transcribeAudio(body) {
  const audioBase64 = String(body.audioBase64 || "");
  if (!audioBase64) {
    const error = new Error("No audio recording was provided for transcription.");
    error.statusCode = 400;
    throw error;
  }

  if (process.env.CLASSLOOP_TRANSCRIBE_URL) {
    const response = await fetch(process.env.CLASSLOOP_TRANSCRIBE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.CLASSLOOP_TRANSCRIBE_TOKEN ? { Authorization: `Bearer ${process.env.CLASSLOOP_TRANSCRIBE_TOKEN}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.message || "Configured transcription service failed.");
    return {
      provider: "Configured speech-to-text service",
      text: data.text || data.transcript || "",
    };
  }

  if (process.env.OPENAI_API_KEY) {
    const buffer = Buffer.from(audioBase64, "base64");
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: body.mimeType || "audio/webm" }), body.fileName || "classloop-recording.webm");
    form.append("model", process.env.CLASSLOOP_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe");
    form.append("response_format", "json");
    if (body.prompt) form.append("prompt", String(body.prompt));

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: form,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error?.message || data.error || "OpenAI transcription failed.");
    return {
      provider: "OpenAI speech-to-text",
      text: data.text || "",
    };
  }

  const error = new Error("Automatic transcription is not configured. Set OPENAI_API_KEY or CLASSLOOP_TRANSCRIBE_URL.");
  error.statusCode = 503;
  throw error;
}

async function handleTranscriptionApi(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed." });
    return true;
  }

  try {
    const body = JSON.parse((await readRequestBody(request)) || "{}");
    const result = await transcribeAudio(body);
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, error.statusCode || 500, { error: error.message || "Unable to transcribe recording." });
  }
  return true;
}

function sessionDescription(session) {
  const resources = Array.isArray(session.resources) && session.resources.length
    ? `\n\nResources:\n${session.resources.map((resource) => `- ${resource.title || resource.url}: ${resource.url}`).join("\n")}`
    : "";
  const actionItems = Array.isArray(session.actionItems) && session.actionItems.length
    ? `\n\nAction items:\n${session.actionItems.map((item) => `- ${item.title}: ${item.description || ""}`).join("\n")}`
    : "";
  return `${session.recap || "ClassLoop recap"}${actionItems}${resources}`;
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
  sendJson(response, 200, {
    email: {
      configured: emailConfig().configured,
      provider: emailConfig().provider,
      from: emailConfig().from,
      replyTo: emailConfig().replyTo,
    },
    googleClassroom: googleStatus(request),
    lms: lmsStatus(),
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

async function handleGoogleClassroomApi(request, response, parsed) {
  try {
    if (parsed.pathname === "/api/google-classroom/status") {
      sendJson(response, 200, googleStatus(request));
      return true;
    }

    if (parsed.pathname === "/api/google-classroom/auth-url") {
      const config = googleConfig(request);
      if (!config.clientId || !config.clientSecret) {
        sendJson(response, 503, { error: "Google Classroom OAuth is not configured." });
        return true;
      }
      googleOauthState = crypto.randomUUID();
      const scopes = [
        "https://www.googleapis.com/auth/classroom.courses.readonly",
        "https://www.googleapis.com/auth/classroom.coursework.students",
      ];
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", config.clientId);
      authUrl.searchParams.set("redirect_uri", config.redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", scopes.join(" "));
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("state", googleOauthState);
      sendJson(response, 200, { authUrl: authUrl.toString() });
      return true;
    }

    if (parsed.pathname === "/api/google-classroom/callback") {
      if (parsed.searchParams.get("state") !== googleOauthState) {
        sendHtml(response, 400, "<h1>ClassLoop Google Classroom connection failed</h1><p>OAuth state did not match.</p>");
        return true;
      }
      const code = parsed.searchParams.get("code");
      if (!code) {
        sendHtml(response, 400, "<h1>ClassLoop Google Classroom connection failed</h1><p>No code was returned.</p>");
        return true;
      }
      const config = googleConfig(request);
      const token = await exchangeGoogleToken({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: config.redirectUri,
      });
      const integrations = readIntegrationFile();
      writeIntegrationFile({
        ...integrations,
        googleClassroom: {
          ...token,
          expiry_date: Date.now() + Number(token.expires_in || 3600) * 1000,
        },
      });
      sendHtml(
        response,
        200,
        "<h1>Google Classroom connected</h1><p>You can close this tab and return to ClassLoop.</p>",
      );
      return true;
    }

    if (parsed.pathname === "/api/google-classroom/courses") {
      const data = await googleApi(
        request,
        "https://classroom.googleapis.com/v1/courses?teacherId=me&courseStates=ACTIVE&pageSize=100",
      );
      sendJson(response, 200, {
        courses: (data.courses || []).map((course) => ({
          id: course.id,
          name: course.name,
        })),
      });
      return true;
    }

    if (parsed.pathname === "/api/google-classroom/post-recap") {
      if (request.method !== "POST") {
        sendJson(response, 405, { error: "Method not allowed." });
        return true;
      }
      const body = JSON.parse((await readRequestBody(request)) || "{}");
      if (!body.courseId) {
        sendJson(response, 400, { error: "Choose a Google Classroom course first." });
        return true;
      }
      const session = body.session || {};
      const dueDate = session.actionItems?.[0]?.dueDate;
      const payload = {
        title: `ClassLoop follow-up: ${session.title || "Session recap"}`,
        description: sessionDescription(session),
        workType: "ASSIGNMENT",
        state: "PUBLISHED",
      };
      if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate || "")) {
        const [year, month, day] = dueDate.split("-").map(Number);
        payload.dueDate = { year, month, day };
      }
      const posted = await googleApi(
        request,
        `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(body.courseId)}/courseWork`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
      sendJson(response, 200, {
        postedAt: new Date().toISOString(),
        courseId: body.courseId,
        courseName: body.courseName || "",
        alternateLink: posted.alternateLink,
      });
      return true;
    }
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Google Classroom request failed." });
    return true;
  }

  sendJson(response, 404, { error: "Google Classroom endpoint not found." });
  return true;
}

async function handleLmsApi(request, response, parsed) {
  try {
    if (parsed.pathname === "/api/lms/status") {
      sendJson(response, 200, lmsStatus());
      return true;
    }

    if (parsed.pathname === "/api/lms/courses") {
      const config = lmsConfig();
      if (config.provider !== "canvas") {
        sendJson(response, 200, { courses: [] });
        return true;
      }
      const courses = await lmsFetch("/api/v1/courses?enrollment_type=teacher&per_page=100");
      sendJson(response, 200, {
        courses: courses.map((course) => ({
          id: String(course.id),
          name: course.name || course.course_code || `Course ${course.id}`,
        })),
      });
      return true;
    }

    if (parsed.pathname === "/api/lms/post-recap") {
      if (request.method !== "POST") {
        sendJson(response, 405, { error: "Method not allowed." });
        return true;
      }
      const config = lmsConfig();
      const body = JSON.parse((await readRequestBody(request)) || "{}");
      const session = body.session || {};
      if (config.postUrl) {
        const genericResponse = await fetch(config.postUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
          },
          body: JSON.stringify({
            courseId: body.courseId,
            courseName: body.courseName,
            title: `ClassLoop follow-up: ${session.title || "Session recap"}`,
            description: sessionDescription(session),
            session,
          }),
        });
        if (!genericResponse.ok) throw new Error(`Generic LMS endpoint returned ${genericResponse.status}.`);
      } else if (config.provider === "canvas") {
        if (!body.courseId) {
          sendJson(response, 400, { error: "Choose a Canvas course first." });
          return true;
        }
        const form = new URLSearchParams();
        form.set("assignment[name]", `ClassLoop follow-up: ${session.title || "Session recap"}`);
        form.set("assignment[description]", sessionDescription(session));
        form.set("assignment[published]", "true");
        form.append("assignment[submission_types][]", "online_text_entry");
        if (session.actionItems?.[0]?.dueDate) form.set("assignment[due_at]", `${session.actionItems[0].dueDate}T23:59:00`);
        await lmsFetch(`/api/v1/courses/${encodeURIComponent(body.courseId)}/assignments`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form,
        });
      } else {
        throw new Error("This LMS provider needs CLASSLOOP_LMS_POST_URL for posting.");
      }
      sendJson(response, 200, {
        postedAt: new Date().toISOString(),
        courseId: body.courseId || "",
        courseName: body.courseName || "",
        provider: config.provider,
      });
      return true;
    }
  } catch (error) {
    sendJson(response, 500, { error: error.message || "LMS request failed." });
    return true;
  }

  sendJson(response, 404, { error: "LMS endpoint not found." });
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
    if (parsed.pathname === "/api/transcribe") {
      await handleTranscriptionApi(request, response);
      return;
    }
    if (parsed.pathname.startsWith("/api/google-classroom/")) {
      await handleGoogleClassroomApi(request, response, parsed);
      return;
    }
    if (parsed.pathname.startsWith("/api/lms/")) {
      await handleLmsApi(request, response, parsed);
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
