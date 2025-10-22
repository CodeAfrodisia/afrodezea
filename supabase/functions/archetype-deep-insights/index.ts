// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ────────────────────────────── Config & CORS ──────────────────────────────
   Simple helpers to read env and allow browser calls with preflight.
-----------------------------------------------------------------------------*/
function env(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

/* ──────────────────────────────── Small utils ──────────────────────────────
   Stable hashing for signatures; light normalizers for safe JSON handling.
-----------------------------------------------------------------------------*/
async function sha256(strOrObj: unknown) {
  const raw = typeof strOrObj === "string" ? strOrObj : JSON.stringify(strOrObj);
  const buf = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
const isPlainObject = (v: any) =>
  v && typeof v === "object" && !Array.isArray(v);

function normalize(v: any): any {
  if (Array.isArray(v))
    return v
      .map(normalize)
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (isPlainObject(v)) {
    const o: any = {};
    for (const k of Object.keys(v).sort()) o[k] = normalize(v[k]);
    return o;
  }
  return v;
}
async function hashStable(o: any) {
  return sha256(JSON.stringify(normalize(o)));
}

// Pretty label for Love-Language keys; fall back to title-casing anything else
function titleCaseLL(key?: string | null) {
  if (!key) return null;
  const map: Record<string, string> = {
    words_of_affirmation: "Words of Affirmation",
    acts_of_service: "Acts of Service",
    receiving_gifts: "Receiving Gifts",
    quality_time: "Quality Time",
    physical_touch: "Physical Touch",
  };
  return (
    map[key] ||
    key
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase())
  );
}

/* ───────────────────────────── Prompt contract ─────────────────────────────
   IMPORTANT: We explicitly shape what we want, so UI can render safely.
   We also add a "weave" section (long-form), and "bullets" (left rail).
-----------------------------------------------------------------------------*/
const SYSTEM = `
You are a relationship analyst and coach. Write a *single, cohesive* Archetype Profile in second-person voice that feels like a warm conversation, not a textbook.

PRINCIPLES
- Always write through the user's Archetype lens (Role × Energy).
- Weave signals (quizzes + answers + check-ins) into one narrative; don't silo by quiz.
- Use concrete examples and short, speakable scripts.
- Be specific; avoid vague platitudes.
- Keep paragraphs tight. Use bullets sparingly when it helps clarity.

SECTIONS (JSON ONLY)
{
  "ribbon": "1–2 sentences in their voice",
  "portrait": ["3–6 short paragraphs, cohesive narrative that references patterns from answers & check-ins"],

  "weave": {
    "narrative": ["extra paragraphs that stitch signals together"],
    "cross_language": ["interplay of giving/receiving/apology/forgiveness, concrete"],
    "tensions": ["light & shadow notes to watch for, kind but honest"],
    "highlights": ["key strengths you noticed across signals"],
    "watchouts": ["gentle cautions where tendencies can create friction"],
    "integrations": ["practical integrations / how to work with it"]
  },

  "compatibility": {
    "natural_fits": [{ "pair": "Role × Energy", "why": "1–2 sentences with concrete interplay" }],
    "likely_friction": [{ "pair": "Role × Energy", "why": "1–2 sentences with concrete interplay" }]
  },

  "conflict": {
    "apology_vs_forgiveness": "how their apology style pairs with others' forgiveness; include 1 speakable script",
    "scripts": ["1–2 short scripts tailored to their styles"]
  },

  "self_care": {
    "love_self": "how they tend themselves given mood & social battery patterns",
    "micro_practices": ["6–10 min actions, 2–4 items"]
  },

  "patterns": ["answer-level motifs you noticed; short bullet one-liners"],

  "bullets": {
    "highlights": ["left panel bullets: strengths / bright spots"],
    "watchouts": ["left panel bullets: gentle cautions"],
    "compatibility_fits": ["left panel bullets: best matches"],
    "compatibility_friction": ["left panel bullets: likely friction"],
    "conflict_scripts": ["left panel bullets: short scripts"],
    "micro_practices": ["left panel bullets: micro care actions"]
  },

  "sources": {
    "archetype": "string",
    "signals": ["slugs used"],
    "checkins": "window summary",
    "journals": "included|excluded|enabled-but-empty"
  }
}
Return STRICT JSON only.
`;


// Make the contract explicit + anchor role×energy first
function USER_PAYLOAD(input: any) {
  return `
DISPLAY_CONTRACT
Your JSON is rendered directly. Use exactly the keys defined in SYSTEM. Omitted keys won't show. Prefer 2–5 concrete items per list. Anchor the opening to Role × Energy (e.g., "Architect × Warrior") and only use preference as color.

USER
${JSON.stringify(input.user, null, 2)}

ARCHETYPE
${JSON.stringify(input.archetype, null, 2)}

SIGNALS
${JSON.stringify(input.signals, null, 2)}

CHECK_INS_AGGREGATES
${JSON.stringify(input.checkins, null, 2)}

ANSWER_MOTIFS
${JSON.stringify(input.answerMotifs, null, 2)}

JOURNAL_SUMMARY
${JSON.stringify(input.journalSummary || null, null, 2)}
`.trim();
}

/* ───────────────────────── Output coercion/guard ───────────────────────────
   Enforces shape & caps list lengths so UI never explodes on odd output.
-----------------------------------------------------------------------------*/
function coerceADI(x: any) {
  const out: any = x && typeof x === "object" ? x : {};
  const arr = (v: any) => (Array.isArray(v) ? v : []);
  const obj = (v: any) =>
    v && typeof v === "object" && !Array.isArray(v) ? v : {};

  out.ribbon ??= null;
  out.portrait = arr(out.portrait).slice(0, 6);

  // compatibility
  {
    const compat = obj(out.compatibility);
    compat.natural_fits = arr(compat.natural_fits).slice(0, 3);
    compat.likely_friction = arr(compat.likely_friction).slice(0, 3);
    out.compatibility =
      compat.natural_fits.length || compat.likely_friction.length
        ? compat
        : null;
  }

  // conflict
  {
    const conflict = obj(out.conflict);
    conflict.apology_vs_forgiveness = conflict.apology_vs_forgiveness ?? null;
    conflict.scripts = arr(conflict.scripts).slice(0, 5);
    out.conflict =
      conflict.apology_vs_forgiveness || conflict.scripts.length
        ? conflict
        : null;
  }

  // self_care
  {
    const sc = obj(out.self_care);
    sc.love_self = sc.love_self ?? null;
    sc.micro_practices = arr(sc.micro_practices).slice(0, 5);
    out.self_care =
      sc.love_self || sc.micro_practices.length ? sc : null;
  }

  out.patterns = arr(out.patterns).slice(0, 6);

  // NEW: long-form weave (right rail)
{
  const weave = obj(out.weave);
  weave.narrative      = arr(weave.narrative).slice(0, 6);
  weave.cross_language = arr(weave.cross_language).slice(0, 8);
  weave.tensions       = arr(weave.tensions).slice(0, 8);
  weave.highlights     = arr(weave.highlights).slice(0, 8);
  weave.watchouts      = arr(weave.watchouts).slice(0, 8);
  weave.integrations   = arr(weave.integrations).slice(0, 8);
  out.weave =
    weave.narrative.length ||
    weave.cross_language.length ||
    weave.tensions.length ||
    weave.highlights.length ||
    weave.watchouts.length ||
    weave.integrations.length
      ? weave
      : null;
}


  // NEW: bullets (left panel)
  {
    const bullets = obj(out.bullets);
    bullets.highlights = arr(bullets.highlights).slice(0, 6);
    bullets.watchouts = arr(bullets.watchouts).slice(0, 6);
    bullets.compatibility_fits = arr(bullets.compatibility_fits).slice(0, 6);
    bullets.compatibility_friction = arr(
      bullets.compatibility_friction
    ).slice(0, 6);
    bullets.conflict_scripts = arr(bullets.conflict_scripts).slice(0, 5);
    bullets.micro_practices = arr(bullets.micro_practices).slice(0, 5);
    out.bullets =
      bullets.highlights.length ||
      bullets.watchouts.length ||
      bullets.compatibility_fits.length ||
      bullets.compatibility_friction.length ||
      bullets.conflict_scripts.length ||
      bullets.micro_practices.length
        ? bullets
        : null;
  }

  return out;
}

/* ───────────────────────────── Misc helpers ────────────────────────────────*/
function isSoftPlaceholder(json: any) {
  const r = String(json?.ribbon || "");
  return /preparing your archetype insight|collecting enough signal/i.test(r);
}

/* ───────────────────────────── Auth helper ─────────────────────────────────
   Extract supabase user_id from Authorization: Bearer <jwt>
-----------------------------------------------------------------------------*/
function getUserIdFromAuth(req: Request): string | null {
  const auth =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) return null;
  const token = auth.slice(7);
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);
    const json = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
      )
    );
    return typeof json?.sub === "string" ? json.sub : null;
  } catch {
    return null;
  }
}

/* ──────────────── Cache helpers (support 2 historical schemas) ─────────────*/
type Supa = ReturnType<typeof createClient>;

async function readDeepCache(supabase: Supa, userId: string) {
  // Try "columns" schema
  try {
    const { data, error } = await supabase
      .from("user_insights_latest")
      .select(
        "archetype_deep_data, archetype_deep_signature, updated_at, payload"
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error && (error as any).code !== "42703") throw error;

    if (
      data &&
      ("archetype_deep_data" in data || "archetype_deep_signature" in data)
    ) {
      return {
        data: (data as any)?.archetype_deep_data ?? null,
        signature: (data as any)?.archetype_deep_signature ?? null,
        updated_at: (data as any)?.updated_at ?? null,
        schema: "columns" as const,
        payload: (data as any)?.payload ?? null,
      };
    }
  } catch {}

  // Try "payload" schema
  try {
    const { data } = await supabase
      .from("user_insights_latest")
      .select("payload, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    const deep = (data as any)?.payload?.archetype_deep || null;
    if (deep) {
      return {
        data: deep.data ?? null,
        signature: deep.signature ?? null,
        updated_at: (data as any)?.updated_at ?? null,
        schema: "payload" as const,
        payload: (data as any)?.payload ?? null,
      };
    }
  } catch {}

  return {
    data: null,
    signature: null,
    updated_at: null,
    schema: null as const,
    payload: null as any,
  };
}

async function writeDeepCache(
  supabase: Supa,
  userId: string,
  json: any,
  signature: string,
  ribbon: string | null,
  opts?: { soft?: boolean }
) {
  const updated_at = new Date().toISOString();
  const softSig = opts?.soft ? `${signature}:soft` : signature;

  const { data: existing } = await supabase
    .from("user_insights_latest")
    .select("payload, signature")
    .eq("user_id", userId)
    .maybeSingle();

  const basePayload =
    existing?.payload && typeof existing.payload === "object"
      ? structuredClone(existing.payload)
      : {};
  (basePayload as any).archetype_deep = {
    signature: softSig,
    data: json,
    at: updated_at,
  };

  const topSignature = existing?.signature || `adi:${softSig}`;

  // Try modern "columns" schema; fall back to "payload"
  try {
    const { error } = await supabase
      .from("user_insights_latest")
      .upsert(
        {
          user_id: userId,
          signature: topSignature,
          payload: basePayload,
          archetype_deep_data: json,
          archetype_deep_signature: softSig,
          ribbon_preview: ribbon,
          updated_at,
        } as any,
        { onConflict: "user_id" }
      );
    if (!error) return { ok: true, schema: "columns" as const };
    if ((error as any).code !== "42703") throw error;
  } catch (e) {
    console.log("[adi] writeDeepCache(columns) err:", (e as any)?.message || e);
  }

  try {
    const { error } = await supabase
      .from("user_insights_latest")
      .upsert(
        {
          user_id: userId,
          signature: topSignature,
          payload: basePayload,
          updated_at,
        } as any,
        { onConflict: "user_id" }
      );
    if (error) throw error;
    return { ok: true, schema: "payload" as const };
  } catch (e) {
    console.log("[adi] writeDeepCache(payload) err:", (e as any)?.message || e);
    return { ok: false, schema: null as const };
  }
}

/* ───────────────────────── Infra: timeouts & retries ───────────────────────
   Supabase edge funcs have ~60s hard limit. Leave headroom for DB I/O.
-----------------------------------------------------------------------------*/
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  abortController?: AbortController
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, rej) => {
      setTimeout(() => {
        try {
          abortController?.abort();
        } catch {}
        rej(new Error(`timeout after ${ms}ms`));
      }, ms);
    }),
  ]);
}
function shouldRetry(err: any) {
  const code = err?.status ?? err?.code ?? null;
  if (code === 429) return true;
  if ([500, 502, 503, 504].includes(code)) return true;
  const msg = String(err?.message || err || "");
  if (
    /\b(429|5\d\d|temporar|retry|rate|overload|unavailable|timeout)\b/i.test(msg)
  )
    return true;
  return false;
}
async function callOpenAIWithRetry({
  openai,
  messages,
  timeoutMs = 55_000, // keep ≤ 55s to fit within function ceiling
  maxAttempts = 3,
}: {
  openai: any;
  messages: any[];
  timeoutMs?: number;
  maxAttempts?: number;
}) {
  let attempt = 0;
  let lastErr: any;
  while (attempt < maxAttempts) {
    attempt++;
    const ac =
      typeof AbortController !== "undefined"
        ? new AbortController()
        : undefined;
    try {
      const resp = await withTimeout(
        // NOTE: pass AbortController signal as the *second* arg
        openai.chat.completions.create(
          {
            model: "gpt-4o-mini",
            messages,
            temperature: 0.4,
            top_p: 0.9,
            presence_penalty: 0.1,
            response_format: { type: "json_object" },
          },
          ac?.signal ? { signal: ac.signal } : undefined
        ),
        timeoutMs,
        ac
      );
      return resp;
    } catch (e) {
      lastErr = e;
      if (!shouldRetry(e) || attempt >= maxAttempts) break;
      const jitter = 300 + Math.floor(Math.random() * 400);
      const wait = attempt * 500 + jitter;
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

/* ───────────────────────── Advisory lock (best-effort) ─────────────────────
   Avoids stampedes when multiple clients refresh simultaneously.
   Requires table:

   create table if not exists function_locks (
     user_id uuid primary key,
     feature text not null,
     locked_until timestamptz not null
   );
-----------------------------------------------------------------------------*/
async function acquireLock(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  feature: string,
  ms = 25_000
) {
  const until = new Date(Date.now() + ms).toISOString();
  const { data } = await supabase
    .from("function_locks")
    .upsert(
      { user_id: userId, feature, locked_until: until },
      { onConflict: "user_id", ignoreDuplicates: true }
    )
    .select("*")
    .maybeSingle();
  if (data) return true;

  const { data: row } = await supabase
    .from("function_locks")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!row) return true;
  if (new Date(row.locked_until).getTime() <= Date.now()) {
    await supabase
      .from("function_locks")
      .upsert(
        { user_id: userId, feature, locked_until: until },
        { onConflict: "user_id" }
      );
    return true;
  }
  return false;
}
async function releaseLock(
  supabase: ReturnType<typeof createClient>,
  userId: string
) {
  try {
    await supabase.from("function_locks").delete().eq("user_id", userId);
  } catch {}
}

/* ───────────────────────────── HTTP helpers ────────────────────────────────*/
function j(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
function ok() {
  return new Response("ok", { headers: CORS });
}

// — helpers to reuse from the nudge engine —
type AnswerRow = { question_id: string; answer: { key?: string; keys?: string[] } | null };

function parseJson(v: any, d = {} as any) { try { return typeof v === "string" ? JSON.parse(v) : (v ?? d); } catch { return d; } }
function toNumberMap(o: any): Record<string, number> { if (!o) return {}; if (o.role || o.energy) return { ...(o.role||{}), ...(o.energy||{}) }; const out: Record<string, number> = {}; for (const [k, v] of Object.entries(o)) out[k] = Number(v as any) || 0; return out; }
function pickTotalsForKeys(all: Record<string, number>, keys: string[]) { const m: Record<string, number> = {}; for (const k of keys) m[k] = Number(all[k] ?? 0); return m; }
function maxMinKeys(m: Record<string, number>) { let topK="", lowK=""; let top=-Infinity, low=Infinity; for (const [k,v] of Object.entries(m)) { if (v>top){top=v; topK=k;} if (v<low){low=v; lowK=k;} } return { topK, lowK, top, low }; }
function renderTemplate(s: string, vars: Record<string, string | number | null>) {
  return (s || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => String(vars[k] ?? ""));
}
function answerMatches(cond: any, a: AnswerRow) {
  if (!a || !a.answer) return false;
  const k = a.answer.key ?? null;
  const ks = Array.isArray(a.answer.keys) ? a.answer.keys : [];
  return (a.question_id === cond.question_id) && (k === cond.option_key || ks.includes(cond.option_key));
}


/* ──────────────────────────────── Handler ──────────────────────────────────
   Endpoints:
   - GET/POST /?mode=ping|peek|purge|keys
   - GET/POST normal → generates/returns insights (with caching)
   - Add &use include_journals=true and/or days=N as needed
-----------------------------------------------------------------------------*/
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return ok();

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") || "";
  const wantPeek = mode === "peek";   // status + cached payload (no refresh)
  const wantPurge = mode === "purge"; // delete cached deep insight only
  const wantDebug = mode === "debug";
  const cacheOnly = url.searchParams.get("cache_only") === "1"; // fast check

  if (mode === "ping")
    return j({ ok: true, time: new Date().toISOString() });
  if (mode === "keys") {
    return j({
      OPENAI_API_KEY_present: !!Deno.env.get("OPENAI_API_KEY"),
      SUPABASE_URL_present: !!Deno.env.get("SUPABASE_URL"),
      SRK_present: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    });
  }

  try {
    // Accept POST body or GET query
    const body = (req.method === "POST"
      ? await req.json().catch(() => ({}))
      : {
          user_id: url.searchParams.get("user_id"),
          include_journals:
            url.searchParams.get("include_journals") === "true",
          days: url.searchParams.get("days")
            ? Number(url.searchParams.get("days"))
            : undefined,
          force: url.searchParams.get("force") === "1",
        }) as {
      user_id?: string | null;
      include_journals?: boolean;
      days?: number;
      force?: boolean;
    };

    const force = !!body.force;

    // Prefer explicit user_id; otherwise infer from Authorization Bearer token
    let userId = (body.user_id ?? undefined) || getUserIdFromAuth(req);
    if (!userId) {
      const ct = req.headers.get("content-type") || "";
      return j(
        {
          error: "user_id required",
          hint:
            "Pass user_id in JSON body or include Authorization: Bearer <access_token>.",
          saw: {
            method: req.method,
            content_type: ct || null,
            has_auth: !!req.headers.get("authorization"),
          },
          expected_body_shape: {
            user_id: "<uuid>",
            include_journals: false,
            days: 30,
          },
        },
        400
      );
    }

    const days = Math.max(1, Number(body.days ?? 30));
    const supabase = createClient(
      env("SUPABASE_URL"),
      env("SUPABASE_SERVICE_ROLE_KEY")
    );

    /* ───────────── PURGE mode: remove only archetype_deep cache ─────────── */
    if (wantPurge) {
      const existing = await readDeepCache(supabase, userId);
      const newPayload =
        existing.payload && typeof existing.payload === "object"
          ? (() => {
              const p = structuredClone(existing.payload);
              if (p?.archetype_deep) delete p.archetype_deep;
              return p;
            })()
          : {};

      await supabase
        .from("user_insights_latest")
        .upsert(
          {
            user_id: userId,
            signature: existing?.signature || `adi:purged:${Date.now()}`,
            payload: newPayload,
            archetype_deep_data: null,
            archetype_deep_signature: null,
            ribbon_preview: null,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "user_id" }
        );

      try {
        await supabase.from("function_locks").delete().eq("user_id", userId);
      } catch {}
      return j({ ok: true });
    }

    /* ──────────── Gather inputs (DB) — NO OpenAI call yet ──────────────── */
    // Slugs for all active quizzes (hyphen/underscore variants)
    const WANTED = [
      // Archetype core
      "archetype-dual",
      "archetype_dual",
      "archetype-preference",
      "archetype_preference",

      // Love-lang variants
      "love-language",
      "love_language",
      "love-language-giving",
      "love_language_giving",
      "love-language-receiving",
      "love_language_receiving",

      // Attachment
      "attachment-style",
      "attachment_style",

      // Soul connection
      "soul-connection",
      "soul_connection",

      // Apology/Forgiveness
      "apology-style",
      "apology_language",
      "apology-language",
      "forgiveness-language",
      "forgiveness_language",

      // Stress/ambiversion/mistake/self-love
      "stress-response",
      "stress_response",
      "ambiversion-spectrum",
      "ambiversion_spectrum",
      "mistake-response-style",
      "mistake_response_style",
      "self-love-style",
      "self_love_style",
    ];

    const { data: attempts, error: atErr } = await supabase
  .from("quiz_attempts")
  .select("id, quiz_slug, result_key, result_title, result_totals, completed_at, created_at")
  .eq("user_id", userId)
  .in("quiz_slug", WANTED)
  .order("completed_at", { ascending: false });

    if (atErr) throw atErr;

    const pickLatest = (slugs: string[]) =>
      (attempts || []).find((r) => slugs.includes(r.quiz_slug)) || null;

    // Core archetype & preference
    const archDual = pickLatest(["archetype-dual", "archetype_dual"]);
    const archPref = pickLatest([
      "archetype-preference",
      "archetype_preference",
    ]);

    // Relationship signals
    const loveGive = pickLatest(["love-language-giving", "love_language_giving"]);
    const loveRecv =
      pickLatest(["love-language-receiving", "love_language_receiving"]) ||
      pickLatest(["love-language", "love_language"]);
    const apology = pickLatest([
      "apology-style",
      "apology_language",
      "apology-language",
    ]);
    const forgive = pickLatest([
      "forgiveness-language",
      "forgiveness_language",
    ]);
    const attach = pickLatest(["attachment-style", "attachment_style"]);

    // Additional color signals
    const soul = pickLatest(["soul-connection", "soul_connection"]);
    const stress = pickLatest(["stress-response", "stress_response"]);
    const ambiv = pickLatest([
      "ambiversion-spectrum",
      "ambiversion_spectrum",
    ]);
    const mistake = pickLatest([
      "mistake-response-style",
      "mistake_response_style",
    ]);
    const selflove = pickLatest(["self-love-style", "self_love_style"]);

    // Archetype framing for the model
    const archetype = {
      title: archDual?.result_title || null, // e.g., "Nurturer × Caregiver"
      role: archDual?.result_title?.split("×")[0]?.trim() || null,
      energy: archDual?.result_title?.split("×")[1]?.trim() || null,
      vectors: archDual?.result_totals || {},
      preference: archPref?.result_totals || null,
    };

    // All signals passed to the model (keep concise where possible)
    const signals = {
      giver_language: loveGive?.result_key || null,
      receiver_language: loveRecv?.result_key || null,
      giver_language_label: titleCaseLL(loveGive?.result_key || null),
      receiver_language_label: titleCaseLL(loveRecv?.result_key || null),

      apology_style: apology?.result_key || null,
      forgiveness_style: forgive?.result_key || null,
      attachment_style: attach?.result_key || null,

      soul_connection: soul?.result_key || null,
      stress_response: stress?.result_key || null,
      ambiversion: ambiv?.result_key || null,
      mistake_response: mistake?.result_key || null,
      self_love_style: selflove?.result_key || null,
    };

    // Tiny rule engine for immediate cross-language notes
    function computeCrossLanguageNotes(s: any) {
      const out: string[] = [];
      const give = String(s.giver_language || "");
      const recv = String(s.receiver_language || "");
      const apology = String(s.apology_style || "");
      const forgive = String(s.forgiveness_style || "");
      const attach = String(s.attachment_style || "");

      const giftRe = /gift/i;
      const wordsRe = /words|affirmation/i;
      const timeRe = /time/i;
      const touchRe = /touch/i;
      const serviceRe = /service/i;

      // Example: apologizes with gifts but doesn't receive gifts well
      if (giftRe.test(apology) && recv && !giftRe.test(recv)) {
        out.push(
          "You tend to apologize with gifts, but gifts rank low in how you actually feel loved. Consider pairing a gift with your top love language so the repair feels received."
        );
      }

      // Example: gives words, but partner's forgiveness requires changed behavior
      if (wordsRe.test(give) && /change|behavior/i.test(forgive)) {
        out.push(
          "Words come naturally for you, but forgiveness in conflicts often hinges on visible behavior change—back your words with small, trackable actions."
        );
      }

      // Example: attachment + love language tension
      if (/avoidant|disorganized|fearful/i.test(attach) && touchRe.test(recv)) {
        out.push(
          "Physical closeness matters to you, but when you feel flooded you might pull away. Name your need for a short pause and offer a warm reconnection plan."
        );
      }

      // Example: time/service tension
      if (timeRe.test(recv) && serviceRe.test(give)) {
        out.push(
          "You show love by doing things, while you feel most loved through shared time. Try ‘co-doing’: invite someone into the task so you get both quality time and helpful action."
        );
      }

      return out;
    }

   // Answer motifs (deterministic; fed to model so it can spot answer-level patterns)
// Also build answersByAttempt for the rule evaluator from the same fetch.
const attemptIds = (attempts || []).map((a) => a.id);
let answerMotifs: any[] = [];
const answersByAttempt = new Map<string, { question_id: string; answer: any }[]>();

if (attemptIds.length) {
  const { data: rawAnswers, error: ansErr } = await supabase
    .from("quiz_answers")
    .select("attempt_id, question_id, answer")
    .in("attempt_id", attemptIds)
    .limit(2000);
  if (ansErr) throw ansErr;

  // motifs
  answerMotifs = (rawAnswers || []).map((r) => ({
    attempt_id: r.attempt_id ?? null,
    qid: r.question_id ?? null,
    key: r.answer?.key ?? null,
  }));
  answerMotifs.sort(
    (a, b) =>
      String(a.qid || "").localeCompare(String(b.qid || "")) ||
      String(a.key || "").localeCompare(String(b.key || "")) ||
      String(a.attempt_id || "").localeCompare(String(b.attempt_id || ""))
  );

  // index for rules
  for (const a of (rawAnswers || [])) {
    const arr = answersByAttempt.get(a.attempt_id) || [];
    arr.push({ question_id: a.question_id, answer: a.answer });
    answersByAttempt.set(a.attempt_id, arr);
  }
}
// else: leave both empty


    // Check-ins aggregate (last N days)
    const sinceIso = new Date(Date.now() - days * 86400000).toISOString();
    const { data: checks } = await supabase
      .from("moods")
      .select("mood, social_battery, need, love_language, created_at")
      .eq("user_id", userId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false });

    const avg = (arr: number[]) =>
      arr.length
        ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
        : null;
    const moodVals = (checks || [])
      .map((x) => Number(x.mood))
      .filter(Number.isFinite);
    const sbVals = (checks || [])
      .map((x) => Number(x.social_battery))
      .filter(Number.isFinite);
    const needs = (checks || []).map((x) => x.need).filter(Boolean);
    const llNeeds = (checks || []).map((x) => x.love_language).filter(Boolean);

    const top = (arr: string[]) => {
      if (!arr.length) return null;
      const counts = new Map<string, number>();
      for (const v of arr) counts.set(v, (counts.get(v) || 0) + 1);
      let best: string | null = null,
        bestN = -1;
      for (const [k, n] of counts) {
        if (n > bestN) {
          best = k;
          bestN = n;
        }
      }
      return best;
    };

    const checkAgg = {
      window_days: days,
      count: (checks || []).length,
      avg_mood: avg(moodVals),
      avg_social_battery: avg(sbVals),
      top_need: top(needs),
      top_ll_need: titleCaseLL(top(llNeeds)),
    };

    // Journals (optional, OFF by default)
    let journalSummary: string | null = null;
    if (body.include_journals) {
      const { data: j } = await supabase
        .from("journal_summaries")
        .select("summary_text")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      journalSummary = j?.summary_text || null;
    }


    


   /*   // Build an index of answers by attempt_id for the rule evaluator
const answersByAttempt = new Map<string, { question_id: string; answer: any }[]>();

const attemptIds = (attempts || []).map(a => a.id);
if (attemptIds.length) {
  const { data: answers, error: ansErr } = await supabase
    .from("quiz_answers")
    .select("attempt_id, question_id, answer")
    .in("attempt_id", attemptIds);
  if (ansErr) throw ansErr;

  for (const a of (answers || [])) {
    const arr = answersByAttempt.get(a.attempt_id) || [];
    arr.push({ question_id: a.question_id, answer: a.answer });
    answersByAttempt.set(a.attempt_id, arr);
  }
}
// else: leave the map empty */


    /* ── 2a) Fetch rules once per quiz slug (after attempts/answers, before OpenAI) ── */
    const slugsToEval = [...new Set((attempts || []).map(a => a.quiz_slug))];
    const rulesBySlug = new Map<string, any[]>();

    for (const slug of slugsToEval) {
      const { data: rules, error } = await supabase.rpc("get_applicable_nudge_rules", {
        p_quiz_slug: slug,
        p_user_id: userId,
      });
      if (!error && rules) rulesBySlug.set(slug, rules);
    }

    /* ── 2b) Deterministically evaluate rules into highlights/watchouts ── */
    const nudgeHighlights: string[] = [];
    const nudgeWatchouts: string[] = [];

    for (const att of (attempts || [])) {
      const rules = rulesBySlug.get(att.quiz_slug) || [];
      if (!rules.length) continue;

      const ans = answersByAttempt.get(att.id) || [];
      const totalsAll = toNumberMap(att.result_totals);

      for (const raw of rules) {
        const rule = {
          ...raw,
          trigger:  parseJson(raw.trigger, {}),
          audience: parseJson(raw.audience, null),
          copy:     parseJson(raw.copy, {}),
        };

        // Audience filters (need `archetype.role/energy`, which you computed earlier)
        const aud = rule.audience || {};
        if (Array.isArray(aud.archetype_energy_in) && archetype.energy && !aud.archetype_energy_in.includes(archetype.energy)) continue;
        if (Array.isArray(aud.archetype_role_in)   && archetype.role   && !aud.archetype_role_in.includes(archetype.role))   continue;
        if (Array.isArray(aud.result_key_in)       && att.result_key   && !aud.result_key_in.includes(att.result_key))       continue;

        // Trigger evaluation (same logic as your nudge function)
        let passes = false;
        const vars: Record<string, string | number | null> = {
          result_key: att.result_key ?? "",
          energy: archetype.energy,
          role: archetype.role,
        };

        if (rule.trigger.result_key) {
          if (att.result_key === rule.trigger.result_key) {
            const need = rule.trigger.min_score;
            if (need == null || (totalsAll[rule.trigger.result_key] ?? 0) >= Number(need)) {
              passes = true;
            }
          }
        } else if (Array.isArray(rule.trigger.any_of)) {
          const hit = ans.find(a => rule.trigger.any_of.some((cond: any) => answerMatches(cond, a)));
          passes = !!hit;
        } else if (rule.trigger.totals_diff?.keys) {
          const keys: string[] = rule.trigger.totals_diff.keys;
          const subset = pickTotalsForKeys(totalsAll, keys);
          const { topK, lowK, top, low } = maxMinKeys(subset);
          const diff = top - low;
          if (diff > Number(rule.trigger.totals_diff.gt ?? 0)) {
            passes = true;
            (vars as any).top_key = topK; (vars as any).low_key = lowK;
            (vars as any).top_score = top; (vars as any).low_score = low;
          }
        }

        if (!passes) continue;

        // Render deterministic copy
        const title = renderTemplate(rule.copy.title || "", vars).trim();
        const body  = renderTemplate(rule.copy.body  || "", vars).trim();
        const line  = title || body ? [title, body].filter(Boolean).join(" — ") : null;
        if (!line) continue;

        // Route into highlights vs watchouts
        if (rule.scope === "micro" || /watchout|tension|risk|friction/i.test(title + " " + body)) {
          nudgeWatchouts.push(line);
        } else {
          nudgeHighlights.push(line);
        }
      }
    }



        // (Optional but recommended) include a tiny hash so cache invalidates if these change:
    const nudges_hash = await sha256(JSON.stringify({
      hi: nudgeHighlights.slice(0, 12), // keep small
      wo: nudgeWatchouts.slice(0, 12),
    }));



    // Stable signature for THIS feature (cache key for deep insight)
    const sigObj = {
  archetype, signals, answers: answerMotifs, checkins: checkAgg,
  journal_hash: journalSummary ? await sha256(journalSummary) : null,
  nudges_hash,           // ← add this line
  prompt_v: 3,
  schema_v: 2,          // bump since shape grew (weave/bullets)
};
const signature = await hashStable(sigObj);


    

    // Read cache FIRST
    const cached = await readDeepCache(supabase, userId);
    const cachedDeep = cached?.data
      ? {
          data: cached.data,
          signature: cached.signature,
          updated_at: cached.updated_at,
        }
      : null;

    const STALE_MS = 6 * 60 * 60 * 1000; // 6h
    const updatedAtMs = cachedDeep?.updated_at
      ? Date.parse(cachedDeep.updated_at)
      : 0;
    const staleByTime = updatedAtMs > 0 ? Date.now() - updatedAtMs > STALE_MS : true;

    // Status-only endpoint
    if (wantPeek) {
      const soft = cachedDeep?.data ? isSoftPlaceholder(cachedDeep.data) : false;
      return j({
        cached: !!cachedDeep?.data,
        signature: cachedDeep?.signature || null,
        has_same_signature: cachedDeep?.signature === signature,
        stale_by_time: staleByTime,
        forced: force,
        is_soft: soft,
        updated_at: cachedDeep?.updated_at ?? null,
        insights: cachedDeep?.data || null,
      });
    }
    // 1) Compute newest source timestamp across quizzes + check-ins (+ journal if wired)
const newestAttemptAt =
  (attempts?.length
    ? new Date((attempts[0].completed_at || attempts[0].created_at) as string).getTime()
    : 0);

const newestCheckinAt =
  (checks?.length ? new Date(checks[0].created_at).getTime() : 0);

// If you later fetch journal created_at, add it here:
const newestJournalAt = 0;

const newest_source_at = Math.max(newestAttemptAt, newestCheckinAt, newestJournalAt);

// 2) Compare with cache.updated_at (when the last render was written)
const cacheUpdatedMs = cachedDeep?.updated_at ? Date.parse(cachedDeep.updated_at) : 0;
const sourcesNewerThanCache = newest_source_at > cacheUpdatedMs;



    // Quick "cache-only" probe (lets the UI render immediately if fresh)
    // — status helper —
if (cacheOnly) {
  if (cachedDeep?.signature === signature && cachedDeep?.data && !force && !staleByTime && !sourcesNewerThanCache) {
    return j({ insights: cachedDeep.data, cached: true, signature, stale_by_time: false });
  }
  return j({ cached: false, signature, stale_by_time: staleByTime, sources_newer: sourcesNewerThanCache }, 202);
}

// — fresh, non-soft cache fast path —
const cachedIsSoft = cachedDeep?.data ? isSoftPlaceholder(cachedDeep.data) : false;
if (
  cachedDeep?.signature === signature &&
  cachedDeep?.data &&
  !force &&
  !staleByTime &&
  !cachedIsSoft &&
  !sourcesNewerThanCache // 👈 new guard
) {
  return j({ insights: cachedDeep.data, cached: true, signature });
}


    const lastGood = cachedDeep?.data || null;

    // Very sparse inputs → early soft placeholder (no OpenAI call)
    const sparse =
      !archetype.title &&
      !signals.giver_language &&
      !signals.receiver_language &&
      !signals.apology_style &&
      !signals.forgiveness_style &&
      !signals.attachment_style &&
      checkAgg.count === 0;
    if (sparse) {
      const minimal = {
        ribbon:
          "We’re still collecting enough signal to weave your archetype deep-read.",
        portrait: [],
        weave: {},
        compatibility: {},
        conflict: {},
        self_care: {},
        patterns: [],
        bullets: {},
        sources: {
          archetype: "Archetype-Dual",
          signals: [],
          checkins: "none",
          journals: body.include_journals ? "enabled-but-empty" : "excluded",
        },
      };
      await writeDeepCache(
        supabase,
        userId,
        minimal,
        signature,
        minimal.ribbon ?? null,
        { soft: true }
      );
      return j({
        insights: minimal,
        cached: false,
        signature: `${signature}:soft`,
      });
    }

    /* ─────────────── HEAVY WORK: OpenAI (JSON mode + retries) ───────────── */
    let haveLock = false;
    try {
      haveLock = await acquireLock(supabase, userId, "archetype_deep", 25_000);
    } catch {}

    // If someone else is generating and we have *any* last good, serve that.
    if (!haveLock && !force && lastGood) {
      return j({
        insights: lastGood,
        cached: true,
        stale: true,
        signature: cachedDeep?.signature || signature,
      });
    }

    const { default: OpenAI } = await import("https://esm.sh/openai@4.56.0");
    const openai = new OpenAI({ apiKey: env("OPENAI_API_KEY") });

    const messages = [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: USER_PAYLOAD({
          user: { id: userId },
          archetype,
          signals,
          answerMotifs,
          checkins: checkAgg,
          journalSummary,
        }),
      },
    ];

    let json: any;
    try {
      const chat = await callOpenAIWithRetry({
        openai,
        messages,
        timeoutMs: 55_000,
        maxAttempts: 3,
      });
      const raw = chat.choices?.[0]?.message?.content?.trim() || "{}";
      json = JSON.parse(raw);
    } catch (e) {
      const why = String((e as any)?.message || e);
      console.log("[adi] generation fallback:", why);

      const soft =
        lastGood || {
          ribbon: "We’re preparing your archetype insight. Try again shortly.",
          portrait: [],
          weave: {},
          compatibility: {},
          conflict: {},
          self_care: {},
          patterns: [],
          bullets: {},
        };

      try {
        await releaseLock(supabase, userId);
      } catch {}
      await writeDeepCache(
        supabase,
        userId,
        soft,
        signature,
        soft.ribbon ?? null,
        { soft: true }
      );

      if (wantDebug)
        return j({
          insights: soft,
          cached: !!lastGood,
          stale: !!lastGood,
          signature: `${signature}:soft`,
          reason: why,
        });
      return j({
        insights: soft,
        cached: !!lastGood,
        stale: !!lastGood,
        signature: `${signature}:soft`,
      });
    }

    // Enforce schema for UI safety
    json = coerceADI(json);


    // Ensure containers exist
json.weave   = json.weave   || {};
json.bullets = json.bullets || {};

// Nudge-derived bullets
if (nudgeHighlights.length) {
  json.weave.highlights  = [...(json.weave.highlights  || []), ...nudgeHighlights];
  json.bullets.highlights = [...(json.bullets.highlights || []), ...nudgeHighlights];
}
if (nudgeWatchouts.length) {
  json.weave.watchouts   = [...(json.weave.watchouts   || []), ...nudgeWatchouts];
  json.bullets.watchouts  = [...(json.bullets.watchouts  || []), ...nudgeWatchouts];
}



    // Provenance (server truth)
    json.sources = {
      archetype: archetype.title
        ? `Archetype-Dual (${archetype.title})`
        : "Archetype-Dual",
      signals: [
        loveGive?.quiz_slug,
        loveRecv?.quiz_slug,
        apology?.quiz_slug,
        forgive?.quiz_slug,
        attach?.quiz_slug,
        soul?.quiz_slug,
        stress?.quiz_slug,
        ambiv?.quiz_slug,
        mistake?.quiz_slug,
        selflove?.quiz_slug,
      ].filter(Boolean),
      checkins: `last ${checkAgg.window_days} days`,
      journals: body.include_journals
        ? journalSummary
          ? "included"
          : "enabled-but-empty"
        : "excluded",
    };

    // Add cross-language notes as both: weave.cross_language AND bullets.watchouts
const cross = computeCrossLanguageNotes(signals);
if (cross.length) {
  json.weave = json.weave || {};
  json.weave.cross_language = [...(json.weave.cross_language || []), ...cross];
  json.bullets = json.bullets || {};
  json.bullets.watchouts = [...(json.bullets.watchouts || []), ...cross];
}


    const ribbon =
      typeof json?.ribbon === "string" ? json.ribbon.slice(0, 180) : null;
    await writeDeepCache(supabase, userId, json, signature, ribbon, {
      soft: false,
    });

    try {
      await releaseLock(supabase, userId);
    } catch {}

    // Optional history insert (best-effort)
    try {
      await supabase
        .from("user_insights_history")
        .insert({
          user_id: userId,
          payload: { kind: "archetype_deep", signature, data: json },
        });
    } catch {}

    return j({ insights: json, cached: false, signature });
  } catch (e) {
    console.log("[archetype-deep-insights] fatal:", (e as any)?.message || e);
    return j({ error: String((e as any)?.message || e) }, 500);
  }
});
