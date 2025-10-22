// supabase/functions/quiz-insights/index.ts
// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ────────────────────────── CORS ────────────────────────── */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function env(n: string) {
  const v = Deno.env.get(n);
  if (!v) throw new Error(`Missing env ${n}`);
  return v;
}

async function readUserId(req: Request) {
  const url = new URL(req.url);
  const qUser = url.searchParams.get("userId");
  if (qUser) return qUser;
  try {
    if (req.headers.get("content-type")?.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      if (body?.userId) return String(body.userId);
    }
  } catch {}
  return null;
}

/* ────────────────────────── Serve ────────────────────────── */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  try {
    const userId = await readUserId(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

    // Read the canonical cache row
    const { data, error } = await supabase
      .from("user_insights_latest")
      .select("payload")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Expected shape: payload.generate_insights = { signature, data, updated_at }
    const gi =
      data?.payload?.generate_insights?.data ??
      // tolerate older shapes just in case
      (data?.payload && typeof data.payload === "object" ? data.payload : null);

    if (!gi) {
      return new Response(JSON.stringify({ insights: null, cached: true, note: "No cached insights yet." }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Return JSON; your FE renders with insightsToHtml()
    return new Response(JSON.stringify({ insights: gi, cached: true }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
