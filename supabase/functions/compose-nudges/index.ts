// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Attempt = {
  id: string;
  user_id: string;
  quiz_slug: string;
  result_key: string | null;
  result_totals: any | null;      // may be { role:{}, energy:{} } for archetype-dual
  completed_at: string | null;
};

type AnswerRow = { question_id: string; answer: { key?: string; keys?: string[] } | null };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function env(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function parseJson(v: any, d = {} as any) {
  try { return typeof v === "string" ? JSON.parse(v) : (v ?? d); } catch { return d; }
}

// Flatten totals safely; if archetype-dual, keep union of role+energy
function toNumberMap(o: any): Record<string, number> {
  if (!o) return {};
  if (o.role || o.energy) return { ...(o.role || {}), ...(o.energy || {}) };
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(o)) out[k] = Number(v as any) || 0;
  return out;
}


// --- TRAITS from totals (same as above) ---
function traitsFromForgivenessTotals(t: Record<string, number> = {}) {
  const s = (k: string) => Number(t[k] ?? 0);
  return {
    fast_to_forgive:            s("repair") > s("time") && s("repair") - s("time") >= 2,
    needs_clear_ack:            s("acknowledge") >= 3,
    avoids_rehashing_conflict:  s("avoid_conflict") >= 2 || s("time") > s("talk"),
    prefers_action_over_words:  s("actions_over_words") >= 2,
    resents_if_rushed:          s("time") - s("repair") >= 2,
  };
}
function computeTraits(slug: string | null, totals: Record<string, number> | null) {
  const t = totals || {};
  if (!slug) return {};
  const s = slug.toLowerCase();
  if (s.includes("forgive") || s.includes("apology")) return traitsFromForgivenessTotals(t);
  return {};
}



// Restrict totals to just the keys asked by a rule (for tilt calc)
function pickTotalsForKeys(all: Record<string, number>, keys: string[]) {
  const m: Record<string, number> = {};
  for (const k of keys) m[k] = Number(all[k] ?? 0);
  return m;
}

function maxMinKeys(m: Record<string, number>) {
  let topK = "", lowK = ""; let top = -Infinity, low = Infinity;
  for (const [k, v] of Object.entries(m)) {
    if (v > top) { top = v; topK = k; }
    if (v < low) { low = v; lowK = k; }
  }
  return { topK, lowK, top, low };
}

function renderTemplate(s: string, vars: Record<string, string | number | null>) {
  return (s || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => String(vars[k] ?? ""));
}

function answerMatches(cond: any, a: AnswerRow) {
  if (!a || !a.answer) return false;
  const k = a.answer.key ?? null;
  const ks = Array.isArray(a.answer.keys) ? a.answer.keys : [];
  return (a.question_id === cond.question_id) &&
         (k === cond.option_key || ks.includes(cond.option_key));
}

// Deterministic dedupe keys
function dedupeKeyFor(rule: any, attempt: Attempt, match?: { qid?: string; opt?: string }) {
  const slug = attempt.quiz_slug;
  const scope = rule.scope;
  if (rule.trigger?.any_of && match?.qid && match?.opt) return `micro:${slug}:${match.qid}:${match.opt}`;
  if (rule.trigger?.result_key) return `macro:${slug}:${attempt.result_key ?? "none"}`;
  if (rule.trigger?.totals_diff?.keys) {
    // include top/low to avoid repeating the exact same tilt message too soon
    const totals = toNumberMap(attempt.result_totals);
    const subset = pickTotalsForKeys(totals, rule.trigger.totals_diff.keys);
    const { topK, lowK } = maxMinKeys(subset);
    return `macro:${slug}:tilt:${topK}->${lowK}`;
  }
  return `${scope}:${slug}:generic`;
}

Deno.serve(async (req) => {
  // Handle preflight quickly
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.user_id as string | null;
    const attemptId = body.attempt_id as string | null;
    if (!userId || !attemptId) {
      return new Response(
        JSON.stringify({ error: "user_id and attempt_id required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));

    // Attempt + answers
    const { data: attempt, error: aErr } = await supabase
      .from("quiz_attempts")
      .select("id,user_id,quiz_slug,result_key,result_totals,completed_at")
      .eq("id", attemptId)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!attempt) {
      return new Response(
        JSON.stringify({ error: "Attempt not found" }),
        { status: 404, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const { data: answers } = await supabase
      .from("quiz_answers")
      .select("question_id,answer")
      .eq("attempt_id", attemptId);

    // Audience context (resolve latest archetype-dual if present)
    const { data: arch } = await supabase
      .from("quiz_attempts")
      .select("quiz_slug,result_title,result_totals,completed_at")
      .eq("user_id", userId)
      .in("quiz_slug", ["archetype-dual","archetype_dual"])
      .order("completed_at", { ascending: false })
      .limit(1);

    const archetypeRoleEnergy = (() => {
      const title = arch?.[0]?.result_title || "";      // e.g., "Navigator × Sovereign"
      const [role, energy] = title.split("×").map(s => s?.trim());
      return { role: role || null, energy: energy || null };
    })();

    // Pre-filtered rules (cooldown + schedule done in SQL)
    const { data: rules, error: rErr } = await supabase
      .rpc("get_applicable_nudge_rules", { p_quiz_slug: attempt.quiz_slug, p_user_id: userId });
    if (rErr) throw rErr;

    const totalsAll = toNumberMap(attempt.result_totals);
    const traits = computeTraits(attempt.quiz_slug, totalsAll);

// helpful human-readable list for templates like {{trait_list}}
const traitList = Object.entries(traits)
  .filter(([,v]) => !!v)
  .map(([k]) => k.replace(/_/g, " ")) // "fast to forgive", etc.
  .join(", ");
    const outs: any[] = [];
    const microFoundKeys = new Set<string>();

    for (const raw of rules || []) {
      const rule = { ...raw, trigger: parseJson(raw.trigger, {}), audience: parseJson(raw.audience, null), copy: parseJson(raw.copy, {}) };

      // Audience predicates
      const aud = rule.audience || {};
      if (Array.isArray(aud.archetype_energy_in)) {
        if (!archetypeRoleEnergy.energy || !aud.archetype_energy_in.includes(archetypeRoleEnergy.energy)) continue;
      }
      if (Array.isArray(aud.archetype_role_in)) {
        if (!archetypeRoleEnergy.role || !aud.archetype_role_in.includes(archetypeRoleEnergy.role)) continue;
      }
      if (Array.isArray(aud.result_key_in)) {
        if (!attempt.result_key || !aud.result_key_in.includes(attempt.result_key)) continue;
      }

     // Trigger evaluation
let passes = false;

const vars: Record<string, string | number | null | boolean> = {
  result_key: attempt.result_key ?? "",
  energy: archetypeRoleEnergy.energy,
  role: archetypeRoleEnergy.role,
  // traits in case authors want to reference them in templates
  ...traits,                    // e.g., {{fast_to_forgive}}
  trait_list: traitList || "",  // e.g., "fast to forgive, needs clear ack"
};

let dedupe: string | undefined;

// A) result_key (+ optional min_score)
if (rule.trigger?.result_key) {
  if (attempt.result_key === rule.trigger.result_key) {
    const need = rule.trigger.min_score;
    if (need == null || (totalsAll[rule.trigger.result_key] ?? 0) >= Number(need)) {
      passes = true;
      dedupe = dedupeKeyFor(rule, attempt);
    }
  }
}

// B) any_of answers (first matching pair wins; dedupe by that pair)
else if (Array.isArray(rule.trigger?.any_of)) {
  const hit = (answers || []).find(a => rule.trigger.any_of.some((cond: any) => answerMatches(cond, a)));
  if (hit) {
    passes = true;
    const matched = rule.trigger.any_of.find((cond: any) => answerMatches(cond, hit));
    dedupe = dedupeKeyFor(rule, attempt, { qid: matched.question_id, opt: matched.option_key });
    if (microFoundKeys.has(dedupe)) passes = false; // avoid duplicates across similar rules
    else microFoundKeys.add(dedupe!);
  }
}

// C) totals_diff (imbalance)
else if (rule.trigger?.totals_diff?.keys) {
  const keys: string[] = rule.trigger.totals_diff.keys;
  const subset = pickTotalsForKeys(totalsAll, keys);
  const { topK, lowK, top, low } = maxMinKeys(subset);
  const diff = top - low;
  if (diff > Number(rule.trigger.totals_diff.gt ?? 0)) {
    passes = true;
    (vars as any).top_key = topK;
    (vars as any).low_key = lowK;
    (vars as any).top_score = top;
    (vars as any).low_score = low;
    dedupe = dedupeKeyFor(rule, attempt);
  }
}

if (!passes) {
  continue;
}

// Render copy
const rendered = {
  title: renderTemplate(rule.copy.title || "", vars),
  body: renderTemplate(rule.copy.body || "", vars),
  cta: rule.copy.cta || null,
  tips: Array.isArray(rule.copy.tips)
    ? rule.copy.tips.map((t: string) => renderTemplate(t, vars))
    : [],
  scope: rule.scope,
  priority: rule.priority,
  rule_id: rule.id,
};

outs.push({ rendered, dedupe });
} // ← closes: for (const raw of rules || [])

// Insert hits (batch), cap 2 macros + 1 micro
const macros = outs.filter(o => o.rendered.scope === "macro").slice(0, 2);
const micros = outs.filter(o => o.rendered.scope === "micro").slice(0, 1);
const selected = [...macros, ...micros];

if (selected.length) {
  const payload = selected.map(s => ({
    user_id: userId,
    nudge_rule_id: s.rendered.rule_id,
    quiz_slug: attempt.quiz_slug,
    attempt_id: attempt.id,
    dedupe_key: s.dedupe
  }));
  const { data: hits } = await supabase
    .from("nudge_hits")
    .insert(payload)
    .select("id, nudge_rule_id");

  // attach hit ids
  for (const s of selected) {
    const h = hits?.find(hh => hh.nudge_rule_id === s.rendered.rule_id);
    (s.rendered as any).hit_id = h?.id ?? null;
  }
}

const nudges = selected.map(s => s.rendered);
return new Response(
  JSON.stringify({ nudges }),
  { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
);
} catch (e) {
return new Response(
  JSON.stringify({ error: String(e?.message || e) }),
  { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
);
}
});

