import { createClient, type Session as SupabaseSession, type SupabaseClient } from "@supabase/supabase-js";

export type PlanTier = "free" | "pro" | "school";

export type BillingProfile = {
  tier: PlanTier;
  status: "active" | "trialing" | "past_due" | "canceled" | "not_configured";
  customerId?: string;
  currentPeriodEnd?: string;
};

export type BackendStatus = {
  supabaseConfigured: boolean;
  stripeConfigured: boolean;
  webReady: boolean;
};

export type CloudProfile = {
  email: string;
  role: "teacher" | "student";
  billingProfile: BillingProfile;
  noTrainingOnStudentData: boolean;
};

export type CloudAuthResult = {
  ok: boolean;
  message: string;
  session?: SupabaseSession | null;
};

export const planCatalog = [
  {
    tier: "free" as const,
    name: "Free",
    price: "$0",
    detail: "5 sessions each month, CSV import/export, student preview, and local desktop storage.",
    sessionLimit: 5,
  },
  {
    tier: "pro" as const,
    name: "Pro",
    price: "$9/mo",
    detail: "Unlimited sessions, multi-device cloud sync, email delivery logs, privacy exports, and advanced reports.",
    sessionLimit: Number.POSITIVE_INFINITY,
  },
  {
    tier: "school" as const,
    name: "School pilot",
    price: "$49/mo",
    detail: "Shared pilot workspace, longer retention controls, audit-ready exports, and priority onboarding.",
    sessionLimit: Number.POSITIVE_INFINITY,
  },
];

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let supabaseClient: SupabaseClient | null = null;

export function getBackendStatus(): BackendStatus {
  const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
  const stripeConfigured = Boolean(import.meta.env.VITE_STRIPE_PRO_PRICE_ID || import.meta.env.VITE_STRIPE_SCHOOL_PRICE_ID);
  return {
    supabaseConfigured,
    stripeConfigured,
    webReady: supabaseConfigured && stripeConfigured,
  };
}

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!supabaseClient) supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
}

export function planForTier(tier: PlanTier) {
  return planCatalog.find((plan) => plan.tier === tier) ?? planCatalog[0];
}

export function isPaidPlan(profile?: BillingProfile | null) {
  return Boolean(profile && ["pro", "school"].includes(profile.tier) && ["active", "trialing"].includes(profile.status));
}

export async function getCloudSession() {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session ?? null;
}

export async function signIntoCloud(email: string, password: string): Promise<CloudAuthResult> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, message: "Add Supabase keys to .env.local before using cloud sync." };
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Cloud sync connected.", session: data.session };
}

export async function createCloudAccount(email: string, password: string): Promise<CloudAuthResult> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, message: "Add Supabase keys to .env.local before creating cloud accounts." };
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Cloud account created. Check email if confirmation is enabled.", session: data.session };
}

export async function signOutCloud() {
  const client = getSupabaseClient();
  if (client) await client.auth.signOut();
}

export async function cloudRequest<T>(path: string, options: RequestInit = {}) {
  const session = await getCloudSession();
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Cloud request failed with status ${response.status}.`);
  }
  return data as T;
}

export async function createCheckoutSession(tier: Exclude<PlanTier, "free">) {
  return cloudRequest<{ url: string }>("/api/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ tier }),
  });
}

export async function getCloudProfile() {
  return cloudRequest<CloudProfile>("/api/profile");
}
