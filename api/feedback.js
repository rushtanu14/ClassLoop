import nodemailer from "nodemailer";
import { getSupabaseAdmin, json } from "./_shared.js";

const FEEDBACK_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const FEEDBACK_RATE_LIMIT_MAX = 20;
const MAX_FEEDBACK_BODY_CHARS = 90_000;
const MAX_TRANSCRIPT_CHARS = 60_000;
const MAX_EMAIL_TRANSCRIPT_CHARS = 12_000;
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

function assertHostedFeedbackConfigured() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw httpError(503, "Missing Supabase hosted feedback configuration.");
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

function sanitizeFeedbackTranscript(transcript) {
  return String(transcript || "").slice(0, MAX_TRANSCRIPT_CHARS);
}

function emailTranscriptSnippet(transcript) {
  if (!transcript) return "";
  if (transcript.length <= MAX_EMAIL_TRANSCRIPT_CHARS) return transcript;
  return `${transcript.slice(0, MAX_EMAIL_TRANSCRIPT_CHARS)}\n\n[Transcript truncated in email; full stored payload is available in ClassLoop product feedback storage.]`;
}

function feedbackEmailConfig() {
  const to = process.env.CLASSLOOP_FEEDBACK_NOTIFY_EMAIL;
  if (!to) return null;

  const senderEmail = process.env.CLASSLOOP_NO_REPLY_EMAIL || process.env.CLASSLOOP_SMTP_FROM || process.env.CLASSLOOP_GMAIL_FROM || process.env.CLASSLOOP_GMAIL_USER;
  const senderName = process.env.CLASSLOOP_NO_REPLY_NAME || "ClassLoop";
  const from = senderName && senderEmail ? `${senderName} <${senderEmail}>` : senderEmail;

  if (process.env.CLASSLOOP_SMTP_HOST && process.env.CLASSLOOP_SMTP_FROM) {
    return {
      to,
      from: from || process.env.CLASSLOOP_SMTP_FROM,
      transport: {
        host: process.env.CLASSLOOP_SMTP_HOST,
        port: Number(process.env.CLASSLOOP_SMTP_PORT || 587),
        secure: process.env.CLASSLOOP_SMTP_SECURE === "true",
        auth: process.env.CLASSLOOP_SMTP_USER
          ? {
              user: process.env.CLASSLOOP_SMTP_USER,
              pass: process.env.CLASSLOOP_SMTP_PASS,
            }
          : undefined,
      },
    };
  }

  if (process.env.CLASSLOOP_GMAIL_USER && process.env.CLASSLOOP_GMAIL_APP_PASSWORD) {
    return {
      to,
      from: from || process.env.CLASSLOOP_GMAIL_USER,
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

  return null;
}

async function notifyCreator(feedback) {
  const config = feedbackEmailConfig();
  if (!config) return false;
  const metadata = Object.entries(feedback.metadata || {})
    .map(([key, value]) => `- ${key}: ${String(value)}`)
    .join("\n");
  const transcriptSnippet = emailTranscriptSnippet(feedback.transcript);
  const text = [
    `ClassLoop product feedback: ${feedback.rating}/5`,
    "",
    `Role: ${feedback.role}`,
    `Source: ${feedback.source}`,
    feedback.note ? ["", "Note:", feedback.note].join("\n") : "",
    metadata ? ["", "Metadata:", metadata].join("\n") : "",
    transcriptSnippet ? ["", "Transcript context:", transcriptSnippet].join("\n") : "",
  ]
    .filter(Boolean)
    .join("\n");
  await nodemailer.createTransport(config.transport).sendMail({
    from: config.from,
    to: config.to,
    subject: `ClassLoop product feedback: ${feedback.rating}/5`,
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
    assertHostedFeedbackConfigured();
    const supabase = getSupabaseAdmin();
    const auth = request.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
    let user = null;
    if (token) {
      const { data, error } = await supabase.auth.getUser(token);
      if (error) throw httpError(401, "Invalid or expired Supabase session.");
      user = data.user ?? null;
    }
    const rating = Number(request.body?.rating || 0);
    const note = String(request.body?.note || "").slice(0, 2000);
    const role = ["teacher", "student"].includes(request.body?.role) ? request.body.role : "unknown";
    const source = String(request.body?.source || "pilot_feedback").slice(0, 100);
    const metadata = sanitizeFeedbackMetadata(request.body?.metadata);
    const transcript = sanitizeFeedbackTranscript(request.body?.transcript);
    const feedback = {
      owner_id: user?.id ?? null,
      rating: Math.max(1, Math.min(5, rating || 3)),
      note,
      role,
      source,
      transcript,
      metadata,
      created_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("classloop_pilot_feedback").insert({
      ...feedback,
    });
    if (error) throw error;
    const notified = await notifyCreator(feedback).catch(() => false);
    return json(response, 200, { ok: true, notified });
  } catch (error) {
    return json(response, error.statusCode || 500, { error: error.message || "Unable to save feedback." });
  }
}
