// scripts/seed_love_language_giving_v2.mjs
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("❌ Missing Supabase env vars (VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}
const admin = createClient(url, key);

// Dual Archetype allow-lists (canon-aligned)
const VALID_ROLES = new Set([
  "Navigator","Protector","Architect","Guardian","Artisan",
  "Catalyst","Nurturer","Herald","Seeker"
]);
// Energies: add Sovereign, Jester. (Hermit/Trickster are SHADOWS only)
const VALID_ENERGIES = new Set([
  "Muse","Sage","Visionary","Healer","Warrior","Creator",
  "Lover","Magician","Rebel","Caregiver","Sovereign","Jester"
]);
const VALID_SHADOWS = new Set([
  "Victim","Saboteur","Addict","Shadow Rebel","Tyrant","Trickster","Hermit","Martyr","Nihilist"
]);

function sanitizeTagMap(map, valid) {
  if (!map || typeof map !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(map)) {
    if (valid.has(k) && typeof v === "number" && v > 0) out[k] = v;
  }
  return out;
}

const quiz = {
  slug: "love-language-giving",
  title: "Love Language — Giving",
  category: "Connection",
  description:
    "How do you most naturally give love—Words, Acts, Gifts, Time, or Touch? Get guidance to give love in ways that actually land.",
  is_published: true,
  questions: {
    version: 2,
    min_required: 9,
    results: [
      {
        key: "words",
        label: "Words of Affirmation (Giver)",
        headline: "You speak love into people.",
        summary: "You express love through praise, reassurance, and thoughtful words.",
        guidance: [
          "Be specific—affirm actions and efforts, not only identity.",
          "Pair words with presence (tone, eye contact, timing).",
          "Use warmth and play (Jester) without undercutting sincerity."
        ]
      },
      {
        key: "acts",
        label: "Acts of Service (Giver)",
        headline: "You love by doing.",
        summary: "You show up with support, errands, planning, and problem-solving.",
        guidance: [
          "Confirm what help is actually helpful (consent + clarity).",
          "Narrate intent so action doesn’t read as control (Sovereign).",
          "Avoid over-functioning—leave room for reciprocity."
        ]
      },
      {
        key: "gifts",
        label: "Gifts (Giver)",
        headline: "You love through thoughtful gestures.",
        summary: "You mark moments with tokens that say ‘I see you.’",
        guidance: [
          "Personalize to their world; keep a running ‘delight list.’",
          "Smaller, frequent, aligned > grand but mismatched.",
          "Add one sentence naming the why (meaning > money)."
        ]
      },
      {
        key: "time",
        label: "Quality Time (Giver)",
        headline: "You love with presence.",
        summary: "You carve out undistracted time and shared rituals.",
        guidance: [
          "Protect time with boundaries (phones down, DND).",
          "Build micro-rituals—walks, tea, weekly check-ins.",
          "Match their preferred pace (quiet vs. activity)."
        ]
      },
      {
        key: "touch",
        label: "Physical Touch (Giver)",
        headline: "You speak love with your body.",
        summary: "Hugs, hand squeezes, and closeness are your native language.",
        guidance: [
          "Ask for consent cues; be attentive to context.",
          "Blend touch with reassurance for deeper safety.",
          "Keep it varied: playful, grounding, celebratory."
        ]
      }
    ],
    questions: [
      // Q1 — Bad day rescue (add Jester, Sovereign)
      {
        id: "q1",
        type: "scenario",
        prompt: "Your partner had a rough day. What’s your go-to way to show love?",
        optional: false,
        options: [
          { key: "a1", label: "Speak life over them—remind them who they are.", weights: { words: 2 }, weights_role: { Herald: 1 }, weights_energy: { Muse: 1, Healer: 1, Jester: 1 } },
          { key: "a2", label: "Handle a chore or errand so they can rest.",    weights: { acts: 2 },  weights_role: { Protector: 1, Architect: 1 }, weights_energy: { Caregiver: 1, Warrior: 1, Sovereign: 1 } },
          { key: "a3", label: "Bring a small treat that’ll lift their mood.",   weights: { gifts: 2 }, weights_role: { Nurturer: 1, Artisan: 1 }, weights_energy: { Lover: 1, Creator: 1 } },
          { key: "a4", label: "Plan quiet time together—no phones, just us.",   weights: { time: 2 },  weights_role: { Guardian: 1 }, weights_energy: { Caregiver: 1 } },
          { key: "a5", label: "Wrap them in a hug and stay close.",             weights: { touch: 2 }, weights_role: { Protector: 1 }, weights_energy: { Lover: 1, Healer: 1 } }
        ]
      },

      // Q2 — H2H: Words vs Acts (Jester, Sovereign accents)
      {
        id: "q2",
        type: "head_to_head",
        prompt: "Which love expression feels more like you?",
        optional: false,
        options: [
          { key: "a", label: "Say the right words at the right time.", weights: { words: 2 }, weights_role: { Herald: 1 }, weights_energy: { Muse: 1, Jester: 1 } },
          { key: "b", label: "Do the right thing at the right time.",  weights: { acts: 2 },  weights_role: { Architect: 1 }, weights_energy: { Creator: 1, Sovereign: 1 } }
        ]
      },

      // Q3 — Quick pref
      {
        id: "q3",
        type: "quick_pref",
        prompt: "Which way of saying “I love you” more closely fits your personality?",
        optional: false,
        options: [
          { key: "a1", label: "Actually saying “I love you”.",         weights: { words: 2 }, weights_role: { Herald: 1 }, weights_energy: { Lover: 1, Muse: 1, Jester: 1 } },
          { key: "a2", label: "Doing something helpful without being asked.", weights: { acts: 2 }, weights_role: { Protector: 1 }, weights_energy: { Caregiver: 1, Sovereign: 1 } },
          { key: "a3", label: "Surprising them with something thoughtful.",  weights: { gifts: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Lover: 1, Creator: 1 } },
          { key: "a4", label: "Carving out uninterrupted time.",             weights: { time: 2 },  weights_role: { Guardian: 1 }, weights_energy: { Caregiver: 1 } },
          { key: "a5", label: "Affection—hugs, hand squeezes, closeness.",   weights: { touch: 2 }, weights_role: { Protector: 1 }, weights_energy: { Lover: 1 } }
        ]
      },

      // Q4 — Birthday (add Sovereign to acts)
      {
        id: "q4",
        type: "scenario",
        prompt: "It’s their birthday. What feels most like you?",
        optional: false,
        options: [
          { key: "a1", label: "Write a note that names what you adore about them.",       weights: { words: 2 }, weights_role: { Herald: 1 }, weights_energy: { Muse: 1, Jester: 1 } },
          { key: "a2", label: "Handle the planning—reservations, logistics, the works.", weights: { acts: 2 },  weights_role: { Architect: 1, Navigator: 1 }, weights_energy: { Creator: 1, Sovereign: 1 } },
          { key: "a3", label: "Find a meaningful gift with a story behind it.",          weights: { gifts: 2 }, weights_role: { Artisan: 1, Nurturer: 1 }, weights_energy: { Lover: 1, Creator: 1 } },
          { key: "a4", label: "Spend the whole day together, just present.",             weights: { time: 2 },  weights_role: { Guardian: 1 }, weights_energy: { Caregiver: 1 } },
          { key: "a5", label: "Wake-up cuddles + touch all day.",                        weights: { touch: 2 }, weights_role: { Protector: 1 }, weights_energy: { Lover: 1 } }
        ]
      },

      // Q5 — Likert (acts planning)
      {
        id: "q5",
        type: "likert",
        prompt: "“I show love best through planning and doing.”",
        scale: ["Strongly Disagree","Disagree","Neutral","Agree","Strongly Agree"],
        optional: false,
        options: [
          { key: "sd", label: "Strongly Disagree", weights: {} },
          { key: "d",  label: "Disagree",          weights: {} },
          { key: "n",  label: "Neutral",           weights: {} },
          { key: "a",  label: "Agree",             weights: { acts: 1 }, weights_role: { Architect: 1 }, weights_energy: { Caregiver: 1, Sovereign: 1 } },
          { key: "sa", label: "Strongly Agree",    weights: { acts: 2 }, weights_role: { Architect: 1, Protector: 1 }, weights_energy: { Creator: 1, Sovereign: 1 } }
        ]
      },

      // Q6 — Long-distance (swap Hermit out; add Sovereign/Jester)
      {
        id: "q6",
        type: "scenario",
        prompt: "In a long-distance season, how do you mostly give love?",
        optional: false,
        options: [
          { key: "a1", label: "Voice notes/texts that affirm them often.",         weights: { words: 2 }, weights_role: { Herald: 1 },    weights_energy: { Muse: 1, Jester: 1 } },
          { key: "a2", label: "Care packages / handling tasks remotely.",          weights: { acts: 2, gifts: 1 }, weights_role: { Architect: 1 }, weights_energy: { Creator: 1, Caregiver: 1, Sovereign: 1 } },
          { key: "a3", label: "Thoughtful surprises delivered to their door.",     weights: { gifts: 2 }, weights_role: { Nurturer: 1, Artisan: 1 }, weights_energy: { Lover: 1 } },
          { key: "a4", label: "Scheduling long video dates—no multitasking.",      weights: { time: 2 },  weights_role: { Guardian: 1, Navigator: 1 }, weights_energy: { Caregiver: 1 } },
          { key: "a5", label: "Plan frequent in-person meetups for togetherness.", weights: { touch: 2, time: 1 }, weights_role: { Protector: 1, Navigator: 1 }, weights_energy: { Lover: 1, Warrior: 1 } }
        ]
      },

      // Q7 — Gift cadence (unchanged but canon-aligned)
      {
        id: "q7",
        type: "scenario",
        prompt: "When it comes to giving gifts, what sounds most like you?",
        optional: false,
        options: [
          { key: "a1", label: "Handwritten notes with small keepsakes.",          weights: { gifts: 2, words: 1 }, weights_role: { Nurturer: 1, Herald: 1 }, weights_energy: { Lover: 1, Muse: 1 } },
          { key: "a2", label: "Occasional bigger gifts—quality over quantity.",   weights: { gifts: 2 },            weights_role: { Artisan: 1 },             weights_energy: { Creator: 1 } },
          { key: "a3", label: "I love having things delivered (flowers, chocolate, etc.).", weights: { gifts: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Lover: 1 } },
          { key: "a4", label: "Prefer shared experiences over physical gifts.",    weights: { time: 2 },             weights_role: { Guardian: 1 },            weights_energy: { Caregiver: 1 } },
          { key: "a5", label: "I’m more of a do-for-you than buy-for-you person.", weights: { acts: 2 },             weights_role: { Protector: 1 },           weights_energy: { Caregiver: 1, Sovereign: 1 } }
        ]
      },

      // Q8 — Daily micro-expressions
      {
        id: "q8",
        type: "quick_pref",
        prompt: "Your everyday love looks like…",
        optional: false,
        options: [
          { key: "a1", label: "Little affirmations and hype checks.",      weights: { words: 2 }, weights_role: { Herald: 1 },   weights_energy: { Muse: 1, Jester: 1 } },
          { key: "a2", label: "Doing tasks before they ask.",              weights: { acts: 2 },  weights_role: { Architect: 1 }, weights_energy: { Caregiver: 1, Sovereign: 1 } },
          { key: "a3", label: "Tiny surprises that say ‘thinking of you’.",weights: { gifts: 2 }, weights_role: { Nurturer: 1 },  weights_energy: { Lover: 1 } },
          { key: "a4", label: "Protected time blocks together.",           weights: { time: 2 },  weights_role: { Guardian: 1 },  weights_energy: { Caregiver: 1 } },
          { key: "a5", label: "Physical touch as you walk by.",            weights: { touch: 2 }, weights_role: { Protector: 1 },  weights_energy: { Lover: 1 } }
        ]
      },

      // Q9 — H2H: Time vs Touch
      {
        id: "q9",
        type: "head_to_head",
        prompt: "Pick your default love move:",
        optional: false,
        options: [
          { key: "a", label: "Plan one-on-one time for us.",  weights: { time: 2 },  weights_role: { Guardian: 1 },  weights_energy: { Caregiver: 1 } },
          { key: "b", label: "Be physically affectionate.",   weights: { touch: 2 }, weights_role: { Protector: 1 },  weights_energy: { Lover: 1 } }
        ]
      },

      // Q10 — Overwhelmed (add Sovereign where acts is planning)
      {
        id: "q10",
        type: "scenario",
        prompt: "Your partner is overwhelmed. Your most natural support is…",
        optional: false,
        options: [
          { key: "a1", label: "Mirror back strengths with affirmations.", weights: { words: 2 }, weights_role: { Herald: 1 },   weights_energy: { Muse: 1, Healer: 1 } },
          { key: "a2", label: "Jump in and solve a few tasks.",           weights: { acts: 2 },  weights_role: { Protector: 1 }, weights_energy: { Warrior: 1, Caregiver: 1, Sovereign: 1 } },
          { key: "a3", label: "Care package / cozy surprise.",            weights: { gifts: 2 }, weights_role: { Nurturer: 1 },  weights_energy: { Lover: 1 } },
          { key: "a4", label: "Quiet time together to decompress.",       weights: { time: 2 },  weights_role: { Guardian: 1 },  weights_energy: { Caregiver: 1 } },
          { key: "a5", label: "A grounding hug and gentle closeness.",    weights: { touch: 2 }, weights_role: { Protector: 1 }, weights_energy: { Lover: 1, Healer: 1 } }
        ]
      },

      // Q11 — Social shine (add Jester to words)
      {
        id: "q11",
        type: "scenario",
        prompt: "You’re out with friends and want your partner to feel loved. What do you do?",
        optional: false,
        options: [
          { key: "a1", label: "Hype them up loud and proud.",                weights: { words: 2 }, weights_role: { Herald: 1 },   weights_energy: { Muse: 1, Jester: 1 } },
          { key: "a2", label: "Quietly take care of small needs.",           weights: { acts: 2 },  weights_role: { Protector: 1 }, weights_energy: { Caregiver: 1, Sovereign: 1 } },
          { key: "a3", label: "Hand them a small surprise you brought.",     weights: { gifts: 2 }, weights_role: { Nurturer: 1 },  weights_energy: { Lover: 1 } },
          { key: "a4", label: "Stick by their side—quality time in public.", weights: { time: 2 },  weights_role: { Guardian: 1 },  weights_energy: { Caregiver: 1 } },
          { key: "a5", label: "Stay touchy—hand on back or knee.",           weights: { touch: 2 }, weights_role: { Protector: 1 },  weights_energy: { Lover: 1 } }
        ]
      },

      // Q12 — H2H: Gifts vs Acts
      {
        id: "q12",
        type: "head_to_head",
        prompt: "Which of the following feels more natural for you?",
        optional: false,
        options: [
          { key: "a", label: "Thoughtful gifts that say ‘I see you’.",  weights: { gifts: 2 }, weights_role: { Nurturer: 1 },  weights_energy: { Lover: 1, Creator: 1 } },
          { key: "b", label: "Helpful actions that make life easier.",  weights: { acts: 2 },  weights_role: { Architect: 1 }, weights_energy: { Caregiver: 1, Creator: 1, Sovereign: 1 } }
        ]
      }
    ]
  }
};

// sanitize archetype maps
quiz.questions.questions.forEach(q => {
  q.options?.forEach(o => {
    if (o.weights_role)   o.weights_role   = sanitizeTagMap(o.weights_role, VALID_ROLES);
    if (o.weights_energy) o.weights_energy = sanitizeTagMap(o.weights_energy, VALID_ENERGIES);
    if (o.weights_shadow) o.weights_shadow = sanitizeTagMap(o.weights_shadow, VALID_SHADOWS);
  });
});

try {
  console.log("➡️  Upserting quiz:", quiz.slug);
  const { data, error } = await admin
    .from("quizzes")
    .upsert(quiz, { onConflict: "slug" })
    .select();
  if (error) throw error;
  console.log("✅ Seeded:", data?.[0]?.slug, "version", quiz.questions.version);
  process.exit(0);
} catch (e) {
  console.error("❌ Seed failed:", e.message);
  process.exit(1);
}
