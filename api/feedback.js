import { json, requireUser } from "./_shared.js";

export default async function handler(request, response) {
  if (request.method !== "POST") return json(response, 405, { error: "Method not allowed." });

  try {
    const { supabase, user } = await requireUser(request);
    const rating = Number(request.body?.rating || 0);
    const note = String(request.body?.note || "").slice(0, 2000);
    const { error } = await supabase.from("relay_pilot_feedback").insert({
      owner_id: user.id,
      rating: Math.max(1, Math.min(5, rating || 3)),
      note,
      created_at: new Date().toISOString(),
    });
    if (error) throw error;
    return json(response, 200, { ok: true });
  } catch (error) {
    return json(response, error.statusCode || 500, { error: error.message || "Unable to save feedback." });
  }
}
