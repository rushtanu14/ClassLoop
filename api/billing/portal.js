import Stripe from "stripe";
import { json, originUrl, requireUser, requiredEnv } from "../_shared.js";

export default async function handler(request, response) {
  if (request.method !== "POST") return json(response, 405, { error: "Method not allowed." });

  try {
    const { supabase, user } = await requireUser(request);
    const stripe = new Stripe(requiredEnv("STRIPE_SECRET_KEY"));
    const { data: profile, error } = await supabase
      .from("classloop_profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!profile?.stripe_customer_id) {
      return json(response, 400, { error: "Complete Stripe Checkout before opening the billing portal." });
    }

    const baseUrl = process.env.CLASSLOOP_PUBLIC_URL || originUrl(request);
    const portal = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${baseUrl}/#/billing`,
    });

    return json(response, 200, { url: portal.url });
  } catch (error) {
    return json(response, error.statusCode || 500, { error: error.message || "Unable to open billing portal." });
  }
}
