// supabase/functions/quiz-narrative/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import OpenAI from "npm:openai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ───────────── CORS ───────────── */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
} as const;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...cors },
  });

/* ───────────── UTIL ───────────── */
const env = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Missing env ${k}`);
  return v;
};

/* ───────────── Types ───────────── */
type Attempt = {
  id: string;
  user_id?: string | null;
  quiz_slug: string | null;
  result_title?: string | null;
  result_key?: string | null;
  result_totals?: Record<string, number> | null;
  result_copy?: any | null;
};

type ArchetypeLite = { role: string | null; energy: string | null; title: string | null } | null;

// Overlay parts we pass into the paragraph builder
type OverlayParts = {
  note: string | null;
  micro_practice: string | null;
  partner_script: string | null;
  label?: string | null;
};

// Safe label resolver to avoid index type errors
function styleLabelOf(k: string) {
  return (STYLE_LABEL as Record<string, string>)[k] || k;
}


/* ───────────── Helpers ───────────── */
function mapSlugToFamily(slug = ""): string {
  const s = slug.toLowerCase();
  if (/love-language|love_language/.test(s)) return "love_language";
  if (/attachment/.test(s)) return "attachment";
  if (/apology|forgiveness|repair/.test(s)) return "apology_forgiveness";
  if (/mistake|stress/.test(s)) return "mistake_stress";
  if (/soul|connection/.test(s)) return "soul_connection";
  if (/ambiversion|introvert|extrovert/.test(s)) return "ambiversion";
  if (/archetype/.test(s)) return "archetype";
  return "love_language";
}

async function loadLatestArchetype(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<ArchetypeLite> {
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("result_title, result_totals, completed_at, quiz_slug")
    .eq("user_id", userId)
    .in("quiz_slug", ["archetype-dual", "archetype_dual", "archetype"])
    .order("completed_at", { ascending: false })
    .limit(1);

  if (error || !data?.[0]) return null;

  const title = data[0].result_title || "";
  const parts = title.includes("×") ? title.split("×").map(s => s.trim()) : [];
  const role = parts[0] || null;
  const energy = parts[1] || null;
  return { role, energy, title: title || null };
}

/* — traits (optional, used by forgiveness/apology families) — */
function traitsFromForgivenessTotals(t: Record<string, number> = {}) {
  const s = (k: string) => Number(t[k] ?? 0);
  return {
    fast_to_forgive:            s("repair") > s("time") && s("repair") - s("time") >= 2,
    needs_clear_ack:            (s("words") ?? 0) >= 3 || (s("accountability") ?? 0) >= 3,
    avoids_rehashing_conflict:  (s("time") ?? 0) > (s("words") ?? 0),
    prefers_action_over_words:  (s("repair") ?? 0) > (s("words") ?? 0),
    resents_if_rushed:          (s("time") ?? 0) - (s("repair") ?? 0) >= 2,
  };
}
function computeTraits(slug: string | null, totals: Record<string, number> | null) {
  const t = totals || {};
  if (!slug) return {};
  const s = slug.toLowerCase();
  if (s.includes("forgive") || s.includes("apology")) return traitsFromForgivenessTotals(t);
  return {};
}

/* distribution signals for the model */
function computeDistribution(totals: Record<string, number> = {}) {
  const entries = Object.entries(totals).map(([k, v]) => [k, Number(v) || 0]) as [string, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const top = entries[0] || ["", 0];
  const second = entries[1] || ["", 0];
  const low = entries[entries.length - 1] || ["", 0];
  const zeros = entries.filter(([, v]) => v === 0).map(([k]) => k);
  return {
    ordered: entries,
    top_key: top[0], top_score: top[1],
    runner_up_key: second[0], runner_up_score: second[1],
    low_key: low[0], low_score: low[1],
    zero_keys: zeros,
  };
}

function deriveUserSignals(a: Attempt, archetype: ArchetypeLite) {
  const totals = a.result_totals || {};
  const traits = computeTraits(a.quiz_slug ?? null, totals);
  const dist = computeDistribution(totals as Record<string, number>);
  return {
    quiz_slug: a.quiz_slug,
    result_title: a.result_title ?? null,
    result_key: a.result_key ?? null,
    result_totals: totals,
    traits,
    distribution: dist,
    archetype: archetype ? { role: archetype.role, energy: archetype.energy, title: archetype.title } : null,
  };
}

/* ───────────── POV/Composition Guards ───────────── */
const APOLOGY = /\b(I'?m sorry|I apologize|say you'?re sorry|how to apologize)\b/i;
const OFFENDER_ACTION = /\b(I will|I’ll|I can|let me fix|I want to make it right)\b/i;
const THERAPY = /\b(container|move energy|somatic|inner child|process the energy)\b/i;

function isForgivenessPOV(s: string){ return !APOLOGY.test(s) && !OFFENDER_ACTION.test(s); }

function composeP1(c: any) {
  const lines = [
    c.behavior,
    c.motive,
    c.immediate_impact,
    c.grounded_example ? `Example: ${c.grounded_example}` : ""
  ].filter(Boolean).join(" ");
  return trimToMaxSentences(lines, 5);
}
function composeP2(c: any) {
  const lines = [
    c.strength ? `Strength: ${c.strength}` : "",
    c.shadow ? `Shadow: ${c.shadow}` : "",
    c.consequence ? `Consequence: ${c.consequence}` : "",
    c.concrete_ask ? `Ask: ${c.concrete_ask}` : ""
  ].filter(Boolean).join(" ");
  return trimToMaxSentences(lines, 5);
}

/* --- Formatting helpers (trim but never add words) --- */
function trimToMaxSentences(s: string, max: number) {
  const parts = String(s || "").split(/(?<=[.!?])\s+/).filter(Boolean);
  return parts.slice(0, max).join(" ").trim();
}

// --- POV + grammar nudges ---
const THIRD_PERSON_OPEN = /^(?:when\s+someone|when\s+people|someone|they|their)\b/i;
function isSecondPersonPOV(s: string) {
  if (!s) return false;
  return /(?:^|\s)you\b/i.test(s) && !THIRD_PERSON_OPEN.test(s);
}

// normalize to second person pronouns without touching quoted speech
function toSecondPerson(s: string) {
  if (!s) return s;
  // crude but effective for our domain; avoids changing inside quotes
  return s
    .replace(/\bthe(?:ir|y)\b/gi, (m) => (m[0] === "T" ? "Your" : "your"))
    .replace(/\bthey\b/gi, "you")
    .replace(/\bthem\b/gi, "you")
    .replace(/\bthemselves\b/gi, "yourself")
    .replace(/\btheir\b/gi, "your")
    .replace(/\bsomeone\b/gi, "the other person"); // keep “someone” only when we truly mean the partner
}

// If an atom starts with "To ..." (infinitive), turn it into "to ..." for smoother insertion.
function normalizeInfinitive(s: string) {
  return s?.replace(/^To\s+/i, "to ").trim();
}

// Build a clean “behavior” sentence without “You You …” or “You Using …”
function behaviorSentence(raw: string) {
  if (!raw) return "";
  let b = raw.trim();

  // already second person complete sentence?
  if (/^you\b/i.test(b)) {
    // ensure it ends with a period
    return b.replace(/\.\s*$/, "") + ".";
  }

  // gerund opener like "Using hurtful words during conflict"
  if (/^[A-Z][a-z]+ing\b/.test(b)) {
    return "You often respond by " + b[0].toLowerCase() + b.slice(1).replace(/\.\s*$/, "") + ".";
  }

  // default fragment like "want specific language that names the harm"
  return "You " + (b[0].toLowerCase() + b.slice(1)).replace(/\.\s*$/, "") + ".";
}

// Motive sentence: handle "To ..." and pronouns
function motiveSentence(raw: string) {
  if (!raw) return "";
  let m = toSecondPerson(normalizeInfinitive(raw));
  if (/^you\b/i.test(m)) return m.replace(/\.\s*$/, "") + ".";
  if (/^to\b/i.test(m)) return "You do this " + m + ".";
  return "You do this because " + (m[0].toLowerCase() + m.slice(1)).replace(/\.\s*$/, "") + ".";
}

// Immediate impact sentence (on you)
function impactSentence(raw: string) {
  if (!raw) return "";
  let i = toSecondPerson(raw);
  // Normalize “it leaves you …” vs “you …”
  if (/^(it|this)\s+/.test(i)) {
    return i[0].toUpperCase() + i.slice(1).replace(/\.\s*$/, "") + ".";
  }
  if (!/^you\b/i.test(i)) i = "you " + i;
  return i[0].toUpperCase() + i.slice(1).replace(/\.\s*$/, "") + ".";
}

// One simple example sentence (no labels)
function exampleSentence(raw: string) {
  if (!raw) return "";
  const e = raw.replace(/^example:\s*/i, "").replace(/\.\s*$/, "");
  return "Example: " + e + ".";
}



function stripOverlayLabels(s: string) {
  return String(s || "")
    .replace(/\b(?:A small practice|Practice|Try saying|Script)\s*:\s*/gi, "")
    .trim();
}

function tidySpeakableLine(s: string) {
  let t = String(s || "").trim();
  t = t.replace(/\b(?:you\s+could\s+say|you\s+could\s+express|you\s+might\s+say|say)\s*,?\s*/gi, "");
  t = t.replace(/["“”']\s*(?:you\s+could\s+say|you\s+could\s+express)\s*,?\s*/gi, "“");
  t = t.replace(/^["“]/, "").replace(/["”]$/, "");
  t = `“${t.trim()}”`;
  t = t.replace(/\s{2,}/g, " ").replace(/\s+([,.!?;:])/g, "$1");
  return t;
}

function softenPracticePhrasing(s: string) {
  let t = String(s || "");
  t = t.replace(/\byour\s+(\d+)[-–]?\s*minute\s+([a-z ]+?)\s*practice\b/gi, "an $1-minute $2 exercise");
  t = t.replace(/\byour\s+([a-z ]+?)\s*practice\b/gi, "a $1 exercise");
  t = t.replace(/^consider\s+pairing\s+your\b/i, "Consider trying");
  t = t.replace(/\s{2,}/g, " ").trim();
  return t;
}

function sanitizeOverlayBlock(
  note: unknown,
  micro: unknown,
  script: unknown
): { cleanNote: string | null; cleanMicro: string | null; cleanScript: string | null } {
  const toStr = (v: unknown) => (typeof v === "string" ? v : "");
  const strip = (s: string) =>
    s.replace(/\*\*/g, "").replace(/\*/g, "").replace(/^[\s"“]+|[\s"”]+$/g, "").trim();

  const dropLabel = (s: string) =>
    s
      .replace(/^A\s*small\s*practice:\s*/i, "")
      .replace(/^Try\s*saying:\s*/i, "")
      .replace(/^If\s*words\s*help,\s*you\s*could\s*say[:,]?\s*/i, "")
      .replace(/^You\s*could\s*say[:,]?\s*/i, "")
      .trim();

  const cleanNote = (() => {
    const s = strip(toStr(note));
    return s ? s : null;
  })();

  const cleanMicro = (() => {
    const s = dropLabel(strip(toStr(micro)));
    return s ? s : null;
  })();

  const cleanScript = (() => {
    let s = dropLabel(strip(toStr(script)));
    s = s.replace(/^['“]+|['”]+$/g, "").trim();
    return s ? s : null;
  })();

  return { cleanNote, cleanMicro, cleanScript };
}


const DEFAULT_ATOMS_BY_STYLE: Record<string, any> = {
  repair: {
    behavior: "look for a visible, proportional fix to what broke",
    motive: "action proves care more than explanations",
    immediate_impact: "exhale and start trusting the path back",
    grounded_example: "replace what was lost or set up a clear make-good by Friday",
    strength: "you turn remorse into movement quickly",
    shadow: "the fix can feel transactional if feelings are skipped",
    consequence: "resentment lingers when the repair lands cold",
    concrete_ask: "“Can we agree on one specific fix by a set date?”"
  },
  accountability: {
    behavior: "want a specific naming of what happened and its impact",
    motive: "clear ownership is the doorway to safety",
    immediate_impact: "your body settles when blame-shifting stops",
    grounded_example: "hear “I interrupted you and made the meeting harder” before next steps",
    strength: "you restore dignity with clarity",
    shadow: "you may stall if ownership sounds polished but empty",
    consequence: "trust stays brittle without one prevention step",
    concrete_ask: "“Can you say what happened and one step to prevent a repeat?”"
  },
  gift: {
    behavior: "notice small, personal gestures that match the harm",
    motive: "a thoughtful act shows attunement without a lecture",
    immediate_impact: "feel warmth return and your guard lower a notch",
    grounded_example: "receive a short handwritten note plus a fitting gesture",
    strength: "you let care be felt, not argued",
    shadow: "gestures without ownership feel performative",
    consequence: "mixed signals grow if gifts try to replace repair",
    concrete_ask: "“A small, specific gesture paired with naming what happened would help.”"
  },
  time: {
    behavior: "ask for space and steady check-ins before resolution",
    motive: "your nervous system needs consistency to unclench",
    immediate_impact: "pressure drops and your thinking clears",
    grounded_example: "set a 48-hour pause with a time to reconnect",
    strength: "you protect the bond by pacing",
    shadow: "too much space can read as distance",
    consequence: "disconnection grows if check-ins don’t happen",
    concrete_ask: "“I need two days and a set time to talk again—can you confirm?”"
  },
  words: {
    behavior: "forgive most easily when you hear sincere, specific language that names the behavior and its impact",
    motive: "clear, honest words restore your sense of understanding and safety",
    immediate_impact: "feel seen and safer to engage",
    grounded_example: "hear “I joked at your expense; that was unfair and hurt you”",
    strength: "you reopen dialogue with plain words",
    shadow: "words alone can feel hollow without change",
    consequence: "doubt returns when slips repeat",
    concrete_ask: "“Will you say what happened and one concrete change you’ll try?”"
  },
  change: {
    behavior: "track consistent pattern change over time",
    motive: "evidence calms your body more than promises",
    immediate_impact: "your shoulders drop when commitments are kept",
    grounded_example: "observe two weeks of the new behavior and one check-in",
    strength: "you anchor forgiveness in reliability",
    shadow: "you may minimize the moment to ‘wait and see’",
    consequence: "hurt freezes if change isn’t named out loud",
    concrete_ask: "“Let’s pick one habit to change and a date to review it.”"
  }
};




/* What matters (fallbacks) */
const WHAT_MATTERS_BY_STYLE: Record<string, string[]> = {
  accountability: [
    "Specific ownership of what happened and its impact",
    "No qualifiers (no “but…”); short, direct language",
    "One boundary or prevention step to avoid repeat harm",
    "Room for questions and reflection",
    "Acknowledge emotions before moving on"
  ],
  repair: [
    "A visible, proportional fix to the actual impact",
    "Start soon (24–72 hours) with a clear done-point",
    "Updates without being chased",
    "Brief acknowledgment so the action doesn’t feel cold",
    "Ownership if the plan slips (and a new deadline)"
  ],
  gift: [
    "Gestures follow ownership—don’t replace it",
    "Small, personal, and proportionate to the harm",
    "Timing that respects your nervous system (no rush)",
    "A note that names what happened and why this gesture fits",
    "One check-in after the gesture (“Did that help?”)"
  ],
  time: [
    "Stated need for space with a re-engage time",
    "Gentle check-ins, not disappearance",
    "Consistency during the cool-off window",
    "No pressure to resolve before the body calms",
    "A simple plan for how to reconnect"
  ],
  words: [
    "Specific acknowledgment of behavior and impact",
    "Tone and body language that match the words",
    "No defensiveness or justification",
    "One small action paired with the apology if needed",
    "Space to ask clarifying questions"
  ],
  change: [
    "Clear pattern change with one or two checkpoints",
    "Small promises that are kept (not grand pledges)",
    "Evidence over explanations",
    "Accountability if a slip happens",
    "Timeframe that matches the size of the pattern"
  ],
};



// Human labels for weaving
const STYLE_LABEL: Record<string,string> = {
  accountability: "Accountability",
  repair: "Repair/Amends",
  gift: "Gesture/Gift",
  time: "Time/Consistency",
  words: "Words",
  change: "Changed Behavior"
};

// small combo insights (extend as needed)
function weaveRunnerUpInsight(top: string, runner?: string|null) {
  if (!runner) return "";
  const t = top, r = runner;
  if (t === "words" && r === "change") return "You tend to need words first and proof over time.";
  if (t === "words" && r === "repair") return "Clear language paired with a visible fix lands best.";
  if (t === "repair" && r === "words") return "A brief acknowledgment before the fix keeps it from feeling cold.";
  if (t === "repair" && r === "change") return "You value a concrete fix now and a pattern shift over time.";
  if (t === "gift"  && r === "words") return "A small, sincere gesture works when it’s tied to specific ownership.";
  if (t === "time"  && r === "words") return "Naming what happened helps you re-engage after space.";
  if (t === "change" && r === "words") return "Evidence matters most, with words as a check-in, not a substitute.";
  return `Your runner-up, ${STYLE_LABEL[r] || r}, adds nuance to how this works for you.`;
}

function weaveZeros(zeroKeys: string[]) {
  const z = zeroKeys?.filter(Boolean) ?? [];
  if (!z.length) return "";
  const labels = z.slice(0,2).map(k => STYLE_LABEL[k] || k).join(", ");
  return `You rarely lean on ${labels}, so you likely prefer prompt, direct repair over waiting it out.`;
}

// P1 — explain HOW YOU FORGIVE (not how the other person behaves)
// Uses ONLY defaults; no model atoms.
function composeForgivenessP1FromBase(styleKey: string) {
  const b = DEFAULT_ATOMS_BY_STYLE[styleKey] || {};
  const s1 = b.behavior
    ? ("You tend to forgive when you " + String(b.behavior).replace(/\.$/, "") + ".")
    : "";
  const s2 = b.motive
    ? ("You need that because " + String(b.motive).replace(/^[A-Z]/, c => c.toLowerCase()).replace(/\.$/, "") + ".")
    : "";
  const s3 = b.immediate_impact
    ? ("When that’s present, you " + String(b.immediate_impact).replace(/^[A-Z]/, c => c.toLowerCase()).replace(/\.$/, "") + ".")
    : "";
  const s4 = b.grounded_example
    ? ("Example: " + String(b.grounded_example).replace(/^Example:\s*/i, "").replace(/\.$/, "") + ".")
    : "";
  return trimToMaxSentences([s1, s2, s3, s4].filter(Boolean).join(" "), 5);
}

// P2 — flowing prose (no labels), weaves what-matters + runner-up + zeros
// Uses ONLY defaults; no model atoms.
function composeForgivenessP2FromBase(
  styleKey: string,
  dist: ReturnType<typeof computeDistribution>,
  whatMatters: string[]
) {
  const b = DEFAULT_ATOMS_BY_STYLE[styleKey] || {};
  const strength    = b.strength ? (String(b.strength).replace(/^you\s+/i,"You ").replace(/\.$/,"") + ".") : "";
  const mindful     = b.shadow   ? ("Be mindful that " + String(b.shadow).replace(/^[A-Z]/, c => c.toLowerCase()).replace(/\.$/, "") + ".") : "";
  const outcome     = b.consequence ? (String(b.consequence)[0].toUpperCase() + String(b.consequence).slice(1).replace(/\.$/,"") + ".") : "";
  const matters     = Array.isArray(whatMatters) && whatMatters.length
    ? ("What matters most: " + whatMatters.slice(0,4).join(", ") + ".")
    : "";
  const ask         = b.concrete_ask ? ("You can ask for " + String(b.concrete_ask).replace(/^["“]|["”]$/g,"").replace(/^ask\s+for\s+/i,"")) : "";

  // weave runner-up & zeros in natural language
  const runner = dist.runner_up_key && dist.runner_up_score > 0 ? String(dist.runner_up_key) : null;
  const ru = weaveRunnerUpInsight(styleKey, runner);
  const z  = weaveZeros(dist.zero_keys || []);

  // allow 5–7 sentences so it breathes
  return trimToMaxSentences(
    [strength, mindful, outcome, matters, ru, z, ask].filter(Boolean).join(" "),
    7
  );
}



function buildArchetypeOverlayParagraph(
  overlay: OverlayParts,
  archetypeTitle: string | null,
  topStyle: string
) {
  const note   = overlay?.note ?? "";
  const micro  = overlay?.micro_practice ? softenPracticePhrasing(overlay.micro_practice) : "";
  const script = overlay?.partner_script ? tidySpeakableLine(overlay.partner_script) : "";

  const label = archetypeTitle || overlay?.label || null;
  const styleName = styleLabelOf(topStyle);

  const influence = label
    ? `${label} tends to shape your ${styleName} style: you’ll aim to keep care and steadiness front-and-center as you decide what you need to forgive.`
    : `Your archetype can shape how ${styleName} plays out—some pairings lean warm and steady; others prefer structure and checkpoints.`;

  const parts = [
    influence,
    note ? toSecondPerson(note) : "",
    micro ? `You might try ${micro.replace(/\.$/, "")} for 6–10 minutes.` : "",
    script ? `If words help, you could say, ${script}.` : ""
  ].filter(Boolean);

  return parts.join(" ");
}



// Map quiz slug to the core question the narrative must answer.
// You can expand this map as you wire other quizzes.
const RESULT_QUESTION_BY_SLUG: Record<string, string> = {
  forgiveness_language:
    "What helps you truly forgive—accountability, words, action, time, gifts, or consistent change? Learn what you need to let go and move forward.",
  // optional aliases:
  forgiveness:
    "What helps you truly forgive—accountability, words, action, time, gifts, or consistent change? Learn what you need to let go and move forward.",
};

// Resolve the question to answer for this attempt
function resultQuestionFor(slug: string | null | undefined): string {
  const s = String(slug || "").toLowerCase();
  if (s.includes("forgive")) return RESULT_QUESTION_BY_SLUG.forgiveness_language;
  return ""; // default empty for other quizzes until we add theirs
}



/* ───────────── Handler ───────────── */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: cors });

  try {
    // accept attempt_id
    const url = new URL(req.url);
    const qAttempt = url.searchParams.get("attempt_id") || url.searchParams.get("attemptId");
    let attempt_id: string | null = qAttempt;

    if (!attempt_id && req.method === "POST") {
      const ct = (req.headers.get("content-type") || "").toLowerCase();
      if (ct.includes("application/json")) {
        const b: any = await req.json().catch(() => ({}));
        attempt_id = b?.attempt_id ?? b?.attemptId ?? b?.body?.attempt_id ?? b?.body?.attemptId ?? null;
      } else if (ct.includes("application/x-www-form-urlencoded")) {
        const fd = await req.formData().catch(() => null);
        attempt_id = (fd?.get("attempt_id") as string) || (fd?.get("attemptId") as string) || null;
      } else {
        const txt = await req.text().catch(() => "");
        if (txt) {
          try {
            const b: any = JSON.parse(txt);
            attempt_id = b?.attempt_id ?? b?.attemptId ?? b?.body?.attempt_id ?? b?.body?.attemptId ?? null;
          } catch {}
        }
      }
    }

    if (!attempt_id) return json({ error: "attempt_id is required" }, 400);

    const SUPABASE_URL = env("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
    const OPENAI_API_KEY = env("OPENAI_API_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // load attempt
    const { data: attempt, error: attemptErr } = await supabase
      .from("quiz_attempts")
      .select("id, user_id, quiz_slug, result_title, result_key, result_totals, result_copy")
      .eq("id", attempt_id)
      .maybeSingle<Attempt>();
    if (attemptErr) throw attemptErr;
    if (!attempt) return json({ error: "Attempt not found" }, 404);

    // cache hit
    if (attempt.result_copy) {
      return json({ ...attempt.result_copy, from_cache: true });
    }

    /* ========= Authoring constraints tuned for forgiveness POV ========= */
    const quiz_family = mapSlugToFamily(attempt.quiz_slug || "");
    const isForgiveness = quiz_family === "apology_forgiveness";

    // Archetype (optional)
    const archetype = attempt.user_id
      ? await loadLatestArchetype(supabase, attempt.user_id)
      : null;

    // Normalize style key
    const style_key = (attempt.result_key || "").toLowerCase();

    // Build payload for the model
    const user_signals = {
  ...deriveUserSignals(attempt, archetype),
  result_key: style_key,
  totals: attempt.result_totals ?? null,
  result_question: resultQuestionFor(attempt.quiz_slug),   // NEW
  result_key_label: (attempt.result_title || "").replace(/^You may be (?:an?|the)\s+/i, "") || style_key
} as const;


    /* ---- Global rules ---- */
    const rules = {
      clarity_first: true,
      observable_behaviors_only: true,
      micro_practice_durations: [6, 7, 8, 10, 12],
      banned_phrases: ["reset the rhythm", "hold the container", "move energy", "deepen the repair"],
      scripts: "1–2 short sentences, speakable, jargon-free",
      sourcing: "Each section must include a 'source' string explaining which signals informed it."
    } as const;

    /* ---- Forgiveness-only instructions ---- */
    const forgivenessRules = isForgiveness
      ? {
          perspective: "FORGIVENESS_VIEW_ONLY",
          pov_definition:
            "Write as if the user has been hurt and is evaluating whether/how to forgive. Do NOT describe how the user apologizes.",
          explicit_negatives: [
            "Do not describe what the user should do to fix what THEY broke.",
            "Do not drift into generic kindness or personality traits without tying to forgiveness behavior."
          ],
          paragraph_plan: {
            paragraph_1:
              "MUST be 4–5 sentences, in this order: behavior → motive → immediate impact → one ordinary example. Write from the FORGIVER’S perspective (they were hurt).",
            paragraph_2:
              "MUST be 4–5 sentences. Include: Strength, Shadow, Consequence, and one speakable Ask the FORGIVER can make today."
          },
          distribution_reference:
            "Mention the top style and, if present, name the runner-up or any zero-score styles for contrast.",
          atoms_required: [
            "behavior","motive","immediate_impact","grounded_example",
            "strength","shadow","consequence","concrete_ask"
          ],
          overlay_rules:
            "If archetype exists, write 4–5 sentences from the SAME forgiveness POV. Weave a calming micro-practice (6–12 min) and one speakable line naturally in the prose. Never use labels like 'A small practice:' or 'Try saying:'. Do NOT assume the user already has any routines (e.g., 'your 8-minute practice'); phrase practices as optional invitations."
        }
      : {} as const;


        const answerContract = {
  must_answer_question: true,
  thesis_line_rule:
    "Write a single-sentence thesis that directly answers the quiz’s core question for THIS user, in second person, starting with 'For you,'. Put it in core_result.thesis.",
  pov: "Always write to 'you' (the user). Never center 'someone/they' unless inside quoted example speech."
} as const;

      

    /* ---- JSON schema ---- */
    const schema = {
      core_result: {
        headline: "string",
        thesis: "string",
        paragraph_1: "string",
        paragraph_2: "string",
        paragraph: "string",
        what_matters: "string[]",
        stress: "string",
        micro_practice: "string",
        partner_script: "string",
        source: "string",

        // atoms (harmless if the model omits them)
        behavior: "string",          // observable behavior you need to see to forgive
        motive: "string",            // why that matters (your value/logic)
        immediate_impact: "string",  // how your body/relationship settles *now*
        grounded_example: "string",  // one ordinary example (1 sentence)
        strength: "string",          // your style’s strength
        shadow: "string",            // common snag
        consequence: "string",       // what happens if you lean too hard on it
        concrete_ask: "string"       // a speakable ask you (the forgiver) can make today
      },
      archetype_overlay: {
        label: "string|null",
        note: "string|null",
        micro_practice: "string|null",
        partner_script: "string|null",
        source: "string|null"
      }
    } as const;

    /* ---- Authoring glossaries (kept) ---- */
    const authoring = {
      hybrid_model:
        "Write core_result first using only quiz signals. If archetype is provided, add archetype_overlay; otherwise set all overlay fields to null.",
      verbs_by_role: {
        Navigator: ["map", "frame", "sequence", "clarify"],
        Protector: ["shield", "name limits", "intervene", "steady"],
        Architect: ["design", "spec", "schedule", "systematize"],
        Guardian: ["preserve", "tend", "steward", "maintain"],
        Artisan: ["craft", "shape", "prototype", "polish"],
        Catalyst: ["spark", "challenge", "accelerate", "disrupt"],
        Nurturer: ["soothe", "provide", "nourish", "care"],
        Herald: ["name", "voice", "announce", "invite"],
        Seeker: ["explore", "sample", "test", "range"]
      },
      verbs_by_energy: {
        Warrior: ["commit", "train", "hold course", "execute"],
        Magician: ["transform", "reframe", "experiment", "simplify"],
        Artisan: ["build", "make", "touch", "refine"],
        Rebel: ["decline", "challenge", "rewrite", "choose"],
        Sage: ["reflect", "distill", "summarize", "ask"],
        Jester: ["lighten", "play", "loosen", "pivot"],
        Sovereign: ["set standard", "delegate", "review", "steward"],
        Lover: ["soften", "attune", "reassure", "draw close"],
        Creator: ["design", "compose", "iterate", "compose"],
        Visionary: ["imagine", "align", "orient", "inspire"],
        Muse: ["spark", "encourage", "lift", "delight"],
        Caregiver: ["tend", "comfort", "pace", "co-regulate"]
      }
    } as const;

    /* ---- System messages (no voice bank) ---- */
const sys = [
  {
  role: "system",
  content: `
You are writing quiz results for Afrodezea. Voice: warm, precise, psychologically astute, never judgmental. You speak to the user as “you”, like a skilled psychologist translated by a loving coach.

CONTRACT — OUTPUT SHAPE (logical, not JSON schema):
- core_result.thesis: 1 sentence. Start with “For you,” and directly answer the quiz’s core question for THIS user.
- core_result.paragraph_1: 4 sentences. Explain THIS user’s forgiveness condition → why it matters to them → immediate felt shift → one ordinary example. Speak only about the user’s needs (not instructing the offender).
- core_result.paragraph_2: 5–7 sentences. Flowing prose (no labels). Include:
  • Their edge (what works for them, light side).
  • “Be mindful …” line (shadow, without using the word “shadow”).
  • “What matters most: …” as a single sentence (convert bullets into a sentence).
  • A smart line that weaves the runner-up style.
  • An optional line if some styles are zero/near-zero and what that implies.
  • One clear, speakable Ask the user can make today (keep it short).
- archetype_overlay (if available): 3–4 sentences. Explain how Role × Energy COLORS their top style (not replaces it), then offer one 6–10 min practice and one speakable line. No “Try saying:” labels—just natural prose.

POV + QUALITY GUARDS
- Always second person (“you”). Do not center “someone/they” unless inside quoted example speech.
- No fragments. No therapy jargon. Concrete, observable behavior over abstract traits.
- If any paragraph would open with “When someone…”, recast to the user (“When you…” or “You forgive when…”).
- Keep all examples ordinary and specific. Keep the Ask speakable in one breath.

WEAVING RULES (for paragraph_2)
- Use the runner-up style to add nuance (e.g., “Words + Change” → “words first, proof over time”).
- If any styles are zero/very low, add one implication (e.g., “You rarely use Time, so prompt repair may feel safer than waiting it out.”).

FORGIVENESS QUIZ GLOSSARY (atoms the model may use)
- behavior: the condition that helps you forgive (what needs to be present).
- motive: why that condition matters to you.
- immediate_impact: the felt shift in your body/relationship when the condition is present.
- grounded_example: one ordinary example (1 sentence).
- mindful: a “Be mindful …” line capturing the pitfall without shame.
- ask: one speakable sentence you can use today.

ABSOLUTE DON’TS
- Don’t instruct the user how to apologize or fix what *they* broke.
- Don’t over-explain the offender’s motives.
- Don’t output bullet labels like “Try saying:”. No headings inside paragraphs.

When composing forgiveness-style narratives, maintain clinical insight with compassionate tone.
For each paragraph:
1. Speak in full sentences that flow logically—no fragments or note lists.
2. Always explain the psychological *why* behind each behavior.
3. Replace "You need that because..." with richer connective phrasing ("That matters because…", "It helps because…").
4. Merge bullet-style lists into narrative sentences using commas or semicolons.
5. Ensure examples sound lived-in, not generic.
6. Archetype paragraph must *show* how the Role × Energy modifies the forgiveness pattern—through sensory or emotional contrast, not exposition.
7. End with a reflective sentence that leaves the user grounded or inspired.
8. Tone = psychologist-level insight expressed like a loving coach: precise, kind, never saccharine.

Follow this contract and keep language calm, specific, and human.
`
}
,
  {
    role: "system" as const,
    content: JSON.stringify({ rules, forgivenessRules, schema, authoring, answerContract })
  }
];


    // OpenAI call (lower entropy to reduce drift)
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.25,
      frequency_penalty: 0.2,
      messages: [...sys, { role: "user", content: JSON.stringify(user_signals) }]
    });

    const raw = resp.choices?.[0]?.message?.content ?? "{}";
    let gen: any = {};
    try { gen = JSON.parse(raw); } catch { gen = {}; }

    // paragraphs
    let para1 = gen?.core_result?.paragraph_1?.trim() || gen?.core_result?.paragraph?.trim() || "";
    let para2 = gen?.core_result?.paragraph_2?.trim() || "";
    const core = gen?.core_result || {};

    // After parsing `gen` and setting para1/para2/core
const thesis = (gen?.core_result?.thesis || "").trim();

// Forgiveness-only guardrails (force 2nd-person POV + compose from defaults)
if (/apology|forgiveness|repair/i.test(String(attempt.quiz_slug || ""))) {
  const styleKey = (attempt.result_key || "").toLowerCase();
  const dist = computeDistribution(attempt.result_totals || {});

  // derive 'what matters' with your fallback table
  const wm = (Array.isArray(gen?.core_result?.what_matters) && (gen.core_result.what_matters?.length || 0) > 0)
    ? gen.core_result.what_matters
    : (WHAT_MATTERS_BY_STYLE[styleKey] ?? []);

  // Build both paragraphs exclusively from defaults to avoid model fragments
  para1 = composeForgivenessP1FromBase(styleKey);
  para2 = composeForgivenessP2FromBase(styleKey, dist, wm);

  // Final nudge: ensure both open in second person
  if (!isSecondPersonPOV(para1)) para1 = para1.replace(THIRD_PERSON_OPEN, "You ");
  if (!isSecondPersonPOV(para2)) para2 = para2.replace(THIRD_PERSON_OPEN, "You ");
}





    // overlay cleanups
const { cleanNote, cleanMicro, cleanScript } = sanitizeOverlayBlock(
  gen?.archetype_overlay?.note,
  gen?.archetype_overlay?.micro_practice,
  gen?.archetype_overlay?.partner_script
);

// what matters: prefer model; else fallback by style (global wm for payload)
const wm: string[] = (Array.isArray(gen?.core_result?.what_matters) &&
                      ((gen?.core_result?.what_matters?.length || 0) > 0))
  ? (gen.core_result.what_matters as string[])
  : (WHAT_MATTERS_BY_STYLE[style_key] ?? []);

// Build the archetype overlay paragraph (ties Role × Energy → style)
const archetypeTitle =
  (typeof archetype?.title === "string" && archetype.title) ||
  (typeof gen?.archetype_overlay?.label === "string" && gen.archetype_overlay.label) ||
  null;

const overlayParagraph = buildArchetypeOverlayParagraph(
  { note: cleanNote, micro_practice: cleanMicro, partner_script: cleanScript },
  archetypeTitle,
  (attempt.result_key || "").toLowerCase()
);

const payload = {
  core_result: {
    headline: gen?.core_result?.headline ?? (attempt.result_title || "Your result"),
    thesis: thesis || "",
    paragraph_1: para1,
    paragraph_2: para2,
    paragraph: gen?.core_result?.paragraph ?? "",
    what_matters: wm,
    stress: gen?.core_result?.stress ?? "",
    micro_practice: gen?.core_result?.micro_practice ?? "",
    partner_script: gen?.core_result?.partner_script ?? "",
    source: gen?.core_result?.source ?? `Based on: ${attempt.quiz_slug || "quiz"}`
  },
  archetype_overlay:
    (archetypeTitle)
      ? {
          label: archetypeTitle,
          note: cleanNote || null,
          micro_practice: cleanMicro || null,
          partner_script: cleanScript || null,
          source: gen?.archetype_overlay?.source ?? (archetype?.title ? `Archetype: ${archetype.title}` : null)
        }
      : { label: null, note: null, micro_practice: null, partner_script: null, source: null },

  // This is what your React renders under “How this looks as …”
  overlay_paragraph: overlayParagraph,

  meta: { quiz_family }
};


// cache on attempt
const { error: upErr } = await supabase
  .from("quiz_attempts")
  .update({ result_copy: payload })
  .eq("id", attempt_id);
if (upErr) throw upErr;

// audit raw (best effort)
try {
  await supabase.from("quiz_result_narratives").insert({
    attempt_id,
    quiz_family,
    payload: gen
  });
} catch {}

return json({ ...payload, from_cache: false }, 200);
  } catch (e) {
    console.error("[quiz-narrative] error:", e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
