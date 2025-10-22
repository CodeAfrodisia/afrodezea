// deno-lint-ignore-file no-explicit-any
/**
 * generate-insights Edge Function
 *
 * - Collapses quiz slug aliases to canonical domains (giving/receiving/apology/forgiveness/attachment).
 * - Uses strict JSON schema + repair pass to encourage full insights.
 * - Caches by stable signature (includes SCHEMA_VERSION + signals).
 * - Returns cached subset when inputs unchanged; regenerates on new signals.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import OpenAI from "https://esm.sh/openai@4.56.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SYSTEM_PROMPT, USER_PROMPT } from "./lib/generateInsights.ts";

/* ────────────────────────── config & constants ────────────────────────── */

function env(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Strict schema guard (allows optional personalized_notes) */
const STRICT_SCHEMA_TEXT = `
You must return a single JSON object with the following shape (no prose outside JSON):

{
  "archetype": {
    "title": string,
    "ribbon": string,
    "source": string
  },
  "domains": {
    "giving": {
      "strength": string,
      "shadow": string,
      "stress": string,                    // no markdown except **label** and *italics* if present
      "micro_practice": { "minutes": number, "text": string },
      "partner_script": string,
      "source": string
    },
    "receiving": { /* same fields as giving */ },
    "apology":   { /* same fields as giving */ },
    "forgiveness":{ /* same fields as giving */ },
    "attachment":{ /* same fields as giving */ }
  },
  "weaving": {
    "principles": string[],
    "experiment_7day": string[],
    "notes": string[],
    "source": string
  },
  "inserts": [ { "domain": "giving|receiving|apology|forgiveness|attachment", "text": string } ],
  "personalized_notes": string[]          // optional convenience list (0–3)
}

Rules:
- Be specific and anchored to the user's archetype and quiz signals; degrade gracefully if a signal is missing.
- No text outside the JSON object. Keep strings concise and concrete.
`;

const SCHEMA_VERSION = 2; // bump to invalidate stale/skinny caches

const ALL_DOMAINS = ["giving","receiving","apology","forgiveness","attachment","weaving"] as const;

/* ────────────────────────── request types ────────────────────────── */

type InsightsRequest = {
  user_id: string;
  domains?: string[];   // client may ask subset; we still generate all, subset on return
  dry_run?: boolean;    // debug path: upsert a tiny valid payload without calling OpenAI
};

/* ────────────────────────── slug aliases → canonical domain ──────────────────────────
   Update these arrays when you add/rename quizzes. We’ll query all aliases and then
   collapse rows into one “latest by canonical domain”.
*/
const SLUGS = {
  archetype: ["archetype-dual","archetype_dual"],

  receiving: ["love-language-receiving", "love_language_receiving", "love-language"],
  giving:    ["love-language-giving",    "love_language_giving"],

  // ⬇️ Added robust apology aliases to fix "undefined" in insights
  apology:   ["apology-style","apology_language","apology-language","apology","repair-style","repair_apology"],

  forgiveness: ["forgiveness-language","forgiveness_language","forgiveness","repair-forgiver","repair_forgiver"],
  attachment:  ["attachment-style","attachment_style","attachment"],
} as const;

const ALL_SIGNAL_SLUGS: string[] = Array.from(
  new Set([
    ...SLUGS.receiving,
    ...SLUGS.giving,
    ...SLUGS.apology,
    ...SLUGS.forgiveness,
    ...SLUGS.attachment,
  ])
);

/* ────────────────────────── helpers: labels, sources, subset ────────────────────────── */

function titleCaseLoveKey(k: string | null | undefined) {
  if (!k) return null;
  const map: Record<string, string> = {
    words_of_affirmation: "Words of Affirmation",
    acts_of_service: "Acts of Service",
    receiving_gifts: "Receiving Gifts",
    quality_time: "Quality Time",
    physical_touch: "Physical Touch",
  };
  return map[k] || k.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

async function getLatestInsightsRow(
  supabase: ReturnType<typeof createClient>,
  userId: string
) {
  const { data, error, status } = await supabase
    .from("user_insights_latest")
    .select("user_id,payload,updated_at,signature")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error && status !== 406) throw error;
  return Array.isArray(data) ? (data[0] ?? null) : (data as any ?? null);
}

function subsetDomains(full: any, requested?: string[]) {
  if (!requested || requested.length === 0) return full;
  const want = new Set(requested);
  const copy = structuredClone(full);
  if (copy?.domains && typeof copy.domains === "object") {
    for (const k of Object.keys(copy.domains)) {
      if (!want.has(k)) delete copy.domains[k];
    }
  }
  return copy;
}

function ensureSources(json: any, archTitle: string | null, labels: { giver: string|null; receiver: string|null }) {
  json.archetype ||= {};
  json.archetype.source ||= `Source: Archetype-Dual${archTitle ? ` (${archTitle})` : ""}`;

  json.domains ||= {};
  for (const [k, v] of Object.entries(json.domains)) {
    if (v && typeof v === "object" && !(v as any).source) {
      const extra =
        k === "giving"    && labels.giver    ? ` (${labels.giver})` :
        k === "receiving" && labels.receiver ? ` (${labels.receiver})` : "";
      (v as any).source = `Source: ${k[0].toUpperCase()}${k.slice(1)}${extra}${archTitle ? ` + Archetype (${archTitle})` : ""}`;
    }
  }
  json.weaving ||= {};
  json.weaving.source ||= "Source: cross-domain synthesis + Archetype resonance";
}

/* ────────────────────────── helpers: signature & upsert ────────────────────────── */

function isPlainObject(v: any) { return v && typeof v === "object" && !Array.isArray(v); }
function normalize(value: any): any {
  if (Array.isArray(value)) {
    const arr = value.map(normalize);
    return arr.sort((a, b) => {
      const sa = JSON.stringify(a); const sb = JSON.stringify(b);
      return sa < sb ? -1 : sa > sb ? 1 : 0;
    });
  }
  if (isPlainObject(value)) {
    const out: Record<string, any> = {};
    for (const k of Object.keys(value).sort()) out[k] = normalize(value[k]);
    return out;
  }
  return value;
}
async function sha256Str(s: string) {
  const buf = new TextEncoder().encode(s);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,"0")).join("");
}
async function hashStable(obj: any) { return sha256Str(JSON.stringify(normalize(obj))); }

async function upsertInsightsRow(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  merged: any,
  signature: string
) {
  const base = { user_id: userId, payload: merged, updated_at: new Date().toISOString() };
  let { error } = await supabase
    .from("user_insights_latest")
    .upsert({ ...base, signature }, { onConflict: "user_id" });

  if (error && (error as any).code === "42703") {
    const { error: e2 } = await supabase
      .from("user_insights_latest")
      .upsert(base, { onConflict: "user_id" });
    return { error: e2, usedSignatureColumn: false };
  }
  return { error, usedSignatureColumn: !error || (error as any).code !== "42703" };
}

/* ────────────────────────── helpers: validation & repair ────────────────────────── */

function isCompleteInsights(json: any) {
  try {
    const D = json?.domains || {};
    const required = ["giving","receiving","apology","forgiveness","attachment"];
    for (const k of required) {
      const d = D[k];
      if (!d || typeof d !== "object") return false;
      if (!d.strength || !d.micro_practice?.text || !d.partner_script) return false;
    }
    const W = json?.weaving;
    if (!W || !Array.isArray(W.principles) || W.principles.length === 0) return false;
    if (!Array.isArray(W.experiment_7day) || W.experiment_7day.length === 0) return false;
    return true;
  } catch {
    return false;
  }
}

function repairPrompt(partialJson: any, context: { userId: string; archetype?: any; signals?: any }) {
  return `
You responded with partial JSON. COMPLETE it to the required schema.
- Keep present text; fill missing fields (2–4 concise sentences each).
- Anchor to signals; if missing, use archetype only (neutral, non-invented).
- Return ONLY JSON; no markdown.

Context:
${JSON.stringify(context)}

Your previous JSON to repair:
${JSON.stringify(partialJson)}
`;
}

/* ────────────────────────── main handler ────────────────────────── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  let stage = "init";
  const hdrs = () => ({ ...CORS, "Content-Type": "application/json", "X-Insights-Stage": stage });

  try {
    /* 0) Parse input */
    stage = "parse_body";
    const body = (await req.json().catch(() => ({}))) as InsightsRequest;
    const userId = body.user_id;
    const dryRun = !!body.dry_run;
    const domainsRequested = body.domains?.length ? body.domains : [...ALL_DOMAINS];
    if (!userId) {
      return new Response(JSON.stringify({ error: "user_id required", stage }), { status: 400, headers: hdrs() });
    }

    /* 1) Supabase client */
    stage = "create_supabase";
    const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

    /* 2) Archetype (latest) */
    stage = "load_archetype";
    const { data: archRows, error: archErr } = await supabase
      .from("quiz_attempts")
      .select("quiz_slug,result_title,result_totals,completed_at")
      .eq("user_id", userId)
      .in("quiz_slug", SLUGS.archetype)
      .order("completed_at", { ascending: false })
      .limit(1);
    if (archErr) throw archErr;

    const archTitle = archRows?.[0]?.result_title || null;
    const [role, energy] = (archTitle || "").split("×").map((s) => (s?.trim() || null));

    /* 3) Signals: collapse alias slugs → canonical domains (latest each) */
    stage = "load_signals";
    const { data: sigRows, error: sigErr } = await supabase
      .from("quiz_attempts")
      .select("quiz_slug,result_key,result_title,result_totals,completed_at")
      .eq("user_id", userId)
      .in("quiz_slug", ALL_SIGNAL_SLUGS)
      .order("completed_at", { ascending: false });
    if (sigErr) throw sigErr;

    type DomainKey = "receiving" | "giving" | "apology" | "forgiveness" | "attachment";
    const canonicalLatest: Partial<Record<DomainKey, any>> = {};

    function domainForSlug(slug: string): DomainKey | null {
      if (SLUGS.receiving.includes(slug))   return "receiving";
      if (SLUGS.giving.includes(slug))      return "giving";
      if (SLUGS.apology.includes(slug))     return "apology";
      if (SLUGS.forgiveness.includes(slug)) return "forgiveness";
      if (SLUGS.attachment.includes(slug))  return "attachment";
      return null;
      }

    for (const r of sigRows || []) {
      const dom = domainForSlug(r.quiz_slug);
      if (!dom) continue;
      if (!canonicalLatest[dom]) canonicalLatest[dom] = r; // rows sorted DESC; first we see is newest
    }

    const signals = {
      giver_language:     canonicalLatest.giving?.result_key || null,
      receiver_language:  canonicalLatest.receiving?.result_key || null,
      apology_style:      canonicalLatest.apology?.result_key || null,
      forgiveness_style:  canonicalLatest.forgiveness?.result_key || null,
      attachment_style:   canonicalLatest.attachment?.result_key || null,
      result_keys: {
        giving:      canonicalLatest.giving?.result_key      ?? null,
        receiving:   canonicalLatest.receiving?.result_key   ?? null,
        apology:     canonicalLatest.apology?.result_key     ?? null,
        forgiveness: canonicalLatest.forgiveness?.result_key ?? null,
        attachment:  canonicalLatest.attachment?.result_key  ?? null,
      },
    };
    const labels = {
      giver: titleCaseLoveKey(signals.giver_language),
      receiver: titleCaseLoveKey(signals.receiver_language),
    };

    /* 4) Signature (includes SCHEMA_VERSION) */
    stage = "build_signature";
    const sigInput = {
      schema_version: SCHEMA_VERSION,
      archetype: archTitle || null,
      role, energy,
      result_keys: signals.result_keys,
      love_giver: signals.giver_language || null,
      love_receiver: signals.receiver_language || null,
      apology: signals.apology_style || null,
      forgiveness: signals.forgiveness_style || null,
      attachment: signals.attachment_style || null,
    };
    const signature = await hashStable(sigInput);

    /* 5) Cache check */
    stage = "cache_check";
    const row = await getLatestInsightsRow(supabase, userId);
    const cachedGI = row?.payload?.generate_insights as { signature?: string; data?: any } | undefined;

    if (cachedGI?.signature === signature && cachedGI?.data && isCompleteInsights(cachedGI.data)) {
      const cachedCopy = structuredClone(cachedGI.data);
      ensureSources(cachedCopy, archTitle, labels);
      const subset = subsetDomains(cachedCopy, domainsRequested);
      return new Response(JSON.stringify({ insights: subset, cached: true, signature }), {
        headers: { ...hdrs(), "X-Insights-Cache": "hit" },
      });
    }

    /* 6) DRY RUN (optional) */
    if (dryRun) {
      stage = "dry_run";
      const stub: any = {
        archetype: { title: archTitle, ribbon: archTitle || "", source: `Source: Archetype-Dual${archTitle ? ` (${archTitle})` : ""}` },
        domains: {},
        weaving: { principles: [], experiment_7day: [], notes: [], source: "Source: cross-domain synthesis + Archetype resonance" },
        inserts: [],
      };
      ensureSources(stub, archTitle, labels);
      const merged = row?.payload ? structuredClone(row.payload) : {};
      merged.generate_insights = { signature, data: stub, at: new Date().toISOString() };

      const { error: upErr } = await upsertInsightsRow(supabase, userId, merged, signature);
      if (upErr) {
        return new Response(JSON.stringify({
          error: "cache_upsert_failed",
          stage: "dry_run_upsert_error",
          code: (upErr as any).code, message: (upErr as any).message, details: (upErr as any).details, hint: (upErr as any).hint,
        }), { status: 500, headers: hdrs() });
      }

      const subset = subsetDomains(stub, domainsRequested);
      return new Response(JSON.stringify({ insights: subset, dry_run: true, signature }), {
        headers: { ...hdrs(), "X-Insights-Stage": "dry_run" },
      });
    }

    /* 7) OpenAI primary call (always ask for ALL domains) */
    stage = "openai_call_primary";
    const openai = new OpenAI({ apiKey: env("OPENAI_API_KEY") });
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: STRICT_SCHEMA_TEXT },
      {
        role: "user",
        content: USER_PROMPT({
          user: { id: userId },
          archetype: { title: archTitle, role, energy },
          signals,
          domainsRequested: ["giving","receiving","apology","forgiveness","attachment","weaving"],
        }),
      },
    ];

    const chat1 = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.55,
      response_format: { type: "json_object" },
      max_tokens: 1600,
    });

    /* 8) Parse JSON (pass 1) */
    stage = "parse_json_primary";
    const raw1 = chat1.choices?.[0]?.message?.content?.trim() || "{}";
    let json: any = {};
    try {
      json = JSON.parse(raw1);
    } catch {
      return new Response(JSON.stringify({
        error: "invalid_model_json_primary",
        stage, model_text: raw1.slice(0, 600), finish_reason: chat1.choices?.[0]?.finish_reason
      }), { status: 502, headers: hdrs() });
    }

    /* 9) Repair pass if incomplete */
    if (!isCompleteInsights(json)) {
      stage = "openai_call_repair";
      const repairMessages = [
        { role: "system", content: STRICT_SCHEMA_TEXT },
        { role: "user", content: repairPrompt(json, { userId, archetype: { title: archTitle, role, energy }, signals }) },
      ];
      const chat2 = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: repairMessages,
        temperature: 0.45,
        response_format: { type: "json_object" },
        max_tokens: 1600,
      });

      stage = "parse_json_repair";
      const raw2 = chat2.choices?.[0]?.message?.content?.trim() || "{}";
      try {
        const repaired = JSON.parse(raw2);
        if (isCompleteInsights(repaired)) json = repaired;
      } catch { /* keep json from pass 1 */ }
    }

    /* 10) Normalize + annotate */
    stage = "normalize_annotate";
    json.domains ||= {};
    json.weaving ||= { principles: [], experiment_7day: [] };
    ensureSources(json, archTitle, labels);

    /* 11) Upsert cache */
    stage = "cache_upsert";
    const merged = row?.payload ? structuredClone(row.payload) : {};
    merged.generate_insights = { signature, data: json, at: new Date().toISOString() };

    const { error: upsertErr } = await upsertInsightsRow(supabase, userId, merged, signature);
    if (upsertErr) {
      return new Response(JSON.stringify({
        error: "cache_upsert_failed",
        stage: "cache_upsert_error",
        code: (upsertErr as any).code, message: (upsertErr as any).message, details: (upsertErr as any).details, hint: (upsertErr as any).hint,
      }), { status: 500, headers: hdrs() });
    }

    /* 12) Success */
    stage = "success";
    const subset = subsetDomains(json, domainsRequested);
    return new Response(JSON.stringify({ insights: subset, cached: false, signature }), {
      headers: { ...hdrs(), "X-Insights-Cache": "miss" },
    });

  } catch (e: any) {
    console.error("generate-insights error @", new Date().toISOString(), "stage:", stage, e);
    return new Response(JSON.stringify({ error: String(e?.message || e), stage }), {
      status: 500, headers: hdrs(),
    });
  }
});
