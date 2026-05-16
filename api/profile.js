import { json, requireUser } from "./_shared.js";

export function billingProfileFromRow(row) {
  return {
    tier: row?.plan_tier || "free",
    status: row?.subscription_status || "not_configured",
    customerId: row?.stripe_customer_id || undefined,
    currentPeriodEnd: row?.current_period_end || undefined,
  };
}

export function profilePatchColumns(payload = {}) {
  const allowed = {};
  if (typeof payload.noTrainingOnStudentData === "boolean") {
    allowed.no_training_on_student_data = payload.noTrainingOnStudentData;
  }
  if (payload.role === "teacher" || payload.role === "student") {
    allowed.role = payload.role;
  }
  return allowed;
}

async function ensureProfile(supabase, user) {
  const { data, error } = await supabase
    .from("classloop_profiles")
    .select("email, role, plan_tier, subscription_status, stripe_customer_id, current_period_end, no_training_on_student_data")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;

  const { data: inserted, error: insertError } = await supabase
    .from("classloop_profiles")
    .insert({
      id: user.id,
      email: user.email || "",
      role: "teacher",
      plan_tier: "free",
      subscription_status: "not_configured",
      no_training_on_student_data: true,
    })
    .select("email, role, plan_tier, subscription_status, stripe_customer_id, current_period_end, no_training_on_student_data")
    .single();
  if (insertError) throw insertError;
  return inserted;
}

export default async function handler(request, response) {
  try {
    const { supabase, user } = await requireUser(request);

    if (request.method === "GET") {
      const profile = await ensureProfile(supabase, user);
      return json(response, 200, {
        email: profile.email,
        role: profile.role,
        billingProfile: billingProfileFromRow(profile),
        noTrainingOnStudentData: Boolean(profile.no_training_on_student_data),
      });
    }

    if (request.method === "PATCH") {
      const payload = request.body && typeof request.body === "object" ? request.body : {};
      const allowed = profilePatchColumns(payload);
      if (!Object.keys(allowed).length) return json(response, 400, { error: "No supported profile updates were provided." });

      const { data, error } = await supabase
        .from("classloop_profiles")
        .upsert({ id: user.id, email: user.email || "", ...allowed, updated_at: new Date().toISOString() })
        .select("email, role, plan_tier, subscription_status, stripe_customer_id, current_period_end, no_training_on_student_data")
        .single();
      if (error) throw error;

      return json(response, 200, {
        email: data.email,
        role: data.role,
        billingProfile: billingProfileFromRow(data),
        noTrainingOnStudentData: Boolean(data.no_training_on_student_data),
      });
    }

    return json(response, 405, { error: "Method not allowed." });
  } catch (error) {
    return json(response, error.statusCode || 500, { error: error.message || "Unable to load account profile." });
  }
}
