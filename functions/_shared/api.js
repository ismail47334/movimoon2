import contentSeed from "../../public/data/content.json" ;
import channelSeed from "../../public/data/channels.json" ;

const TMDB_ORIGIN = "https://api.themoviedb.org";
const TMDB_IMAGE_ORIGIN = "https://image.tmdb.org";
const REGION_CODES = new Set(["AE", "AU", "BD", "BR", "CA", "DE", "FR", "GB", "IN", "JP", "KR", "NG", "NZ", "PK", "SG", "US", "ZA"]);
const PAGE_LIMIT = 20;
const SAFE_SORTS = new Set(["popularity.desc", "popularity.asc", "vote_average.desc", "vote_average.asc", "release_date.desc", "release_date.asc", "primary_release_date.desc", "primary_release_date.asc", "first_air_date.desc", "first_air_date.asc", "title.asc", "title.desc"]);
const SECRET_QUERY_KEYS = /^(?:key|api[_-]?key|token|access[_-]?token|auth|authorization|signature|sig|secret|password|pass|session|jwt)$/i;
const DEFAULT_PLAYER_TEMPLATE = "https://movimoon-com-player.md-ismail.workers.dev/?tmdb={mediaId}&type={mediaType}&s={season}&e={episode}";
const DEFAULT_PLAYER_ORIGIN = "https://movimoon-com-player.md-ismail.workers.dev";

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}
function cleanText(value, limit = 500) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, limit);
}
function isValidRegion(value) { return REGION_CODES.has(String(value || "").toUpperCase()); }
function allowedPlayerOrigins(env) {
  const raw = String(env.PLAYER_ALLOWED_ORIGINS || "");
  const result = new Set();
  // The original MoviMoon player is a public embed endpoint, so it is safe
  // to keep it as a non-secret fallback when the Pages variables are absent.
  result.add(DEFAULT_PLAYER_ORIGIN);
  for (const part of raw.split(",")) {
    const value = part.trim();
    if (!value) continue;
    try {
      const u = new URL(value);
      if (u.protocol !== "https:" || u.origin !== value.replace(/\/$/, "") || u.username || u.password || !isPublicHost(u.hostname)) continue;
      result.add(u.origin);
    } catch { /* invalid allow-list entry is ignored */ }
  }
  return result;
}
function isPublicHost(hostname) {
  const h = hostname.toLowerCase();
  if (!h || h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".invalid")) return false;
  if (/^(?:10\.|127\.|169\.254\.|192\.168\.)/.test(h) || /^172\.(?:1[6-9]|2\d|3[01])\./.test(h)) return false;
  if (h === "::1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80:")) return false;
  return true;
}
function safePlayerTemplate(env, parentOrigin = "") {
  const configured = String(env.PLAYER_EMBED_URL || "").trim();
  let template = configured || DEFAULT_PLAYER_TEMPLATE;
  // If a dashboard template is missing the media placeholders, fall back to
  // the known-good original player instead of silently losing the TMDB ID.
  if (configured && (!configured.includes("{mediaId}") || !configured.includes("{mediaType}"))) {
    template = DEFAULT_PLAYER_TEMPLATE;
  }
  if (!template || template.length > 1200 || /[\r\n]/.test(template)) return null;
  let candidate;
  const sample = template.replaceAll("{channelId}", "sample-channel").replaceAll("{mediaType}", "movie").replaceAll("{mediaId}", "123").replaceAll("{season}", "1").replaceAll("{episode}", "1");
  try { candidate = new URL(sample); } catch { return null; }
  const allowed = allowedPlayerOrigins(env);
  if (candidate.protocol !== "https:" || !isPublicHost(candidate.hostname) || !allowed.has(candidate.origin) || (parentOrigin && candidate.origin === parentOrigin) || candidate.username || candidate.password || candidate.hash) return null;
  for (const key of candidate.searchParams.keys()) if (SECRET_QUERY_KEYS.test(key)) return null;
  if (/[{}]/.test(candidate.pathname + candidate.search)) return null;
  return { template, allowed };
}
export function securityHeaders(env, requestUrl) {
  const frames = ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com", "https://n6wxm.com", "https://www.highrevenueformat.com", ...allowedPlayerOrigins(env)];
  const challenge = env.TURNSTILE_SITE_KEY ? " https://challenges.cloudflare.com" : "";
  const ads = " https://n6wxm.com https://www.highrevenueformat.com";
  const connect = " https: https://raw.githubusercontent.com https://api.themoviedb.org https://image.tmdb.org https://fonts.googleapis.com https://fonts.gstatic.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net" + (env.TURNSTILE_SITE_KEY ? " https://challenges.cloudflare.com" : "");
  const upgrade = requestUrl.protocol === "https:" ? "; upgrade-insecure-requests" : "";
  return {
    "content-security-policy": `default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'none'; script-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net${challenge}${ads}; script-src-attr 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self'${connect}; frame-src ${[...new Set(frames)].join(" ")}; media-src 'self' https:${upgrade}`,
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "permissions-policy": "geolocation=(), camera=(), microphone=()",
    "cross-origin-opener-policy": "same-origin",
    "strict-transport-security": requestUrl.protocol === "https:" ? "max-age=31536000; includeSubDomains" : "max-age=0",
  };
}
function withSecurity(response, env, requestUrl) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(securityHeaders(env, requestUrl))) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
function safeSlug(value) { return /^[a-z0-9][a-z0-9-]{0,99}$/.test(value); }
function allowedTmdbPath(path) {
  if (["movie/popular", "movie/top_rated", "movie/upcoming", "tv/popular", "tv/top_rated", "genre/movie/list", "genre/tv/list", "search/movie", "search/tv", "search/multi", "discover/movie", "discover/tv"].includes(path)) return true;
  if (/^trending\/(?:all|movie|tv)\/(?:day|week)$/.test(path)) return true;
  return /^(?:movie|tv)\/\d+(?:\/(?:credits|videos|similar|recommendations|watch\/providers))?$/.test(path) || /^tv\/\d+\/season\/\d+$/.test(path);
}
function validTmdbQuery(path, incoming) {
  const common = new Set(["language", "page"]);
  const search = new Set(["query", "include_adult", "region", "year", "primary_release_year"]);
  const discover = new Set(["region", "watch_region", "sort_by", "with_genres", "with_original_language", "with_release_type", "with_watch_providers", "with_watch_monetization_types", "primary_release_date.gte", "primary_release_date.lte", "release_date.gte", "release_date.lte", "first_air_date.gte", "first_air_date.lte", "first_air_date_year", "primary_release_year", "vote_average.gte", "vote_count.gte"]);
  const params = new URLSearchParams();
  for (const [key, value] of incoming) {
    if (key === "api_key" || key === "append_to_response" || key === "include_adult") {
      if (key === "include_adult") continue;
      return { error: "Unsupported query parameter." };
    }
    if (!(common.has(key) || (path.startsWith("search/") && search.has(key)) || (path.startsWith("discover/") && discover.has(key)))) return { error: "Unsupported query parameter." };
    if (key === "page" && (!/^\d{1,3}$/.test(value) || Number(value) < 1 || Number(value) > 500)) return { error: "Page must be from 1 to 500." };
    if (key === "query" && (!value.trim() || value.length > 120)) return { error: "Search query must be 1–120 characters." };
    if (key === "region" && !isValidRegion(value)) return { error: "Choose a supported ISO region code." };
    if (key === "language" && !/^[a-z]{2}(?:-[A-Z]{2})?$/.test(value)) return { error: "Language must use an ISO language code." };
    if (key === "sort_by" && !SAFE_SORTS.has(value)) return { error: "Unsupported sort order." };
    if (key === "with_genres" && !/^[\d,|]+$/.test(value)) return { error: "Invalid genre filter." };
    if (key === "with_original_language" && !/^[a-z]{2}(?:\|[a-z]{2})*$/.test(value)) return { error: "Invalid original-language filter." };
    if (["primary_release_date.gte", "primary_release_date.lte", "release_date.gte", "release_date.lte"].includes(key) && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { error: "Date filter must use YYYY-MM-DD." };
    if (["vote_average.gte", "vote_count.gte"].includes(key) && !/^\d{1,6}(?:\.\d{1,2})?$/.test(value)) return { error: "Invalid numeric filter." };
    if (value.length > 200) return { error: "Query value is too long." };
    params.set(key, value);
  }
  if (path.startsWith("search/") && !params.has("query")) return { error: "A search query is required." };
  if (path === "discover/movie" && params.get("region") && !params.has("sort_by")) params.set("sort_by", "popularity.desc");
  return { params };
}
async function tmdbProxy(request, env, ctx, url) {
  const path = url.pathname.slice("/api/tmdb/".length);
  if (!allowedTmdbPath(path)) return json({ error: "TMDB route not allowed." }, 404);
  const bearer = String(env.TMDB_READ_ACCESS_TOKEN || "").trim();
  const v3key = String(env.TMDB_API_KEY || "").trim();
  if (!bearer && !v3key) return json({ error: "tmdb_not_configured", message: "TMDB is not configured. Showing the local sample catalogue until a Pages Secret is added." }, 503);
  if (path.startsWith("trending/") && url.searchParams.has("region")) return json({ error: "tmdb_trending_is_global", message: "TMDB trending is global. Use the separately labeled regional discovery feed for a release-region filter." }, 400);
  const checked = validTmdbQuery(path, url.searchParams);
  if (checked.error) return json({ error: "invalid_query", message: checked.error }, 400);
  const upstream = new URL(`/3/${path}`, TMDB_ORIGIN);
  for (const [key, value] of checked.params) upstream.searchParams.set(key, value);
  if (/^(?:movie|tv)\/\d+$/.test(path)) upstream.searchParams.set("append_to_response", "credits,videos,similar,recommendations");
  const headers = new Headers({ accept: "application/json" });
  if (bearer) headers.set("authorization", `Bearer ${bearer}`);
  else upstream.searchParams.set("api_key", v3key);

  // Edge-cache public catalogue responses. The token stays server-side and is not part of the cache key.
  const cache = caches.default;
  const cacheKey = new Request(url.toString(), { method: "GET" });
  try {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  } catch { /* cache is an optimization; continue to TMDB */ }

  let response;
  try {
    response = await fetch(upstream.toString(), { method: "GET", headers, redirect: "follow", cf: { cacheTtl: 180, cacheEverything: true } });
  } catch (e) {
    return json({ error: "tmdb_unavailable", message: "The catalogue service is temporarily unavailable.", detail: String(e?.message || e).slice(0, 300) }, 502);
  }
  if (!response.ok) return json({ error: "tmdb_request_failed", message: "TMDB did not return a successful response. Check the server-side credential and provider access." }, response.status === 429 ? 503 : 502, response.status === 429 ? { "retry-after": response.headers.get("retry-after") || "60" } : {});
  let data;
  try { data = await response.json(); } catch { return json({ error: "tmdb_invalid_response" }, 502); }
  const result = json(data, 200, { "cache-control": "public, max-age=180, s-maxage=300", "x-catalog-source": "TMDB" });
  try { ctx?.waitUntil(cache.put(cacheKey, result.clone())); } catch { /* cache is optional */ }
  return result;
}
function readAssetJson(_env, _requestUrl, assetPath, fallback) {
  if (assetPath === "/data/content.json") return contentSeed;
  if (assetPath === "/data/channels.json") return channelSeed;
  return fallback;
}
function parseLabels(value) {
  try { const parsed = JSON.parse(value || "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
async function getContent(request, env, url) {
  const kind = url.searchParams.get("kind") || "posts";
  if (!["posts", "pages"].includes(kind)) return json({ error: "kind must be posts or pages" }, 400);
  const limit = Math.min(PAGE_LIMIT, Math.max(1, Number(url.searchParams.get("limit")) || 10));
  if (env.DB) {
    try {
      const table = kind === "posts" ? "posts" : "pages";
      const result = await env.DB.prepare(`SELECT slug, title, excerpt, body, labels_json, created_at, updated_at FROM ${table} WHERE published = 1 ORDER BY created_at DESC LIMIT ?`).bind(limit).all();
      const items = (result.results || []).map(row => ({ ...row, labels: parseLabels(row.labels_json) }));
      return json({ source: "d1", items }, 200, { "cache-control": "public, max-age=60" });
    } catch { /* migration not applied: JSON fallback remains available */ }
  }
  const fallback = await readAssetJson(env, url, "/data/content.json", { posts: [], pages: [] });
  return json({ source: "json", items: Array.isArray(fallback[kind]) ? fallback[kind].slice(0, limit) : [] }, 200, { "cache-control": "public, max-age=60" });
}
async function getArticle(kind, slug, env, url) {
  if (!safeSlug(slug)) return json({ error: "invalid_slug" }, 400);
  if (env.DB) {
    try {
      const table = kind === "posts" ? "posts" : "pages";
      const row = await env.DB.prepare(`SELECT slug, title, excerpt, body, labels_json, created_at, updated_at FROM ${table} WHERE slug = ? AND published = 1 LIMIT 1`).bind(slug).first();
      if (row) return json({ ...row, labels: parseLabels(row.labels_json), source: "d1" });
    } catch { /* JSON fallback */ }
  }
  const data = await readAssetJson(env, url, "/data/content.json", { posts: [], pages: [] });
  const item = (Array.isArray(data[kind]) ? data[kind] : []).find(x => x.slug === slug);
  return item ? json({ ...item, source: "json" }) : json({ error: "not_found" }, 404);
}
async function listChannels(env, url) {
  const data = await readAssetJson(env, url, "/data/channels.json", { channels: [] });
  return (Array.isArray(data.channels) ? data.channels : []).filter(x => x && /^[a-z0-9-]{1,60}$/.test(String(x.id || ""))).map(x => ({ id: x.id, title: cleanText(x.title, 100), category: cleanText(x.category, 60), description: cleanText(x.description, 250) }));
}
function makeEmbedUrl(env, context) {
  const config = safePlayerTemplate(env, context.parentOrigin);
  if (!config) return { error: "player_not_configured", message: "No authorized HTTPS player source is configured." };
  const values = {
    channelId: context.channelId || "",
    mediaType: context.mediaType || "",
    mediaId: context.mediaId || "",
    season: context.season || "",
    episode: context.episode || "",
  };
  let raw = config.template;
  for (const [key, value] of Object.entries(values)) raw = raw.replaceAll(`{${key}}`, encodeURIComponent(value));
  if (/[{}]/.test(raw)) return { error: "invalid_player_template", message: "The player URL template contains an unsupported placeholder." };
  let target;
  try { target = new URL(raw); } catch { return { error: "invalid_player_url", message: "The configured player URL is invalid." }; }
  if (target.protocol !== "https:" || !config.allowed.has(target.origin) || !isPublicHost(target.hostname) || target.username || target.password || target.hash) return { error: "player_origin_not_allowed", message: "The player URL does not match the HTTPS origin allow-list." };
  for (const key of target.searchParams.keys()) if (SECRET_QUERY_KEYS.test(key)) return { error: "secret_in_player_url", message: "Secret-bearing player URLs cannot be exposed in an iframe." };
  return { url: target.href };
}
async function commentsApi(request, env, url) {
  const postSlug = cleanText(url.searchParams.get("postSlug"), 100);
  if (!safeSlug(postSlug)) return json({ error: "postSlug is required" }, 400);
  if (request.method === "GET") {
    if (!env.DB) return json({ enabled: false, comments: [], message: "Comments are not configured." });
    try {
      const result = await env.DB.prepare("SELECT id, name, body, created_at FROM comments WHERE post_slug = ? AND status = 'approved' ORDER BY created_at ASC LIMIT 100").bind(postSlug).all();
      return json({ enabled: Boolean(env.COMMENTS_ENABLED === "true" && env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET), comments: result.results || [] }, 200, { "cache-control": "public, max-age=30" });
    } catch { return json({ enabled: false, comments: [], message: "Comments are not configured." }); }
  }
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "GET, POST" });
  const origin = request.headers.get("origin");
  if (origin !== url.origin) return json({ error: "same_origin_required" }, 403);
  if (env.COMMENTS_ENABLED !== "true" || !env.DB || !env.TURNSTILE_SECRET || !env.TURNSTILE_SITE_KEY) return json({ error: "comments_not_configured", message: "Comment submission is disabled until the database, moderation and anti-spam settings are configured." }, 503);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 6000) return json({ error: "request_too_large" }, 413);
  let payload;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 6000) return json({ error: "request_too_large" }, 413);
    payload = JSON.parse(rawBody);
  } catch { return json({ error: "invalid_json" }, 400); }
  const name = cleanText(payload.name, 80);
  const body = cleanText(payload.body, 2000);
  const token = cleanText(payload.turnstileToken, 2048);
  if (!name || body.length < 3 || !token) return json({ error: "name_body_and_challenge_required" }, 400);
  const published = await env.DB.prepare("SELECT 1 AS published FROM posts WHERE slug = ? AND published = 1 LIMIT 1").bind(postSlug).first();
  if (!published) return json({ error: "post_not_found" }, 404);
  let verification;
  try {
    const form = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token });
    const check = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form, redirect: "follow",  });
    verification = await check.json();
  } catch { return json({ error: "challenge_unavailable" }, 503); }
  if (!verification?.success) return json({ error: "challenge_failed" }, 400);
  const result = await env.DB.prepare("INSERT INTO comments (post_slug, name, body, status) VALUES (?, ?, ?, 'pending')").bind(postSlug, name, body).run();
  return json({ accepted: true, id: result.meta?.last_row_id ?? null, status: "pending" }, 202);
}
async function api(request, env, ctx, url) {
  if (url.pathname === "/api/config" && request.method === "GET") {
    const player = safePlayerTemplate(env, url.origin);
    const channels = await listChannels(env, url);
    return json({
      tmdbReady: Boolean(env.TMDB_READ_ACCESS_TOKEN || env.TMDB_API_KEY),
      playerConfigured: Boolean(player),
      liveChannelCount: channels.length,
      contentMode: env.DB ? "d1-with-json-fallback" : "json",
      commentsEnabled: Boolean(env.COMMENTS_ENABLED === "true" && env.DB && env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET),
      turnstileSiteKey: env.TURNSTILE_SITE_KEY ? String(env.TURNSTILE_SITE_KEY).slice(0, 256) : null,
    });
  }
  if (url.pathname.startsWith("/api/tmdb/")) {
    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, { allow: "GET" });
    return tmdbProxy(request, env, ctx, url);
  }
  if (url.pathname === "/api/live/channels" && request.method === "GET") {
    return json({ configured: Boolean(safePlayerTemplate(env, url.origin)), channels: await listChannels(env, url) });
  }
  if (url.pathname === "/api/player-config" && request.method === "GET") {
    let context, item;
    if (url.searchParams.has("channel")) {
      const id = cleanText(url.searchParams.get("channel"), 60);
      if (!/^[a-z0-9-]{1,60}$/.test(id)) return json({ enabled: false, error: "invalid_channel" }, 400);
      item = (await listChannels(env, url)).find(x => x.id === id);
      if (!item) return json({ enabled: false, error: "channel_not_found", message: "That channel is not in the configured channel list." }, 404);
      context = { channelId: id, mediaType: "live", parentOrigin: url.origin };
    } else {
      const mediaType = url.searchParams.get("mediaType");
      const mediaId = cleanText(url.searchParams.get("mediaId"), 12);
      const season = cleanText(url.searchParams.get("season"), 3);
      const episode = cleanText(url.searchParams.get("episode"), 4);
      if (!["movie", "tv"].includes(mediaType) || !/^\d{1,12}$/.test(mediaId)) return json({ enabled: false, error: "invalid_media" }, 400);
      if (mediaType === "tv" && ((season && !/^\d{1,3}$/.test(season)) || (episode && !/^\d{1,4}$/.test(episode)))) return json({ enabled: false, error: "invalid_episode" }, 400);
      context = { mediaType, mediaId, season: mediaType === "tv" ? (season || "1") : "", episode: mediaType === "tv" ? (episode || "1") : "", parentOrigin: url.origin };
      item = { id: mediaId, title: mediaType === "tv" ? "Configured series player" : "Configured movie player" };
    }
    const result = makeEmbedUrl(env, context);
    if (result.error) return json({ enabled: false, error: result.error, message: result.message }, 503);
    return json({ enabled: true, item: { id: item.id, title: item.title }, src: result.url }, 200, { "cache-control": "no-store" });
  }
  if (url.pathname === "/api/content" && request.method === "GET") return getContent(request, env, url);
  const article = url.pathname.match(/^\/api\/(posts|pages)\/([^/]+)$/);
  if (article && request.method === "GET") return getArticle(article[1], decodeURIComponent(article[2]), env, url);
  if (url.pathname === "/api/feed.json" && request.method === "GET") {
    const result = await getContent(request, env, new URL("/api/content?kind=posts&limit=20", url));
    const feed = await result.json();
    const items = (feed.items || []).map(p => ({ id: p.slug, url: `${url.origin}/#article/${encodeURIComponent(p.slug)}`, title: p.title, content_text: p.body || p.excerpt || "", date_published: p.created_at || undefined }));
    return json({ version: "https://jsonfeed.org/version/1.1", title: "MoviMoon Journal", home_page_url: `${url.origin}/#blog`, feed_url: `${url.origin}/api/feed.json`, items });
  }
  if (url.pathname === "/api/comments") return commentsApi(request, env, url);
  return json({ error: "not_found" }, 404);
}

export async function handleApiRequest(request, env = {}, ctx = {}) {
  const url = new URL(request.url);
  const response = (url.pathname === "/api" || url.pathname.startsWith("/api/"))
    ? await api(request, env, ctx, url)
    : json({ error: "not_found" }, 404);
  return withSecurity(response, env, url);
}
