// /supabase/functions/profile-analysis/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as Sentry from "https://deno.land/x/sentry@7.119.0/index.mjs";

Sentry.init({ dsn: Deno.env.get("SENTRY_DSN") || "" });

type Section = "mood";
type Body = { user_id?: string; section?: Section };

const cors = {
  "Access-Control-Allow-Origin": "*", // set to your origin in prod
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // service role
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

const restBase = `${SUPABASE_URL}/rest/v1`;
const sHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { user_id, section }: Body = await req.json().catch(() => ({}));
    if (!user_id || !section) {
      return new Response(JSON.stringify({ error: "user_id and section required" }), { status: 400, headers: cors });
    }
    if (!SUPABASE_URL || !SERVICE_KEY) {
      const msg = "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY";
      Sentry.captureMessage(msg);
      return new Response(JSON.stringify({ error: msg }), { status: 500, headers: cors });
    }

    // ---------- Fetch data ----------
    // Last 50 mood rows; include "need" (Greatest Need)
    const moodsRes = await fetch(
      `${restBase}/moods?user_id=eq.${user_id}` +
        `&select=created_at,mood,social_battery,love_language,need,follow_up,journal` +
        `&order=created_at.desc&limit=50`,
      { headers: sHeaders }
    );
    if (!moodsRes.ok) {
      Sentry.captureMessage(`moods fetch failed: ${moodsRes.status} ${moodsRes.statusText}`);
      return new Response(JSON.stringify({ summary: "" }), { status: 502, headers: cors });
    }
    const moods = (await moodsRes.json().catch(() => [])) as Array<Record<string, unknown>>;
    const sample = moods.slice(0, 12);

    // ---------- Fingerprint for caching ----------
    const fpSource = sample.map((r) => ({
      c: r["created_at"],
      m: r["mood"],
      b: r["social_battery"],
      ll: r["love_language"],
      need: r["need"],             // ← Greatest Need now included
      j: r["journal"] ? String(r["journal"]).slice(0, 100) : null, // small excerpt
    }));
    const fingerprint = await sha256(JSON.stringify(fpSource));

    // ---------- Cache lookup ----------
    const cacheGet = await fetch(
      `${restBase}/insights_cache?user_id=eq.${user_id}&kind=eq.mood_profile&select=fingerprint,payload&limit=1`,
      { headers: sHeaders }
    );
    let cached: { fingerprint: string; payload: unknown } | null = null;
    if (cacheGet.ok) {
      const arr = (await cacheGet.json().catch(() => [])) as any[];
      cached = arr?.[0] || null;
    }
    if (cached && cached.fingerprint === fingerprint) {
      // Instant load
      return new Response(JSON.stringify(cached.payload ?? { summary: "" }), { headers: cors });
    }

    // ---------- Generate (or fallback) ----------
    const prompt = buildMoodPrompt(sample);
    const summary = OPENAI_API_KEY ? await callOpenAI(prompt) : fallbackSummaryFromMoods(sample);

    // ---------- Upsert cache ----------
    const upsert = await fetch(`${restBase}/insights_cache`, {
      method: "POST",
      headers: sHeaders,
      body: JSON.stringify([{ user_id, kind: "mood_profile", fingerprint, payload: { summary } }]),
    });
    if (!upsert.ok) {
      Sentry.captureMessage(`cache upsert failed: ${upsert.status} ${upsert.statusText}`);
    }

    return new Response(JSON.stringify({ summary }), { headers: cors });
  } catch (e) {
    Sentry.captureException(e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), { status: 500, headers: cors });
  }
});

// ---------- helpers ----------
function buildMoodPrompt(rows: Array<Record<string, unknown>>) {
  return [
    `You are a gentle, grounded coach writing a short Mood Insight for a returning user.`,
    `Tone: calm, invitational, concrete. No diagnosis. 3–5 sentences. Finish with one micro-practice (≤30 words).`,
    `Use mood + social_battery + love_language + need (Greatest Need) + a tiny journal echo if present.`,
    `DATA (most recent first, JSON):`,
    JSON.stringify(rows),
    `Write:\n1) Pattern acknowledgement (mood + battery + any repeating need).\n2) Tie "Greatest Need" to energy choice.\n3) Note how needed love language can help.\n4) Micro-practice: "Try: …" (6–10 minutes, specific).`,
    `Rules: No bullets; one paragraph; 'you' language; no jargon; omit 'need' line if missing.`,
  ].join("\n");
}

async function callOpenAI(prompt: string): Promise<string> {
  try {
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!aiRes.ok) throw new Error(`${aiRes.status} ${aiRes.statusText}`);
    const json = await aiRes.json().catch(() => ({}));
    return json?.choices?.[0]?.message?.content?.trim() || "";
  } catch {
    return "";
  }
}

function fallbackSummaryFromMoods(rows: Array<Record<string, unknown>>): string {
  const latest = rows?.[0] || {};
  const mood = (latest["mood"] as string) || "mixed";
  const energy = (latest["social_battery"] as string) || "balanced";
  const need = (latest["need"] as string) || "";
  const needLine = need ? ` Your system has been asking for ${need.toLowerCase()}.` : "";
  return `You’ve been trending ${mood} with ${energy} energy.${needLine} Try: 7 minutes to honor that need—one small, kind action that matches how you actually refill.`;
}

async function sha256(s: string) {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
