// /supabase/functions/profile-analysis/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as Sentry from "https://deno.land/x/sentry@7.119.0/index.mjs";

Sentry.init({ dsn: Deno.env.get("SENTRY_DSN") || "" });

type Body = { user_id?: string; section?: "mood" | "love" | "archetype" };

const cors = {
  "Access-Control-Allow-Origin": "*", // set to https://afrodezea.com in prod
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { user_id, section }: Body = await req.json().catch(() => ({}));
    if (!user_id || !section) {
      return new Response(JSON.stringify({ error: "user_id and section required" }), {
        status: 400, headers: { "Content-Type": "application/json", ...cors },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); // ⬅️ service role
    if (!SUPABASE_URL || !SERVICE_KEY) {
      const msg = "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY";
      Sentry.captureMessage(msg);
      return new Response(JSON.stringify({ error: msg }), {
        status: 500, headers: { "Content-Type": "application/json", ...cors },
      });
    }

    const base = `${SUPABASE_URL}/rest/v1`;
    const headers = {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };

    // Pull last 50 moods (most recent first) using fields that actually exist in your schema
    const moodsRes = await fetch(
      `${base}/moods?user_id=eq.${user_id}` +
        `&select=created_at,mood,social_battery,love_language,need,follow_up,journal,archetype` +
        `&order=created_at.desc&limit=50`,
      { headers }
    );

    if (!moodsRes.ok) {
      Sentry.captureMessage(`moods fetch failed: ${moodsRes.status} ${moodsRes.statusText}`);
      return new Response(JSON.stringify({ summary: "" }), {
        status: 502, headers: { "Content-Type": "application/json", ...cors },
      });
    }

    const moods = await moodsRes.json().catch(() => []) as Array<Record<string, unknown>>;
    const sample = moods.slice(0, 12); // keep prompt small

    // Build a compact analysis prompt
    const prompt = [
      `You write a short, friendly ${section} analysis for a returning user.`,
      `Use concrete observations, 3–5 sentences, encouraging tone. Avoid diagnosis.`,
      `Recent check-ins (most recent first, JSON):`,
      JSON.stringify(sample),
    ].join("\n");

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
    if (!OPENAI_API_KEY) {
      const summary = fallbackSummaryFromMoods(section, sample);
      return new Response(JSON.stringify({ summary }), {
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      Sentry.captureMessage(`OpenAI failure: ${aiRes.status} ${aiRes.statusText}`);
      const summary = fallbackSummaryFromMoods(section, sample);
      return new Response(JSON.stringify({ summary }), {
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    const json = await aiRes.json().catch(() => ({}));
    const summary =
      json?.choices?.[0]?.message?.content?.trim() ??
      fallbackSummaryFromMoods(section, sample);

    return new Response(JSON.stringify({ summary }), {
      headers: { "Content-Type": "application/json", ...cors },
    });
  } catch (e) {
    Sentry.captureException(e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500, headers: { "Content-Type": "application/json", ...cors },
    });
  }
});

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

Deno.serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, section } = await req.json();
    // ... build your analysis ...
    const payload = { summary: "…" };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || "bad request" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});


// Basic fallback if AI is unavailable
function fallbackSummaryFromMoods(section: Body["section"], rows: Array<Record<string, unknown>>): string {
  const recent = rows?.[0] || {};
  const mood = (recent["mood"] as string) || "mixed";
  const love = (recent["love_language"] as string) || "varied";
  const energy = (recent["social_battery"] as string) || "balanced";
  if (section === "love") {
    return `You seem to be gravitating toward ${love} lately. Consider one small act today that reflects that need, and notice how your mood shifts. Keep honoring what actually restores you.`;
  }
  if (section === "archetype") {
    return `Your recent entries show ${energy} energy with ${mood} moods. Lean into your archetype’s strengths today and set a simple boundary to protect your focus. Small consistency beats bursts.`;
  }
  // mood
  return `Recent check-ins suggest ${mood} overall with ${energy} social energy. Try a brief reset ritual—breath, water, or a short walk—and choose one priority to carry gently forward.`;
}
