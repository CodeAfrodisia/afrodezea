// scripts/seed_forgiveness_language_v3.mjs
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
  slug: "forgiveness-language",
  title: "Forgiveness Language",
  category: "Forgiveness",
  description:
    "What helps you truly forgive—accountability, words, action, time, gifts, or consistent change? Learn what you need to let go and move forward.",
  is_published: true,
  questions: {
    version: 3,
    min_required: 10,
    results: [
      {
        key: "accountability",
        label: "Accountability Forgiver",
        headline: "Owning it opens the door.",
        summary: "Specific ownership (what happened, why it was wrong, who it impacted) is the reset point.",
        guidance: [
          "Ask them to name the behavior and the impact without qualifiers.",
          "Look for a brief plan or boundary that prevents repeat harm.",
          "If emotions run hot, pause—then return to the specific accountability."
        ]
      },
      {
        key: "repair",
        label: "Repair/Amends Forgiver",
        headline: "Action rebuilds trust.",
        summary: "Concrete repair—fixing what broke—makes forgiveness feel real.",
        guidance: [
          "Name one visible repair that matches the harm.",
          "Agree on a simple timeline so effort doesn’t drift.",
          "Pair repair with one sentence of ownership for closure."
        ]
      },
      {
        key: "gift",
        label: "Gesture/Gift Forgiver",
        headline: "Thoughtful gestures soften you.",
        summary: "Tangible care that reflects you (not performance) helps your heart un-clench.",
        guidance: [
          "Keep gestures personal (a note, a meal you love, something from your world).",
          "Let the gift follow words or repair—not replace them.",
          "If you feel pressured by gifts, slow down and name what still hurts."
        ]
      },
      {
        key: "time",
        label: "Time/Presence Forgiver",
        headline: "Space and steadiness heal.",
        summary: "Nervous system calm comes first; steady check-ins restore safety.",
        guidance: [
          "State your need for time + when you’ll re-engage.",
          "Prefer gentle presence over absence; light check-ins help.",
          "Use the space to feel and reset (walks, journaling, breath)."
        ]
      },
      {
        key: "words",
        label: "Words Forgiver",
        headline: "Clear words change the weather.",
        summary: "Direct acknowledgment in the right tone lets you release the knot.",
        guidance: [
          "Ask for a specific apology that names the behavior and impact.",
          "Tone and body language must match the words.",
          "Pair words with a small action when you need it."
        ]
      },
      {
        key: "change",
        label: "Changed-Behavior Forgiver",
        headline: "Consistency is the apology.",
        summary: "You forgive when the pattern changes and stays changed.",
        guidance: [
          "Agree on a simple plan and one check-point.",
          "Watch trends over weeks, not one-offs.",
          "Don’t let ‘I’ll do better’ replace accountability."
        ]
      }
    ],

    // ─────────────────────────────────────────────────────────────
    // 12 QUESTIONS TOTAL
    // 1–6: SCENARIOS (all six styles appear each time; weight 2 to the aligned style)
    // 7–12: HEAD-TO-HEAD (each style appears exactly twice; weight 2 on its option)
    // Total cap per style = 6*2 + 2*2 = 16 (balanced)
    // ─────────────────────────────────────────────────────────────
    questions: [
      // Q1 — all six present
      {
        id: "q1",
        type: "scenario",
        prompt: "A close friend says something that stings in front of others. What helps you forgive most?",
        optional: false,
        options: [
          { key: "acc", label: "They clearly own it: what they said, why it was wrong, the impact.", weights: { accountability: 2 }, weights_role: { Herald: 1 }, weights_energy: { Sage: 1 } },
          { key: "rep", label: "They repair the social fallout (clarify publicly, check in with you, reset the vibe).", weights: { repair: 2 }, weights_role: { Architect: 1 }, weights_energy: { Creator: 1 } },
          { key: "gif", label: "A personal gesture that shows they really thought about you.", weights: { gift: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Lover: 1, Jester: 1 } },
          { key: "tim", label: "Space to cool off + a gentle check-in later.", weights: { time: 2 }, weights_role: { Guardian: 1 }, weights_energy: { Caregiver: 1 }, weights_shadow: { Hermit: 1 } },
          { key: "wor", label: "A direct apology in the right tone that names the harm.", weights: { words: 2 }, weights_role: { Herald: 1 }, weights_energy: { Healer: 1 } },
          { key: "chg", label: "Proof it won’t repeat (a simple agreement and they stick to it).", weights: { change: 2 }, weights_role: { Navigator: 1 }, weights_energy: { Warrior: 1, Sovereign: 1 } }
        ]
      },

      // Q2
      {
        id: "q2",
        type: "scenario",
        prompt: "Your partner missed something important to you. What helps you forgive?",
        optional: false,
        options: [
          { key: "acc", label: "They name what they missed and why it mattered—no excuses.", weights: { accountability: 2 }, weights_role: { Herald: 1 }, weights_energy: { Sage: 1 } },
          { key: "rep", label: "They handle the fallout (reschedule, cover logistics, make amends).", weights: { repair: 2 }, weights_role: { Architect: 1, Artisan: 1 }, weights_energy: { Creator: 1 } },
          { key: "gif", label: "A thoughtful gesture that matches your world.", weights: { gift: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Lover: 1 } },
          { key: "tim", label: "Time to de-stress + steady presence.", weights: { time: 2 }, weights_role: { Guardian: 1 }, weights_energy: { Caregiver: 1 } },
          { key: "wor", label: "A specific apology that says the words you needed to hear.", weights: { words: 2 }, weights_role: { Herald: 1 }, weights_energy: { Healer: 1, Muse: 1 } },
          { key: "chg", label: "A simple plan so it doesn’t repeat—and they follow it.", weights: { change: 2 }, weights_role: { Navigator: 1 }, weights_energy: { Warrior: 1, Sage: 1 } }
        ]
      },

      // Q3
      {
        id: "q3",
        type: "scenario",
        prompt: "A coworker’s mistake created extra work for you. What helps you forgive fastest?",
        optional: false,
        options: [
          { key: "acc", label: "They own it to you and the team, clearly and briefly.", weights: { accountability: 2 }, weights_role: { Herald: 1 }, weights_energy: { Sovereign: 1 } },
          { key: "rep", label: "They jump in to help you catch up or remove blockers.", weights: { repair: 2 }, weights_role: { Protector: 1 }, weights_energy: { Warrior: 1 } },
          { key: "gif", label: "A small gesture (coffee, note) that shows they see the impact.", weights: { gift: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Lover: 1, Jester: 1 } },
          { key: "tim", label: "Space to reset; they check back respectfully.", weights: { time: 2 }, weights_role: { Guardian: 1 }, weights_energy: { Caregiver: 1 } },
          { key: "wor", label: "A clean apology that names the specific miss.", weights: { words: 2 }, weights_role: { Herald: 1 }, weights_energy: { Sage: 1 } },
          { key: "chg", label: "They adjust their process so it doesn’t happen again.", weights: { change: 2 }, weights_role: { Architect: 1, Navigator: 1 }, weights_energy: { Creator: 1 } }
        ]
      },

      // Q4
      {
        id: "q4",
        type: "scenario",
        prompt: "Someone forgets a boundary you set. What opens forgiveness for you?",
        optional: false,
        options: [
          { key: "acc", label: "They reflect back your boundary and why it matters.", weights: { accountability: 2 }, weights_role: { Herald: 1 }, weights_energy: { Sage: 1 } },
          { key: "rep", label: "They make amends by fixing whatever was affected.", weights: { repair: 2 }, weights_role: { Architect: 1 }, weights_energy: { Creator: 1 } },
          { key: "gif", label: "A gesture that shows care for your boundary (note, small support).", weights: { gift: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Lover: 1 } },
          { key: "tim", label: "Time; you reconnect when you’re ready.", weights: { time: 2 }, weights_role: { Seeker: 1 }, weights_energy: { Caregiver: 1 }, weights_shadow: { Hermit: 1 } },
          { key: "wor", label: "They apologize using your words for the boundary.", weights: { words: 2 }, weights_role: { Herald: 1 }, weights_energy: { Healer: 1 } },
          { key: "chg", label: "They add a reminder/system so the boundary sticks.", weights: { change: 2 }, weights_role: { Navigator: 1 }, weights_energy: { Warrior: 1, Sovereign: 1 } }
        ]
      },

      // Q5
      {
        id: "q5",
        type: "scenario",
        prompt: "After a heated argument, what softens you?",
        optional: false,
        options: [
          { key: "acc", label: "They own their part without asking you to own yours first.", weights: { accountability: 2 }, weights_role: { Herald: 1 }, weights_energy: { Sage: 1 } },
          { key: "rep", label: "They repair what was impacted (plans, mess, cleanup).", weights: { repair: 2 }, weights_role: { Protector: 1 }, weights_energy: { Warrior: 1 } },
          { key: "gif", label: "A sincere gesture that feels like ‘I see you.’", weights: { gift: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Lover: 1 } },
          { key: "tim", label: "Time and then a calm check-in.", weights: { time: 2 }, weights_role: { Guardian: 1 }, weights_energy: { Caregiver: 1 } },
          { key: "wor", label: "Hearing them name the impact in their own words.", weights: { words: 2 }, weights_role: { Herald: 1 }, weights_energy: { Healer: 1, Muse: 1 } },
          { key: "chg", label: "A small change you can see the next day.", weights: { change: 2 }, weights_role: { Architect: 1, Navigator: 1 }, weights_energy: { Creator: 1 } }
        ]
      },

      // Q6
      {
        id: "q6",
        type: "scenario",
        prompt: "A family member breaks a promise. What helps you move forward?",
        optional: false,
        options: [
          { key: "acc", label: "They say exactly what promise broke and how they’ll protect it next time.", weights: { accountability: 2 }, weights_role: { Herald: 1 }, weights_energy: { Sovereign: 1 } },
          { key: "rep", label: "They handle the consequence the promise was protecting.", weights: { repair: 2 }, weights_role: { Architect: 1 }, weights_energy: { Creator: 1 } },
          { key: "gif", label: "A small, meaningful gesture that meets you where you are.", weights: { gift: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Lover: 1 } },
          { key: "tim", label: "Time apart + a plan to reconnect.", weights: { time: 2 }, weights_role: { Seeker: 1 }, weights_energy: { Caregiver: 1 } },
          { key: "wor", label: "A clear apology (no ‘but’), in a calm tone.", weights: { words: 2 }, weights_role: { Herald: 1 }, weights_energy: { Healer: 1 } },
          { key: "chg", label: "A visible routine change to protect the promise.", weights: { change: 2 }, weights_role: { Navigator: 1 }, weights_energy: { Warrior: 1 } }
        ]
      },

      // HEAD-TO-HEAD (each style appears exactly twice across Q7–Q12)
      // Pair schedule: (acc vs words), (repair vs change), (gift vs time),
      // (acc vs repair), (words vs change), (gift vs acc)  ← each style shows twice.

      { id: "q7", type: "head_to_head",
        prompt: "What restores trust faster—for you?",
        optional: false,
        options: [
          { key: "o1", label: "They own it clearly and specifically.", weights: { accountability: 2 } },
          { key: "o2", label: "They apologize in the right words and tone.", weights: { words: 2 } }
        ]
      },

      { id: "q8", type: "head_to_head",
        prompt: "Which matters more when harm was done?",
        optional: false,
        options: [
          { key: "o1", label: "They fix the impact.", weights: { repair: 2 } },
          { key: "o2", label: "They change the pattern.", weights: { change: 2 } }
        ]
      },

      { id: "q9", type: "head_to_head",
        prompt: "What helps you soften sooner?",
        optional: false,
        options: [
          { key: "o1", label: "A thoughtful gesture that fits you.", weights: { gift: 2 } },
          { key: "o2", label: "Time and calm presence.", weights: { time: 2 } }
        ]
      },

      { id: "q10", type: "head_to_head",
        prompt: "Pick the one that matters more—most of the time:",
        optional: false,
        options: [
          { key: "o1", label: "They take responsibility (no excuses).", weights: { accountability: 2 } },
          { key: "o2", label: "They make amends you can see.", weights: { repair: 2 } }
        ]
      },

      { id: "q11", type: "head_to_head",
        prompt: "If you had to choose one:",
        optional: false,
        options: [
          { key: "o1", label: "An apology that says exactly what hurt.", weights: { words: 2 } },
          { key: "o2", label: "Proof it won’t repeat.", weights: { change: 2 } }
        ]
      },

      { id: "q12", type: "head_to_head",
        prompt: "When emotions run high, what feels like care?",
        optional: false,
        options: [
          { key: "o1", label: "A small, genuine gesture.", weights: { gift: 2 } },
          { key: "o2", label: "Space + steady check-ins.", weights: { time: 2 } }
        ]
      }
    ]
  }
};

// sanitize tag maps
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
