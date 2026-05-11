import Stripe from "stripe";
import { getSupabaseAdmin, json, requiredEnv } from "../_shared.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(request) {
  if (Buffer.isBuffer(request.body)) return request.body;
  if (typeof request.body === "string") return Buffer.from(request.body);
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function currentPeriodEnd(subscription) {
  const seconds = subscription.current_period_end;
  return typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : null;
}

async function upsertSubscriptionProfile({ customerId, userId, tier, status, subscriptionId, currentPeriodEndIso }) {
  const supabase = getSupabaseAdmin();
  const payload = {
    stripe_customer_id: customerId,
    subscription_id: subscriptionId,
    plan_tier: status === "active" || status === "trialing" ? tier : "free",
    subscription_status: status,
    current_period_end: currentPeriodEndIso,
    updated_at: new Date().toISOString(),
  };

  if (userId) {
    const { error } = await supabase.from("relay_profiles").update(payload).eq("id", userId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("relay_profiles").update(payload).eq("stripe_customer_id", customerId);
  if (error) throw error;
}

export default async function handler(request, response) {
  if (request.method !== "POST") return json(response, 405, { error: "Method not allowed." });

  try {
    const stripe = new Stripe(requiredEnv("STRIPE_SECRET_KEY"));
    const signature = request.headers["stripe-signature"];
    const rawBody = await readRawBody(request);
    const event = stripe.webhooks.constructEvent(rawBody, signature, requiredEnv("STRIPE_WEBHOOK_SECRET"));

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const subscription =
        typeof session.subscription === "string"
          ? await stripe.subscriptions.retrieve(session.subscription)
          : session.subscription;
      await upsertSubscriptionProfile({
        customerId: String(session.customer || subscription?.customer || ""),
        userId: session.metadata?.supabaseUserId,
        tier: "pro",
        status: subscription?.status || "active",
        subscriptionId: typeof session.subscription === "string" ? session.subscription : subscription?.id,
        currentPeriodEndIso: subscription ? currentPeriodEnd(subscription) : null,
      });
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      await upsertSubscriptionProfile({
        customerId: String(subscription.customer || ""),
        userId: subscription.metadata?.supabaseUserId,
        tier: "pro",
        status: subscription.status || "canceled",
        subscriptionId: subscription.id,
        currentPeriodEndIso: currentPeriodEnd(subscription),
      });
    }

    return json(response, 200, { received: true });
  } catch (error) {
    return json(response, 400, { error: error.message || "Invalid Stripe webhook." });
  }
}
