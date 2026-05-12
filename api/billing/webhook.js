import Stripe from "stripe";
import { getSupabaseAdmin, json, requiredEnv } from "../_shared.js";
import { applySubscriptionProfileUpdate, currentPeriodEnd } from "./entitlements.js";

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
      await applySubscriptionProfileUpdate(getSupabaseAdmin(), {
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
      await applySubscriptionProfileUpdate(getSupabaseAdmin(), {
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
