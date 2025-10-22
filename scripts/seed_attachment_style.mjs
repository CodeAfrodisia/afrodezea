// scripts/seed_attachment_style_v2.mjs
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

// Allow-lists (canon-aligned)
const VALID_ROLES = new Set([
  "Navigator","Protector","Architect","Guardian","Artisan","Catalyst","Nurturer","Herald","Seeker"
]);
// Energies: add Sovereign, Jester. (Hermit/Trickster/Outcast are SHADOWS only)
const VALID_ENERGIES = new Set([
  "Muse","Sage","Visionary","Healer","Warrior","Creator","Lover","Magician","Rebel","Caregiver","Sovereign","Jester"
]);
const VALID_SHADOWS = new Set([
  "Victim","Saboteur","Addict","Shadow Rebel","Tyrant","Trickster","Hermit","Martyr","Nihilist","Mask","Outcast","Destroyer","Survivor","Tempted"
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
  slug: "attachment-style",
  title: "Attachment Style",
  category: "Connection",
  description:
    "Do you feel secure, anxious, avoidant, or fearful-avoidant (disorganized) in connection? Find your pattern and get guidance to love better.",
  is_published: true,
  questions: {
    version: 2,
    min_required: 8,
    results: [
      {
        key: "secure",
        label: "Secure",
        headline: "Comfortable with closeness and space.",
        summary: "You trust, communicate, and repair without spirals.",
        guidance: [
          "Name needs directly; keep modeling healthy repair.",
          "Offer reassurance without over-functioning for partners.",
          "Protect your boundaries with warmth and clarity (Sovereign)."
        ]
      },
      {
        key: "anxious",
        label: "Anxious",
        headline: "Craves closeness, fears loss.",
        summary: "You seek reassurance and may over-apologize to keep peace.",
        guidance: [
          "Ask for reassurance explicitly, not indirectly.",
          "Self-soothe before texting/acting; set a 15-min pause.",
          "Use light, co-regulating humor without dismissing feelings (Jester)."
        ]
      },
      {
        key: "avoidant",
        label: "Avoidant",
        headline: "Values independence, wary of too much closeness.",
        summary: "You need space; you may minimize or withdraw under stress.",
        guidance: [
          "Share your ‘space plan’ so distance isn’t read as rejection.",
          "Practice brief, specific reassurance when your partner bids.",
          "Schedule reconnection windows after cool-off periods (Sovereign)."
        ]
      },
      {
        key: "fearful",
        label: "Fearful-Avoidant",
        headline: "Wants closeness, fears it too.",
        summary: "You swing between pursuit and withdrawal when triggered.",
        guidance: [
          "Name the swing: ‘I want you and I feel scared.’",
          "Pick one micro-move (text/call/breathe) to stabilize.",
          "Do repair rituals that blend reassurance + boundaries (Sovereign)."
        ]
      }
    ],
    questions: [
      // Q1 — Closeness & Intimacy
      {
        id: "q1",
        type: "scenario",
        prompt: "A new relationship is getting deep fast. What feels most true?",
        optional: false,
        options: [
          { key: "a1", label: "I’m comfortable; I can be close and still be me.", weights: { secure: 2 }, weights_role: { Guardian: 1, Nurturer: 1 }, weights_energy: { Caregiver: 1, Lover: 1, Sovereign: 1 } },
          { key: "a2", label: "I feel excited but also uneasy; I need lots of reassurance.", weights: { anxious: 2 }, weights_role: { Herald: 1 }, weights_energy: { Lover: 1, Jester: 1 }, weights_shadow: { Victim: 1, Outcast: 1 } },
          { key: "a3", label: "It’s too much too soon; I pull back to breathe.", weights: { avoidant: 2 }, weights_role: { Seeker: 1 }, weights_energy: { Sage: 1 }, weights_shadow: { Hermit: 1 } },
          { key: "a4", label: "I want it and it scares me—so I get hot-and-cold.", weights: { fearful: 2 }, weights_role: { Catalyst: 1 }, weights_energy: { Rebel: 1, Lover: 1 } }
        ]
      },

      // Q2 — Emotional closeness
      {
        id: "q2",
        type: "head_to_head",
        prompt: "Which is closer to how you feel when someone wants to get emotionally close?",
        optional: false,
        options: [
          { key: "a1", label: "Safe—closeness is comforting.", weights: { secure: 2 }, weights_role: { Guardian: 1 }, weights_energy: { Caregiver: 1, Sovereign: 1 } },
          { key: "a2", label: "Uneasy—they’ll leave eventually.", weights: { anxious: 2, fearful: 1 }, weights_role: { Herald: 1 }, weights_energy: { Jester: 1 }, weights_shadow: { Victim: 1, Outcast: 1 } }
        ]
      },

      // Q3 — Conflict style
      {
        id: "q3",
        type: "scenario",
        prompt: "Conflict pops up. What’s your most natural move?",
        optional: false,
        options: [
          { key: "a1", label: "Talk it through respectfully and try to repair.", weights: { secure: 2 }, weights_role: { Navigator: 1 }, weights_energy: { Sage: 1, Sovereign: 1 } },
          { key: "a2", label: "Pursue reassurance fast (texts, calls, apologies).", weights: { anxious: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Lover: 1, Jester: 1 }, weights_shadow: { Addict: 1 } },
          { key: "a3", label: "Shut down or need distance to think straight.", weights: { avoidant: 2 }, weights_role: { Seeker: 1 }, weights_energy: { Sage: 1 }, weights_shadow: { Hermit: 1 } },
          { key: "a4", label: "Ping-pong between clinging and pushing away.", weights: { fearful: 2 }, weights_role: { Catalyst: 1 }, weights_energy: { Rebel: 1 } }
        ]
      },

      // Q4 — Conflict thought
      {
        id: "q4",
        type: "head_to_head",
        prompt: "When conflict happens, which thought is closer to yours?",
        optional: false,
        options: [
          { key: "a1", label: "We can work this out together.", weights: { secure: 2 }, weights_role: { Guardian: 1 }, weights_energy: { Caregiver: 1, Sovereign: 1 } },
          { key: "a2", label: "I worry they’ll leave me.", weights: { anxious: 2 }, weights_role: { Herald: 1 }, weights_energy: { Jester: 1 }, weights_shadow: { Victim: 1, Outcast: 1 } }
        ]
      },

      // Q5 — Push-pull Likert
      {
        id: "q5",
        type: "likert",
        prompt: "“Sometimes I want closeness, then push it away when it arrives.”",
        scale: ["Strongly Disagree","Disagree","Neutral","Agree","Strongly Agree"],
        optional: false,
        options: [
          { key: "sd", label: "Strongly Disagree", weights: {} },
          { key: "d",  label: "Disagree",          weights: {} },
          { key: "n",  label: "Neutral",           weights: {} },
          { key: "a",  label: "Agree",             weights: { fearful: 1, anxious: 2 }, weights_role: { Herald: 1 }, weights_shadow: { Outcast: 1 } },
          { key: "sa", label: "Strongly Agree",    weights: { fearful: 2, anxious: 2 }, weights_role: { Catalyst: 1 }, weights_energy: { Rebel: 1 }, weights_shadow: { Outcast: 1 } }
        ]
      },

      // Q6 — Depending on others
      {
        id: "q6",
        type: "scenario",
        prompt: "Which best describes how you feel about depending on others?",
        optional: false,
        options: [
          { key: "a1", label: "I’m comfortable depending on others—and being depended on.", weights: { secure: 2 }, weights_role: { Guardian: 1 }, weights_energy: { Caregiver: 1, Lover: 1, Sovereign: 1 } },
          { key: "a2", label: "Dependence makes me uneasy; I’d rather rely on myself.", weights: { avoidant: 2 }, weights_role: { Seeker: 1 }, weights_energy: { Sage: 1 }, weights_shadow: { Hermit: 1 } },
          { key: "a3", label: "I’d like to, but it doesn’t always feel safe.", weights: { fearful: 2 }, weights_role: { Catalyst: 1 }, weights_energy: { Rebel: 1 } }
        ]
      },

      // Q7 — Interdependence belief
      {
        id: "q7",
        type: "scenario",
        prompt: "Which of the following sounds truest for you?",
        optional: false,
        options: [
          { key: "a1", label: "Healthy interdependence is strength.", weights: { secure: 2 }, weights_role: { Navigator: 1 }, weights_energy: { Sage: 1, Sovereign: 1 } },
          { key: "a2", label: "Needing people makes me feel constrained.", weights: { avoidant: 2 }, weights_role: { Seeker: 1 }, weights_energy: { Sage: 1 }, weights_shadow: { Hermit: 1 } },
          { key: "a3", label: "I want closeness, but needing it feels like a weakness.", weights: { fearful: 2, avoidant: 1 }, weights_role: { Catalyst: 1 }, weights_energy: { Rebel: 1 } }
        ]
      },

      // Q8 — Reassurance need
      {
        id: "q8",
        type: "head_to_head",
        prompt: "Do you often need reassurance that your partner loves you?",
        optional: false,
        options: [
          { key: "a1", label: "Not really—I can feel secure without it.", weights: { secure: 2 }, weights_role: { Guardian: 1 }, weights_energy: { Caregiver: 1, Sovereign: 1 } },
          { key: "a2", label: "Honestly, yes.", weights: { anxious: 2 }, weights_role: { Herald: 1, Nurturer: 1 }, weights_energy: { Lover: 1, Jester: 1 }, weights_shadow: { Victim: 1 } }
        ]
      },

      // Q9 — Reputation
      {
        id: "q9",
        type: "quick_pref",
        prompt: "Which is closest to how people have described you?",
        optional: false,
        options: [
          { key: "a1", label: "Steady, communicative, and dependable.", weights: { secure: 2 }, weights_role: { Guardian: 1 }, weights_energy: { Caregiver: 1, Sage: 1, Sovereign: 1 } },
          { key: "a2", label: "Clingy or overly sensitive.", weights: { anxious: 2 }, weights_role: { Herald: 1 }, weights_energy: { Lover: 1, Jester: 1 }, weights_shadow: { Victim: 1 } },
          { key: "a3", label: "Distant or hard to read.", weights: { avoidant: 2 }, weights_role: { Seeker: 1 }, weights_energy: { Sage: 1 }, weights_shadow: { Hermit: 1 } },
          { key: "a4", label: "Hot-and-cold—mixed signals.", weights: { fearful: 2 }, weights_role: { Catalyst: 1 }, weights_energy: { Rebel: 1 } }
        ]
      },

      // Q10 — Stable relationship appraisal
      {
        id: "q10",
        type: "head_to_head",
        prompt: "How does the idea of a stable, secure relationship feel?",
        optional: false,
        options: [
          { key: "a1", label: "Natural—I can relax and be myself.", weights: { secure: 2 }, weights_role: { Guardian: 1 }, weights_energy: { Caregiver: 1, Sovereign: 1 } },
          { key: "a2", label: "Foreign—I want it but don’t fully trust it.", weights: { anxious: 1, fearful: 2 }, weights_role: { Herald: 1 }, weights_energy: { Jester: 1 }, weights_shadow: { Outcast: 1 } },
          { key: "a3", label: "Safer to be alone than lose someone.", weights: { avoidant: 2, fearful: 1 }, weights_role: { Seeker: 1 }, weights_energy: { Sage: 1 }, weights_shadow: { Hermit: 1 } }
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
