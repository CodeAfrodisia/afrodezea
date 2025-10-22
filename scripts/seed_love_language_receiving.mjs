// scripts/seed_love_language_receiving_v2.mjs
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

// Canon allow-lists (Dual Archetype)
// NOTE: Hermit/Trickster are SHADOWS, not energies, to match our system.
const VALID_ROLES = new Set([
  "Navigator","Protector","Architect","Guardian","Artisan",
  "Catalyst","Nurturer","Herald","Seeker"
]);
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
  slug: "love-language-receiving",
  title: "Love Language — Receiving",
  category: "Connection",
  description:
    "How do you most naturally receive love—Words, Acts, Gifts, Time, or Touch? Learn what lands for you and how to ask for it cleanly.",
  is_published: true,
  questions: {
    version: 2,
    min_required: 9,
    results: [
      {
        key: "words",
        label: "Words of Affirmation (Receiver)",
        headline: "You feel loved when you’re seen and named.",
        summary: "Clear praise, reassurance, and thoughtful language feed your heart.",
        guidance: [
          "Ask for specific affirmations (what, not just ‘you’re amazing’).",
          "Share your ‘no’ words (e.g., jokes that actually sting).",
          "Save affirmations you can revisit on low days."
        ]
      },
      {
        key: "acts",
        label: "Acts of Service (Receiver)",
        headline: "You feel loved when life gets lighter.",
        summary: "Help, planning, and done-for-you support mean care in motion.",
        guidance: [
          "Offer a shortlist of helpful tasks—reduce guesswork.",
          "Celebrate attempts, not just perfect execution.",
          "Balance autonomy: receive help without losing agency."
        ]
      },
      {
        key: "gifts",
        label: "Gifts (Receiver)",
        headline: "You feel loved when thoughtfulness is tangible.",
        summary: "Tokens, surprises, and mementos say ‘I see you’ in 3D.",
        guidance: [
          "Share your ‘delight list’ (sizes, scents, favorites).",
          "Prefer meaning > money—give examples of both.",
          "Pair gifts with a note that names the why."
        ]
      },
      {
        key: "time",
        label: "Quality Time (Receiver)",
        headline: "You feel loved when you have their presence.",
        summary: "Undistracted attention, shared rituals, and consistent check-ins steady you.",
        guidance: [
          "Define ‘quality’: quiet vs. adventures vs. projects.",
          "Create recurring time blocks and guard them together.",
          "Phones down: agree on a simple device boundary."
        ]
      },
      {
        key: "touch",
        label: "Physical Touch (Receiver)",
        headline: "You feel loved through closeness and contact.",
        summary: "Hugs, leaning, hand squeezes, and cuddles ground you.",
        guidance: [
          "Name your green/amber/red contexts for touch.",
          "Ask for micro-touch (hand, shoulder) in public if you like it.",
          "Pair touch with words when you need extra safety."
        ]
      }
    ],
    questions: [
      // Q1 — After a hard day (adds Sovereign/Jester accents)
      {
        id: "q1",
        type: "scenario",
        prompt: "After a long, draining day, what makes you feel *most* loved?",
        optional: false,
        options: [
          { key: "a1", label: "Hearing affirmations that make me feel valued and appreciated.", weights: { words: 2 }, weights_role: { Herald: 1 }, weights_energy: { Healer: 1, Muse: 1, Jester: 1 } },
          { key: "a2", label: "Seeing them quietly handle a few things for me.",   weights: { acts: 2 },  weights_role: { Protector: 1, Architect: 1 }, weights_energy: { Caregiver: 1, Sovereign: 1, Warrior: 1 } },
          { key: "a3", label: "A small, meaningful surprise waiting for me.",      weights: { gifts: 2 }, weights_role: { Nurturer: 1, Artisan: 1 }, weights_energy: { Lover: 1, Creator: 1 } },
          { key: "a4", label: "Uninterrupted time together—no multitasking.",      weights: { time: 2 },  weights_role: { Guardian: 1 }, weights_energy: { Caregiver: 1 } },
          { key: "a5", label: "A long hug and steady closeness.",                   weights: { touch: 2 }, weights_role: { Protector: 1 }, weights_energy: { Lover: 1, Healer: 1 } }
        ]
      },

      // Q2 — H2H: Acts vs Time
      {
        id: "q2",
        type: "head_to_head",
        prompt: "If you could only get one right now, which lands deeper?",
        optional: false,
        options: [
          { key: "a", label: "An obligation handled on my behalf.",     weights: { acts: 2 },  weights_role: { Architect: 1 }, weights_energy: { Caregiver: 1, Sovereign: 1 } },
          { key: "b", label: "Their full presence with zero distractions.", weights: { time: 2 },  weights_role: { Guardian: 1 }, weights_energy: { Caregiver: 1 } }
        ]
      },

      // Q3 — Quick Pref
      {
        id: "q3",
        type: "quick_pref",
        prompt: "Day to day, what reassures you most?",
        optional: false,
        options: [
          { key: "a1", label: "Random ‘thinking of you’ messages.",     weights: { words: 2 }, weights_role: { Herald: 1 },   weights_energy: { Muse: 1, Jester: 1 } },
          { key: "a2", label: "Tasks done without me asking.",          weights: { acts: 2 },  weights_role: { Architect: 1 }, weights_energy: { Caregiver: 1, Sovereign: 1 } },
          { key: "a3", label: "Tiny gifts or treats that match my vibe.", weights: { gifts: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Lover: 1, Creator: 1 } },
          { key: "a4", label: "Consistent check-ins / quality time.",   weights: { time: 2 },  weights_role: { Guardian: 1 },  weights_energy: { Caregiver: 1 } },
          { key: "a5", label: "Affection in passing—touch as we move.", weights: { touch: 2 }, weights_role: { Protector: 1 },  weights_energy: { Lover: 1 } }
        ]
      },

      // Q4 — Birthday receiving
      {
        id: "q4",
        type: "scenario",
        prompt: "It’s your birthday. What would make you feel most loved?",
        optional: false,
        options: [
          { key: "a1", label: "A note that really *sees* me.",           weights: { words: 2 }, weights_role: { Herald: 1 },   weights_energy: { Muse: 1, Jester: 1 } },
          { key: "a2", label: "They plan the day so I can just enjoy.",  weights: { acts: 2 },  weights_role: { Architect: 1, Navigator: 1 }, weights_energy: { Creator: 1, Caregiver: 1, Sovereign: 1 } },
          { key: "a3", label: "A personal gift with a story behind it.", weights: { gifts: 2 }, weights_role: { Artisan: 1, Nurturer: 1 },   weights_energy: { Lover: 1, Creator: 1 } },
          { key: "a4", label: "A full day together—just us.",            weights: { time: 2 },  weights_role: { Guardian: 1 },  weights_energy: { Caregiver: 1 } },
          { key: "a5", label: "Cuddles and closeness all day.",          weights: { touch: 2 }, weights_role: { Protector: 1 },  weights_energy: { Lover: 1 } }
        ]
      },

      // Q5 — Likert: words sensitivity
      {
        id: "q5",
        type: "likert",
        prompt: "“Words land deeply for me—both praise and criticism.”",
        scale: ["Strongly Disagree","Disagree","Neutral","Agree","Strongly Agree"],
        optional: false,
        options: [
          { key: "sd", label: "Strongly Disagree", weights: {} },
          { key: "d",  label: "Disagree",          weights: {} },
          { key: "n",  label: "Neutral",           weights: {} },
          { key: "a",  label: "Agree",             weights: { words: 1 }, weights_role: { Herald: 1 }, weights_energy: { Lover: 1 } },
          { key: "sa", label: "Strongly Agree",    weights: { words: 2 }, weights_role: { Herald: 1 }, weights_energy: { Muse: 1, Jester: 1 } }
        ]
      },

      // Q6 — Stress support receiving
      {
        id: "q6",
        type: "scenario",
        prompt: "When you’re stressed, what *receiving* gesture helps most?",
        optional: false,
        options: [
          { key: "a1", label: "Reassuring, grounding words.",             weights: { words: 2 }, weights_role: { Herald: 1 },   weights_energy: { Healer: 1, Sage: 1 } },
          { key: "a2", label: "They handle a few tasks so I can breathe.", weights: { acts: 2 },  weights_role: { Protector: 1 }, weights_energy: { Caregiver: 1, Sovereign: 1 } },
          { key: "a3", label: "A little care package or cozy surprise.",   weights: { gifts: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Lover: 1, Creator: 1 } },
          { key: "a4", label: "Protected time together to decompress.",    weights: { time: 2 },  weights_role: { Guardian: 1 }, weights_energy: { Caregiver: 1 } },
          { key: "a5", label: "A long hug I can melt into.",               weights: { touch: 2 }, weights_role: { Protector: 1 }, weights_energy: { Lover: 1, Healer: 1 } }
        ]
      },

      // Q7 — H2H: Touch vs Words
      {
        id: "q7",
        type: "head_to_head",
        prompt: "Which do you crave more when you feel insecure?",
        optional: false,
        options: [
          { key: "a", label: "Physical closeness (touch).", weights: { touch: 2 }, weights_role: { Protector: 1 }, weights_energy: { Lover: 1 } },
          { key: "b", label: "Clear reassurance (words).",  weights: { words: 2 }, weights_role: { Herald: 1 },   weights_energy: { Healer: 1, Jester: 1 } }
        ]
      },

      // Q8 — Quick Pref: love receipt
      {
        id: "q8",
        type: "quick_pref",
        prompt: "What’s a small thing that always lands for you?",
        optional: false,
        options: [
          { key: "a1", label: "A voice note saying exactly what they appreciate.", weights: { words: 2 }, weights_role: { Herald: 1 },   weights_energy: { Muse: 1, Jester: 1 } },
          { key: "a2", label: "Dishes done / car gassed / errand handled.",       weights: { acts: 2 },  weights_role: { Architect: 1 }, weights_energy: { Caregiver: 1, Sovereign: 1 } },
          { key: "a3", label: "A tiny surprise (snack, flower, playlist).",       weights: { gifts: 2 }, weights_role: { Nurturer: 1 },  weights_energy: { Lover: 1, Creator: 1 } },
          { key: "a4", label: "An hour just for us with phones away.",            weights: { time: 2 },  weights_role: { Guardian: 1 },  weights_energy: { Caregiver: 1 } },
          { key: "a5", label: "A head rub or hand squeeze in passing.",           weights: { touch: 2 }, weights_role: { Protector: 1 },  weights_energy: { Lover: 1 } }
        ]
      },

      // Q9 — Public setting
      {
        id: "q9",
        type: "scenario",
        prompt: "In public, love lands best as…",
        optional: false,
        options: [
          { key: "a1", label: "Hyped-up affirmation that makes me beam.",              weights: { words: 2 }, weights_role: { Herald: 1 },   weights_energy: { Muse: 1, Jester: 1 } },
          { key: "a2", label: "Acts that reduce my load without attention.",           weights: { acts: 2 },  weights_role: { Protector: 1 }, weights_energy: { Caregiver: 1, Sovereign: 1 } },
          { key: "a3", label: "Gifts, big or small, that make me feel cherished.",     weights: { gifts: 2 }, weights_role: { Nurturer: 1 },  weights_energy: { Lover: 1, Creator: 1 } },
          { key: "a4", label: "Focused time together within the group.",               weights: { time: 2 },  weights_role: { Guardian: 1 },  weights_energy: { Caregiver: 1 } },
          { key: "a5", label: "Subtle but steady touch I can feel.",                   weights: { touch: 2 }, weights_role: { Protector: 1 },  weights_energy: { Lover: 1 } }
        ]
      },

      // Q10 — Likert: gift meaning
      {
        id: "q10",
        type: "likert",
        prompt: "“Meaningful gifts make me feel deeply understood.”",
        scale: ["Strongly Disagree","Disagree","Neutral","Agree","Strongly Agree"],
        optional: false,
        options: [
          { key: "sd", label: "Strongly Disagree", weights: {} },
          { key: "d",  label: "Disagree",          weights: {} },
          { key: "n",  label: "Neutral",           weights: {} },
          { key: "a",  label: "Agree",             weights: { gifts: 1 }, weights_role: { Artisan: 1 }, weights_energy: { Lover: 1 } },
          { key: "sa", label: "Strongly Agree",    weights: { gifts: 2 }, weights_role: { Artisan: 1, Nurturer: 1 }, weights_energy: { Lover: 1, Creator: 1 } }
        ]
      },

      // Q11 — H2H: Acts vs Touch
      {
        id: "q11",
        type: "head_to_head",
        prompt: "Which of the following would mean more to you?",
        optional: false,
        options: [
          { key: "a", label: "They take care of something for me.", weights: { acts: 2 },  weights_role: { Architect: 1 }, weights_energy: { Caregiver: 1, Sovereign: 1 } },
          { key: "b", label: "They hold me like they love me.",     weights: { touch: 2 }, weights_role: { Protector: 1 },  weights_energy: { Lover: 1 } }
        ]
      },

      // Q12 — Quick Pref: where to begin
      {
        id: "q12",
        type: "quick_pref",
        prompt: "If your partner is unsure how you need love today, where should they begin?",
        optional: false,
        options: [
          { key: "a1", label: "Say something specific they appreciate about me.", weights: { words: 2 }, weights_role: { Herald: 1 },   weights_energy: { Muse: 1, Jester: 1 } },
          { key: "a2", label: "Pick a task and just do it.",                      weights: { acts: 2 },  weights_role: { Architect: 1 }, weights_energy: { Caregiver: 1, Sovereign: 1 } },
          { key: "a3", label: "Surprise me with something that feels personal.",  weights: { gifts: 2 }, weights_role: { Nurturer: 1 },  weights_energy: { Lover: 1, Creator: 1 } },
          { key: "a4", label: "Offer focused time with no devices.",              weights: { time: 2 },  weights_role: { Guardian: 1 },  weights_energy: { Caregiver: 1 } },
          { key: "a5", label: "Give me a lingering hug.",                         weights: { touch: 2 }, weights_role: { Protector: 1 },  weights_energy: { Lover: 1 } }
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
