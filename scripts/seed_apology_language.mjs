// scripts/seed_apology_language_v3.mjs
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

// Canon allow-lists
const VALID_ROLES = new Set(["Navigator","Protector","Architect","Guardian","Artisan","Catalyst","Nurturer","Herald","Seeker"]);
const VALID_ENERGIES = new Set([
  "Muse","Sage","Visionary","Healer","Warrior","Creator","Lover","Magician","Rebel","Caregiver","Sovereign","Jester"
]);
// Shadows (detectors only)
const VALID_SHADOWS = new Set(["Victim","Saboteur","Addict","Shadow Rebel","Tyrant","Trickster","Hermit","Martyr","Nihilist","Mask"]);

function sanitizeTagMap(map, valid) {
  if (!map || typeof map !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(map)) {
    if (valid.has(k) && typeof v === "number" && v > 0) out[k] = v;
  }
  return out;
}

const quiz = {
  slug: "apology-language",
  title: "Apology Language",
  category: "Forgiveness",
  description:
    "Discover how you instinctively apologize—and what that reveals about your Role and Energy archetypes.",
  is_published: true,
  questions: {
    version: 3,
    min_required: 9,
    results: [
      { key: "words",  label: "Words Apologist",  headline: "You express regret directly.", summary: "Clarity and sincerity matter most to you when making things right." },
      { key: "repair", label: "Repair Apologist", headline: "You fix mistakes through action.", summary: "Restoring what was broken feels more honest than words." },
      { key: "change", label: "Change Apologist", headline: "You prove your apology by growing.", summary: "Consistency and new behavior show your sincerity." },
      { key: "gift",   label: "Gift Apologist",   headline: "You offer peace offerings.",      summary: "A gesture softens tension and shows care." },
      { key: "time",   label: "Time Apologist",   headline: "You let space do the work.",      summary: "Patience and steady presence allow emotions to settle." }
    ],
    questions: [
      // Q1
      {
        id: "q1",
        type: "scenario",
        prompt: "You snap at a friend after a long day, and they get quiet. What’s your first instinct?",
        optional: false,
        options: [
          { key: "a", label: "Apologize immediately, simply, and sincerely.", weights: { words: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Healer: 1, Sage: 1, Jester: 1 }, weights_shadow: { Victim: 1 } },
          { key: "b", label: "Offer to make it up (cook dinner, run an errand).", weights: { repair: 2 }, weights_role: { Protector: 1, Artisan: 1 }, weights_energy: { Creator: 1, Warrior: 1 } },
          { key: "c", label: "Bring a small treat or thoughtful gift to lighten the mood.", weights: { gift: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Lover: 1, Muse: 1, Jester: 1 } },
          { key: "d", label: "Give space, then check in tomorrow to see how they’re feeling.", weights: { time: 2 }, weights_role: { Guardian: 1 }, weights_energy: { Caregiver: 1 }, weights_shadow: { Hermit: 1 } },
          { key: "e", label: "Own that stress leaked and commit to handling it differently next time.", weights: { change: 2 }, weights_role: { Architect: 1, Navigator: 1 }, weights_energy: { Sage: 1, Warrior: 1, Sovereign: 1 } }
        ]
      },

      // Q2
      {
        id: "q2",
        type: "scenario",
        prompt: "When you realize you’ve hurt someone, what do you usually do first?",
        optional: false,
        options: [
          { key: "a1", label: "Own it: “That’s on me. I apologize.”", weights: { words: 2 }, weights_role: { Protector: 1 }, weights_energy: { Sage: 1, Warrior: 1, Sovereign: 1 } },
          { key: "a2", label: "Briefly explain intent, then acknowledge the impact.", weights: { words: 1, repair: 1 }, weights_role: { Herald: 1 }, weights_energy: { Muse: 1, Sage: 1 }, weights_shadow: { Saboteur: 1 } },
          { key: "a3", label: "Offer to make it right through an action.", weights: { repair: 2 }, weights_role: { Artisan: 1, Architect: 1 }, weights_energy: { Healer: 1, Creator: 1 } },
          { key: "a4", label: "Pause the convo, let things cool, then re-approach.", weights: { time: 2 }, weights_role: { Guardian: 1 }, weights_energy: { Caregiver: 1 }, weights_shadow: { Hermit: 1 } }
        ]
      },

      // Q3
      {
        id: "q3",
        type: "scenario",
        prompt: "What matters most in how you make an apology?",
        optional: false,
        options: [
          { key: "a1", label: "Actually saying “I’m sorry.”", weights: { words: 2 },  weights_role: { Herald: 1 },   weights_energy: { Muse: 1, Sage: 1 } },
          { key: "a2", label: "Doing something to fix it.",    weights: { repair: 2 }, weights_role: { Architect: 1 }, weights_energy: { Creator: 1, Warrior: 1 } },
          { key: "a3", label: "Showing I’ve changed through consistent action.", weights: { change: 2 }, weights_role: { Navigator: 1 }, weights_energy: { Warrior: 1, Sovereign: 1 } },
          { key: "a4", label: "Offering a gift to smooth things over.", weights: { gift: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Lover: 1, Muse: 1, Jester: 1 } },
          { key: "a5", label: "Staying present while they share how it felt.", weights: { time: 2 }, weights_role: { Guardian: 1 }, weights_energy: { Caregiver: 1 } }
        ]
      },

      // Q4 — words vs repair
      {
        id: "q4",
        type: "head_to_head",
        prompt: "Which feels more like your style of apologizing?",
        optional: false,
        options: [
          { key: "a", label: "Say “I’m sorry” clearly.",              weights: { words: 2 },  weights_role: { Herald: 1 },   weights_energy: { Muse: 1, Sage: 1 } },
          { key: "b", label: "Show you’re sorry by doing something.", weights: { repair: 2 }, weights_role: { Architect: 1 }, weights_energy: { Creator: 1, Warrior: 1 } }
        ]
      },

      // Q5 — gift vs time
      {
        id: "q5",
        type: "head_to_head",
        prompt: "Which feels truer to you?",
        optional: false,
        options: [
          { key: "a", label: "A meaningful gift or gesture repairs the bond.", weights: { gift: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Lover: 1, Muse: 1, Jester: 1 } },
          { key: "b", label: "Space and steady presence works better.",        weights: { time: 2 },  weights_role: { Guardian: 1 }, weights_energy: { Caregiver: 1 } }
        ]
      },

      // Q6 — Likert (Change)
      {
        id: "q6",
        type: "likert",
        prompt: "“The best apology is changed behavior.”",
        scale: ["Strongly Disagree","Disagree","Neither","Agree","Strongly Agree"],
        optional: false,
        options: [
          { key: "sd", label: "Strongly Disagree", weights: {} },
          { key: "d",  label: "Disagree",          weights: {} },
          { key: "n",  label: "Neither",           weights: {} },
          { key: "a",  label: "Agree",             weights: { change: 1 }, weights_role: { Navigator: 1 }, weights_energy: { Warrior: 1 } },
          { key: "sa", label: "Strongly Agree",    weights: { change: 3 }, weights_role: { Navigator: 1 }, weights_energy: { Warrior: 1, Sovereign: 1 } }
        ]
      },

      // Q7 — workplace lateness
      {
        id: "q7",
        type: "scenario",
        prompt: "You were late and caused your team to start behind. What do you do next?",
        optional: false,
        options: [
          { key: "a1", label: "Apologize for the mistake.", weights: { words: 2 },  weights_role: { Herald: 1 },   weights_energy: { Muse: 1, Sovereign: 1 } },
          { key: "a2", label: "Stay late to help the team catch up.", weights: { repair: 2 }, weights_role: { Protector: 1 }, weights_energy: { Warrior: 1, Caregiver: 1 } },
          { key: "a3", label: "Bring a small treat for the group.",    weights: { gift: 2 },   weights_role: { Nurturer: 1 }, weights_energy: { Lover: 1, Jester: 1 } },
          { key: "a4", label: "Circle back later and steady the relationship.", weights: { time: 2 }, weights_role: { Guardian: 1 }, weights_energy: { Caregiver: 1 } }
        ]
      },

      // Q8 — broken promise
      {
        id: "q8",
        type: "scenario",
        prompt: "You broke a promise and disappointed someone you care about. What’s your next move?",
        optional: false,
        options: [
          { key: "a1", label: "Briefly explain and acknowledge the impact.", weights: { words: 2 }, weights_role: { Herald: 1 }, weights_energy: { Sage: 1 }, weights_shadow: { Saboteur: 1 } },
          { key: "a2", label: "Offer to fix the consequences (reschedule, cover costs, etc.).", weights: { repair: 2 }, weights_role: { Architect: 1, Artisan: 1 }, weights_energy: { Creator: 1 } },
          { key: "a3", label: "Give a thoughtful gift that suits them.", weights: { gift: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Lover: 1, Jester: 1 } },
          { key: "a4", label: "Give space now, then re-approach with care.", weights: { time: 2 }, weights_role: { Guardian: 1 }, weights_energy: { Caregiver: 1 }, weights_shadow: { Hermit: 1 } },
          { key: "a5", label: "Commit to specific changes so it won’t happen again.", weights: { change: 2 }, weights_role: { Navigator: 1 }, weights_energy: { Warrior: 1, Sage: 1, Sovereign: 1 } },
          { key: "a6", label: "Re-evaluate how I make promises so I don’t overcommit again.", weights: { change: 2 }, weights_role: { Architect: 1, Navigator: 1 }, weights_energy: { Sage: 1, Sovereign: 1 } }
        ]
      },

      // Q9 — peer read
      {
        id: "q9",
        type: "quick_pref",
        prompt: "Which sounds closest to how your peers might describe your apology style?",
        optional: false,
        options: [
          { key: "a1", label: "You have no problem apologizing.",              weights: { words: 2 },  weights_role: { Herald: 1 },   weights_energy: { Muse: 1 } },
          { key: "a2", label: "You fix your mistakes.",                        weights: { repair: 2 }, weights_role: { Architect: 1 }, weights_energy: { Creator: 1 } },
          { key: "a3", label: "You rarely repeat the same mistake.",           weights: { change: 2 }, weights_role: { Navigator: 1 }, weights_energy: { Warrior: 1, Sovereign: 1 } },
          { key: "a4", label: "You make things right with gestures.",          weights: { gift: 2 },   weights_role: { Nurturer: 1 }, weights_energy: { Lover: 1, Jester: 1 } },
          { key: "a5", label: "You use space and a steady follow-up.",         weights: { time: 2 },   weights_role: { Guardian: 1 }, weights_energy: { Caregiver: 1 } }
        ]
      },

      // Q10 — timing
      {
        id: "q10",
        type: "scenario",
        prompt: "Emotional timing: what feels truest for you?",
        optional: false,
        options: [
          { key: "a1", label: "Apologize quickly and cleanly.",                 weights: { words: 2 },  weights_role: { Nurturer: 1 },  weights_energy: { Healer: 1, Jester: 1 }, weights_shadow: { Victim: 1 } },
          { key: "a2", label: "Act fast to repair something concrete.",         weights: { repair: 2 }, weights_role: { Protector: 1 },  weights_energy: { Warrior: 1 } },
          { key: "a3", label: "State what will change and follow through.",     weights: { change: 2 }, weights_role: { Navigator: 1 }, weights_energy: { Warrior: 1, Sage: 1, Sovereign: 1 } },
          { key: "a4", label: "Process first; respond thoughtfully later.",     weights: { time: 1, change: 1 }, weights_role: { Guardian: 1 }, weights_energy: { Caregiver: 1, Sage: 1 } },
          { key: "a5", label: "Offer a disarming gesture to reset the vibe.",   weights: { gift: 2 },   weights_role: { Catalyst: 1 },  weights_energy: { Rebel: 1, Creator: 1, Jester: 1 }, weights_shadow: { "Shadow Rebel": 1 } }
        ]
      },

      // Q11 — aftermath
      {
        id: "q11",
        type: "scenario",
        prompt: "Which of these best describes how you feel after a mistake?",
        optional: false,
        options: [
          { key: "a1", label: "I can’t find peace until I’ve corrected my wrongs.", weights: { repair: 2 }, weights_role: { Protector: 1 }, weights_energy: { Warrior: 1 } },
          { key: "a2", label: "Once I apologize, I move forward and give it time.", weights: { words: 2, time: 1 }, weights_role: { Herald: 1, Seeker: 1 }, weights_energy: { Sage: 1 } },
          { key: "a3", label: "Even after they accept it, I want to do a little more.", weights: { gift: 1, repair: 1 }, weights_role: { Nurturer: 1, Architect: 1 }, weights_energy: { Lover: 1, Creator: 1 }, weights_shadow: { Addict: 1 } }
        ]
      }
    ]
  }
};

// sanitize role/energy/shadow keys
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
