import { json, requireUser } from "./_shared.js";

export default async function handler(request, response) {
  try {
    const { supabase, user } = await requireUser(request);

    if (request.method === "GET") {
      const { data, error } = await supabase
        .from("classloop_workspace_state")
        .select("state, updated_at")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return json(response, 200, data?.state ?? null);
    }

    if (request.method === "PUT") {
      const payload = request.body && typeof request.body === "object" ? request.body : {};
      const { error } = await supabase.from("classloop_workspace_state").upsert({
        owner_id: user.id,
        state: payload,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return json(response, 200, { ok: true, updatedAt: new Date().toISOString() });
    }

    return json(response, 405, { error: "Method not allowed." });
  } catch (error) {
    return json(response, error.statusCode || 500, { error: error.message || "Cloud sync failed." });
  }
}
