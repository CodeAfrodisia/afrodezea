// scripts/seed_mistake_response_style_v2.mjs
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

// Canon-aligned allow-lists
const VALID_ROLES = new Set(["Navigator","Protector","Architect","Guardian","Artisan","Catalyst","Nurturer","Herald","Seeker"]);
const VALID_ENERGIES = new Set([
  "Muse","Sage","Visionary","Healer","Warrior","Creator","Lover","Magician","Rebel","Caregiver","Sovereign","Jester"
]);
// Shadows only (detectors)
const VALID_SHADOWS = new Set([
  "Victim","Saboteur","Addict","Shadow Rebel","Tyrant","Trickster","Hermit","Martyr","Nihilist","Outcast","Mask","Destroyer","Survivor","Tempted"
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
  slug: "mistake-response-style",
  title: "Mistake Response Style",
  category: "Forgiveness",
  description:
    "When you mess up, what’s your instinct—appease, defend, avoid, go aggressive, withdraw, fix it, or own it? Map your default pattern and get smarter options.",
  is_published: true,
  questions: {
    version: 2,
    min_required: 9,
    results: [
      { key: "appease",   label: "Appeasement",       headline: "You try to smooth it over.", summary: "You over-apologize to calm conflict fast—even when it costs you." },
      { key: "defensive", label: "Defensive",         headline: "You explain or justify.",   summary: "You protect your image and intent, sometimes at truth’s expense." },
      { key: "avoidant",  label: "Avoidant",          headline: "You minimize or defer.",    summary: "You hope it blows over rather than face it head-on." },
      { key: "aggressive",label: "Aggressive",        headline: "You counter-attack.",       summary: "You push back hard and shift pressure off of you." },
      { key: "withdrawn", label: "Withdrawn",         headline: "You shut down or ghost.",   summary: "You disappear to escape conflict or shame." },
      { key: "solution",  label: "Solution-Oriented", headline: "You fix it fast.",          summary: "You move to repairs and logistics over emotions." },
      { key: "accountable",label:"Accountable",       headline: "You own it and grow.",      summary: "You acknowledge, apologize, and change your behavior." }
    ],
    questions: [
      // Q1
      {
        id: "q1",
        type: "scenario",
        prompt: "You realize you messed up and someone’s upset. What’s your first instinct?",
        optional: false,
        options: [
          { key: "a1", label: "Apologize until things feel better.", weights: { appease: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Healer: 1, Jester: 1 }, weights_shadow: { Victim: 1 } },
          { key: "a2", label: "Explain my side so it doesn’t seem that bad.", weights: { defensive: 2 }, weights_role: { Protector: 1 }, weights_energy: { }, weights_shadow: { Trickster: 1, Saboteur: 1 } },
          { key: "a3", label: "Downplay it and hope it passes.", weights: { avoidant: 2 }, weights_role: { Guardian: 1 }, weights_energy: { }, weights_shadow: { Hermit: 1 } },
          { key: "a4", label: "Push back—why are they acting like it’s all on me?", weights: { aggressive: 2 }, weights_role: { Catalyst: 1 }, weights_energy: { Rebel: 1, Warrior: 1 }, weights_shadow: { "Shadow Rebel": 1, Tyrant: 1 } },
          { key: "a5", label: "Fix what I can immediately.", weights: { solution: 2 }, weights_role: { Navigator: 1, Architect: 1 }, weights_energy: { Creator: 1, Warrior: 1 } },
          { key: "a6", label: "Acknowledge it, apologize, and outline what I’ll change.", weights: { accountable: 2 }, weights_role: { Architect: 1, Navigator: 1 }, weights_energy: { Sage: 1, Sovereign: 1 } }
        ]
      },

      // Q2
      {
        id: "q2",
        type: "scenario",
        prompt: "Someone calls you out in the moment. Which response sounds most like you?",
        optional: false,
        options: [
          { key: "a1", label: "“I’m so sorry—my bad.” (rinse and repeat)", weights: { appease: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Healer: 1, Jester: 1 }, weights_shadow: { Victim: 1 } },
          { key: "a2", label: "“Hold on—here’s what actually happened…”", weights: { defensive: 2 }, weights_role: { Protector: 1 }, weights_energy: { }, weights_shadow: { Trickster: 1 } },
          { key: "a3", label: "Let’s just move on. It’s not that deep.", weights: { avoidant: 2 }, weights_role: { Guardian: 1 }, weights_energy: { }, weights_shadow: { Hermit: 1 } },
          { key: "a4", label: "“You’re the reason I’m acting this way in the first place.”", weights: { aggressive: 2, defensive: 1 }, weights_role: { Protector: 1, Catalyst: 1 }, weights_energy: { Rebel: 1, Warrior: 1 }, weights_shadow: { "Shadow Rebel": 1 } }
        ]
      },

      // Q3
      {
        id: "q3",
        type: "scenario",
        prompt: "When you calm down and reflect later, what do you notice about your pattern?",
        optional: false,
        options: [
          { key: "a1", label: "I may apologize quite a bit hoping to smooth things over.", weights: { appease: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Healer: 1, Jester: 1 }, weights_shadow: { Victim: 1 } },
          { key: "a2", label: "I defend myself because attacking me makes me feel misunderstood.", weights: { defensive: 2, aggressive: 1 }, weights_role: { Protector: 1 }, weights_energy: { Rebel: 1 }, weights_shadow: { Trickster: 1 } },
          { key: "a3", label: "I minimize it or act like it’ll go away.", weights: { avoidant: 2 }, weights_role: { Guardian: 1 }, weights_energy: { }, weights_shadow: { Hermit: 1 } },
          { key: "a4", label: "I go fix mode—checklists and action items.", weights: { solution: 2 }, weights_role: { Architect: 1, Navigator: 1 }, weights_energy: { Creator: 1 } },
          { key: "a5", label: "I own it and set a change plan.", weights: { accountable: 2 }, weights_role: { Architect: 1 }, weights_energy: { Sage: 1, Sovereign: 1 } }
        ]
      },

      // Q4
      {
        id: "q4",
        type: "head_to_head",
        prompt: "Which is closer to your personality in conflict?",
        optional: false,
        options: [
          { key: "a1", label: "When you point the finger at me, I point back because my index fingers work too.", weights: { aggressive: 2, defensive: 1 }, weights_role: { Catalyst: 1 }, weights_energy: { Rebel: 1 }, weights_shadow: { Tyrant: 1, "Shadow Rebel": 1 } },
          { key: "a2", label: "The more you complain, the less I want to apologize.", weights: { avoidant: 2 }, weights_role: { Seeker: 1 }, weights_energy: { }, weights_shadow: { Hermit: 1 } }
        ]
      },

      // Q5
      {
        id: "q5",
        type: "scenario",
        prompt: "Which of these would your peers say sounds most like you after a mistake?",
        optional: false,
        options: [
          { key: "a1", label: "You apologize so much it can annoy the other person.", weights: { appease: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Healer: 1, Jester: 1 }, weights_shadow: { Victim: 1 } },
          { key: "a2", label: "You point out that it wasn’t completely your fault.", weights: { defensive: 2 }, weights_role: { Protector: 1 }, weights_energy: { }, weights_shadow: { Trickster: 1 } },
          { key: "a3", label: "You tend to avoid addressing issues.", weights: { avoidant: 2 }, weights_role: { Guardian: 1 }, weights_energy: { }, weights_shadow: { Hermit: 1 } },
          { key: "a4", label: "You point out that the other person does the same thing they’re chastising you about.", weights: { aggressive: 2, defensive: 1 }, weights_role: { Catalyst: 1 }, weights_energy: { Rebel: 1 }, weights_shadow: { "Shadow Rebel": 1 } },
          { key: "a5", label: "You ghost situations.", weights: { withdrawn: 2 }, weights_role: { Seeker: 1 }, weights_energy: { }, weights_shadow: { Hermit: 1 } },
          { key: "a6", label: "You’re focused on resolving the issue.", weights: { solution: 2 }, weights_role: { Navigator: 1 }, weights_energy: { Creator: 1 } },
          { key: "a7", label: "You own your mistakes and propose prevention.", weights: { accountable: 2 }, weights_role: { Architect: 1 }, weights_energy: { Sage: 1, Sovereign: 1 } }
        ]
      },

      // Q6 — Likert
      {
        id: "q6",
        type: "likert",
        prompt: "“When someone confronts me, my first impulse is to explain myself.”",
        scale: ["Strongly Disagree","Disagree","Neither","Agree","Strongly Agree"],
        optional: false,
        options: [
          { key: "sd", label: "Strongly Disagree", weights: {} },
          { key: "d",  label: "Disagree",          weights: {} },
          { key: "n",  label: "Neither",           weights: {} },
          { key: "a",  label: "Agree",             weights: { defensive: 1 }, weights_role: { Protector: 1 }, weights_shadow: { Trickster: 1 } },
          { key: "sa", label: "Strongly Agree",    weights: { defensive: 2 }, weights_role: { Protector: 1 }, weights_shadow: { Trickster: 1 } }
        ]
      },

      // Q7
      {
        id: "q7",
        type: "scenario",
        prompt: "Your mistake inconvenienced your team. What do you do next?",
        optional: false,
        options: [
          { key: "a1", label: "Say sorry a lot because I feel so bad.", weights: { appease: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Healer: 1, Jester: 1 } },
          { key: "a2", label: "Stay late and fix the damage.", weights: { solution: 2 }, weights_role: { Protector: 1, Navigator: 1 }, weights_energy: { Warrior: 1, Creator: 1 } },
          { key: "a3", label: "Avoid the heat and hope it cools off by tomorrow.", weights: { avoidant: 2 }, weights_role: { Guardian: 1 }, weights_energy: { }, weights_shadow: { Hermit: 1 } },
          { key: "a4", label: "Get irritated—they act like they’ve never messed up.", weights: { aggressive: 2 }, weights_role: { Catalyst: 1 }, weights_energy: { Rebel: 1 } },
          { key: "a5", label: "Acknowledge the impact, apologize, then propose a fix + prevention.", weights: { accountable: 2 }, weights_role: { Architect: 1 }, weights_energy: { Sage: 1, Sovereign: 1, Warrior: 1 } }
        ]
      },

      // Q8
      {
        id: "q8",
        type: "scenario",
        prompt: "Someone you care about is clearly disappointed in you. What do you actually do?",
        optional: false,
        options: [
          { key: "a1", label: "Apologize a lot so they feel better.", weights: { appease: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Healer: 1, Jester: 1 } },
          { key: "a2", label: "Explain myself.", weights: { defensive: 2 }, weights_role: { Protector: 1 }, weights_energy: { }, weights_shadow: { Trickster: 1 } },
          { key: "a3", label: "Lay low for a while.", weights: { withdrawn: 2 }, weights_role: { Seeker: 1 }, weights_energy: { }, weights_shadow: { Hermit: 1 } },
          { key: "a4", label: "Fix something specific to make it right.", weights: { solution: 2 }, weights_role: { Architect: 1 }, weights_energy: { Creator: 1 } },
          { key: "a5", label: "Own it and outline how I’ll avoid repeating it.", weights: { accountable: 2 }, weights_role: { Navigator: 1 }, weights_energy: { Sage: 1, Sovereign: 1 } }
        ]
      },

      // Q9
      {
        id: "q9",
        type: "scenario",
        prompt: "Someone calls you out for something you’ve done. What slips out?",
        optional: false,
        options: [
          { key: "a1", label: "“I’m sorry. Tell me what would help now.”", weights: { appease: 2, accountable: 1 }, weights_role: { Nurturer: 1 }, weights_energy: { Healer: 1, Jester: 1 } },
          { key: "a2", label: "You do the same thing and it’s never a problem then.", weights: { aggressive: 2, defensive: 1 }, weights_role: { Catalyst: 1 }, weights_energy: { Rebel: 1 }, weights_shadow: { "Shadow Rebel": 1 } },
          { key: "a3", label: "“It’s not that serious.”", weights: { avoidant: 2 }, weights_role: { Guardian: 1 }, weights_energy: { }, weights_shadow: { Hermit: 1 } },
          { key: "a4", label: "“I’ll fix it today.”", weights: { solution: 2 }, weights_role: { Architect: 1 }, weights_energy: { Creator: 1 } },
          { key: "a5", label: "“You’re right. Here’s what I’m changing.”", weights: { accountable: 2 }, weights_role: { Architect: 1, Navigator: 1 }, weights_energy: { Sage: 1, Sovereign: 1 } }
        ]
      },

      // Q10
      {
        id: "q10",
        type: "quick_pref",
        prompt: "Which of these feels closer to your instinctive response to mistakes?",
        optional: false,
        options: [
          { key: "a1", label: "Over-apologizing until things feel better.", weights: { appease: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Healer: 1, Jester: 1 }, weights_shadow: { Victim: 1 } },
          { key: "a2", label: "Defending myself from people who need it to be my fault.", weights: { defensive: 2 }, weights_role: { Protector: 1 }, weights_energy: { }, weights_shadow: { Trickster: 1 } },
          { key: "a3", label: "Hoping problems fade on their own.", weights: { avoidant: 2 }, weights_role: { Guardian: 1 }, weights_energy: { }, weights_shadow: { Hermit: 1 } },
          { key: "a4", label: "Reminding hypocrites they’re just as guilty when their amnesia kicks in.", weights: { aggressive: 2 }, weights_role: { Catalyst: 1 }, weights_energy: { Rebel: 1 }, weights_shadow: { "Shadow Rebel": 1 } },
          { key: "a5", label: "Silent treatment.", weights: { withdrawn: 2 }, weights_role: { Seeker: 1 }, weights_energy: { }, weights_shadow: { Hermit: 1 } },
          { key: "a6", label: "Focusing on the solution.", weights: { solution: 2 }, weights_role: { Navigator: 1 }, weights_energy: { Creator: 1 } },
          { key: "a7", label: "Acknowledging my mistake and making the needed changes.", weights: { accountable: 2 }, weights_role: { Architect: 1 }, weights_energy: { Sage: 1, Sovereign: 1 } }
        ]
      }
    ]
  }
};

// sanitize maps
quiz.questions.questions.forEach(q => {
  q.options?.forEach(o => {
    if (o.weights_role)   o.weights_role   = sanitizeTagMap(o.weights_role, VALID_ROLES);
    if (o.weights_energy) o.weights_energy = sanitizeTagMap(o.weights_energy, VALID_ENERGIES);
    if (o.weights_shadow) o.weights_shadow = sanitizeTagMap(o.weights_shadow, VALID_SHADOWS);
  });
});

try {
  console.log("➡️  Upserting quiz:", quiz.slug);
  const { data, error } = await admin.from("quizzes").upsert(quiz, { onConflict: "slug" }).select();
  if (error) throw error;
  console.log("✅ Seeded:", data?.[0]?.slug, "version", quiz.questions.version);
  process.exit(0);
} catch (e) {
  console.error("❌ Seed failed:", e.message);
  process.exit(1);
}
