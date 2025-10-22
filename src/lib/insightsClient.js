// src/lib/insightsClient.js
import supabase from "@lib/supabaseClient.js";

/**
 * Existing helper (kept as-is).
 * Returns HTML for the Love tab "quiz dossier" (quiz-insights function).
 */
export async function fetchQuizDossierHTML(userId) {
  const { data, error } = await supabase.functions.invoke("quiz-insights", {
    body: { userId, mode: "compose" }, // ask server for full dossier HTML
  });
  if (error) throw error;
  return data?.content_html || "";
}

/* ───────────────────────── Archetype Deep Insights client ─────────────────────────
   We talk to the edge function via fetch so we can do GET peek/cache_only + POST generate.
   Endpoints (from the server code you deployed):
   - GET  /archetype-deep-insights?mode=peek&user_id=...
   - GET  /archetype-deep-insights?cache_only=1&user_id=...
   - POST /archetype-deep-insights  { user_id, include_journals?, days? }
   Responses include { insights, cached, signature } or cache stubs.
────────────────────────────────────────────────────────────────────────────────── */

const BASE =
  (import.meta?.env?.VITE_SUPABASE_URL || "").replace(/\/+$/, "") + "/functions/v1";

const inflight = new Map(); // single-flight by key

function once(key, fn) {
  if (inflight.has(key)) return inflight.get(key);
  const p = Promise.resolve().then(fn).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

async function getJSON(res) {
  const ct = res.headers.get("content-type") || "";
  const isJSON = ct.includes("application/json");
  return isJSON ? res.json() : res.text().then((t) => ({ error: t || res.statusText }));
}

/**
 * Peek: fast, cache-only status (NO generation).
 * Returns: { cached:boolean, insights?:object, signature?:string, has_same_signature?:boolean }
 */
export async function peekArchetypeDeep({ userId }) {
  if (!userId) throw new Error("userId required");
  const url = new URL(`${BASE}/archetype-deep-insights`);
  url.searchParams.set("mode", "peek");
  url.searchParams.set("user_id", userId);

  const res = await fetch(url.toString(), { method: "GET" });
  const json = await getJSON(res);
  if (!res.ok) throw new Error(json?.error || "peek failed");
  return json;
}

/**
 * Cache-only: ask server to return cache if present, but DO NOT generate.
 * Returns:
 *   - 200 { cached:true, insights, signature } when cache exists
 *   - 202 { cached:false, signature } when cache missing/stale
 */
export async function cacheOnlyArchetypeDeep({ userId }) {
  if (!userId) throw new Error("userId required");
  const url = new URL(`${BASE}/archetype-deep-insights`);
  url.searchParams.set("cache_only", "1");
  url.searchParams.set("user_id", userId);

  const res = await fetch(url.toString(), { method: "GET" });
  const json = await getJSON(res);

  if (res.status === 202) {
    // No cache yet
    return { cached: false, signature: json?.signature || null };
  }
  if (!res.ok) throw new Error(json?.error || "cache_only failed");
  return json; // { cached:true, insights, signature }
}

/**
 * Heavy path: actually generate (LLM call on server).
 * Single-flight guarded per user to avoid duplicate POST storms.
 * Returns: { insights, cached:false, signature }
 */
export async function generateArchetypeDeep({ userId, includeJournals = false, days = 30 }) {
  if (!userId) throw new Error("userId required");
  const key = `adi:gen:${userId}`;
  return once(key, async () => {
    const res = await fetch(`${BASE}/archetype-deep-insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        include_journals: includeJournals,
        days,
      }),
    });
    const json = await getJSON(res);
    if (!res.ok) throw new Error(json?.error || "generate failed");
    return json; // { insights, cached:false, signature }
  });
}
