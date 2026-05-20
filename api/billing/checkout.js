import { json, originUrl, requireUser, requiredEnv } from "../_shared.js";
import { createStripeClient } from "./stripe-client.js";

export function checkoutReturnUrls(baseUrl) {
  return {
    success_url: `${baseUrl}/#/billing?billing=success`,
    cancel_url: `${baseUrl}/#/billing?billing=canceled`,
  };
}

export function embeddedCheckoutReturnUrl(baseUrl) {
  return `${baseUrl}/#/checkout?billing=success`;
}

async function readCheckoutBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

export default async function handler(request, response) {
  if (request.method !== "POST") return json(response, 405, { error: "Method not allowed." });

  try {
    const body = await readCheckoutBody(request);
    const { supabase, user } = await requireUser(request);
    const stripe = createStripeClient();
    const tier = "pro";
    const price = requiredEnv("STRIPE_PRO_PRICE_ID");
    const baseUrl = process.env.CLASSLOOP_PUBLIC_URL || originUrl(request);
    const embedded = body?.uiMode === "embedded";
    const { data: profile } = await supabase
      .from("classloop_profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();
    const customerId =
      profile?.stripe_customer_id ||
      (
        await stripe.customers.create({
          email: user.email || undefined,
          metadata: { supabaseUserId: user.id },
        })
      ).id;

    await supabase.from("classloop_profiles").upsert({
      id: user.id,
      email: user.email || "",
      role: "teacher",
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    });

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: user.id,
      ...(embedded
        ? {
            ui_mode: "embedded",
            return_url: embeddedCheckoutReturnUrl(baseUrl),
          }
        : checkoutReturnUrls(baseUrl)),
      subscription_data: {
        metadata: {
          supabaseUserId: user.id,
          tier,
        },
      },
      metadata: {
        supabaseUserId: user.id,
        tier,
      },
    });

    if (embedded && !checkout.client_secret) {
      throw new Error("Stripe did not return an embedded checkout client secret.");
    }

    return json(response, 200, embedded ? { clientSecret: checkout.client_secret } : { url: checkout.url });
  } catch (error) {
    return json(response, error.statusCode || 500, { error: error.message || "Unable to create checkout session." });
  }
}
