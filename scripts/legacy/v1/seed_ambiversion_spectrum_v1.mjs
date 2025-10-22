// scripts/seed_ambiversion_spectrum.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

/* ---------- Env + client ---------- */
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Seeding: Ambiversion Spectrum (merged selection)');
console.log('   VITE_SUPABASE_URL:', url || '(undefined)');
console.log('   SERVICE_ROLE key len:', key ? String(key.length) : 0);

if (!url || !key) {
  console.error('❌ Missing env. You need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(url, key);

/* ---------- Results (5-tier spectrum) ---------- */
const results = [
  {
    key: "introvert_strong",
    label: "Strong Introvert — The Depth Seeker",
    headline: "You may lean toward the deep quiet of introversion.",
    summary:
      "You recharge best in solitude, prefer rich one-on-one connection, and value pace over buzz.",
    guidance: [
      "Protect restorative alone time without guilt—schedule it like any commitment.",
      "Favor settings that prize depth: small dinners, focused work blocks.",
      "Translate needs early: “I’m in for the first hour, then I’ll recharge.”"
    ],
    product_suggestions: [
      { kind: "journal", sku: "reflection-journal", reason: "Channel inner clarity into words." },
      { kind: "candle",  sku: "i-am-peaceful",       reason: "Set a calm, restorative atmosphere." }
    ]
  },
  {
    key: "introvert",
    label: "Leaning Introvert — The Grounded Observer",
    headline: "You may lean slightly toward introversion.",
    summary:
      "You enjoy people, yet you refuel through quiet. Small groups and familiar spaces suit you.",
    guidance: [
      "Alternate social time with solo rituals that reset your energy.",
      "Pick formats that fit: coffee chats over loud mixers.",
      "Own your preference kindly: “I’m present now; I’ll step out when I’m full.”"
    ],
    product_suggestions: [
      { kind: "candle",  sku: "i-am-grateful",   reason: "Anchor gentle, grounded connection." },
      { kind: "planner", sku: "energy-planner",  reason: "Design your week around energy flow." }
    ]
  },
  {
    key: "ambivert",
    label: "Balanced Ambivert — The Adaptive Bridge",
    headline: "You may sit near the balance point of ambiversion.",
    summary:
      "You flex with context—sometimes you glow in groups, other times you savor quiet depth.",
    guidance: [
      "Track patterns: time of day, setting, people density. Choose accordingly.",
      "Bridge worlds: help groups include the quiet and amplify the lively.",
      "Watch for overbooking—flexibility isn’t limitless."
    ],
    product_suggestions: [
      { kind: "travel", sku: "mini-ritual-kit", reason: "Portable tools for on-the-go balance." },
      { kind: "candle", sku: "i-am-centered",   reason: "Stay centered across contexts." }
    ]
  },
  {
    key: "extrovert",
    label: "Leaning Extrovert — The Connector",
    headline: "You may lean slightly toward extroversion.",
    summary:
      "People give you energy, and you still appreciate occasional resets. You naturally bring folks together.",
    guidance: [
      "Pre-plan decompression time after big social windows.",
      "Use your warmth to include quieter voices.",
      "Guard your calendar: leave space between peaks."
    ],
    product_suggestions: [
      { kind: "bundle", sku: "social-host-set", reason: "Elevate gatherings with intention." },
      { kind: "candle", sku: "i-am-joy",        reason: "Match your bright, connective vibe." }
    ]
  },
  {
    key: "extrovert_strong",
    label: "Strong Extrovert — The Radiant Energizer",
    headline: "You may lean toward the dynamic energy of extroversion.",
    summary:
      "You thrive in motion—group energy, live events, and spontaneous plans refill your cup.",
    guidance: [
      "Pair charisma with grounding: breath, stretches, or a slow walk between events.",
      "Say no sometimes—protect your best yes.",
      "Channel your social spark into purposeful leadership or collaboration."
    ],
    product_suggestions: [
      { kind: "candle", sku: "i-am-power",          reason: "Harness momentum without burning out." },
      { kind: "ritual", sku: "post-social-reset",   reason: "Quick cool-down after high-energy days." }
    ]
  }
];

/* ---------- Questions (merged) ---------- */
const questions = [
  /* ===== SCENARIO (4) — original list you approved ===== */
  {
    id: "sc1",
    prompt: "It’s Friday evening after a long week. Which appeals most?",
    optional: false,
    options: [
      { key: "sc1_a", label: "A quiet night in, no obligations.",
        weights: { introvert: 2, introvert_strong: 1 } },
      { key: "sc1_b", label: "A cozy dinner with one or two close friends.",
        weights: { ambivert: 2 } },
      { key: "sc1_c", label: "A lively outing with a bigger group.",
        weights: { extrovert: 2, extrovert_strong: 1 } }
    ]
  },
  {
    id: "sc2",
    prompt: "Your boss assigns a project presentation to you and your team. What fits you best?",
    optional: false,
    options: [
      { key: "sc2_a", label: "Prepare alone and contribute in writing.",
        weights: { introvert: 2, introvert_strong: 1 } },
      { key: "sc2_b", label: "Split prep, collaborate closely, and present together.",
        weights: { ambivert: 2 } },
      { key: "sc2_c", label: "Take the lead and enjoy presenting.",
        weights: { extrovert: 2, extrovert_strong: 1 } }
    ]
  },
  {
    id: "sc3",
    prompt: "At a social event where you know very few people, you’re most likely to…",
    optional: false,
    options: [
      { key: "sc3_a", label: "Find a quiet corner and observe until approached.",
        weights: { introvert: 2, introvert_strong: 1 } },
      { key: "sc3_b", label: "Gravitate toward one or two approachable people.",
        weights: { ambivert: 2 } },
      { key: "sc3_c", label: "Dive into the crowd and start conversations.",
        weights: { extrovert: 2, extrovert_strong: 1 } }
    ]
  },
  {
    id: "sc4",
    prompt: "How do you prefer to spend your birthday?",
    optional: false,
    options: [
      { key: "sc4_a", label: "With just yourself or one special person.",
        weights: { introvert: 2, introvert_strong: 1 } },
      { key: "sc4_b", label: "A small, intimate gathering with close friends.",
        weights: { ambivert: 2 } },
      { key: "sc4_c", label: "A big celebration with lots of energy and people.",
        weights: { extrovert: 2, extrovert_strong: 1 } }
    ]
  },

  /* ===== SCENARIO (1) — extra you kept from the new draft ===== */
  {
    id: "s3",
    prompt: "A free Saturday arrives. What sounds most like you?",
    optional: false,
    options: [
      { key: "s3_a", label: "Solo rituals—reading, journaling, a quiet walk.",
        weights: { introvert_strong: 2 } },
      { key: "s3_b", label: "A calm coffee with one close person.",
        weights: { introvert: 2 } },
      { key: "s3_c", label: "Mix of solo time and a short plan with friends.",
        weights: { ambivert: 2 } },
      { key: "s3_d", label: "Brunch + browsing with a few friends.",
        weights: { extrovert: 2 } },
      { key: "s3_e", label: "Full day out—markets, events, and a group dinner.",
        weights: { extrovert_strong: 2 } }
    ]
  },

  /* ===== HEAD-TO-HEAD (2) — original list you approved ===== */
  {
    id: "hA",
    prompt: "Which sounds more refreshing right now?",
    optional: false,
    options: [
      { key: "hA_a", label: "An afternoon reading, journaling, or relaxing alone.",
        weights: { introvert: 2, introvert_strong: 1 } },
      { key: "hA_b", label: "An afternoon out exploring with friends.",
        weights: { extrovert: 2, extrovert_strong: 1 } }
    ]
  },
  {
    id: "hB",
    prompt: "When facing a challenge, what helps most?",
    optional: false,
    options: [
      { key: "hB_a", label: "Taking quiet time to think it through on your own.",
        weights: { introvert: 2, introvert_strong: 1 } },
      { key: "hB_b", label: "Talking it out with friends or loved ones.",
        weights: { extrovert: 2, extrovert_strong: 1 } }
    ]
  },

  /* ===== HEAD-TO-HEAD (2) — extras you kept from the new draft ===== */
  {
    id: "h1",
    prompt: "Pick the evening that sounds better right now:",
    optional: false,
    options: [
      { key: "h1_a", label: "A slow dinner with one favorite person.",
        weights: { introvert: 2, introvert_strong: 1 } },
      { key: "h1_b", label: "A rooftop mixer with lots of friendly faces.",
        weights: { extrovert: 2, extrovert_strong: 1 } }
    ]
  },
  {
    id: "h3",
    prompt: "Birthday vibe:",
    optional: false,
    options: [
      { key: "h3_a", label: "Small, intimate celebration.",
        weights: { introvert: 2, introvert_strong: 1 } },
      { key: "h3_b", label: "Big, lively gathering.",
        weights: { extrovert: 2, extrovert_strong: 1 } }
    ]
  },

  /* ===== LIKERT (5) — from your selected list ===== */
  {
    id: "lEnergize",
    prompt: "After a full day with people, I usually feel more energized than drained.",
    optional: false,
    options: [
      { key: "le_sd", label: "Strongly disagree", weights: { introvert_strong: 2 } },
      { key: "le_d",  label: "Disagree",          weights: { introvert: 2 } },
      { key: "le_n",  label: "Neutral",           weights: { ambivert: 2 } },
      { key: "le_a",  label: "Agree",             weights: { extrovert: 2 } },
      { key: "le_sa", label: "Strongly agree",    weights: { extrovert_strong: 2 } }
    ]
  },
  {
    id: "lQuiet",
    prompt: "Quiet time alone isn’t just enjoyable for me—it feels necessary to reset.",
    optional: false,
    options: [
      { key: "lq_sd", label: "Strongly disagree", weights: { extrovert_strong: 2 } },
      { key: "lq_d",  label: "Disagree",          weights: { extrovert: 2 } },
      { key: "lq_n",  label: "Neutral",           weights: { ambivert: 2 } },
      { key: "lq_a",  label: "Agree",             weights: { introvert: 2 } },
      { key: "lq_sa", label: "Strongly agree",    weights: { introvert_strong: 2 } }
    ]
  },
  {
    id: "lLead",
    prompt: "In group settings, I naturally take the lead in keeping the energy flowing.",
    optional: false,
    options: [
      { key: "ll_sd", label: "Strongly disagree", weights: { introvert_strong: 2 } },
      { key: "ll_d",  label: "Disagree",          weights: { introvert: 2 } },
      { key: "ll_n",  label: "Neutral",           weights: { ambivert: 2 } },
      { key: "ll_a",  label: "Agree",             weights: { extrovert: 2 } },
      { key: "ll_sa", label: "Strongly agree",    weights: { extrovert_strong: 2 } }
    ]
  },
  {
    id: "lOverstim",
    prompt: "Too much social interaction can leave me overstimulated, even if I had fun.",
    optional: false,
    options: [
      { key: "lo_sd", label: "Strongly disagree", weights: { extrovert_strong: 2 } },
      { key: "lo_d",  label: "Disagree",          weights: { extrovert: 2 } },
      { key: "lo_n",  label: "Neutral",           weights: { ambivert: 2 } },
      { key: "lo_a",  label: "Agree",             weights: { introvert: 2 } },
      { key: "lo_sa", label: "Strongly agree",    weights: { introvert_strong: 2 } }
    ]
  },
  {
    id: "lEither",
    prompt: "Whether I’m alone or with others, I can usually find energy either way.",
    optional: false,
    options: [
      { key: "lei_sd", label: "Strongly disagree", weights: { /* leave neutral to avoid false tilt */ } },
      { key: "lei_d",  label: "Disagree",          weights: { /* neutral; other items decide */ } },
      { key: "lei_n",  label: "Neutral",           weights: { ambivert: 2 } },
      { key: "lei_a",  label: "Agree",             weights: { ambivert: 2 } },
      { key: "lei_sa", label: "Strongly agree",    weights: { ambivert: 2 } }
    ]
  },

  /* ===== EXTRA MULTI-OPTION you kept (new draft l2) ===== */
  {
    id: "l2",
    prompt: "I prefer to process my thoughts…",
    optional: false,
    options: [
      { key: "l2_a", label: "Privately first (write/think), then share.",
        weights: { introvert_strong: 2, introvert: 1 } },
      { key: "l2_b", label: "Mostly alone, with an occasional sounding board.",
        weights: { introvert: 2, ambivert: 1 } },
      { key: "l2_c", label: "Either works—depends on context.",
        weights: { ambivert: 2 } },
      { key: "l2_d", label: "Out loud with a few people—talk it through.",
        weights: { extrovert: 2, ambivert: 1 } },
      { key: "l2_e", label: "With a group—ideas spark when we’re together.",
        weights: { extrovert_strong: 2, extrovert: 1 } }
    ]
  },

  /* ===== QUICK PREFERENCE (1) — original ===== */
  {
    id: "qp1",
    prompt: "At the end of the day, I recharge most through…",
    optional: false,
    options: [
      { key: "qp1_a", label: "Solitude and self-reflection.",
        weights: { introvert: 2, introvert_strong: 1 } },
      { key: "qp1_b", label: "A mix—sometimes alone, sometimes with people.",
        weights: { ambivert: 2 } },
      { key: "qp1_c", label: "Social connection and shared experiences.",
        weights: { extrovert: 2, extrovert_strong: 1 } }
    ]
  }
];

/* ---------- Quiz payload ---------- */
const quiz = {
  slug: "ambiversion-spectrum",
  title: "Where Do You Fall on the Ambiversion Spectrum?",
  category: "Identity",
  description:
    "Discover how you recharge and show up socially. There’s no “better”—just your natural rhythm. Results suggest a lean, not a label.",
  is_published: true,
  questions: {
    version: 2,
    min_required: 9,
    results,
    questions
  }
};

/* ---------- Upsert ---------- */
(async function main() {
  try {
    console.log('⏫ Upserting quiz…');
    const { data, error } = await admin
      .from('quizzes')
      .upsert(quiz, { onConflict: 'slug' })
      .select();

    if (error) {
      console.error('❌ Error upserting quiz:', error);
      process.exit(1);
    }
    console.log('✅ Quiz seeded:', (data || []).map(r => r.slug));
    console.log('🔎 Test at /quizzes/ambiversion-spectrum');
  } catch (e) {
    console.error('💥 Seed failed:', e);
    process.exit(1);
  }
})();

