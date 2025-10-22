// scripts/seed_archetype_preference.mjs
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

/** ---------------- Env guard + client ---------------- **/
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("🔧 Seeding Archetype Preference quiz…");
console.log("• VITE_SUPABASE_URL:", url || "(undefined)");
console.log("• SUPABASE_SERVICE_ROLE_KEY length:", key ? key.length : 0);

if (!url || !key) {
  console.error("❌ Missing environment variables.");
  console.error("   Ensure .env.local (or .env) contains:");
  console.error("   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co");
  console.error("   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key);

/** ---------------- Quiz payload ----------------
 * Model: preference ranking across Role + Element
 * To remain compatible with your evaluator (which expects a result key),
 * we provide results for each role_* and element_* so the top-scored key
 * will resolve cleanly. UI can still render the full ranked vectors.
 */
const quiz = {
  slug: "archetype-preference",
  title: "Archetype Preference (Who You’re Drawn To)",
  category: "Archetypal",
  description:
    "Rank what *pulls you in*: roles (protector, strategist, healer, etc.) and elements (fire, water, earth, air, electricity). Results highlight your top matches and why they land for you. Reflective guidance—not verdicts.",
  is_published: true,
  questions: {
    version: 1,
    min_required: 12, // you can tweak; we have enough variety
    /* Results: include role_* and element_* keys used in weights.
       Brief, friendly copy so your current evaluator can resolve a “winner”. */
    results: [
      // ----- Roles -----
      { key: "role_protector",  label: "Protector",  headline: "You’re drawn to the Protector.",  summary: "Steady presence, safety, and devotion feel magnetic." },
      { key: "role_healer",     label: "Healer",     headline: "You’re drawn to the Healer.",     summary: "Emotional attunement and deep presence pull you in." },
      { key: "role_strategist", label: "Strategist", headline: "You’re drawn to the Strategist.", summary: "Clarity, planning, and sharp thinking are green flags." },
      { key: "role_builder",    label: "Builder",    headline: "You’re drawn to the Builder.",    summary: "Practical support, reliability, and follow-through glow." },
      { key: "role_muse",       label: "Muse",       headline: "You’re drawn to the Muse.",       summary: "Warmth, play, and spark light you up." },
      { key: "role_rebel",      label: "Rebel",      headline: "You’re drawn to the Rebel.",      summary: "Boldness and rule-breaking authenticity attract you." },
      { key: "role_diplomat",   label: "Diplomat",   headline: "You’re drawn to the Diplomat.",   summary: "Fairness, harmony, and grace under pressure soothe you." },
      { key: "role_sage",       label: "Sage",       headline: "You’re drawn to the Sage.",       summary: "Perspective, wisdom, and pattern-sense invite trust." },
      { key: "role_seeker",     label: "Seeker",     headline: "You’re drawn to the Seeker.",     summary: "Curiosity and growth-tracking energy feel alive to you." },
      { key: "role_anchor",     label: "Anchor",     headline: "You’re drawn to the Anchor.",     summary: "Grounded, calming stability feels like home." },
      { key: "role_visionary",  label: "Visionary",  headline: "You’re drawn to the Visionary.",  summary: "Future-leaning courage and momentum excite you." },
      { key: "role_steward",    label: "Steward",    headline: "You’re drawn to the Steward.",    summary: "Care, consistency, and systems make love feel safe." },

      // ----- Elements -----
      { key: "element_fire",     label: "Fire",       headline: "Elemental pull: Fire.",       summary: "Heat, charisma, and expressive chemistry speak to you." },
      { key: "element_water",    label: "Water",      headline: "Elemental pull: Water.",      summary: "Emotional depth, tenderness, and attunement draw you in." },
      { key: "element_earth",    label: "Earth",      headline: "Elemental pull: Earth.",      summary: "Reliability, substance, and practical devotion attract you." },
      { key: "element_air",      label: "Air",        headline: "Elemental pull: Air.",        summary: "Clarity, wit, and intellectual play are your oxygen." },
      { key: "element_electric", label: "Electric",   headline: "Elemental pull: Electric.",   summary: "Bold novelty, momentum, and spark turn you on." }
    ],

    // ---------------- Questions ----------------
    questions: [
      // ------- Quick Preference (2) -------
      {
        id: "qp1",
        prompt: "When I imagine an ideal partner’s energy, I’m most pulled toward…",
        optional: false,
        options: [
          { key: "qp1_a", label: "Steady, grounding, dependable presence.",
            weights: { role_anchor: 2, element_earth: 1 } },
          { key: "qp1_b", label: "Warm, expressive, heart-forward passion.",
            weights: { role_muse: 1, role_healer: 1, element_fire: 2 } },
          { key: "qp1_c", label: "Clear-minded, witty, intellectually playful.",
            weights: { role_strategist: 2, element_air: 2 } },
          { key: "qp1_d", label: "Fluid, emotionally intuitive, nurturing.",
            weights: { role_healer: 2, element_water: 2 } },
          { key: "qp1_e", label: "Dynamic, bold, unconventional spark.",
            weights: { role_rebel: 2, element_electric: 2 } }
        ]
      },
      {
        id: "qp2",
        prompt: "If I had to pick one quality that keeps me interested:",
        optional: false,
        options: [
          { key: "qp2_a", label: "Reliability & follow-through.",
            weights: { role_steward: 2, role_anchor: 1, element_earth: 1 } },
          { key: "qp2_b", label: "Emotional availability.",
            weights: { role_healer: 2, element_water: 1 } },
          { key: "qp2_c", label: "Mental stimulation.",
            weights: { role_strategist: 2, element_air: 1 } },
          { key: "qp2_d", label: "Creative heat/chemistry.",
            weights: { role_muse: 2, element_fire: 1 } },
          { key: "qp2_e", label: "Momentum & boldness.",
            weights: { role_visionary: 2, role_rebel: 1, element_electric: 1 } }
        ]
      },

      // ------- Head-to-Head (10) -------
      {
        id: "h1",
        prompt: "Which partner dynamic is more attractive right now?",
        optional: false,
        options: [
          { key: "h1_a", label: "They plan the route, I enjoy the ride (decisive, strategic).",
            weights: { role_strategist: 2, element_air: 1 } },
          { key: "h1_b", label: "We improvise together, sparks fly (spontaneous, bold).",
            weights: { role_rebel: 1, role_visionary: 1, element_electric: 2 } }
        ]
      },
      {
        id: "h2",
        prompt: "Two great people; who pulls you more?",
        optional: false,
        options: [
          { key: "h2_a", label: "The steady builder who turns dreams into concrete plans.",
            weights: { role_builder: 2, element_earth: 1 } },
          { key: "h2_b", label: "The emotive healer who stays deeply present with your feelings.",
            weights: { role_healer: 2, element_water: 1 } }
        ]
      },
      {
        id: "h3",
        prompt: "Which style is your green flag?",
        optional: false,
        options: [
          { key: "h3_a", label: "Alive, playful, flirty warmth.",
            weights: { role_muse: 2, element_fire: 2 } },
          { key: "h3_b", label: "Cool-headed clarity under pressure.",
            weights: { role_strategist: 2, element_air: 1 } }
        ]
      },
      {
        id: "h4",
        prompt: "On big life moves, whose energy do you want beside you?",
        optional: false,
        options: [
          { key: "h4_a", label: "The rock—reliable, measured, practical.",
            weights: { role_anchor: 2, role_steward: 1, element_earth: 2 } },
          { key: "h4_b", label: "The spark—visionary, future-leaning, brave.",
            weights: { role_visionary: 2, element_electric: 2 } }
        ]
      },
      {
        id: "h5",
        prompt: "Conflict style you prefer in a partner:",
        optional: false,
        options: [
          { key: "h5_a", label: "They regulate, name impact, seek repair.",
            weights: { role_healer: 1, role_diplomat: 1, element_water: 1, element_air: 1 } },
          { key: "h5_b", label: "They cut through noise, decide, and move forward.",
            weights: { role_strategist: 1, role_builder: 1, element_electric: 1, element_fire: 1 } }
        ]
      },
      {
        id: "h6",
        prompt: "Date vibe that draws you in:",
        optional: false,
        options: [
          { key: "h6_a", label: "Hands-on making/doing (cook/build/design together).",
            weights: { role_builder: 2, element_earth: 1, element_fire: 1 } },
          { key: "h6_b", label: "Conversation and ideas (lectures, bookstores, debates).",
            weights: { role_strategist: 2, element_air: 2 } }
        ]
      },
      {
        id: "h7",
        prompt: "Social energy you favor in a partner:",
        optional: false,
        options: [
          { key: "h7_a", label: "Cozy, intimate, few people—deep connection.",
            weights: { role_healer: 1, role_anchor: 1, element_water: 1, element_earth: 1 } },
          { key: "h7_b", label: "Lively, networky, expansive—let’s go.",
            weights: { role_visionary: 1, role_rebel: 1, element_electric: 2, element_fire: 1 } }
        ]
      },
      {
        id: "h8",
        prompt: "Which ‘superpower’ is hotter to you?",
        optional: false,
        options: [
          { key: "h8_a", label: "Turning chaos into a clear plan.",
            weights: { role_strategist: 2, element_air: 1 } },
          { key: "h8_b", label: "Turning stagnation into momentum.",
            weights: { role_visionary: 1, role_rebel: 1, element_electric: 2 } }
        ]
      },
      {
        id: "h9",
        prompt: "Gesture that makes you melt:",
        optional: false,
        options: [
          { key: "h9_a", label: "They fix a lingering problem without fanfare.",
            weights: { role_builder: 2, role_steward: 1, element_earth: 1 } },
          { key: "h9_b", label: "They read your mood and hold space naturally.",
            weights: { role_healer: 2, element_water: 2 } }
        ]
      },
      {
        id: "h10",
        prompt: "If you had to choose:",
        optional: false,
        options: [
          { key: "h10_a", label: "A partner who brings warmth and play.",
            weights: { role_muse: 2, element_fire: 2 } },
          { key: "h10_b", label: "A partner who brings diplomacy and ease.",
            weights: { role_diplomat: 2, element_air: 1, element_water: 1 } }
        ]
      },

      // ------- Scenarios (6) -------
      {
        id: "s1",
        prompt: "You’re stuck on a life decision. The partner you’d want will most likely…",
        optional: false,
        options: [
          { key: "s1_a", label: "Lay out options and trade-offs with you.",
            weights: { role_strategist: 2, element_air: 1 } },
          { key: "s1_b", label: "Sit with your feelings until clarity lands.",
            weights: { role_healer: 2, element_water: 2 } },
          { key: "s1_c", label: "Spark a bold step to break inertia.",
            weights: { role_visionary: 2, element_electric: 2 } },
          { key: "s1_d", label: "Handle a few practical tasks to reduce stress.",
            weights: { role_builder: 2, element_earth: 2 } }
        ]
      },
      {
        id: "s2",
        prompt: "It’s a big weekend. Which partner energy sounds best?",
        optional: false,
        options: [
          { key: "s2_a", label: "Candlelight dinner, slow music, lingering touch.",
            weights: { role_muse: 2, element_fire: 2 } },
          { key: "s2_b", label: "Roadmap chat + cozy planning session.",
            weights: { role_strategist: 2, element_air: 1 } },
          { key: "s2_c", label: "Service vibe—errands done, home set, tea made.",
            weights: { role_steward: 2, element_earth: 1 } },
          { key: "s2_d", label: "Nature + water day, then deep talk.",
            weights: { role_healer: 1, role_seeker: 1, element_water: 2 } }
        ]
      },
      {
        id: "s3",
        prompt: "A conflict flares. The partner you trust most would…",
        optional: false,
        options: [
          { key: "s3_a", label: "Co-regulate and reflect back your feelings.",
            weights: { role_healer: 2, element_water: 1 } },
          { key: "s3_b", label: "Structure the convo and keep it fair.",
            weights: { role_diplomat: 2, element_air: 2 } },
          { key: "s3_c", label: "Own impact quickly, suggest a repair plan.",
            weights: { role_builder: 1, role_strategist: 1, element_earth: 1 } },
          { key: "s3_d", label: "Crack tension, lighten the mood, reset together.",
            weights: { role_muse: 1, role_rebel: 1, element_fire: 1, element_electric: 1 } }
        ]
      },
      {
        id: "s4",
        prompt: "You’re dreaming bigger this year. Whose presence fuels you?",
        optional: false,
        options: [
          { key: "s4_a", label: "The visionary who expands horizons.",
            weights: { role_visionary: 2, element_electric: 1 } },
          { key: "s4_b", label: "The steady steward who builds systems.",
            weights: { role_steward: 2, element_earth: 2 } },
          { key: "s4_c", label: "The sage who helps you see patterns.",
            weights: { role_sage: 2, element_air: 1 } },
          { key: "s4_d", label: "The healer who keeps you emotionally resourced.",
            weights: { role_healer: 2, element_water: 1 } }
        ]
      },
      {
        id: "s5",
        prompt: "In everyday life, a partner feels best when they are…",
        optional: false,
        options: [
          { key: "s5_a", label: "Playful glue—keeping laughter and warmth.",
            weights: { role_muse: 2, element_fire: 1 } },
          { key: "s5_b", label: "Logistics wizard—things just flow.",
            weights: { role_steward: 2, role_builder: 1, element_earth: 1 } },
          { key: "s5_c", label: "Perspective setter—helps reframe and prioritize.",
            weights: { role_sage: 2, role_strategist: 1, element_air: 1 } },
          { key: "s5_d", label: "Emotional anchor—present, attuned, gentle.",
            weights: { role_healer: 2, role_anchor: 1, element_water: 1 } }
        ]
      },
      {
        id: "s6",
        prompt: "If there’s a surprise, you’d rather it be…",
        optional: false,
        options: [
          { key: "s6_a", label: "A well-planned experience we’ll remember.",
            weights: { role_visionary: 1, role_strategist: 1, element_electric: 1 } },
          { key: "s6_b", label: "A practical fix to something that’s been annoying.",
            weights: { role_builder: 2, role_steward: 1, element_earth: 1 } },
          { key: "s6_c", label: "A heartfelt, vulnerable moment.",
            weights: { role_healer: 2, element_water: 1 } },
          { key: "s6_d", label: "A spark of play—dance, music, heat.",
            weights: { role_muse: 2, element_fire: 2 } }
        ]
      },

      // ------- Likert (5) -------
      {
        id: "l1",
        prompt: "I’m most attracted to partners who take the lead with a plan.",
        optional: false,
        options: [
          { key: "l1_1", label: "Strongly Disagree", weights: { role_strategist: -1 } },
          { key: "l1_3", label: "Somewhat Disagree", weights: { } },
          { key: "l1_5", label: "Neutral",           weights: { } },
          { key: "l1_7", label: "Somewhat Agree",    weights: { role_strategist: 1 } },
          { key: "l1_9", label: "Strongly Agree",    weights: { role_strategist: 2 } }
        ]
      },
      {
        id: "l2",
        prompt: "Steadiness and practical reliability are a top-tier green flag for me.",
        optional: false,
        options: [
          { key: "l2_1", label: "Strongly Disagree", weights: { role_anchor: -1, role_steward: -1 } },
          { key: "l2_3", label: "Somewhat Disagree", weights: { } },
          { key: "l2_5", label: "Neutral",           weights: { } },
          { key: "l2_7", label: "Somewhat Agree",    weights: { role_anchor: 1, role_steward: 1, element_earth: 1 } },
          { key: "l2_9", label: "Strongly Agree",    weights: { role_anchor: 2, role_steward: 2, element_earth: 1 } }
        ]
      },
      {
        id: "l3",
        prompt: "Bold, unconventional partners keep my world alive.",
        optional: false,
        options: [
          { key: "l3_1", label: "Strongly Disagree", weights: { role_rebel: -1, element_electric: -1 } },
          { key: "l3_3", label: "Somewhat Disagree", weights: { } },
          { key: "l3_5", label: "Neutral",           weights: { } },
          { key: "l3_7", label: "Somewhat Agree",    weights: { role_rebel: 1, role_visionary: 1, element_electric: 1 } },
          { key: "l3_9", label: "Strongly Agree",    weights: { role_rebel: 2, role_visionary: 1, element_electric: 2 } }
        ]
      },
      {
        id: "l4",
        prompt: "Emotional attunement matters more to me than rapid problem-solving.",
        optional: false,
        options: [
          { key: "l4_1", label: "Strongly Disagree", weights: { role_strategist: 1, element_air: 1 } },
          { key: "l4_3", label: "Somewhat Disagree", weights: { role_builder: 1 } },
          { key: "l4_5", label: "Neutral",           weights: { } },
          { key: "l4_7", label: "Somewhat Agree",    weights: { role_healer: 1, element_water: 1 } },
          { key: "l4_9", label: "Strongly Agree",    weights: { role_healer: 2, element_water: 1 } }
        ]
      },
      {
        id: "l5",
        prompt: "A little fire/heat in a partner is essential for me.",
        optional: false,
        options: [
          { key: "l5_1", label: "Strongly Disagree", weights: { element_fire: -1 } },
          { key: "l5_3", label: "Somewhat Disagree", weights: { } },
          { key: "l5_5", label: "Neutral",           weights: { } },
          { key: "l5_7", label: "Somewhat Agree",    weights: { element_fire: 1, role_muse: 1 } },
          { key: "l5_9", label: "Strongly Agree",    weights: { element_fire: 2, role_muse: 1 } }
        ]
      }
    ]
  }
};

/** ---------------- Upsert ---------------- **/
async function main() {
  console.log("📦 Upserting quiz with slug:", quiz.slug);
  const { data, error } = await admin
    .from("quizzes")
    .upsert(quiz, { onConflict: "slug" })
    .select();

  if (error) {
    console.error("❌ Error upserting quiz:", error);
    process.exit(1);
  }

  const row = data?.[0];
  console.log("✅ Upserted:", row?.slug, "id:", row?.id);
  console.log("   Title:", row?.title);
  console.log("   Category:", row?.category);
  console.log("   is_published:", row?.is_published);
  console.log("   Q count:", quiz.questions.questions.length);
}

main().catch((e) => {
  console.error("❌ Unhandled error:", e);
  process.exit(1);
});

