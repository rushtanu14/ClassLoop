import Stripe from "stripe";
import { json, originUrl, requireUser, requiredEnv } from "../_shared.js";

export default async function handler(request, response) {
  if (request.method !== "POST") return json(response, 405, { error: "Method not allowed." });

  try {
    const { supabase, user } = await requireUser(request);
    const stripe = new Stripe(requiredEnv("STRIPE_SECRET_KEY"));
    const tier = request.body?.tier === "school" ? "school" : "pro";
    const price = tier === "school" ? requiredEnv("STRIPE_SCHOOL_PRICE_ID") : requiredEnv("STRIPE_PRO_PRICE_ID");
    const baseUrl = process.env.CLASSLOOP_PUBLIC_URL || originUrl(request);
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
      success_url: `${baseUrl}/#/dashboard?billing=success`,
      cancel_url: `${baseUrl}/#/dashboard?billing=canceled`,
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

    return json(response, 200, { url: checkout.url });
  } catch (error) {
    return json(response, error.statusCode || 500, { error: error.message || "Unable to create checkout session." });
  }
}
