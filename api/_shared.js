import { createClient } from "@supabase/supabase-js";

export function json(response, status, payload) {
  response.status(status).setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

export function originUrl(request) {
  const forwardedHost = request.headers["x-forwarded-host"];
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost || request.headers.host;
  const protocol = request.headers["x-forwarded-proto"] || "http";
  return `${protocol}://${host}`;
}

export function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

export function getSupabaseAdmin() {
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
}

export async function requireUser(request) {
  const auth = request.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  if (!token) {
    const error = new Error("Sign in with Supabase before using hosted sync.");
    error.statusCode = 401;
    throw error;
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    const nextError = new Error("Invalid or expired Supabase session.");
    nextError.statusCode = 401;
    throw nextError;
  }
  return { supabase, user: data.user };
}

export function publicConfig() {
  return {
    supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_PRICE_ID),
    stripeSchoolConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SCHOOL_PRICE_ID),
  };
}
