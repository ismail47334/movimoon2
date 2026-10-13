import { securityHeaders } from "./_shared/api.js";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  let response;
  try {
    response = await context.next();
  } catch {
    response = Response.json({ error: "internal_error" }, { status: 500 });
  }

  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeaders(context.env || {}, url))) {
    headers.set(name, value);
  }
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
    if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
