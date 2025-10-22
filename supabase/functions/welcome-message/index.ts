// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ───────────────────────── CORS helpers ───────────────────────── */
function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "*";
  // If you want to restrict in prod, swap "*" for a whitelist check
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    // Reflect whatever the browser asked for (fallback to a safe list)
    "Access-Control-Allow-Headers":
      req.headers.get("access-control-request-headers") ||
      "authorization, x-client-info, apikey, content-type",
    // Helps caches; and required when reflecting Origin
    "Vary": "Origin",
    // Optional: cache preflight for an hour
    "Access-Control-Max-Age": "3600",
  };
}
function env(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}
// JSON response with CORS
function j(req: Request, body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(req) },
  });
}

// OK/empty with CORS (for OPTIONS)
function ok(req: Request, status = 204) {
  return new Response(null, { status, headers: corsHeaders(req) });
}

/* ───────────────────────── SMALL UTILS ───────────────────────── */
const clamp = (n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
function getUserIdFromAuth(req: Request): string | null {
  const a = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!a?.toLowerCase().startsWith("bearer ")) return null;
  const token = a.slice(7);
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g,"+").replace(/_/g,"/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);
    const json = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(padded), c => c.charCodeAt(0))));
    return typeof json?.sub === "string" ? json.sub : null;
  } catch { return null; }
}

/* ── Receiving love-language helpers ─────────────────────────── */
const RECEIVING_SLUGS = [
  "love-language-receiving",
  "love_language_receiving",
  "love-language",
  "love_language",
];
const isReceivingSlug = (slug: string) => RECEIVING_SLUGS.includes(slug);
function pickLatestReceiving(attempts: any[] = []) {
  return attempts.find((a) => isReceivingSlug(a.quiz_slug))?.result_key ?? null;
}

/* ────────────────── COERCER (UI SAFETY) ──────────────────
   Ensures ≤3 lines + 1 affirmation; 0–1 CTA; sane defaults.
---------------------------------------------------------------- */
function coerceWelcome(x: any) {
  const out: any = x && typeof x === "object" ? x : {};
  const arr = (v:any)=>Array.isArray(v)?v:[];

  const welcome = out.welcome && typeof out.welcome==="object" ? out.welcome : {};
  welcome.greeting = typeof welcome.greeting === "string" ? welcome.greeting.slice(0,140) : null;

  let lines = arr(welcome.lines).map((s:string)=>String(s||"").trim()).filter(Boolean);
  if (lines.length > 3) lines = lines.slice(0,3);
  welcome.lines = lines;

  const nudge = welcome.nudge && typeof welcome.nudge==="object" ? welcome.nudge : {};
  const kind = (nudge.kind || "none");
  welcome.nudge = {
    kind: ["breath","product","gift"].includes(kind) ? kind : "none",
    variant: nudge.variant === "4-7-8" ? "4-7-8" : (nudge.variant === "box" ? "box" : null),
    cta_label: typeof nudge.cta_label === "string" ? nudge.cta_label.slice(0,80) : null,
    product: nudge.product && typeof nudge.product==="object" ? {
      id: nudge.product.id || null, slug: nudge.product.slug || null, name: nudge.product.name || null
    } : null,
    gift: nudge.gift && typeof nudge.gift==="object" ? {
      code: nudge.gift.code || null, label: nudge.gift.label || null, expires_at: nudge.gift.expires_at || null
    } : null,
  };
  // enforce 0–1 CTA
  if (welcome.nudge.kind === "none") { welcome.nudge = { kind: "none", variant: null, cta_label: null, product: null, gift: null }; }
  if (welcome.nudge.kind === "breath") { welcome.nudge.product = null; welcome.nudge.gift = null; }
  if (welcome.nudge.kind === "product") { welcome.nudge.gift = null; welcome.nudge.variant = null; }
  if (welcome.nudge.kind === "gift") { welcome.nudge.product = null; welcome.nudge.variant = null; }

  const aff = out.affirmation && typeof out.affirmation==="object" ? out.affirmation : {};
  const text = typeof aff.text === "string" ? aff.text.replace(/[“”]/g,'"').replace(/[’]/g,"'").trim() : "";
  out.affirmation = {
    id: aff.id || crypto.randomUUID(),
    text: text ? text : "I meet today with gentle presence.",
    tone: ["warm","rooted","bright"].includes(aff.tone) ? aff.tone : "warm",
  };

  out.welcome = welcome;
  out.provenance = out.provenance || {};
  return out;
}

/* ────────────────── MISC INPUTS ─────────────────────────── */
type MoodRow = { mood: number|null; social_battery:number|null; need:string|null; love_language:string|null; created_at:string };
function timeOfDayFromTZ(tz?: string|null) {
  try {
    const now = tz ? new Date(new Date().toLocaleString("en-US", { timeZone: tz })) : new Date();
    const h = now.getHours();
    if (h < 12) return "morning";
    if (h < 18) return "afternoon";
    return "evening";
  } catch { return "morning"; }
}

/* ────────────────── OPENAI CALL (JSON MODE) ────────────────── */
async function callOpenAI(messages: any[], timeoutMs=18_000) {
  const { default: OpenAI } = await import("https://esm.sh/openai@4.56.0");
  const openai = new OpenAI({ apiKey: env("OPENAI_API_KEY") });
  const ac = new AbortController();
  const t = setTimeout(()=>ac.abort(), timeoutMs);
  try {
    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages
    }, { signal: ac.signal });
    return chat.choices?.[0]?.message?.content ?? "{}";
  } finally { clearTimeout(t); }
}

const SYSTEM = `
You write a *2 sentence (max 3)* welcome and a single affirmation that makes the user feel loved.
Rules:
- Prefer **2 sentences total** for welcome (3 only if weaving two ideas). Keep concrete, warm, non-therapist tone.
- You may include **ONE** nudge: "breath" (box or 4-7-8), or "product" (shortcut), or "gift". Never more than one.
- If their most recent mood is low (<=3), do NOT include product or gift. Prefer breath or words.
- Tailor tone by time of day: morning/opening, afternoon/steady, evening/soften.
- Use their *receiving* love language to bias how you care for them (words, service/shortcut, ritual/time, rare gift, gentle body cue).
- NEVER exceed 3 welcome sentences. Always return an affirmation as one sentence.

Return STRICT JSON with keys:
{
  "welcome": {
    "greeting": "string or null",
    "lines": ["... at most 3 short lines ..."],
    "nudge": { "kind": "breath|product|gift|none", "variant": "box|4-7-8|null", "cta_label": "string|null", "product": {"id":null,"slug":null,"name":null} | null, "gift": {"code":null,"label":null,"expires_at":null} | null }
  },
  "affirmation": { "id": "any", "text": "one sentence", "tone": "warm|rooted|bright" },
  "provenance": { "used": ["..."], "tod": "morning|afternoon|evening", "cached": false, "date": "YYYY-MM-DD" }
}
`;

/* ────────────────────────── HANDLER ────────────────────────── */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return ok(req);

  // Parse URL once
  const url = new URL(req.url);
  const q = (k: string) => url.searchParams.get(k);

  // Parse body exactly once (single-use stream!)
  let body: any = {};
  if (req.method === "POST") {
    try { body = await req.json(); } catch { body = {}; }
  }

  // Inputs
  const mode = q("mode") || "";                           // ping | peek | default
  const force = q("force") === "1" || body?.force === 1;  // allow query or body
  const tz = body?.tz || q("tz") || null;                 // prefer body.tz
  const cacheOnly = q("cache_only") === "1";

  if (mode === "ping") return j(req, { ok: true, time: new Date().toISOString() });

  try {
    // Auth
    const userId = (body?.user_id ?? null) || getUserIdFromAuth(req);
    if (!userId) return j(req, { error: "user_id required (body or Authorization: Bearer)" }, 400);

    const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
    // … continue with your existing logic


    // Pull recent attempts (for receiving LL, etc.)
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("quiz_slug,result_key,result_title,completed_at,result_totals")
      .eq("user_id", userId)
      .order("completed_at", { ascending:false })
      .limit(200);

    // Last & 30d check-ins
    const since30 = new Date(Date.now() - 30*86400e3).toISOString();
    const { data: checks } = await supabase
      .from("moods")
      .select("mood,social_battery,need,love_language,created_at")
      .eq("user_id", userId)
      .gte("created_at", since30)
      .order("created_at", { ascending:false });

    const moods = (checks||[]).map(c=>Number(c.mood)).filter(n=>Number.isFinite(n)) as number[];
    const avg30 = moods.length ? Math.round((moods.reduce((a,b)=>a+b,0)/moods.length)*10)/10 : null;

    // OPTIONAL: product habit / wishlist / achievements timestamps
    const recvLL = pickLatestReceiving(attempts || []);
    const latestCheckAt = (checks?.[0]?.created_at && Date.parse(checks[0].created_at)) || 0;
    const latestRecvAt =
      (attempts?.find((a) => isReceivingSlug(a.quiz_slug))?.completed_at &&
        Date.parse(attempts.find((a) => isReceivingSlug(a.quiz_slug))!.completed_at)) || 0;

    let latestFavAt = 0;
    try {
      // NOTE: table name adjusted to singular 'wishlist' based on your schema messages.
      const { data: wrows } = await supabase
        .from("wishlist")
        .select("updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1);
      latestFavAt = wrows?.[0]?.updated_at ? Date.parse(wrows[0].updated_at) : 0;
    } catch {}

    let latestAchAt = 0;
    try {
      const { data: arows } = await supabase
        .from("user_achievements")
        .select("updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1);
      latestAchAt = arows?.[0]?.updated_at ? Date.parse(arows[0].updated_at) : 0;
    } catch {}

    const tod = timeOfDayFromTZ(tz || null);
    const today = new Date().toISOString().slice(0, 10);

    // Content-addressed signature (what shapes the copy)
    const signatureInputs = {
      day: today,
      lastMood: (checks?.[0]?.mood ?? null),
      receiving_ll_key: recvLL,
      prompt_v: 2,
    };
    const signature = await sha256(JSON.stringify(signatureInputs));

    // Read cache
    const { data: cacheRow } = await supabase
      .from("user_insights_latest")
      .select("payload, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    const existing = cacheRow?.payload?.welcome_message || null;
    const cacheUpdatedMs = cacheRow?.updated_at ? Date.parse(cacheRow.updated_at) : 0;

    // If source signals are newer than cache write time, recompute even if signatures match
    const newestSourceAt = Math.max(latestCheckAt, latestRecvAt, latestFavAt, latestAchAt);
    const sourcesNewerThanCache = newestSourceAt > cacheUpdatedMs;

    if (mode === "peek") {
  return j(req, {
    cached: !!existing,
    same_signature: existing?.signature === signature,
    sources_newer_than_cache: sourcesNewerThanCache,
    welcome: existing || null,
    updated_at: cacheRow?.updated_at || null,
  });
}


    // Serve cache only if: same signature, not forced, and no newer sources
    if (!force && existing?.signature === signature && !sourcesNewerThanCache) {
      return j(req, { welcome: { ...existing, provenance: { ...(existing.provenance||{}), cached: true } }, cached: true });
    }

    // Build model context
    const context = {
      date: today,
      tod,
      love_language_receiving: recvLL,
      last_checkin: checks?.[0]
        ? {
            mood: clamp(Number(checks[0].mood || 0), 0, 5),
            social_battery: clamp(Number(checks[0].social_battery || 0), 0, 5),
            need: checks[0].need || null,
            ll_need: checks[0].love_language || null,
            at: checks[0].created_at,
          }
        : null,
      avg30_mood: avg30,
      guardrails: { prefer_words_when_low: true, single_nudge_only: true },
    };

    const messages = [
      { role: "system", content: SYSTEM },
      { role: "user", content: JSON.stringify(context, null, 2) },
    ];

    // Generate or fallback
    let json: any;
    try {
      const raw = await callOpenAI(messages, 18_000);
      json = JSON.parse(raw || "{}");
    } catch {
      json = {
        welcome: {
          greeting: null,
          lines: ["Welcome back. Let’s take one gentle step today."],
          nudge: { kind: "breath", variant: "box", cta_label: "Take a 60-second reset", product: null, gift: null },
        },
        affirmation: { id: crypto.randomUUID(), text: "I meet today with gentle presence.", tone: "warm" },
        provenance: { used: ["fallback"], tod, cached: false, date: today },
      };
    }

    // Enforce shape & provenance
    const coerced = coerceWelcome(json);
    coerced.provenance = { ...(coerced.provenance || {}), tod, cached: false, date: today };

    // Write back with signature so we can compare next time
const payload =
  cacheRow?.payload && typeof cacheRow.payload === "object"
    ? structuredClone(cacheRow.payload)
    : {};
payload.welcome_message = {
  ...coerced,
  date: today,
  signature,
};

// ✅ also set the top-level signature so NOT NULL constraint is satisfied
const row = {
  user_id: userId,
  payload,
  signature,                              // <-- ADD THIS LINE
  updated_at: new Date().toISOString(),
};

const { error: upsertErr } = await supabase
  .from("user_insights_latest")
  .upsert(row, { onConflict: "user_id" });

if (upsertErr) {
  console.log("[welcome-message] upsert error:", upsertErr);
  return j(req, { error: `upsert_failed: ${upsertErr.message}` }, 500);
}


    return j(req, { welcome: payload.welcome_message, cached: false });

  } catch (e) {
    console.log("[welcome-message] error:", (e as any)?.message || e);
    return j(req, { error: String((e as any)?.message || e) }, 500);
  }
});
