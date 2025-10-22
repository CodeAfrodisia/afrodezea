// scripts/seed_archetype.mjs
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌ Missing env. Check .env.local");
  console.error("VITE_SUPABASE_URL =", url || "(undefined)");
  console.error("SUPABASE_SERVICE_ROLE_KEY length =", key ? key.length : 0);
  process.exit(1);
}

const admin = createClient(url, key);

const ELEMENTS = [
  { key: "fire",        label: "Fire",        color: "#ff5a36", traits: ["bold", "decisive", "energizing"] },
  { key: "water",       label: "Water",       color: "#3aa9ff", traits: ["empathic", "adaptable", "soothing"] },
  { key: "earth",       label: "Earth",       color: "#9c8458", traits: ["steady", "practical", "grounded"] },
  { key: "air",         label: "Air",         color: "#cfd7ff", traits: ["curious", "expressive", "idea-driven"] },
  { key: "electricity", label: "Electricity", color: "#ffd84d", traits: ["innovative", "spontaneous", "sparky"] },
];

const ROLES = [
  { key: "protector",     label: "Protector",     light: "steadfast, safe-keeping",       shadow: "rigid, over-controlling" },
  { key: "healer",        label: "Healer",        light: "soothing, compassionate",       shadow: "self-erasing, rescuer" },
  { key: "muse",          label: "Muse",          light: "inspiring, enchanting",         shadow: "elusive, performative" },
  { key: "architect",     label: "Architect",     light: "systems, order, clarity",       shadow: "over-planning, cold" },
  { key: "rebel",         label: "Rebel",         light: "catalyst, change-maker",        shadow: "chaotic, contrary" },
  { key: "sage",          label: "Sage",          light: "perspective, discernment",      shadow: "aloof, overly cerebral" },
  { key: "guardian",      label: "Guardian",      light: "reliable, loyal",               shadow: "possessive, limiting" },
  { key: "artisan",       label: "Artisan",       light: "craft, beauty, devotion",       shadow: "perfectionist, stalled" },
  { key: "visionary",     label: "Visionary",     light: "future-minded, pioneering",     shadow: "untethered, restless" },
  { key: "navigator",     label: "Navigator",     light: "strategy, wayfinding",          shadow: "controlling the path" },
];

// Helper text builders
function comboTitle(el, role) {
  return `${el.label} ${role.label}`;
}
function comboHeadline(el, role) {
  return `You **may be** a ${el.label} ${role.label}.`;
}
function comboSummary(el, role) {
  return `${el.label}: ${el.traits.join(", ")}. ${role.label}: ${role.light}. In shadow, ${role.shadow}.`;
}

// NOTE: This quiz uses **two-dimensional** scoring:
// - Per option, we store `weights_element` and `weights_role`.
// - Frontend will compute top Element and top Role and compose the result.

const quiz = {
  slug: "archetype",
  title: "Your Afrodezea Archetype",
  category: "Archetypal",
  description:
    "Discover your core Element and Role. We’ll combine both to form your archetype (e.g., Fire Protector). Reflective guidance—never a verdict.",
  is_published: true,
  questions: {
    version: 1,
    min_required: 9,

    // We must still supply a `results` array for compatibility,
    // but final composition is computed client-side from the two vectors.
    // Provide one generic placeholder result to satisfy older UIs.
    results: [
      {
        key: "composite",
        label: "Composite Archetype",
        headline: "Your Element + Role",
        summary: "Calculated from your answers. The UI composes the label (e.g., Fire Protector).",
        guidance: [
          "Lean into the light qualities of both dimensions.",
          "Notice when shadow tendencies appear; choose small, consistent repairs."
        ],
      }
    ],

    // ─────────────────────────────────────────────────────────────
    // QUESTIONS
    // Convention:
    // - Each option may include:
    //   - weights_element: { fire: n, water: n, earth: n, air: n, electricity: n }
    //   - weights_role:    { protector: n, healer: n, ... }
    //   - tags/suggestion optional
    // ─────────────────────────────────────────────────────────────

    questions: [
      // ELEMENT-FORWARD (3)
      {
        id: "e1",
        prompt: "In a fresh team setting, what’s your instinctive contribution?",
        optional: false,
        options: [
          { key: "e1_a", label: "Spark momentum and rally energy.",
            weights_element: { fire: 2, electricity: 1 } },
          { key: "e1_b", label: "Tune into people, sense the room’s needs.",
            weights_element: { water: 2 } },
          { key: "e1_c", label: "Offer structure and next steps.",
            weights_element: { earth: 2 } },
          { key: "e1_d", label: "Generate ideas and connect dots.",
            weights_element: { air: 2, electricity: 1 } },
        ]
      },
      {
        id: "e2",
        prompt: "When a plan falls apart last minute, you typically…",
        optional: false,
        options: [
          { key: "e2_a", label: "Take decisive action—new plan now.",
            weights_element: { fire: 2 } },
          { key: "e2_b", label: "Adapt fluidly—what do people need?",
            weights_element: { water: 2 } },
          { key: "e2_c", label: "Ground the chaos—stabilize essentials.",
            weights_element: { earth: 2 } },
          { key: "e2_d", label: "Reframe creatively—find a clever path.",
            weights_element: { air: 2, electricity: 1 } },
        ]
      },
      {
        id: "e3",
        prompt: "Which sentence feels closest to how you move through life?",
        optional: false,
        options: [
          { key: "e3_a", label: "I move with bold, catalytic intention.",
            weights_element: { fire: 2 } },
          { key: "e3_b", label: "I flow and shape to what’s needed.",
            weights_element: { water: 2 } },
          { key: "e3_c", label: "I build steadily—slow is smooth.",
            weights_element: { earth: 2 } },
          { key: "e3_d", label: "I think in currents—ideas, patterns, sparks.",
            weights_element: { air: 1, electricity: 2 } },
        ]
      },

      // ROLE-FORWARD (3)
      {
        id: "r1",
        prompt: "A close friend is overwhelmed. What’s your first instinct?",
        optional: false,
        options: [
          { key: "r1_a", label: "Create safety, set a boundary around the chaos.",
            weights_role: { protector: 2, guardian: 1 } },
          { key: "r1_b", label: "Listen deeply and soothe their nervous system.",
            weights_role: { healer: 2 } },
          { key: "r1_c", label: "Offer a crisp plan and next steps.",
            weights_role: { navigator: 2, architect: 1 } },
          { key: "r1_d", label: "Spark perspective and inspiration.",
            weights_role: { sage: 1, muse: 2, visionary: 1 } },
        ]
      },
      {
        id: "r2",
        prompt: "Given a blank canvas, what do you most enjoy building?",
        optional: false,
        options: [
          { key: "r2_a", label: "A durable system or structure that runs well.",
            weights_role: { architect: 2, guardian: 1 } },
          { key: "r2_b", label: "A ritual or offering that heals/beautifies.",
            weights_role: { healer: 1, artisan: 2 } },
          { key: "r2_c", label: "A bold movement that changes the status quo.",
            weights_role: { rebel: 2, visionary: 1 } },
          { key: "r2_d", label: "A map—strategy, milestones, wayfinding.",
            weights_role: { navigator: 2 } },
        ]
      },
      {
        id: "r3",
        prompt: "Which feedback do you hear most often (the positive kind)?",
        optional: false,
        options: [
          { key: "r3_a", label: "“I feel safe/held when you’re around.”",
            weights_role: { protector: 2, guardian: 1, healer: 1 } },
          { key: "r3_b", label: "“You help me see possibilities I missed.”",
            weights_role: { sage: 1, visionary: 2, muse: 1 } },
          { key: "r3_c", label: "“You make complex things feel simple.”",
            weights_role: { architect: 2, navigator: 1 } },
          { key: "r3_d", label: "“You bring beauty and care into little details.”",
            weights_role: { artisan: 2, healer: 1 } },
        ]
      },

      // HYBRID SCENARIOS (mix both vectors) (4)
      {
        id: "h1",
        prompt: "A community project stalls. You would most likely…",
        optional: false,
        options: [
          { key: "h1_a", label: "Rally the room—reignite purpose (fast).",
            weights_element: { fire: 2, electricity: 1 }, weights_role: { rebel: 1, visionary: 1 } },
          { key: "h1_b", label: "Stabilize basics, divvy tasks, restore flow.",
            weights_element: { earth: 2, water: 1 }, weights_role: { architect: 1, navigator: 1 } },
          { key: "h1_c", label: "Refocus the why—offer a clarifying reframe.",
            weights_element: { air: 2 }, weights_role: { sage: 1 } },
          { key: "h1_d", label: "Tend to morale—1:1 encouragement/repair.",
            weights_element: { water: 2 }, weights_role: { healer: 2 } },
        ]
      },
      {
        id: "h2",
        prompt: "A partner asks you to “lead tonight.” You most naturally…",
        optional: false,
        options: [
          { key: "h2_a", label: "Plan a bold, memorable experience.",
            weights_element: { fire: 2 }, weights_role: { visionary: 1, rebel: 1 } },
          { key: "h2_b", label: "Craft a grounding, sensory ritual.",
            weights_element: { earth: 1, water: 1 }, weights_role: { artisan: 2, healer: 1 } },
          { key: "h2_c", label: "Design a smooth itinerary with options.",
            weights_element: { air: 1, earth: 1 }, weights_role: { navigator: 2, architect: 1 } },
          { key: "h2_d", label: "Surprise them with a spark—spontaneous delight.",
            weights_element: { electricity: 2 }, weights_role: { muse: 1 } },
        ]
      },
      {
        id: "h3",
        prompt: "Conflict lands at your door. Your first move tends to be…",
        optional: false,
        options: [
          { key: "h3_a", label: "Name it, set a clear boundary.",
            weights_element: { fire: 1, earth: 1 }, weights_role: { protector: 2 } },
          { key: "h3_b", label: "Hear both sides—soothe, then sort.",
            weights_element: { water: 2 }, weights_role: { healer: 2 } },
          { key: "h3_c", label: "Map the issue—find the leverage point.",
            weights_element: { air: 2 }, weights_role: { navigator: 2, sage: 1 } },
          { key: "h3_d", label: "Flip the script—introduce a creative third way.",
            weights_element: { electricity: 2 }, weights_role: { rebel: 1, visionary: 1 } },
        ]
      },
      {
        id: "h4",
        prompt: "Your favorite kind of win feels like…",
        optional: false,
        options: [
          { key: "h4_a", label: "We changed the game.",
            weights_element: { fire: 1, electricity: 1 }, weights_role: { rebel: 2, visionary: 1 } },
          { key: "h4_b", label: "Everyone is okay and closer than before.",
            weights_element: { water: 2 }, weights_role: { healer: 2, guardian: 1 } },
          { key: "h4_c", label: "It runs beautifully; it will last.",
            weights_element: { earth: 2 }, weights_role: { architect: 2 } },
          { key: "h4_d", label: "The idea sang—and people felt it.",
            weights_element: { air: 1, electricity: 1 }, weights_role: { muse: 2, sage: 1 } },
        ]
      },

      // QUICK PREFERENCES (2)
      {
        id: "q1",
        prompt: "Pick the element that feels like your baseline state.",
        optional: true,
        options: [
          { key: "q1_fire",        label: "Fire",        weights_element: { fire: 2 } },
          { key: "q1_water",       label: "Water",       weights_element: { water: 2 } },
          { key: "q1_earth",       label: "Earth",       weights_element: { earth: 2 } },
          { key: "q1_air",         label: "Air",         weights_element: { air: 2 } },
          { key: "q1_electricity", label: "Electricity", weights_element: { electricity: 2 } },
        ]
      },
      {
        id: "q2",
        prompt: "Which role label resonates most (no wrong picks)?",
        optional: true,
        options: ROLES.map(r => ({ key: `q2_${r.key}`, label: r.label, weights_role: { [r.key]: 2 } }))
      },
    ]
  }
};

async function main() {
  console.log("🚀 Seeding Archetype quiz (5 elements) …");
  const { data, error } = await admin.from("quizzes").upsert(quiz, { onConflict: "slug" }).select();
  if (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
  console.log("✅ Upserted:", data?.map(r => r.slug));
}

main().catch((e) => {
  console.error("❌ Uncaught:", e);
  process.exit(1);
});

