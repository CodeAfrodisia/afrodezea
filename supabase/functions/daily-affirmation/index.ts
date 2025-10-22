// supabase/functions/daily-affirmation/index.ts

// deno-lint-ignore-file no-explicit-any
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

function corsHeaders(origin?: string) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin") ?? "*";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    const { archetype = "", name = "" } = await req.json().catch(() => ({}));

    // 🔑 DEBUG: log first 6 chars of key (safe)
    console.log("🔑 OPENAI_API_KEY prefix:", OPENAI_API_KEY?.slice(0, 6));

    if (!OPENAI_API_KEY) {
      const line =
        "Breathe. You’re allowed to be both a work in progress and a masterpiece.";
      return new Response(
        JSON.stringify({ line, source: "fallback-no-key" }),
        {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(origin),
          },
        },
      );
    }

    const sys =
      "You write one short, elegant daily affirmation (1 sentence) tailored to the user's archetype and optional name. Warm, grounded, luxurious tone. No emojis, no quotes.";
    const usr =
      `Archetype: ${archetype || "unknown"}; Name: ${name || "love"}.
Return only the affirmation text.`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
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

    if (!r.ok) {
      const line =
        "Your presence is enough; move with quiet certainty today.";
      return new Response(
        JSON.stringify({ line, source: "fallback-openai" }),
        {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(origin),
          },
        },
      );
    }

    const data = await r.json();
    const line =
      data?.choices?.[0]?.message?.content?.trim() ||
      "Your presence is enough; move with quiet certainty today.";

    return new Response(JSON.stringify({ line, source: "ai" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  } catch (e) {
    console.error("daily-affirmation error:", e);
    const line = "Return to your center; everything you need is within reach.";
    return new Response(JSON.stringify({ line, source: "fallback" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  }
});
