// /supabase/functions/love-profile/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import * as Sentry from "https://deno.land/x/sentry@7.119.0/index.mjs";

Sentry.init({ dsn: Deno.env.get("SENTRY_DSN") || "" });

type Body = { user_id?: string };

const cors = {
  "Access-Control-Allow-Origin": "*", // set to your origin in prod
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

const restBase = `${SUPABASE_URL}/rest/v1`;
const sHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

// Canonical + legacy slugs
const SLUGS = {
  receiving: ["love-language-receiving", "love_language_receiving", "love-language"],
  giving: ["love-language-giving", "love_language_giving"],
  apology: ["apology-style", "apology_language", "apology-language", "apology", "repair-style", "repair_apology"],
  forgiveness: ["forgiveness-language", "forgiveness_language", "forgiveness", "repair-forgiver", "repair_forgiver"],
  attachment: ["attachment-style", "attachment_style", "attachment"],
  archetype: ["archetype-dual", "archetype_dual"],
  selflove: ["self-love", "self_love", "self_compassion"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { user_id }: Body = await req.json().catch(() => ({}));
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: cors });
    }
    if (!SUPABASE_URL || !SERVICE_KEY) {
      const msg = "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY";
      Sentry.captureMessage(msg);
      return new Response(JSON.stringify({ error: msg }), { status: 500, headers: cors });
    }

    // ---------- Pull quizzes (latest per slug family) ----------
    const allSlugs = [
      ...SLUGS.receiving, ...SLUGS.giving, ...SLUGS.apology, ...SLUGS.forgiveness,
      ...SLUGS.attachment, ...SLUGS.archetype, ...SLUGS.selflove,
    ];

    const qres = await fetch(
      `${restBase}/quiz_attempts_latest?user_id=eq.${user_id}` +
        `&select=quiz_slug,result_key,result_title,result_summary,result_totals,completed_at` +
        `&in=quiz_slug.${encodeURIComponent(`(${allSlugs.map(s => `"${s}"`).join(",")})`)}`,
      { headers: sHeaders }
    );
    const quizRows = qres.ok ? (await qres.json().catch(() => [])) as any[] : [];

    const pick = (families: string[]) => families.map(s => quizRows.find(r => r.quiz_slug === s)).find(Boolean) || null;
    const recv = pick(SLUGS.receiving);
    const give = pick(SLUGS.giving);
    const apol = pick(SLUGS.apology);
    const forg = pick(SLUGS.forgiveness);
    const atta = pick(SLUGS.attachment);
    const self = pick(SLUGS.selflove);
    const arch = pick(SLUGS.archetype);

    // Archetype title (prefer result_title, else derive from totals)
    let archetypeTitle = arch?.result_title || null;
    if (!archetypeTitle && arch?.result_totals) {
      const t = arch.result_totals;
      const role = topKey(t?.role || {});
      const energy = topKey(t?.energy || {});
      if (role && energy) archetypeTitle = `${role} × ${energy}`;
    }

    // ---------- Most needed love language (check-ins, last 60 days) ----------
    const since = new Date(); since.setDate(since.getDate() - 60);
    const mRes = await fetch(
      `${restBase}/moods?user_id=eq.${user_id}` +
        `&select=created_at,love_language` +
        `&created_at=gte.${since.toISOString()}` +
        `&order=created_at.desc&limit=400`,
      { headers: sHeaders }
    );
    const moods = mRes.ok ? (await mRes.json().catch(() => [])) as any[] : [];
    const neededMost = modeOf(moods.map(r => r.love_language).filter(Boolean)) || null;

    // ---------- Fingerprint for caching ----------
    const fpSource = {
      receiving: recv?.result_key || recv?.result_title || null,
      giving: give?.result_key || give?.result_title || null,
      apology: apol?.result_key || apol?.result_title || null,
      forgiveness: forg?.result_key || forg?.result_title || null,
      attachment: atta?.result_key || atta?.result_title || null,
      selflove: self?.result_key || self?.result_title || null,
      archetype: archetypeTitle || null,
      neededMost,
      // changed-at timestamps to ensure regen on new attempts
      ts: [
        recv?.completed_at, give?.completed_at, apol?.completed_at, forg?.completed_at,
        atta?.completed_at, self?.completed_at, arch?.completed_at,
      ].filter(Boolean),
    };
    const fingerprint = await sha256(JSON.stringify(fpSource));

    // ---------- Cache lookup ----------
    const cacheGet = await fetch(
      `${restBase}/insights_cache?user_id=eq.${user_id}&kind=eq.love_profile&select=fingerprint,payload&limit=1`,
      { headers: sHeaders }
    );
    if (cacheGet.ok) {
      const hit = (await cacheGet.json().catch(() => [])) as any[];
      const cached = hit?.[0];
      if (cached && cached.fingerprint === fingerprint) {
        return new Response(JSON.stringify(cached.payload), { headers: cors });
      }
    }

    // ---------- Build model input ----------
    const signals = {
      archetype: archetypeTitle,
      quizzes: {
        receiving: summarizeRow(recv),
        giving: summarizeRow(give),
        attachment: summarizeRow(atta),
        apology: summarizeRow(apol),
        forgiveness: summarizeRow(forg),
        self_love: summarizeRow(self),
      },
      checkins: { most_needed_love_language: neededMost },
    };

    // ---------- Call model (STRICT JSON) ----------
    const prompt = buildLovePrompt(signals);
    const json = OPENAI_API_KEY ? await callOpenAIJSON(prompt) : fallbackLoveJSON(signals);

    // ---------- Upsert cache ----------
    const upsert = await fetch(`${restBase}/insights_cache`, {
      method: "POST",
      headers: sHeaders,
      body: JSON.stringify([{ user_id, kind: "love_profile", fingerprint, payload: json }]),
    });
    if (!upsert.ok) {
      Sentry.captureMessage(`love cache upsert failed: ${upsert.status} ${upsert.statusText}`);
    }

    return new Response(JSON.stringify(json), { headers: cors });
  } catch (e) {
    Sentry.captureException(e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), { status: 500, headers: cors });
  }
});

// ---------- helpers ----------
function summarizeRow(r: any) {
  if (!r) return null;
  return {
    slug: r.quiz_slug,
    key: r.result_key || null,
    title: r.result_title || null,
    summary: r.result_summary || null,
  };
}
function modeOf(arr: string[]): string | null {
  if (!arr?.length) return null;
  const c: Record<string, number> = {};
  for (const k of arr) c[k] = (c[k] || 0) + 1;
  return Object.entries(c).sort((a,b) => b[1]-a[1])[0]?.[0] || null;
}
function topKey(obj: Record<string, number>) {
  let best = "", v = -Infinity;
  for (const [k, n] of Object.entries(obj || {})) if ((n ?? 0) > v) { v = n; best = k; }
  return best || null;
}
async function sha256(s: string) {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function buildLovePrompt(signals: unknown) {
  // Strict JSON schema baked into the prompt
  const schema = {
    summary: {
      ribbon: "string",
      sources: ["archetype","giving","receiving","attachment","apology","forgiveness","self_love","checkins"]
    },
    pillars: [
      { label: "Receiving",   value: "string", source: "string" },
      { label: "Giving",      value: "string", source: "string" },
      { label: "Attachment",  value: "string", source: "string" },
      { label: "Apology",     value: "string", source: "string" },
      { label: "Forgiveness", value: "string", source: "string" },
      { label: "Self-Love",   value: "string", source: "string" },
      { label: "Most Needed (check-ins)", value: "string", source: "checkins" }
    ],
    sections: {
      how_you_love: {
        strength: "string",
        watchout: "string",
        archetype_line: "string",
        source: "composite"
      },
      repair_and_trust: {
        strength: "string",
        watchout: "string",
        micro_practice: { minutes: 6, text: "string" },
        partner_script: "string",
        source: "apology + forgiveness + attachment + archetype"
      },
      receiving_care: {
        tip: "string",
        micro_practice: { minutes: 7, text: "string" },
        partner_script: "string",
        source: "receiving + checkins + archetype"
      },
      giving_care: {
        tip: "string",
        micro_practice: { minutes: 7, text: "string" },
        partner_script: "string",
        source: "giving + archetype"
      }
    },
    weaving: {
      principles: ["string","string","string"],
      experiment_7day: ["string","string","string"],
      notes: ["string"],
      source: "cross-synthesis"
    }
  };

  return [
    "You are a relationship insights writer.",
    "Return STRICT JSON only. No markdown. Match the schema exactly.",
    "Every section must explicitly reference Archetype (name it) and blend quiz signals with it.",
    "Micro-practices: 6–10 minutes, concrete; Partner scripts: 1–2 sentences, literal.",
    "If a quiz is missing, set its pillar value to '—' and offer a safe, short suggestion where relevant.",
    "Signals (JSON):",
    JSON.stringify(signals, null, 2),
    "JSON SCHEMA (shape to follow):",
    JSON.stringify(schema, null, 2),
  ].join("\n");
}

async function callOpenAIJSON(prompt: string) {
  try {
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!aiRes.ok) throw new Error(`${aiRes.status} ${aiRes.statusText}`);
    const json = await aiRes.json().catch(() => ({}));
    const content = json?.choices?.[0]?.message?.content || "{}";
    return JSON.parse(content);
  } catch (e) {
    Sentry.captureException(e);
    return { error: "model_failure" };
  }
}

function fallbackLoveJSON(signals: any) {
  const arche = signals?.archetype || "—";
  const recv = signals?.quizzes?.receiving?.title || signals?.quizzes?.receiving?.key || "—";
  const give = signals?.quizzes?.giving?.title || signals?.quizzes?.giving?.key || "—";
  const atta = signals?.quizzes?.attachment?.title || signals?.quizzes?.attachment?.key || "—";
  const apol = signals?.quizzes?.apology?.title || signals?.quizzes?.apology?.key || "—";
  const forg = signals?.quizzes?.forgiveness?.title || signals?.quizzes?.forgiveness?.key || "—";
  const self = signals?.quizzes?.self_love?.title || signals?.quizzes?.self_love?.key || "—";
  const need = signals?.checkins?.most_needed_love_language || "—";

  return {
    summary: {
      ribbon: `Your love signature blends ${arche} with clear preferences in giving and receiving.`,
      sources: ["archetype","giving","receiving","attachment","apology","forgiveness","self_love","checkins"]
    },
    pillars: [
      { label: "Receiving", value: recv, source: signals?.quizzes?.receiving?.slug || "love-language-receiving" },
      { label: "Giving", value: give, source: signals?.quizzes?.giving?.slug || "love-language-giving" },
      { label: "Attachment", value: atta, source: signals?.quizzes?.attachment?.slug || "attachment-style" },
      { label: "Apology", value: apol, source: signals?.quizzes?.apology?.slug || "apology-style" },
      { label: "Forgiveness", value: forg, source: signals?.quizzes?.forgiveness?.slug || "forgiveness-language" },
      { label: "Self-Love", value: self, source: signals?.quizzes?.self_love?.slug || "self-love" },
      { label: "Most Needed (check-ins)", value: need, source: "checkins" }
    ],
    sections: {
      how_you_love: {
        strength: "You lead with steadiness and care.",
        watchout: "Under pressure you might over-structure love.",
        archetype_line: `As ${arche}, you design how love moves and how it’s felt.`,
        source: "composite",
      },
      repair_and_trust: {
        strength: "You prefer repair that is named and enacted.",
        watchout: "You may rush the fix before naming feelings.",
        micro_practice: { minutes: 7, text: "Ask for one apology line and one concrete promise this week." },
        partner_script: "A clear apology plus one practical step would help me feel fully repaired.",
        source: "apology + forgiveness + attachment + archetype",
      },
      receiving_care: {
        tip: "Name one receiving cue that truly settles you and request it upfront.",
        micro_practice: { minutes: 7, text: "Identify one cue that matches your most-needed love language and schedule it today." },
        partner_script: "One small thing that would really land for me today is…",
        source: "receiving + checkins + archetype",
      },
      giving_care: {
        tip: "Deliver one act that is small, specific, and timely.",
        micro_practice: { minutes: 7, text: "Choose one support action you can complete today from start to finish." },
        partner_script: "I want to support you in a way that lands. What one action would help most today?",
        source: "giving + archetype",
      }
    },
    weaving: {
      principles: ["Ask before you fix", "Promise less, prove more", "Let emotion set the pace"],
      experiment_7day: ["One tiny receiving ritual daily", "Midweek repair check-in", "Weekend shared micro-goal"],
      notes: ["Some domains are placeholders until quizzes are completed."],
      source: "cross-synthesis",
    }
  };
}

