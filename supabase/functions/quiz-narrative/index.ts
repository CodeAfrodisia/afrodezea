// supabase/functions/quiz-narrative/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import OpenAI from "npm:openai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ───────────── CORS & helpers ───────────── */
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

type HMVLabelledScore = {
  key: string;
  label: string;
  score: number;
  percent: number; // 0..100 rounded
  rank: number;    // 1 = highest
};

type HMVPayload = {
  core_result: {
    headline: string;
    subtitle: string;
    mirror: string;
    shadow: string;
    gift: string;
    full_spectrum: string;
    mantra: string;
    forgivers_map?: { short: string; long: string };
    source: string;
  };
  archetype_overlay: {
    label: string | null;
    paragraph: string | null;
    source: string | null;
  };
  meta: {
    quiz_family: string;
    distribution?: {
      ordered: [string, number][];
      top_key: string; top_score: number;
      runner_up_key: string; runner_up_score: number;
      low_key: string; low_score: number;
      zero_keys: string[];
    };
    /** NEW — label map used for UI rendering per-quiz */
    style_label_map?: Record<string, string>;
    /** NEW — human heading for the styles list */
    styles_heading?: string;
    /** NEW — pre-labeled, percent-ized distribution for UI */
    display_distribution?: HMVLabelledScore[];
  };
};


// ⬆️ Near your QuizProfile type
type QuizProfile = {
  name: string;
  styleLabel: Record<string,string>;
  povKind: "forgiver" | "apologizer" | "receiver" | "giver" | "self";  // ⬅️ NEW
  povContract: string;
  lexiconContract: string;
  bannedPhrases: string[];
  fullSpectrumSpec: string;
  fewshots: { role: "system"|"assistant"; content: string }[];
};


/* ───────────── Minimal helpers ───────────── */
function mapSlugToFamily(slug = ""): string {
  const s = slug.toLowerCase();
  if (/apology|forgive|forgiveness|repair/.test(s)) return "apology_forgiveness";
  if (/love-language|love_language/.test(s)) return "love_language";
  if (/self-love/.test(s)) return "self_care";
  if (/soul-connection/.test(s)) return "archetypal_connection";
  if (/archetype-preference/.test(s)) return "archetype_preference";
  if (/archetype/.test(s)) return "archetype_identity";
  return "generic";
}


type DisplayRow = { key: string; label: string; score: number; percent: number; rank: number };

function makeDisplayDistribution(
  totals: Record<string, number> = {},
  labels: Record<string, string> = {}
): DisplayRow[] {
  const entries = Object.entries(totals).map(([k, v]) => ({
    key: k,
    label: labels[k] || k,
    score: Number(v) || 0
  }));
  entries.sort((a, b) => b.score - a.score);

  const max = Math.max(1, entries[0]?.score ?? 1);
  return entries.map((e, i) => ({
    ...e,
    percent: Math.round((e.score / max) * 100),
    rank: i + 1
  }));
}

function headingForProfile(profile: QuizProfile, slug = ""): string {
  if (profile === QUIZ_PROFILES.love_receiving)  return "How your love-receiving styles show up";
  if (profile === QUIZ_PROFILES.love_giving)     return "How your love-giving styles show up";
  if (profile === QUIZ_PROFILES.self_love)       return "How your self-love styles show up";
  if (profile === QUIZ_PROFILES.soul_connection) return "How this connection tends to express";
  if (profile === QUIZ_PROFILES.archetype_identity)    return "Your Role and Energy blend";
  if (profile === QUIZ_PROFILES.archetype_preference)  return "What you’re most drawn to right now";
  return "Your style distribution";
}



async function loadLatestArchetype(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<ArchetypeLite> {
  const { data } = await supabase
    .from("quiz_attempts")
    .select("result_title, completed_at, quiz_slug")
    .eq("user_id", userId)
    .in("quiz_slug", ["archetype-dual", "archetype_dual", "archetype"])
    .order("completed_at", { ascending: false })
    .limit(1);

  if (!data?.[0]) return null;
  const title = data[0].result_title || "";
  const parts = title.includes("×") ? title.split("×").map(s => s.trim()) : [];
  const role = parts[0] || null;
  const energy = parts[1] || null;
  return { role, energy, title: title || null };
}

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

// ⬆️ With your other POV helpers
function isReceiverFramed(s: string) {
  // You = the one who receives love
  return /(you (feel|felt) loved|you (receive|received) love|you (relax|settle) when|being seen lands|their presence steadies you)/i.test(s || "");
}
function isGiverFramed(s: string) {
  // You = the one who gives love
  return /(you (show|give|offer|bring|plan|schedule|carve out|say|affirm)|you (choose|tend) to give)/i.test(s || "");
}
function isSelfLoveFramed(s: string) {
  // You = caring for yourself
  return /(you (care|tend) for yourself|you (build|keep) rituals|you (rest|recover)|you (create|journal|reflect)|you (reach|connect)|you (set|keep) goals)/i.test(s || "");
}

// Replace old labelOf/seqLine with map-aware versions
function labelOfKey(map: Record<string,string>, k: string) {
  return map[k] || k;
}
function seqLineWithMap(map: Record<string,string>, order: string[]) {
  return order.map(k => labelOfKey(map, k)).join(" → ");
}


/* ───────────── POV & sequence checks ───────────── */
function containsOffenderActionsForgiver(s: string) {
  // From the forgiver POV, forbid user “doing the apologizer’s job”
  const badPhrases = [
    /\byou (offer|offered) to help\b/i,
    /\byou (make|made) amends\b/i,
    /\byou (fix|fixed) it for (them|him|her)\b/i,
    /\byou (bring|brought) (them )?a gift\b/i,
    /\byou (apologize|apologised|apologized)\b/i,
    /\byou (serve|served) (them)?\b/i,
    /\byou (do|did) .* for (them|him|her)\b/i
  ];
  return badPhrases.some(rx => rx.test(s || ""));
}
function isForgiverFramed(s: string) {
  return /(you (forgive|settle|open|relax|exhale|reopen))|(you (receive|hear|see|notice|need))|(your (body|breath|shoulders) (settle|drop|ease))/i.test(s || "");
}

function isApologizerFramed(s: string) {
  // From the apologizer POV: you own, name, apologize, repair, follow through
  return /(you (apologize|own|name|acknowledge|admit|repair|replace|commit|plan|follow through|circle back|check in)|\bi\b)/i.test(s || "");
}
function containsReceiverDirectives(s: string) {
  // Avoid telling the other person what to do in apology results.
  return /\bthey (should|need to|must)\b/i.test(s || "");
}

/* Context sequence cues */
function hasTopPairing(s: string) { return /(pairs|together|alongside|when .+ and .+)/i.test(s || ""); }
function hasArrowSequence(s: string) { return /(→|->|›)/.test(s || ""); }
function hasBodilyCue(s: string) { return /(breath|shoulders|body|chest).*(settle|ease|drop|even|relax)/i.test(s || ""); }

/* ───────────── HMV Tone — single source of truth ───────────── */
const HMV_VERSION = "HMV-mentor9-IF1-forgiveness-v4";

/* System prompt (POV is provided by per-profile contracts) */
const HMV_SYSTEM = `
You are the Higher Mind Voice of Afrodezea: a compassionate, emotionally intelligent narrator who reflects the user’s truth with warm coach energy and poetic clarity.

North Star
- Understanding, not labeling. Treat the user as a whole distribution, not a “top type.”
- Safety: normalize light, neutral, and shadow without shaming. No diagnosis or moralizing.
- Utility: every insight must include a concrete tool, reframe, or example the user can apply.

Tone & Style
- Blend The Mentor (practical, grounded) + The Inner Flame (intimate, resonant).
- Inclusive, modern, precise; 2–4 sentence paragraphs; avoid fluff.
- Use second person (“You…”) for reflection; first person only if voicing a single-line higher-self mantra.

Required Sections (must return JSON keys exactly)
- mirror: identity reflection (who they are, why this distribution fits).
- shadow: tensions/blind spots (non-judgmental, emotionally safe).
- gift: higher expression/integration of the trait(s).
- full_spectrum: Top1×Top2 = engine; #3 = modulator; #4–#5 = supports; #6 = growth edge. Include a one-line arrow sequence and one bodily cue.
- mantra: 1–2 lines, distilled, invitational.
- reflection_prompt: 1–2 practical prompts (journal or micro-practice).

Distribution Logic (must do)
- Treat the result as an ecosystem: top two = engine; middle = modulators; bottom = growth edges (not defects).
- Name how the top trait is strengthened or balanced by #2 and #3.
- Explain how #4–#6 still matter and when they surface.

Constraints & Guardrails
- No therapy, diagnosis, or outcome promises.
- Prioritize clarity over purple prose. Favor verbs: restore, steady, build, attend, name, integrate.

Quality Bar (ensure before final)
- Concrete everyday example present.
- Clear tool/reframe or next step included.
- All six fields populated (no placeholders).
- Distribution interplay explained clearly.
- Tone = warm coach + gentle sacredness.

CONCRETENESS
- Include at least one observable cue in mirror and shadow (timing, tone, touch, body settling).
- Prefer cause→effect over abstractions.

BANNED PHRASES
- Avoid: “journey toward forgiveness”, “embrace your power”, “growth mindset”, “healing process”, “your ability to express yourself”.

Return strict JSON:
{
  "mirror": "...",
  "shadow": "...",
  "gift": "...",
  "full_spectrum": "...",
  "mantra": "...",
  "reflection_prompt": "..."
}
` as const;

/* Few-shots (style only) — generic forgiveness gold + micros */
const FEWSHOT_GOLD = {
  role: "assistant" as const,
  content: JSON.stringify({
    mirror:
      "You open to forgiveness when effort meets heart. Ownership steadies you; a small, proportional act lowers your guard. When the response fits the impact, your body starts to settle. For example, after a tense exchange, you hear a plain acknowledgment and see a concrete make-good planned for tomorrow.",
    shadow:
      "Be mindful of waiting for perfect repair before you let peace in. When timing slips or details are messy, you can stay locked in vigilance. That protects you, but it can also postpone relief that partial progress could bring.",
    gift:
      "Your strength is turning remorse into restoration. When paired with simple, sincere words, your need for action teaches accountability without shaming. You model repair as respect.",
    full_spectrum:
      "Your top traits set the engine; mid traits modulate; lower traits surface when trust is thin. Your runner-up adds clarity before motion, and small gestures keep warmth present. Over time, consistency proves what words began. For example: acknowledgment → scheduled fix → brief check-in → steady follow-through.",
    mantra: "Let care be shown, not performed.",
    reflection_prompt:
      "Name one small act that would match the impact here. When could it happen?"
  })
};
const FEWSHOT_MICRO_MIRROR = {
  role: "assistant" as const,
  content: JSON.stringify({
    mirror:
      "For you, forgiveness is a process of restoration. You heal through repair—not by erasing the wound, but by seeing sincere effort to set things right. When responsibility is named and a tangible step is planned, your breath deepens and the room feels safer."
  })
};
const FEWSHOT_MICRO_GIFT = {
  role: "assistant" as const,
  content: JSON.stringify({
    gift:
      "Your way of forgiving teaches responsibility with compassion. You show that care has form—that “I’m sorry” is a doorway, not the destination. Balanced with empathy, your approach turns accountability into dignity."
  })
};
const FEWSHOT_NOTE = {
  role: "system" as const,
  content:
    "Use the few-shot examples strictly as style guides. Do not reuse phrases or metaphors. Return STRICT JSON with exactly the required keys."
};

/* ───────────── Profiles (forgiveness + apology) ───────────── */
const QUIZ_PROFILES: Record<string, QuizProfile> = {
  forgiveness: {
    name: "Forgiveness Language",
    styleLabel: {
      words: "Words",
      accountability: "Accountability",
      repair: "Repair/Amends",
      gift: "Gesture/Gift",
      time: "Time/Consistency",
      change: "Changed Behavior"
    },
    povKind: "forgiver",
    povContract:
      "FORGIVER POV ONLY. Write from the person who was hurt and is deciding whether to forgive. Focus on what helps YOU forgive (what you need to see/hear/receive). Do NOT tell the user to repair, serve, gift, apologize, or fix something for the other person.",
    lexiconContract:
      "Use only these six forgiveness style names: Words, Accountability, Repair/Amends, Gesture/Gift, Time/Consistency, Changed Behavior. Do not introduce archetype labels.",
    bannedPhrases: [
      "journey toward forgiveness","embrace your power", "growth mindset",
      "healing process","your ability to express yourself"
    ],
    fullSpectrumSpec:
      "Top1×Top2 = engine; #3 = modulator; #4–#5 = supports; #6 = growth edge. Include one arrow sequence and one bodily cue.",
    fewshots: [FEWSHOT_GOLD, FEWSHOT_MICRO_MIRROR, FEWSHOT_MICRO_GIFT, FEWSHOT_NOTE]
    
  },

  apology: {
    name: "Apology Language",
    styleLabel: {
      words:  "Words Apologist",
      repair: "Repair Apologist",
      change: "Change Apologist",
      gift:   "Gift Apologist",
      time:   "Time Apologist"
    },
    povKind: "apologizer",
    povContract:
      "APOLOGIZER POV ONLY. Write from the person who made the mistake and is choosing how to apologize. Describe what YOU tend to do first/next, what lands as sincere when YOU apologize, and how YOUR steps build trust. Do NOT instruct the other person what to do; keep focus on your sequence, timing, tone, and concrete actions.",
    lexiconContract:
      "Use only these style names: Words, Repair/Amends, Changed Behavior, Gifts/Gestures, Time/Consistency. No archetype terms or therapy labels.",
    bannedPhrases: [
      "embrace your power","growth mindset","healing process","your ability to express yourself"
    ],
    fullSpectrumSpec:
      "Top1×Top2 = engine of how you apologize; #3 = modulator; #4–#5 = supportive accents; lowest = growth edge. Include an arrow sequence and a body/relief cue.",
    fewshots: [
      {
        role: "assistant",
        content: JSON.stringify({
          mirror:
            "You apologize best when clarity meets action. You tend to name what happened in plain words and pair it with a proportionate make-good. When your tone is steady and the next step is specific, the tension eases in your chest and you can stay present.",
          shadow:
            "Be mindful of over-explaining intent or rushing to fix before you’ve named the impact. That can read as managing the moment rather than owning it.",
          gift:
            "Your higher expression is accountability with warmth: a clean apology, a concrete amends, and a brief check-in that proves respect without theatrics. You show that sincerity is simple and repeatable.",
          full_spectrum:
            "Your top two set the engine of your apology; your third keeps it human-sized; lower styles add texture when trust feels thin. Example: “I snapped at you; that was unfair” → replace what slipped → 48-hour check-in to confirm it holds.",
          mantra: "Own it simply. Fix one thing. Follow through.",
          reflection_prompt:
            "What’s the one sentence you need to say? What’s the one action you can finish this week?"
        })
      },
      FEWSHOT_NOTE
    ]
  },

self_love: {
    name: "Self-Love Style",
    povKind: "self",
    styleLabel: {
      ritualist: "Ritual",
      indulger:  "Rest & Indulgence",
      creator:   "Creation",
      reflector: "Reflection",
      connector: "Connection",
      achiever:  "Achievement"
    },
    povContract:
      "SELF-CARE POV. Write from the person caring for themselves: what *you* do that actually restores you. Describe actions, pacing, and cues that tell your body it’s working. No advice to others; keep focus on your own choices and signals.",
    lexiconContract:
      "Use only these six style names (display labels allowed): Ritual, Rest & Indulgence, Creation, Reflection, Connection, Achievement. No archetype terms.",
    bannedPhrases: ["treat yourself (as a cliché)","self-love journey"],
    fullSpectrumSpec:
      "Top1×Top2 = engine of your self-care; #3 = modulator; #4–#5 = supportive accents; #6 = growth edge. Include one arrow sequence across a day or week and one body settling cue.",
    fewshots: [
      {
        role: "assistant",
        content: JSON.stringify({
          mirror:
            "You refill best when rhythm meets relief. Ritual gives your day edges; rest softens the middle. When you light the candle, make the tea, or step into a 10-minute flow, your shoulders drop and your breath evens.",
          shadow:
            "Be mindful of turning care into a checklist. If a ritual can’t bend, it breaks, and the pressure cancels the nourishment.",
          gift:
            "Your higher expression is consistency with kindness: small repeatables you can keep on rough days, plus one flexible swap when life tilts.",
          full_spectrum:
            "Engine: Ritual × Rest; Creation modulates energy; Connection and Reflection add warmth and meaning; Achievement is a growth edge when goals try to outrun capacity. Example: morning reset → 10-minute stretch → text a friend for a walk → one tiny win. Notice where your breath gets even—that’s your green light.",
          mantra: "Keep it gentle, make it keepable.",
          reflection_prompt:
            "What’s your 10-minute minimum today? Where in the day will it live?"
        })
      }
    ]
  },

  love_receiving: {
    name: "Love Language — Receiving",
    povKind: "receiver",
    styleLabel: {
      words: "Words of Affirmation",
      acts:  "Acts of Service",
      gifts: "Gifts",
      time:  "Quality Time",
      touch: "Physical Touch"
    },
    povContract:
      "RECEIVER OF LOVE POV. Write from the person describing what helps YOU feel loved and safe to open—what lands, when, and why. No instructions to the partner; describe your cues and preferences.",
    lexiconContract:
      "Use only these style names: Words of Affirmation, Acts of Service, Gifts, Quality Time, Physical Touch. No attachment labels or archetypes.",
    bannedPhrases: ["love tank","soulmate"],
    fullSpectrumSpec:
      "Top1×Top2 = engine of what lands; #3 = modulator for intensity/timing; #4–#5 = supportive textures. Include one arrow sequence across an evening or weekend and one body cue.",
    fewshots: [
      {
        role: "assistant",
        content: JSON.stringify({
          mirror:
            "You receive love best when your top two arrive together. For you, Quality Time with simple words is the click: undistracted minutes and one sentence that names what they see. Your chest loosens and you lean in.",
          shadow:
            "Be mindful of waiting for perfect timing. If a small version lands now, let it land.",
          gift:
            "Your higher expression is naming what works—specifics, pace, and context—so good love has a pathway to reach you.",
          full_spectrum:
            "Engine: Quality Time × Words; Acts modulates by lightening load; Gifts and Touch add texture when trust is warm. Example: phones down dinner → “I loved how you handled today” → quick dish help → couch lean. Notice when your breath slows; that’s your yes.",
          mantra: "Presence first, then a simple naming.",
          reflection_prompt:
            "What’s one small way you like to receive your top style this week?"
        })
      }
    ]
  },

  love_giving: {
    name: "Love Language — Giving",
    povKind: "giver",
    styleLabel: {
      words: "Words of Affirmation",
      acts:  "Acts of Service",
      gifts: "Gifts",
      time:  "Quality Time",
      touch: "Physical Touch"
    },
    povContract:
      "GIVER OF LOVE POV. Write from the person who gives love—what you naturally do first/next, how you tailor it, and how you check it lands. Keep focus on your actions and calibration; no directing the partner’s feelings.",
    lexiconContract:
      "Use only these style names: Words of Affirmation, Acts of Service, Gifts, Quality Time, Physical Touch. No archetype terms.",
    bannedPhrases: ["grand gesture (as cliché)"],
    fullSpectrumSpec:
      "Top1×Top2 = engine of how you give; #3 = modulator; #4–#5 = accents. Include an arrow sequence and one consent/attunement cue.",
    fewshots: [
      {
        role: "assistant",
        content: JSON.stringify({
          mirror:
            "You give love by making it tangible. Acts lead for you, and Time keeps it warm: you plan, prep, and then show up undistracted. When you see their shoulders drop, you know it landed.",
          shadow:
            "Be mindful of over-functioning. Help can feel like pressure if it arrives without a quick check-in.",
          gift:
            "Your higher expression is consent + clarity: ‘Would this help?’ then one done-for-you step and a relaxed presence.",
          full_spectrum:
            "Engine: Acts × Time; Words modulates by naming the why; Gifts and Touch add texture when invited. Example: set up the errand → “so you can rest tonight” → phones-down hour → a small token or hand squeeze if welcome.",
          mantra: "Ask, then do one thing well.",
          reflection_prompt:
            "What’s one done-for-you action you can complete this week—and when?"
        })
      }
    ]
  },

    stress_response: {
    name: "Stress Response",
    povKind: "self",
    styleLabel: {
      problem_solve:  "Problem-Solving",
      emotion_process:"Emotion-Focused",
      avoidance:      "Avoidance",
      internalize:    "Internalizing"
    },
    povContract:
      "SELF-REGULATION POV. Write from the person describing how YOU cope under stress—what you do, in what sequence, and what helps your body settle. No telling others what to do.",
    lexiconContract:
      "Use only these style names: Problem-Solving, Emotion-Focused, Avoidance, Internalizing. No diagnosis terms.",
    bannedPhrases: ["toxic positivity","grindset"],
    fullSpectrumSpec:
      "Top1×Top2 = engine; #3 = modulator; #4 = growth edge. Include one arrowed micro-sequence and one body cue.",
    fewshots: [
      {
        role: "assistant",
        content: JSON.stringify({
          mirror:
            "You steady fastest when action meets containment. A single next step plus a brief body check lowers the static; your jaw unclenches and you can think again.",
          shadow:
            "Be mindful of skipping feelings entirely; they don’t vanish—they queue.",
          gift:
            "Your higher expression is structured relief: one 15-minute sprint, one grounding ritual, and a planned cool-down.",
          full_spectrum:
            "Engine: Problem-Solving × Emotion-Focused; Avoidance can modulate if scheduled; Internalizing is a growth edge when it turns harsh. Example: list one step → 3 deep breaths → 15-minute sprint → 5-minute walk. Notice when your breath evens.",
          mantra: "Small step, small settle.",
          reflection_prompt:
            "What’s the smallest next step? What 3-minute grounding will you pair with it?"
        })
      }
    ]
  },

  mistake_response: {
    name: "Mistake Response Style",
    povKind: "apologizer",
    styleLabel: {
      appease:     "Appeasement",
      defensive:   "Defensive",
      avoidant:    "Avoidant",
      aggressive:  "Aggressive",
      withdrawn:   "Withdrawn",
      solution:    "Solution-Oriented",
      accountable: "Accountable"
    },
    povContract:
      "APOLOGIZER POV. Write from the person who made the mistake: how YOU tend to react first, what helps you shift toward clean accountability, and what sequence lands as sincere.",
    lexiconContract:
      "Use only these style names: Appeasement, Defensive, Avoidant, Aggressive, Withdrawn, Solution-Oriented, Accountable.",
    bannedPhrases: ["weaponized apology"],
    fullSpectrumSpec:
      "Top1×Top2 = default engine; #3 moderates; #4–#6 add texture; lowest is your growth edge toward Accountability. Include an arrowed example and one relief cue.",
    fewshots: [
      {
        role: "assistant",
        content: JSON.stringify({
          mirror:
            "Under pressure you move fast—either smoothing or fixing—then clarity returns. When you name the impact plainly, your chest loosens and you can choose better next steps.",
          shadow:
            "Be mindful of explaining intent too soon; it can read like defense.",
          gift:
            "Your higher expression: one clean acknowledgment, one proportionate repair, one check-back.",
          full_spectrum:
            "Engine: Solution-Oriented × Appeasement; Defensive moderates when you pause it; Avoidant/Aggressive/Withdrawn show up when shame spikes; Accountable is the growth edge that steadies everything. Example: “I missed the deadline; that put you in a bind” → stay late to close the gap → ping tomorrow to confirm it holds.",
          mantra: "Own one thing. Fix one thing.",
          reflection_prompt:
            "Write the one sentence of ownership you’ll say. What’s the one fix you’ll finish this week?"
        })
      }
    ]
  },

  attachment: {
    name: "Attachment Style",
    povKind: "self",
    styleLabel: {
      secure:   "Secure",
      anxious:  "Anxious",
      avoidant: "Avoidant",
      fearful:  "Fearful-Avoidant"
    },
    povContract:
      "SELF AWARENESS POV. Describe your pattern in connection—what helps YOU settle, what timings/assurances land, and how you can move toward secure behaviors.",
    lexiconContract:
      "Use only these style names: Secure, Anxious, Avoidant, Fearful-Avoidant. No pathologizing language.",
    bannedPhrases: ["clingy","cold-hearted"],
    fullSpectrumSpec:
      "Top1×Top2 color your default; #3 modulates; lowest is a growth edge toward secure. Include an arrowed micro-repair flow and a body cue.",
    fewshots: [
      {
        role: "assistant",
        content: JSON.stringify({
          mirror:
            "Safety returns when signals match needs. A short reassurance or a named space plan calms the spiral; your shoulders drop and conversation opens.",
          shadow:
            "Be mindful of reading silence as rejection or space as disinterest; check the plan, not the story.",
          gift:
            "Your higher expression is secure behavior you can practice: clear bids, paced pauses, reliable reconnects.",
          full_spectrum:
            "Engine depends on your top two; the third modulates reactivity; the lowest points to practice. Example: ‘I care + I need 30 minutes’ → a brief check-in → reconnect at the agreed time. Notice when your breath steadies.",
          mantra: "Name it, pace it, return.",
          reflection_prompt:
            "What 1-line reassurance or space plan helps you settle today?"
        })
      }
    ]
  },

  ambiversion: {
    name: "Ambiversion",
    povKind: "self",
    styleLabel: {
      introvert_strong: "Strong Introvert",
      introvert:        "Leaning Introvert",
      ambivert:         "Balanced Ambivert",
      extrovert:        "Leaning Extrovert",
      extrovert_strong: "Strong Extrovert"
    },
    povContract:
      "ENERGY POV. Describe how YOU refuel—contexts that drain or feed you—and how you plan your week to match energy realistically.",
    lexiconContract:
      "Use only these labels above; avoid stereotyping language.",
    bannedPhrases: ["party animal","antisocial"],
    fullSpectrumSpec:
      "Top1×Top2 = energy center; middle moderates; lower indicates stretch contexts. Include an arrowed day/ week plan and one body cue.",
    fewshots: [
      {
        role: "assistant",
        content: JSON.stringify({
          mirror:
            "You function best when your calendar reflects your energy math. Protected quiet plus the right dose of people time keeps you bright without the crash; your breath evens when the plan fits.",
          shadow:
            "Be mindful of overbooking peaks without recovery windows.",
          gift:
            "Your higher expression: design weeks with ebb and flow—depth blocks, small groups, then reset.",
          full_spectrum:
            "Engine reflects your top two; the middle style helps you flex; the low style is a conscious stretch. Example: solo morning → focused work block → small dinner → early wind-down. Notice where your shoulders drop—keep that ratio.",
          mantra: "Match the plan to the battery.",
          reflection_prompt:
            "What will you protect this week: one depth block, one social window, one reset?"
        })
      }
    ]
  },
  /* ───────── Soul Connection ───────── */
  soul_connection: {
    name: "Soul Connection",
    povKind: "self",
    styleLabel: {
      soulmate:     "Soulmate",
      twin_flame:   "Twin Flame",
      twin_soul:    "Twin Soul",
      karmic:       "Karmic Connection",
      kindred:      "Kindred Spirit"
    },
    povContract:
      "RELATIONSHIP REFLECTION POV. Describe how this connection tends to feel in your body and your life—signals of safety, growth, and pacing. Use ‘may be your…’ language (gentle, non-authoritative). No fate claims, no guarantees, no diagnosis. Offer green/yellow flag awareness as gentle patterns, not verdicts.",
    lexiconContract:
      "Use only these labels: Soulmate, Twin Flame, Twin Soul, Karmic Connection, Kindred Spirit. Keep language reflective and non-deterministic.",
    bannedPhrases: [
      "destined forever","guaranteed","the one and only","twin flames are always meant to be together",
      "you must leave","you must stay"
    ],
    fullSpectrumSpec:
      "Top1×Top2 = center of the bond; #3 modulates flavor; lower two are situational facets. Include one arrow sequence that spans a week or a conflict → repair → everyday rhythm, and one nervous-system cue.",
    fewshots: [
      {
        role: "assistant",
        content: JSON.stringify({
          mirror:
            "This connection may hold a steady center with periodic intensifications. You notice how your breath evens when the everyday care is present, and how your shoulders lift when pace gets too fast. It feels like growth you can keep.",
          shadow:
            "Be mindful of mistaking intensity for depth or comfort for complacency. If loops repeat without repair, name them early and simplify the next choice.",
          gift:
            "Your higher expression is conscious design: small rituals, explicit boundaries, and a shared repair plan. That lets chemistry live inside care.",
          full_spectrum:
            "Engine: your top two define the felt center; the third adds texture; the lower two appear situationally. Example: phones-down dinner → clean check-in after tension → small novelty on the weekend. Notice when your chest loosens—that’s your green light.",
          mantra: "Let meaning ride inside rhythm.",
          reflection_prompt:
            "Name one ritual you’ll protect weekly, and one boundary you’ll keep kindly."
        })
      }
    ]
  },

  /* ───────── Archetype — Identity (Role + Energy) ───────── */
  archetype_identity: {
    name: "Archetype — Role + Energy",
    povKind: "self",
    styleLabel: {
      // Role tops are not mutually exclusive; the “distribution” will be axes. We still need labels to build rows.
      role_Navigator:  "Role: Navigator",
      role_Protector:  "Role: Protector",
      role_Architect:  "Role: Architect",
      role_Guardian:   "Role: Guardian",
      role_Artisan:    "Role: Artisan",
      role_Catalyst:   "Role: Catalyst",
      role_Nurturer:   "Role: Nurturer",
      role_Herald:     "Role: Herald",
      role_Seeker:     "Role: Seeker",
      energy_Muse:     "Energy: Muse",
      energy_Sage:     "Energy: Sage",
      energy_Visionary:"Energy: Visionary",
      energy_Healer:   "Energy: Healer",
      energy_Warrior:  "Energy: Warrior",
      energy_Creator:  "Energy: Creator",
      energy_Lover:    "Energy: Lover",
      energy_Magician: "Energy: Magician",
      energy_Rebel:    "Energy: Rebel",
      energy_Caregiver:"Energy: Caregiver",
      energy_Sovereign:"Energy: Sovereign",
      energy_Jester:   "Energy: Jester"
    },
    povContract:
      "IDENTITY POV. Reflect how your Role (what you do) and Energy (how you’re felt) work together. No shadow labeling. Keep it actionable and concrete (contexts, cues, tiny practices).",
    lexiconContract:
      "Use the Role and Energy names above; no pathologizing terms. No ‘type as destiny’.",
    bannedPhrases: ["this is who you are forever","diagnosis"],
    fullSpectrumSpec:
      "Name Top Role × Top Energy as the engine; mention how secondaries modulate. Include a one-day arrow sequence (morning → collaboration → reset) and one body cue.",
    fewshots: [
      {
        role: "assistant",
        content: JSON.stringify({
          mirror:
            "You move best when your Role and Energy click—what you do meets how people feel you. When they align, your shoulders drop and the room steadies.",
          shadow:
            "Watch for overusing a single strength when the context wants its complement.",
          gift:
            "Your higher expression is pairing your Role with the right Energy dose for the room.",
          full_spectrum:
            "Engine: Top Role × Top Energy; secondaries color tone by task. Example: morning focus block → guide a teammate with calm authority → light reset walk. Track the moment your breath evens.",
          mantra: "Do what fits; bring the energy that lands.",
          reflection_prompt:
            "Where will you use your Role today—and what Energy serves that room?"
        })
      }
    ]
  },

  /* ───────── Archetype Preference — Attraction Map ───────── */
  archetype_preference: {
    name: "Archetype Preference",
    povKind: "self",
    styleLabel: {
      // We’ll show preferences for both axes; keep “pref_” to avoid clash with identity labels.
      role_pref_Navigator:  "Prefer Role: Navigator",
      role_pref_Protector:  "Prefer Role: Protector",
      role_pref_Architect:  "Prefer Role: Architect",
      role_pref_Guardian:   "Prefer Role: Guardian",
      role_pref_Artisan:    "Prefer Role: Artisan",
      role_pref_Catalyst:   "Prefer Role: Catalyst",
      role_pref_Nurturer:   "Prefer Role: Nurturer",
      role_pref_Herald:     "Prefer Role: Herald",
      role_pref_Seeker:     "Prefer Role: Seeker",
      energy_pref_Muse:     "Prefer Energy: Muse",
      energy_pref_Sage:     "Prefer Energy: Sage",
      energy_pref_Visionary:"Prefer Energy: Visionary",
      energy_pref_Healer:   "Prefer Energy: Healer",
      energy_pref_Warrior:  "Prefer Energy: Warrior",
      energy_pref_Creator:  "Prefer Energy: Creator",
      energy_pref_Lover:    "Prefer Energy: Lover",
      energy_pref_Magician: "Prefer Energy: Magician",
      energy_pref_Rebel:    "Prefer Energy: Rebel",
      energy_pref_Caregiver:"Prefer Energy: Caregiver",
      energy_pref_Sovereign:"Prefer Energy: Sovereign",
      energy_pref_Jester:   "Prefer Energy: Jester"
    },
    povContract:
      "ATTRACTION POV. Describe what you’re most drawn to lately—how it feels in your body, what it brings out in you, and how to engage it wisely. This is not compatibility or fate.",
    lexiconContract:
      "Use the ‘Prefer Role/Prefer Energy’ labels above. You may gently mention shadow pulls as tendencies, not identities.",
    bannedPhrases: ["soul contract","you’re destined to end up with"],
    fullSpectrumSpec:
      "Top1×Top2 attractions = engine of pull; #3 modulates; include one arrowed dating/connection micro-flow and one cue to check consent/safety.",
    fewshots: [
      {
        role: "assistant",
        content: JSON.stringify({
          mirror:
            "Lately you’re pulled by a specific flavor of leadership and presence; your body leans toward it before your mind names it.",
          shadow:
            "Notice if the pull spikes when you’re under-resourced; intensity can mask mismatch.",
          gift:
            "Use the attraction as a compass, not a contract. Ask for small examples first.",
          full_spectrum:
            "Engine: your top two preferences set the pull; the third fine-tunes context. Example: coffee chat → one small plan → check how your breath feels around them before you scale.",
          mantra: "Let the signal be information, not obligation.",
          reflection_prompt:
            "What small step lets you test this preference while staying resourced?"
        })
      }
    ]
  },


};

/* Router */
function resolveProfile(quiz_slug: string): QuizProfile {
  const s = (quiz_slug || "").toLowerCase();

  if (/apology-language/.test(s)) return QUIZ_PROFILES.apology;
  if (/forgive|forgiveness|repair/.test(s)) return QUIZ_PROFILES.forgiveness;

  if (/love-language-receiving/.test(s)) return QUIZ_PROFILES.love_receiving;
  if (/love-language-giving/.test(s))   return QUIZ_PROFILES.love_giving;
  if (/self-love-style/.test(s))        return QUIZ_PROFILES.self_love;

  if (/soul-connection/.test(s))        return QUIZ_PROFILES.soul_connection;

  if (/archetype-dual/.test(s))         return QUIZ_PROFILES.archetype_identity;
  if (/archetype-preference/.test(s))   return QUIZ_PROFILES.archetype_preference;

  // last resort
  return QUIZ_PROFILES.forgiveness;
}



/* ───────────── JSON schema hint ───────────── */
const SCHEMA_HINT = {
  schema: {
    mirror: "string",
    shadow: "string",
    gift: "string",
    full_spectrum: "string",
    mantra: "string",
    reflection_prompt: "string"
  },
  version: HMV_VERSION,
  instruction: "Return STRICT JSON with exactly these keys. No markdown, no extra keys."
} as const;

/* ---------- Copy atoms (unchanged for fallbacks) ---------- */
const DEFAULT_ATOMS_BY_STYLE: Record<string, any> = {
  words: {
    behavior: "hear sincere, specific language that names the behavior and its impact",
    motive: "clear words restore your sense of understanding and safety",
    immediate_impact: "feel seen and safer to re-engage",
    grounded_example: "hear “I joked at your expense; that was unfair and it hurt you”",
    strength: "you reopen dialogue with plain, specific language",
    shadow: "words without follow-through can feel polished but empty",
    consequence: "doubt creeps back if slips repeat and nothing changes",
    concrete_ask: "Will you say what happened and one concrete change you’ll try?"
  },
  accountability: {
    behavior: "hear specific ownership of what happened and its impact",
    motive: "clear responsibility is the doorway to safety",
    immediate_impact: "your body settles when blame-shifting stops",
    grounded_example: "hear “I interrupted you and made the meeting harder” before next steps",
    strength: "you restore dignity with clarity",
    shadow: "over-focus on perfect wording can stall repair",
    consequence: "trust stays brittle without one prevention step",
    concrete_ask: "Can you name what happened and one step to prevent a repeat?"
  },
  repair: {
    behavior: "see a visible, proportional fix to what broke",
    motive: "action proves care more than explanations",
    immediate_impact: "exhale and begin to trust the path back",
    grounded_example: "replace what was lost or set a concrete make-good by Friday",
    strength: "you turn remorse into movement",
    shadow: "a fix can feel transactional if feelings are skipped",
    consequence: "resentment lingers when repair lands cold",
    concrete_ask: "Can we agree on one specific fix by a set date?"
  },
  gift: {
    behavior: "receive small, personal gestures that match the harm",
    motive: "a thoughtful act shows attunement without a lecture",
    immediate_impact: "warmth returns and your guard lowers a notch",
    grounded_example: "a short handwritten note paired with a fitting gesture",
    strength: "you let care be felt, not argued",
    shadow: "gestures without ownership can feel performative",
    consequence: "mixed signals grow if gifts try to replace repair",
    concrete_ask: "A small, specific gesture paired with naming what happened would help."
  },
  time: {
    behavior: "get space and steady check-ins before resolution",
    motive: "consistency gives your nervous system room to unclench",
    immediate_impact: "pressure drops and your thinking clears",
    grounded_example: "set a 48-hour pause with a time to reconnect",
    strength: "you protect the bond by pacing",
    shadow: "too much space can read as distance",
    consequence: "disconnection grows if check-ins don’t happen",
    concrete_ask: "I need two days and a set time to talk again—can you confirm?"
  },
  change: {
    behavior: "observe consistent pattern change over time",
    motive: "evidence calms your body more than promises",
    immediate_impact: "your shoulders drop as commitments are kept",
    grounded_example: "see two weeks of the new behavior with one check-in",
    strength: "you anchor forgiveness in reliability",
    shadow: "waiting for proof can minimize the present hurt",
    consequence: "hurt freezes if change isn’t named out loud",
    concrete_ask: "Let’s pick one habit to change and a date to review it."
  }
};

const WHAT_MATTERS_BY_STYLE: Record<string, string[]> = {
  words: [
    "Specific acknowledgment of behavior and impact",
    "Tone and body language that match the words",
    "No defensiveness or justification",
    "A small action paired with the apology",
    "Room for clarifying questions"
  ],
  accountability: [
    "Specific ownership",
    "No qualifiers (“but …”)",
    "One prevention step",
    "Room for reflection",
    "Name emotions before moving on"
  ],
  repair: [
    "Visible, proportional fix",
    "Clear done-point within 24–72 hours",
    "Updates without being chased",
    "Brief acknowledgment so the action isn’t cold",
    "Own slips and reset deadlines"
  ],
  gift: [
    "Gestures follow ownership—don’t replace it",
    "Small and personal",
    "Paced to your nervous system",
    "A note that names what happened",
    "One gentle check-in after"
  ],
  time: [
    "State the space you need with a re-engage time",
    "Gentle check-ins, not disappearance",
    "Consistency during the cool-off",
    "No pressure to resolve early",
    "A simple reconnect plan"
  ],
  change: [
    "Clear pattern change with checkpoints",
    "Small promises that are kept",
    "Evidence over explanations",
    "Accountability if a slip happens",
    "A timeframe that matches the pattern"
  ]
};

const STYLE_LABEL: Record<string, string> = {
  words: "Words",
  accountability: "Accountability",
  repair: "Repair/Amends",
  gift: "Gesture/Gift",
  time: "Time/Consistency",
  change: "Changed Behavior"
};

function weaveRunnerUpInsight(top: string, runner?: string | null) {
  if (!runner) return "";
  const t = top, r = runner;
  if (t === "words" && r === "change") return "Your runner-up, Changed Behavior, makes proof over time the seal on sincere words.";
  if (t === "words" && r === "repair") return "Precise language paired with a visible fix lands best for you.";
  if (t === "repair" && r === "words") return "A brief acknowledgment before the fix keeps it from feeling cold.";
  if (t === "repair" && r === "change") return "A concrete amends now with a pattern shift over time works for you.";
  if (t === "gift" && r === "words") return "A small, sincere gesture lands when it’s tied to specific ownership.";
  if (t === "time" && r === "words") return "Naming what happened helps you re-engage after space.";
  if (t === "change" && r === "words") return "Evidence matters most, with words as a check-in, not a substitute.";
  return `Your runner-up, ${STYLE_LABEL[r] || r}, adds a useful nuance.`;
}

function weaveZeros(zeroKeys: string[]) {
  const z = (zeroKeys || []).filter(Boolean);
  if (!z.length) return "";
  const labels = z.slice(0, 2).map(k => STYLE_LABEL[k] || k).join(", ");
  return `You rarely use ${labels}; prompt, direct resolution may feel safer than waiting it out.`;
}

function sentence(s: string) {
  return String(s || "").replace(/\s+/g, " ").trim().replace(/\.\s*$/, "") + ".";
}
function joinSentences(parts: string[], _max = 6) {
  return parts.filter(Boolean).map(sentence).join(" ");
}

/* ---------- Tiny composer fallback ---------- */
function composeHMV(
  styleKey: string,
  dist: ReturnType<typeof computeDistribution>,
  whatMatters: string[]
) {
  const b = DEFAULT_ATOMS_BY_STYLE[styleKey] || DEFAULT_ATOMS_BY_STYLE.words;

  const mirror = joinSentences([
    `You forgive most easily when you ${b.behavior}`,
    `That matters because ${b.motive}`,
    `When that condition is present, you ${b.immediate_impact}`,
    `Example: ${b.grounded_example}`
  ]);

  const shadow = sentence(`Be mindful that ${b.shadow}`);
  const gift   = joinSentences([ b.strength, `Balanced with context and timing, it lands as real care.` ]);

  const runner = dist.runner_up_key && dist.runner_up_score > 0 ? String(dist.runner_up_key) : null;
  const ruLine = weaveRunnerUpInsight(styleKey, runner);
  const zLine  = weaveZeros(dist.zero_keys || []);
  const matters = (Array.isArray(whatMatters) && whatMatters.length)
    ? `What matters most: ${whatMatters.slice(0,4).join(", ")}.`
    : "";

  const full_spectrum = joinSentences([ruLine, zLine, matters]);

  const ask = (b.concrete_ask || "").replace(/^["“]|["”]$/g, "");
  const mantra = ask || "Clarity first; then care; then one steady next step.";

  return { mirror, shadow, gift, full_spectrum, mantra };
}

/* ---------- (Legacy) Map fallback — retained but can be hidden in UI ---------- */
function labelOf(k: string) {
  const map: Record<string,string> = STYLE_LABEL;
  return map[k] || k;
}
function seqLine(order: string[]) {
  const labels = order.map(labelOf);
  return labels.join(" → ");
}
function needsSentence(order: string[]) {
  const first = order[0]; const second = order[1]; const last = order[order.length-1];
  const parts: string[] = [];
  if (first === "words") parts.push("Clear, specific words that name what happened open the door first.");
  if (first === "accountability") parts.push("Unambiguous ownership of behavior and impact is the entry point.");
  if (first === "time") parts.push("A calm window of space with a named time to reconnect lets your body settle.");
  if (first === "gift") parts.push("Small, personal gestures that match the harm help you feel seen.");
  if (first === "repair") parts.push("A visible, proportional fix shows care in motion.");
  if (first === "change") parts.push("Consistent pattern change proves safety over time.");
  if (second === "accountability") parts.push("Once words land, responsibility sustains trust.");
  if (second === "words") parts.push("Once ownership is named, simple language keeps the bridge steady.");
  if (second === "time") parts.push("A short pause after the first step prevents pressure from flooding the moment.");
  if (second === "repair") parts.push("A fitting amends next shows the care isn’t just verbal.");
  if (second === "gift") parts.push("A small gesture can soften the edges after the first step is met.");
  if (second === "change") parts.push("Evidence over a few days or weeks turns relief into confidence.");
  parts.push(`Least effective for you is ${labelOf(last)} when it tries to go first.`);
  return parts.join(" ");
}
function othersPlaySentence(order: string[]) {
  const steps = order.slice(0, 4).map(labelOf);
  return `Start with ${steps[0].toLowerCase()}, then ${steps[1].toLowerCase()}, add ${steps[2].toLowerCase()} as needed, and close with ${steps[3].toLowerCase()}; keep it simple and human.`;
}
function whyWorksSentence(order: string[]) {
  const first = order[0]; const second = order[1];
  if (first === "words" && second === "accountability")
    return "Words restore understanding; accountability makes it safe. Space and either a small repair or a gentle gesture lower the remaining tension. Proof over time is optional seasoning—not the main course.";
  if (first === "accountability" && second === "words")
    return "Ownership stops the doubt spiral; plain language helps it settle. A short pause protects the bond from pressure, and a fitting amends turns intent into motion.";
  if (first === "time" && second === "words")
    return "Your system calms with pacing; then language can be heard. From there, a small fix or gesture keeps warmth present while trust reforms.";
  return "This order mirrors how your nervous system rebuilds safety—signal first, then pacing or proof, then small tangible care.";
}
function composeForgiversMapFallback(dist: ReturnType<typeof computeDistribution>) {
  const order = dist.ordered.map(([k]) => k);
  const short = [
    `Your repair sequence tends to move like this: ${seqLine(order)}.`,
    needsSentence(order),
  ].join(" ");
  const long = [
    `What helps you forgive: ${needsSentence(order)}`,
    `What others can do: ${othersPlaySentence(order)}`,
    `Why this works for you: ${whyWorksSentence(order)}`
  ].join(" ");
  return { short, long };
}

function composeGenericFallback(
  profile: QuizProfile,
  dist: ReturnType<typeof computeDistribution>
) {
  const labels = profile.styleLabel;
  const order = dist.ordered.map(([k]) => labels[k] || k);

  const top1 = order[0] || "Top Style";
  const top2 = order[1] || "Runner-up";
  const third = order[2] || "";
  const low   = order[order.length - 1] || "";

  const arrow = order.slice(0, Math.min(4, order.length)).join(" → ");

  const mirror = `You tend to lead with ${top1.toLowerCase()}, supported by ${top2.toLowerCase()}. When those are present in proportion, your body starts to settle and it’s easier to stay present.`;
  const shadow = `Be mindful of over-relying on ${top1.toLowerCase()} when timing or context asks for a softer entry. If ${low.toLowerCase()} tries to go first, it can add pressure instead of relief.`;
  const gift   = `Your higher expression is choosing a simple, right-sized step and letting ${third ? third.toLowerCase() : "your mid style"} keep it human and doable.`;

  const full_spectrum = `Engine: ${top1} × ${top2}; ${third ? `${third} acts as a modulator,` : ""} lower styles add texture when trust or energy is thin. Example flow: ${arrow}. Notice the moment your breath evens out—use that as your cue to continue.`;

  const mantra = "Keep it specific, right-sized, and repeatable.";
  const reflection_prompt = "Name one small step that fits today. When will you do it?";

  return { mirror, shadow, gift, full_spectrum, mantra, reflection_prompt };
}


/* ---------- Validation helpers ---------- */
const GLOBAL_BANNED = [
  "journey toward forgiveness",
  "embrace your power",
  "growth mindset",
  "healing process",
  "your ability to express yourself"
];
const BANNED_VIRTUES = ["visionary", "archetype", "protector", "caregiver", "muse", "sage", "vision"];

function looksConcrete(s: string) {
  const cues = /(shoulders|breath|settle|tone|timing|touch|example|for example|“|")/i;
  return cues.test(s || "");
}
function mentionsDistribution(s: string) {
  return /(top two|runner[- ]?up|top\s*→\s*bottom|top to bottom|engine|modulate|growth edge|#2|#3)/i.test(s || "");
}
function violatesLexicon(s: string) {
  const txt = (s || "").toLowerCase();
  return BANNED_VIRTUES.some(w => txt.includes(w));
}
function nameTopTwoInMirror(m: string, top1: string, top2: string) {
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const t1 = new RegExp(esc(top1), "i");
  const t2 = new RegExp(esc(top2), "i");
  return t1.test(m) && t2.test(m);
}
function mentionsStyleByName(s: string, ...styles: string[]) {
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return styles.every(st => new RegExp(esc(st), "i").test(s || ""));
}
function contradictsZeros(s: string, zeroLabels: string[]) {
  const txt = (s || "").toLowerCase();
  return zeroLabels.some(label => {
    const rx = new RegExp(label.toLowerCase());
    const elevates = /(drives|anchors|core|engine|central|foundation|you rely on)/;
    return rx.test(txt) && elevates.test(txt);
  });
}

/* Profile-aware validator */
function makeValidator(profile: QuizProfile) {
  const banned = profile.bannedPhrases || [];
  const styleLabel = profile.styleLabel;

  return function validateCore(core: any, dist: ReturnType<typeof computeDistribution>) {
    const m  = String(core?.mirror || "");
    const sh = String(core?.shadow || "");
    const g  = String(core?.gift || "");
    const fs = String(core?.full_spectrum || "");
    const man= String(core?.mantra || "");
    const rp = String(core?.reflection_prompt || "");

    const present =
      m.length > 120 && sh.length > 80 && g.length > 80 && fs.length > 120 &&
      man.length > 5 && rp.length > 20;

    const bannedFree = [m,sh,g,fs].every(x =>
      !GLOBAL_BANNED.some(b => x.toLowerCase().includes(b)) &&
      !banned.some(b => x.toLowerCase().includes(b.toLowerCase()))
    );

    const concreteOK = /(shoulders|breath|settle|tone|timing|touch|example|“|")/i.test(m+fs);

    const T1 = styleLabel[dist.top_key] || dist.top_key;
    const T2 = styleLabel[dist.runner_up_key] || dist.runner_up_key;
    const namesOK = nameTopTwoInMirror(m, T1, T2) && mentionsStyleByName(fs, T1, T2);

    

    const arrowOK = /(→|->|›)/.test(fs);
    const distLangOK = /(engine|runner[- ]?up|top\s*→\s*bottom|modulate|growth edge|#2|#3)/i.test(fs);
    const bodyCueOK = /(breath|shoulders|body|chest).*(settle|ease|drop|even|relax)/i.test(fs);

    const zeroLabels = (dist.zero_keys || []).map(k => (styleLabel[k] || k));
    const noZeroContradiction = !contradictsZeros([m,sh,g,fs].join(" "), zeroLabels);

    const lexiconOK = true; // handled by contracts & banned words above

    const blockDirectives = /\b(they|partner)\s+(should|need to|must)\b/i.test(m+sh+g+fs);

    

    let povOK = false;
    if (profile.povKind === "forgiver") {
      povOK = [m,sh,g,fs].every(isForgiverFramed);
      povOK = povOK && !/(you (apologize|make amends|fix it for them))/i.test(m+sh+g+fs);
    } else if (profile.povKind === "apologizer") {
      povOK = [m,sh,g,fs].every(isApologizerFramed) && !blockDirectives;
    } else if (profile.povKind === "receiver") {
      povOK = [m,sh,g,fs].every(isReceiverFramed) && !blockDirectives;
    } else if (profile.povKind === "giver") {
      povOK = [m,sh,g,fs].every(isGiverFramed) && !blockDirectives;
    } else if (profile.povKind === "self") {
      povOK = [m,sh,g,fs].every(isSelfLoveFramed);
    }

    // Allow archetype profiles to skip explicit name checks to avoid awkward phrasing
const isArchetype = profile === QUIZ_PROFILES.archetype_identity || profile === QUIZ_PROFILES.archetype_preference;
const namesPass = isArchetype ? true : namesOK;

return present && bannedFree && concreteOK && namesPass && arrowOK &&
       distLangOK && bodyCueOK && noZeroContradiction && lexiconOK && povOK;

    
  };
}


/* Corrective note — profile-aware */
function makeFixNote(profile: QuizProfile) {
  const pov = profile.name === "Apology Language"
    ? "APOLOGIZER POV ONLY."
    : "FORGIVER POV ONLY.";
  const stylesList = Object.values(profile.styleLabel).join(", ");
  return {
    role: "system" as const,
    content:
      `${pov} Use only these style names: ${stylesList}. Name Top1 and Top2 explicitly in Mirror and Full Spectrum. No archetype terms or vague virtues (e.g., 'vision'). If any style is zero, do not center it. In Full Spectrum, write Top1×Top2 engine + #3 modulator + #4–#5 supports + #6 growth edge; include one body cue and an arrow sequence. Return strict JSON.`
  };
}

function displayHeadingFor(profile: QuizProfile): string {
  switch (profile.povKind) {
    case "forgiver":   return "How your forgiveness styles show up";
    case "apologizer": return "How your apology styles show up";
    case "receiver":   return "How your love languages land";
    case "giver":      return "How you tend to give love";
    case "self":       return "How your styles show up";
    default:           return "Your style distribution";
  }
}

function labeledDistribution(
  profile: QuizProfile,
  dist: ReturnType<typeof computeDistribution>
): HMVLabelledScore[] {
  const labels = profile.styleLabel || {};
  const total = (dist.ordered || []).reduce((acc, [, v]) => acc + (Number(v) || 0), 0) || 0;

  return (dist.ordered || []).map(([key, score], idx) => {
    const pct = total ? Math.round((Number(score) * 1000) / total) / 10 : 0; // 1 decimal
    return {
      key,
      label: labels[key] || key,
      score: Number(score) || 0,
      percent: pct,
      rank: idx + 1
    };
  });
}



/* ───────────── Handler ───────────── */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: cors });

  try {
    // attempt_id
    const url = new URL(req.url);
    const qAttempt = url.searchParams.get("attempt_id") || url.searchParams.get("attemptId");
    const fresh = url.searchParams.get("fresh") === "1";
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

    // clients
    const SUPABASE_URL = env("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
    const OPENAI_API_KEY = env("OPENAI_API_KEY");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    // load attempt
    const { data: attempt } = await supabase
      .from("quiz_attempts")
      .select("id, user_id, quiz_slug, result_title, result_key, result_totals, result_copy")
      .eq("id", attempt_id)
      .maybeSingle<Attempt>();
    if (!attempt) return json({ error: "Attempt not found" }, 404);

    if (!fresh && attempt.result_copy) {
      return json({ ...attempt.result_copy, from_cache: true });
    }

    // signals
    const quiz_family = mapSlugToFamily(attempt.quiz_slug || "");
    const style_key   = (attempt.result_key || "").toLowerCase();
    const dist        = computeDistribution(attempt.result_totals || {});
    const archetype   = attempt.user_id ? await loadLatestArchetype(supabase, attempt.user_id) : null;

    const userSignals = {
      quiz_slug: attempt.quiz_slug,
      quiz_family,
      result_title: attempt.result_title,
      result_key: style_key,
      result_totals: attempt.result_totals || {},
      distribution: dist,
      archetype: archetype
    };

    // profile + validator
    const profile = resolveProfile(attempt.quiz_slug || "");
    const validateCore = makeValidator(profile);
    const fixNote = makeFixNote(profile);

    // messages (POV/lexicon come from profile, not from global forgiveness-only contracts)
    const messages_base = [
      { role: "system" as const, content: HMV_SYSTEM },
      { role: "system" as const, content: JSON.stringify(SCHEMA_HINT) },
      { role: "system" as const, content: profile.povContract },
      { role: "system" as const, content: profile.lexiconContract },
      ...profile.fewshots
    ];

    const userMsg = { role: "user" as const, content: JSON.stringify(userSignals) };

    const generate = async (messages: any[]) => {
      const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.4,
        top_p: 0.9,
        frequency_penalty: 0.3,
        presence_penalty: 0.1,
        max_tokens: 1400,
        messages
      });
      const raw = resp.choices?.[0]?.message?.content ?? "{}";
      try { return JSON.parse(raw); } catch { return {}; }
    };

    // first pass
    let modelOut = await generate([...messages_base, userMsg]);

    // normalize shape (accept flat or core_result)
    const flat = modelOut && modelOut.mirror && modelOut.shadow ? modelOut : null;
    const coreIn = modelOut?.core_result || flat || {};
    const initialValid = validateCore(coreIn, dist);

    // corrective retry if invalid
    if (!initialValid) {
      modelOut = await generate([...messages_base, fixNote, userMsg]);
    }

    // normalize again
    const flat2 = modelOut && modelOut.mirror && modelOut.shadow ? modelOut : null;
    const coreModel = modelOut?.core_result || flat2 || {};
    const coreValid = validateCore(coreModel, dist);

    // compose fallbacks if needed
    const wm = WHAT_MATTERS_BY_STYLE[style_key] || [];
    const hmvFallback = (profile.povKind === "forgiver" || profile.povKind === "apologizer")
  ? composeHMV(style_key, dist, wm)              // your tuned atoms work fine here
  : composeGenericFallback(profile, dist);       // generic for self/receiving/giving
    const mapFallback = composeForgiversMapFallback(dist);

    const pick = (v: string | null | undefined, fb: string): string => {
      const s = (v ?? "").trim();
      return s.length ? s : fb;
    };

    // build payload -------------------------------------------------
const overlayLabel = archetype?.title || null;

const _mirror = pick(coreModel?.mirror, hmvFallback.mirror);
const _shadow = pick(coreModel?.shadow, hmvFallback.shadow);
const _gift   = pick(coreModel?.gift,   hmvFallback.gift);
const _fs     = pick(coreModel?.full_spectrum, hmvFallback.full_spectrum);
const _mantra = pick(coreModel?.mantra, hmvFallback.mantra);
const _rp     = pick(coreModel?.reflection_prompt,
  "Name one small action that would match the impact here. When could it happen?"
);

// POV validation (same logic you already had)
const povOk = profile.name === "Apology Language"
  ? [ _mirror, _shadow, _gift, _fs ].every(isApologizerFramed)
      && !containsReceiverDirectives([_mirror,_shadow,_gift,_fs].join(" "))
  : [ _mirror, _shadow, _gift, _fs ].every(isForgiverFramed)
      && !containsOffenderActionsForgiver([_mirror,_shadow,_gift,_fs].join(" "));

// Show the Forgiver’s Map only for forgiver POV
const showForgiversMap = profile.povKind === "forgiver";

// Optional: server-side heading + rows for the distribution bar
const stylesHeading = displayHeadingFor(profile);
const displayRows   = labeledDistribution(profile, dist);

const payload: HMVPayload = {
  core_result: {
    headline: attempt.result_title || "Your result",
    subtitle: "",
    mirror: _mirror,
    shadow: _shadow,
    gift: _gift,
    full_spectrum: _fs,
    mantra: _mantra,
    forgivers_map: showForgiversMap ? {
      short: mapFallback.short,
      long:  mapFallback.long,
    } : undefined,
    source:
      `version:${HMV_VERSION} | profile:${profile.name} | ` +
      `pov_ok:${povOk} | runner_up_used:${/runner[- ]?up/i.test(_fs)} | ` +
      `zeros_used:${/you rarely use/i.test(_fs)}`
  },

  archetype_overlay: {
    label: overlayLabel,
    paragraph: modelOut?.archetype_overlay?.paragraph ?? null,
    source: modelOut?.archetype_overlay?.source
            ?? (overlayLabel ? `Archetype: ${overlayLabel}` : null)
  },

  meta: {
    quiz_family,
    distribution: dist,
    // 👉 the only UI hints we ship now:
    styles_heading: stylesHeading,
    display_distribution: displayRows,
  }
};


    // cache
    await supabase.from("quiz_attempts").update({ result_copy: payload }).eq("id", attempt_id);

    // audit raw (best effort)
    try {
      await supabase.from("quiz_result_narratives").insert({
        attempt_id,
        quiz_family,
        payload: modelOut
      });
    } catch {}

    return json({ ...payload, from_cache: false }, 200);

  } catch (e) {
    console.error("[quiz-narrative] error:", e);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
