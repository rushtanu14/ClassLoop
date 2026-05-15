import nodemailer from "nodemailer";
import { getSupabaseAdmin, json } from "./_shared.js";

const FEEDBACK_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const FEEDBACK_RATE_LIMIT_MAX = 20;
const MAX_FEEDBACK_BODY_CHARS = 12_000;
const MAX_METADATA_KEYS = 12;
const MAX_METADATA_KEY_CHARS = 50;
const MAX_METADATA_VALUE_CHARS = 220;
const feedbackRateBuckets = new Map();

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function allowProductFeedbackCors(request, response) {
  const origin = request.headers.origin || "";
  if (/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

function feedbackClientKey(request) {
  const forwardedFor = request.headers["x-forwarded-for"];
  const rawForwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const firstForwarded = rawForwarded ? rawForwarded.split(",")[0]?.trim() : "";
  return firstForwarded || request.socket?.remoteAddress || "unknown";
}

function assertFeedbackRateLimit(request) {
  const now = Date.now();
  for (const [key, bucket] of feedbackRateBuckets) {
    if (now - bucket.startedAt > FEEDBACK_RATE_LIMIT_WINDOW_MS) {
      feedbackRateBuckets.delete(key);
    }
  }

  const key = feedbackClientKey(request);
  const current = feedbackRateBuckets.get(key);
  if (!current) {
    feedbackRateBuckets.set(key, { count: 1, startedAt: now });
    return;
  }
  if (current.count >= FEEDBACK_RATE_LIMIT_MAX) {
    throw httpError(429, "Too many feedback submissions. Please try again later.");
  }
  current.count += 1;
}

function assertFeedbackBodyLimit(body) {
  const serialized = JSON.stringify(body ?? {});
  if (serialized.length > MAX_FEEDBACK_BODY_CHARS) {
    throw httpError(413, "Feedback payload is too large.");
  }
}

function sanitizeFeedbackMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  return Object.entries(metadata)
    .slice(0, MAX_METADATA_KEYS)
    .reduce((safe, [key, value]) => {
      const safeKey = String(key).slice(0, MAX_METADATA_KEY_CHARS);
      if (!safeKey) return safe;
      if (typeof value === "string") {
        safe[safeKey] = value.slice(0, MAX_METADATA_VALUE_CHARS);
      } else if (typeof value === "number" && Number.isFinite(value)) {
        safe[safeKey] = value;
      } else if (typeof value === "boolean") {
        safe[safeKey] = value;
      }
      return safe;
    }, {});
}

function feedbackEmailConfig() {
  const to = process.env.RELAY_FEEDBACK_NOTIFY_EMAIL;
  if (!to) return null;

  const senderEmail = process.env.RELAY_NO_REPLY_EMAIL || process.env.RELAY_SMTP_FROM || process.env.RELAY_GMAIL_FROM || process.env.RELAY_GMAIL_USER;
  const senderName = process.env.RELAY_NO_REPLY_NAME || "Relay";
  const from = senderName && senderEmail ? `${senderName} <${senderEmail}>` : senderEmail;

  if (process.env.RELAY_SMTP_HOST && process.env.RELAY_SMTP_FROM) {
    return {
      to,
      from: from || process.env.RELAY_SMTP_FROM,
      transport: {
        host: process.env.RELAY_SMTP_HOST,
        port: Number(process.env.RELAY_SMTP_PORT || 587),
        secure: process.env.RELAY_SMTP_SECURE === "true",
        auth: process.env.RELAY_SMTP_USER
          ? {
              user: process.env.RELAY_SMTP_USER,
              pass: process.env.RELAY_SMTP_PASS,
            }
          : undefined,
      },
    };
  }

  if (process.env.RELAY_GMAIL_USER && process.env.RELAY_GMAIL_APP_PASSWORD) {
    return {
      to,
      from: from || process.env.RELAY_GMAIL_USER,
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

  return null;
}

async function notifyCreator(feedback) {
  const config = feedbackEmailConfig();
  if (!config) return false;
  const metadata = Object.entries(feedback.metadata || {})
    .map(([key, value]) => `- ${key}: ${String(value)}`)
    .join("\n");
  const text = [
    `Relay product feedback: ${feedback.rating}/5`,
    "",
    `Role: ${feedback.role}`,
    `Source: ${feedback.source}`,
    feedback.note ? ["", "Note:", feedback.note].join("\n") : "",
    metadata ? ["", "Metadata:", metadata].join("\n") : "",
  ]
    .filter(Boolean)
    .join("\n");
  await nodemailer.createTransport(config.transport).sendMail({
    from: config.from,
    to: config.to,
    subject: `Relay product feedback: ${feedback.rating}/5`,
    text,
  });
  return true;
}

export default async function handler(request, response) {
  allowProductFeedbackCors(request, response);
  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "POST") return json(response, 405, { error: "Method not allowed." });

  try {
    assertFeedbackRateLimit(request);
    assertFeedbackBodyLimit(request.body);
    const supabase = getSupabaseAdmin();
    const auth = request.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
    let user = null;
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      user = data.user ?? null;
    }
    const rating = Number(request.body?.rating || 0);
    const note = String(request.body?.note || "").slice(0, 2000);
    const role = ["teacher", "student"].includes(request.body?.role) ? request.body.role : "unknown";
    const source = String(request.body?.source || "pilot_feedback").slice(0, 100);
    const metadata = sanitizeFeedbackMetadata(request.body?.metadata);
    const feedback = {
      owner_id: user?.id ?? null,
      rating: Math.max(1, Math.min(5, rating || 3)),
      note,
      role,
      source,
      metadata,
      created_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("relay_pilot_feedback").insert({
      ...feedback,
    });
    if (error) throw error;
    const notified = await notifyCreator(feedback).catch(() => false);
    return json(response, 200, { ok: true, notified });
  } catch (error) {
    return json(response, error.statusCode || 500, { error: error.message || "Unable to save feedback." });
  }
}
