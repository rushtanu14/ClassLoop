import { json, publicConfig } from "./_shared.js";

export default async function handler(request, response) {
  if (request.method !== "GET") return json(response, 405, { error: "Method not allowed." });
  return json(response, 200, publicConfig());
}
