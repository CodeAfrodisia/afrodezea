// scripts/seed_stress_response_v1.mjs
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("❌ Missing Supabase env vars");
  process.exit(1);
}
const admin = createClient(url, key);

// Dual Archetype allow-lists
const VALID_ROLES = new Set(["Navigator","Protector","Architect","Guardian","Artisan","Catalyst","Nurturer","Herald","Seeker"]);
const VALID_ENERGIES = new Set(["Muse","Sage","Visionary","Healer","Warrior","Creator","Lover","Magician","Rebel","Caregiver","Trickster","Hermit"]);
const VALID_SHADOWS = new Set(["Victim","Saboteur","Addict","Shadow Rebel","Tyrant","Trickster","Hermit","Martyr","Nihilist"]);

function sanitizeTagMap(map, valid) {
  if (!map || typeof map !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(map)) {
    if (valid.has(k) && typeof v === "number" && v > 0) out[k] = v;
  }
  return out;
}

const quiz = {
  slug: "stress-response",
  title: "Stress Response",
  category: "Wellbeing",
  description:
    "How do you respond under stress—solve, process, avoid, or internalize? Get tailored guidance to cope cleanly and recover faster.",
  is_published: true,
  questions: {
    version: 1,
    min_required: 9,
    results: [
      {
        key: "problem_solve",
        label: "Problem-Solving",
        headline: "You calm down by fixing what you can.",
        summary: "Action and structure help you regain control.",
        guidance: [
          "Name the smallest next step; sprint for 15 minutes.",
          "Don’t skip feelings—add a 3-minute body check.",
          "Schedule recovery time after the fix."
        ]
      },
      {
        key: "emotion_process",
        label: "Emotion-Focused",
        headline: "You steady yourself by feeling and expressing.",
        summary: "Naming emotions, venting, and co-regulating help you reset.",
        guidance: [
          "Use a timer to contain venting; end with one action.",
          "Add a grounding ritual (breathe, walk, stretch).",
          "Ask supporters for what you need explicitly."
        ]
      },
      {
        key: "avoidance",
        label: "Avoidance",
        headline: "You cope by distracting or delaying.",
        summary: "Space helps, but too much creates pile-ups.",
        guidance: [
          "Use ‘conscious delay’: schedule the task window.",
          "Pair a comfort with a commitment (e.g., 20-min show → 10-min step).",
          "Set one accountability ping with someone safe."
        ]
      },
      {
        key: "internalize",
        label: "Internalizing",
        headline: "You turn stress inward.",
        summary: "Self-criticism and rumination drain your energy.",
        guidance: [
          "Replace ‘I should’ with ‘Next time I’ll…’.",
          "Keep a wins log to counter harsh narratives.",
          "Share one honest sentence with a trusted person."
        ]
      }
    ],
    questions: [
      // Q1 — Perception of stress (A1/A4 updated)
      {
        id: "q1",
        type: "scenario",
        prompt: "When stress hits, what do you notice first?",
        optional: false,
        options: [
          { key: "a1", label: "I feel a discomfort and go right into dissecting and solving it.", weights: { problem_solve: 2 }, weights_role: { Architect: 1, Navigator: 1 }, weights_energy: { Sage: 1 } },
          { key: "a2", label: "I feel it emotionally and want to talk/vent.", weights: { emotion_process: 2 }, weights_role: { Nurturer: 1, Herald: 1 }, weights_energy: { Healer: 1 } },
          { key: "a3", label: "I distract myself and hope the feeling fades.", weights: { avoidance: 2 }, weights_role: { Seeker: 1 }, weights_energy: { Hermit: 1 }, weights_shadow: { Addict: 1 } },
          { key: "a4", label: "I get quiet.", weights: { internalize: 2 }, weights_role: { Guardian: 1 }, weights_energy: { Hermit: 1 } }
        ]
      },

      // Q2 — First move under stress (A4 updated)
      {
        id: "q2",
        type: "scenario",
        prompt: "What’s your first move when you feel overwhelmed?",
        optional: false,
        options: [
          { key: "a1", label: "Make a quick plan and execute one small step.", weights: { problem_solve: 2 }, weights_role: { Architect: 1 }, weights_energy: { Warrior: 1 } },
          { key: "a2", label: "Call/text someone and express what I’m feeling.", weights: { emotion_process: 2 }, weights_role: { Herald: 1 }, weights_energy: { Healer: 1 } },
          { key: "a3", label: "Indulging in a comfort (food, sleep, substances).", weights: { avoidance: 2 }, weights_role: { Seeker: 1 }, weights_energy: { Hermit: 1 }, weights_shadow: { Addict: 1 } },
          { key: "a4", label: "I tend to go silent and maybe consider where I went wrong.", weights: { internalize: 2 }, weights_role: { Guardian: 1 }, weights_energy: { Hermit: 1 } }
        ]
      },

      // Q3 — Social/relational shift (A3/A4 updated)
      {
        id: "q3",
        type: "scenario",
        prompt: "Around people, stress makes you…",
        optional: false,
        options: [
          { key: "a1", label: "More direct and solution-driven.", weights: { problem_solve: 2 }, weights_role: { Protector: 1 }, weights_energy: { Warrior: 1 } },
          { key: "a2", label: "More expressive—tears, venting, talking it out.", weights: { emotion_process: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Healer: 1 } },
          { key: "a3", label: "More indulgent in distractions—scrolling, TV, errands that don’t matter.", weights: { avoidance: 2 }, weights_role: { Seeker: 1 }, weights_energy: { Trickster: 1 } },
          { key: "a4", label: "Quieter—I don’t want to burden anyone with my problems.", weights: { internalize: 2 }, weights_role: { Guardian: 1 }, weights_energy: { Hermit: 1 } }
        ]
      },

      // Q4 — H2H: fix now vs settle first (unchanged)
      {
        id: "q4",
        type: "head_to_head",
        prompt: "Which feels truer under stress?",
        optional: false,
        options: [
          { key: "a", label: "Fix the source of stress ASAP.", weights: { problem_solve: 2 }, weights_role: { Architect: 1 }, weights_energy: { Warrior: 1 } },
          { key: "b", label: "Calm my body first; solutions can wait.", weights: { emotion_process: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Healer: 1 } }
        ]
      },

      // Q5 — Deadlines tendency (unchanged)
      {
        id: "q5",
        type: "scenario",
        prompt: "Deadlines are approaching. What’s your tendency?",
        optional: false,
        options: [
          { key: "a1", label: "Break it down and start early.", weights: { problem_solve: 2 }, weights_role: { Architect: 1 }, weights_energy: { Sage: 1 } },
          { key: "a2", label: "Talk it out, then work when I feel steadier.", weights: { emotion_process: 2 }, weights_role: { Herald: 1 }, weights_energy: { Healer: 1 } },
          { key: "a3", label: "I may put it off for as long as I can—sometimes up to the last minute.", weights: { avoidance: 2 }, weights_role: { Seeker: 1 }, weights_energy: { Trickster: 1 } },
          { key: "a4", label: "Freeze and judge myself for not starting.", weights: { internalize: 2 }, weights_role: { Guardian: 1 }, weights_energy: { Hermit: 1 } }
        ]
      },

      // Q6 — Elevated stress (prompt updated; A4 updated)
      {
        id: "q6",
        type: "scenario",
        prompt: "You’re in a moment of elevated stress. Which sounds most like how you’d respond?",
        optional: false,
        options: [
          { key: "a1", label: "Make a 20-minute micro-plan and begin.", weights: { problem_solve: 2 }, weights_role: { Architect: 1 }, weights_energy: { Warrior: 1 } },
          { key: "a2", label: "Breathwork/cry/talk, then one small step.", weights: { emotion_process: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Healer: 1 } },
          { key: "a3", label: "I try to distract myself until it passes.", weights: { avoidance: 2 }, weights_role: { Seeker: 1 }, weights_energy: { Hermit: 1 } },
          { key: "a4", label: "Stay to myself and replay what I did wrong.", weights: { internalize: 2 }, weights_role: { Guardian: 1 }, weights_energy: { Hermit: 1 } }
        ]
      },

      // Q7 — H2H support (prompt + labels updated — essence preserved)
      {
        id: "q7",
        type: "head_to_head",
        prompt: "Your loved ones want to help in a moment of stress for you. Which would you consider more helpful?",
        optional: false,
        options: [
          { key: "a", label: "Execution of tasks that solve the source of the stress.", weights: { problem_solve: 2 }, weights_role: { Navigator: 1 }, weights_energy: { Sage: 1 } },
          { key: "b", label: "Caring enough to listen and allow me to vent for a bit.", weights: { emotion_process: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Healer: 1 } }
        ]
      },

      // Q8 — General approach (internalizer line preserved)
      {
        id: "q8",
        type: "quick_pref",
        prompt: "What’s your general approach to stress?",
        optional: false,
        options: [
          { key: "a1", label: "Solve it, and eliminate it.", weights: { problem_solve: 2 }, weights_role: { Architect: 1 }, weights_energy: { Warrior: 1 } },
          { key: "a2", label: "Express it and release it.", weights: { emotion_process: 2 }, weights_role: { Herald: 1 }, weights_energy: { Healer: 1 } },
          { key: "a3", label: "Wait it out; focus on something else.", weights: { avoidance: 2 }, weights_role: { Seeker: 1 }, weights_energy: { Hermit: 1 } },
          { key: "a4", label: "I assume I should’ve done better—it must be my fault somehow.", weights: { internalize: 2 }, weights_role: { Guardian: 1 }, weights_energy: { Hermit: 1 }, weights_shadow: { Victim: 1 } }
        ]
      },

      // Q9 — Quick Pref (prompt updated)
      {
        id: "q9",
        type: "quick_pref",
        prompt: "When you’re stressed, what tends to be your first response?",
        optional: false,
        options: [
          { key: "a1", label: "List 3 actions and start one.", weights: { problem_solve: 2 }, weights_role: { Architect: 1 }, weights_energy: { Warrior: 1 } },
          { key: "a2", label: "Call/text someone safe to vent.", weights: { emotion_process: 2 }, weights_role: { Herald: 1 }, weights_energy: { Healer: 1 } },
          { key: "a3", label: "Open an app / show / snack and zone out.", weights: { avoidance: 2 }, weights_role: { Seeker: 1 }, weights_energy: { Trickster: 1 } },
          { key: "a4", label: "Go quiet and replay what went wrong.", weights: { internalize: 2 }, weights_role: { Guardian: 1 }, weights_energy: { Hermit: 1 } }
        ]
      },

      // Q10 — Default coping (prompt updated; A4 updated)
      {
        id: "q10",
        type: "scenario",
        prompt: "What’s your default coping method when you’re tapped out?",
        optional: false,
        options: [
          { key: "a1", label: "Handle the smallest actionable piece.", weights: { problem_solve: 2 }, weights_role: { Architect: 1 }, weights_energy: { Sage: 1 } },
          { key: "a2", label: "I try to distract myself until it passes.", weights: { avoidance: 2 }, weights_role: { Seeker: 1 }, weights_energy: { Hermit: 1 } },
          { key: "a3", label: "I cry/vent/journal to move the feeling.", weights: { emotion_process: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Healer: 1 } },
          { key: "a4", label: "I assume I’m the problem and isolate.", weights: { internalize: 2 }, weights_role: { Guardian: 1 }, weights_energy: { Hermit: 1 } }
        ]
      },

      // Q11 — H2H instinct
      {
        id: "q11",
        type: "head_to_head",
        prompt: "Which of these feels closer to your *instinctive* response to stress?",
        optional: false,
        options: [
          { key: "a", label: "Act: ‘What’s the next step I can do?’", weights: { problem_solve: 2 }, weights_role: { Navigator: 1 }, weights_energy: { Warrior: 1 } },
          { key: "b", label: "Feel: ‘Let me process this with someone or alone.’", weights: { emotion_process: 2 }, weights_role: { Nurturer: 1 }, weights_energy: { Healer: 1 } }
        ]
      },

      // Q12 — Likert bottling
      {
        id: "q12",
        type: "likert",
        prompt: "“I bottle things up so I won’t burden anyone.”",
        scale: ["Strongly Disagree","Disagree","Neutral","Agree","Strongly Agree"],
        optional: false,
        options: [
          { key: "sd", label: "Strongly Disagree", weights: {}, weights_role: {}, weights_energy: {} },
          { key: "d",  label: "Disagree",          weights: {}, weights_role: {}, weights_energy: {} },
          { key: "n",  label: "Neutral",           weights: {}, weights_role: {}, weights_energy: {} },
          { key: "a",  label: "Agree",             weights: { internalize: 1 }, weights_role: { Guardian: 1 }, weights_energy: { Hermit: 1 } },
          { key: "sa", label: "Strongly Agree",    weights: { internalize: 2 }, weights_role: { Guardian: 1 }, weights_energy: { Hermit: 1 } }
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
  console.log("✅ Seeded:", data?.[0]?.slug);
  process.exit(0);
} catch (e) {
  console.error("❌ Seed failed:", e.message);
  process.exit(1);
}
