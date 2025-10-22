// /supabase/functions/journal-prompt/index.ts
// deno-lint-ignore-file no-explicit-any
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// ⬇️ Sentry (Edge)
import * as Sentry from "https://deno.land/x/sentry@7.119.0/index.mjs";
Sentry.init({ dsn: Deno.env.get("SENTRY_DSN") || "" });

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// ⬇️ CORS helpers
const ALLOW_ORIGIN = "*"; // TIP: set to "https://afrodezea.com" in prod
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function fallbackPrompt(
  mood: string,
  battery: string,
  love: string,
  archetype?: string | null
) {
  const base = `What's on your mind today?`;
  const parts: string[] = [];
  if (archetype) parts.push(`As a ${archetype},`);
  if (mood) parts.push(`feeling ${mood}`);
  if (battery) parts.push(`with ${battery} social energy`);
  if (love) parts.push(`needing ${love.toLowerCase()}`);
  const ctx = parts.length ? parts.join(", ") : null;

  return ctx
    ? `${base} Consider this: How does ${ctx} shape your choices right now?`
    : base;
}

serve(async (req) => {
  // Handle the CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      mood = "",
      social_battery = "",
      love_language = "",
      archetype = "",
      usedPrompts = [],
      forceNew = false,
    } = body || {};

    // If no key, always fallback (still 200) — include CORS headers
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          prompt: fallbackPrompt(mood, social_battery, love_language, archetype),
          source: "fallback-no-key",
        }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const sys =
      `You generate one insightful, compassionate journaling prompt tailored to a person's quick daily check-in.
Keep it short (1–2 sentences), warm, and specific to their current state.
Do not include quotes, emojis or prefacing text. Return only the prompt text.`;

    const usr = `Context:
- Mood: ${mood || "unknown"}
- Social Energy: ${social_battery || "unknown"}
- Love Language most needed: ${love_language || "unknown"}
- Archetype: ${archetype || "unknown"}
- Previously used prompts (avoid repeating anything similar): ${usedPrompts.join(" | ")}

Task: Write one journaling prompt tailored to this person.`;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: usr },
        ],
      }),
    });

    if (!resp.ok) {
      // Capture upstream error for observability
      Sentry.captureMessage(`OpenAI chat/completions failed: ${resp.status} ${resp.statusText}`);
      const fb = fallbackPrompt(mood, social_battery, love_language, archetype);
      return new Response(
        JSON.stringify({ prompt: fb, source: "fallback-openai" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const data = await resp.json();
    const text =
      data?.choices?.[0]?.message?.content?.trim() ||
      fallbackPrompt(mood, social_battery, love_language, archetype);

    return new Response(JSON.stringify({ prompt: text, source: "ai" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    Sentry.captureException(e);
    const fb = fallbackPrompt("", "", "", "");
    return new Response(JSON.stringify({ prompt: fb, source: "fallback" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
