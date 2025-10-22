// scripts/seed_ambiversion_spectrum_v3.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

/* ---------- Env + client ---------- */
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log('🔧 Seeding: Ambiversion Spectrum v3');
if (!url || !key) {
  console.error('❌ Missing env. Add VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local');
  process.exit(1);
}
const admin = createClient(url, key);

/* ---------- Optional archetype allow-lists (metadata only) ---------- */
const VALID_ENERGIES = new Set([
  "Muse","Sage","Visionary","Healer","Warrior","Creator","Lover","Magician","Rebel",
  "Caregiver","Trickster","Hermit","Sovereign","Jester","Herald"
]);
function sanitize(map, valid) {
  if (!map || typeof map !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(map)) if (valid.has(k) && typeof v === "number" && v > 0) out[k] = v;
  return out;
}

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
    ],
    // flavor tags (not used in scoring)
    energies: { Hermit: 2, Sage: 1 }
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
    ],
    energies: { Sage: 1, Caregiver: 1 }
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
    ],
    energies: { Sovereign: 2, Magician: 1 }
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
    ],
    energies: { Lover: 1, Warrior: 1 }
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
    ],
    energies: { Jester: 2, Herald: 1 }
  }
];

/* ---------- Questions (refined copy + energy flavor tags) ---------- */
const questions = [
  // SCENARIO (4)
  {
    id: "sc1",
    prompt: "It’s Friday evening after a long week. Which appeals most?",
    optional: false,
    options: [
      { key: "sc1_a", label: "A quiet night in, no obligations.",
        weights: { introvert: 2, introvert_strong: 1 }, weights_energy: { Hermit: 2 } },
      { key: "sc1_b", label: "A cozy dinner with one or two close friends.",
        weights: { ambivert: 2 }, weights_energy: { Sovereign: 1, Lover: 1 } },
      { key: "sc1_c", label: "A high-energy outing with a bigger group.",
        weights: { extrovert: 2, extrovert_strong: 1 }, weights_energy: { Jester: 2 } }
    ]
  },
  {
    id: "sc2",
    prompt: "Your boss assigns a project presentation to you and your team. What fits you best?",
    optional: false,
    options: [
      { key: "sc2_a", label: "Prepare alone and contribute in writing.",
        weights: { introvert: 2, introvert_strong: 1 }, weights_energy: { Sage: 1 } },
      { key: "sc2_b", label: "Split prep, collaborate closely, and present together.",
        weights: { ambivert: 2 }, weights_energy: { Sovereign: 1, Magician: 1 } },
      { key: "sc2_c", label: "Take the lead and enjoy presenting.",
        weights: { extrovert: 2, extrovert_strong: 1 }, weights_energy: { Herald: 1, Jester: 1 } }
    ]
  },
  {
    id: "sc3",
    prompt: "At a social event where you know very few people, you’re most likely to…",
    optional: false,
    options: [
      { key: "sc3_a", label: "Find a quiet corner and observe until approached.",
        weights: { introvert: 2, introvert_strong: 1 }, weights_energy: { Hermit: 2 } },
      { key: "sc3_b", label: "Gravitate toward one or two approachable people.",
        weights: { ambivert: 2 }, weights_energy: { Sovereign: 1 } },
      { key: "sc3_c", label: "Dive in and start conversations.",
        weights: { extrovert: 2, extrovert_strong: 1 }, weights_energy: { Jester: 1, Lover: 1 } }
    ]
  },
  {
    id: "sc4",
    prompt: "How do you prefer to spend your birthday?",
    optional: false,
    options: [
      { key: "sc4_a", label: "With just yourself or one special person.",
        weights: { introvert: 2, introvert_strong: 1 }, weights_energy: { Hermit: 1, Lover: 1 } },
      { key: "sc4_b", label: "A small, intimate gathering with close friends.",
        weights: { ambivert: 2 }, weights_energy: { Sovereign: 1 } },
      { key: "sc4_c", label: "A large, high-energy celebration.",
        weights: { extrovert: 2, extrovert_strong: 1 }, weights_energy: { Jester: 2 } }
    ]
  },

  // SCENARIO (extra)
  {
    id: "s3",
    prompt: "A free Saturday arrives. What sounds most like you?",
    optional: false,
    options: [
      { key: "s3_a", label: "Solo rituals—reading, journaling, a quiet walk.",
        weights: { introvert_strong: 2 }, weights_energy: { Hermit: 2, Sage: 1 } },
      { key: "s3_b", label: "A calm coffee with one close person.",
        weights: { introvert: 2 }, weights_energy: { Caregiver: 1 } },
      { key: "s3_c", label: "Mix of solo time and a short plan with friends.",
        weights: { ambivert: 2 }, weights_energy: { Sovereign: 1 } },
      { key: "s3_d", label: "Brunch + browsing with a few friends.",
        weights: { extrovert: 2 }, weights_energy: { Lover: 1 } },
      { key: "s3_e", label: "Full day out—markets, events, and a group dinner.",
        weights: { extrovert_strong: 2 }, weights_energy: { Jester: 2 } }
    ]
  },

  // HEAD-TO-HEAD (2 original)
  {
    id: "hA",
    prompt: "Which sounds more refreshing right now?",
    optional: false,
    options: [
      { key: "hA_a", label: "An afternoon reading, journaling, or relaxing alone.",
        weights: { introvert: 2, introvert_strong: 1 }, weights_energy: { Hermit: 2 } },
      { key: "hA_b", label: "An afternoon out exploring with friends.",
        weights: { extrovert: 2, extrovert_strong: 1 }, weights_energy: { Jester: 1, Lover: 1 } }
    ]
  },
  {
    id: "hB",
    prompt: "When facing a challenge, what helps most?",
    optional: false,
    options: [
      { key: "hB_a", label: "Taking quiet time to think it through on your own.",
        weights: { introvert: 2, introvert_strong: 1 }, weights_energy: { Sage: 1 } },
      { key: "hB_b", label: "Talking it out with friends or loved ones.",
        weights: { extrovert: 2, extrovert_strong: 1 }, weights_energy: { Herald: 1, Lover: 1 } }
    ]
  },

  // HEAD-TO-HEAD (2 extras you kept)
  {
    id: "h1",
    prompt: "Pick the evening that sounds better right now:",
    optional: false,
    options: [
      { key: "h1_a", label: "A slow dinner with one favorite person.",
        weights: { introvert: 2, introvert_strong: 1 }, weights_energy: { Lover: 1 } },
      { key: "h1_b", label: "A rooftop mixer with lots of friendly faces.",
        weights: { extrovert: 2, extrovert_strong: 1 }, weights_energy: { Jester: 2 } }
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

  // LIKERT (5) + new recovery item
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
      { key: "lei_sd", label: "Strongly disagree", weights: { } },
      { key: "lei_d",  label: "Disagree",          weights: { } },
      { key: "lei_n",  label: "Neutral",           weights: { ambivert: 2 } },
      { key: "lei_a",  label: "Agree",             weights: { ambivert: 2 } },
      { key: "lei_sa", label: "Strongly agree",    weights: { ambivert: 2 } }
    ]
  },
  // NEW: decompression buffer
  {
    id: "lBuffer",
    prompt: "After social plans, I like scheduling a decompression buffer before the next thing.",
    optional: false,
    options: [
      { key: "lb_sd", label: "Strongly disagree", weights: { extrovert_strong: 1 } },
      { key: "lb_d",  label: "Disagree",          weights: { extrovert: 1 } },
      { key: "lb_n",  label: "Neutral",           weights: { ambivert: 1 } },
      { key: "lb_a",  label: "Agree",             weights: { introvert: 1 } },
      { key: "lb_sa", label: "Strongly agree",    weights: { introvert_strong: 1 } }
    ]
  },

  // MULTI-OPTION (processing) + QUICK PREF
  {
    id: "l2",
    prompt: "I prefer to process my thoughts…",
    optional: false,
    options: [
      { key: "l2_a", label: "Privately first (write/think), then share.",
        weights: { introvert_strong: 2, introvert: 1 }, weights_energy: { Sage: 1, Hermit: 1 } },
      { key: "l2_b", label: "Mostly alone, with an occasional sounding board.",
        weights: { introvert: 2, ambivert: 1 }, weights_energy: { Sage: 1 } },
      { key: "l2_c", label: "Either works—depends on context.",
        weights: { ambivert: 2 }, weights_energy: { Sovereign: 1, Magician: 1 } },
      { key: "l2_d", label: "Out loud with a few people—talk it through.",
        weights: { extrovert: 2, ambivert: 1 }, weights_energy: { Herald: 1, Lover: 1 } },
      { key: "l2_e", label: "With a group—ideas spark when we’re together.",
        weights: { extrovert_strong: 2, extrovert: 1 }, weights_energy: { Jester: 1, Herald: 1 } }
    ]
  },
  {
    id: "qp1",
    prompt: "At the end of the day, I recharge most through…",
    optional: false,
    options: [
      { key: "qp1_a", label: "Solitude and self-reflection.",
        weights: { introvert: 2, introvert_strong: 1 }, weights_energy: { Hermit: 2 } },
      { key: "qp1_b", label: "A mix—sometimes alone, sometimes with people.",
        weights: { ambivert: 2 }, weights_energy: { Sovereign: 1 } },
      { key: "qp1_c", label: "Social connection and shared experiences.",
        weights: { extrovert: 2, extrovert_strong: 1 }, weights_energy: { Jester: 1, Lover: 1 } }
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
    version: 3,
    min_required: 9,
    results,
    questions
  }
};

/* ---------- Sanitize energy maps (optional metadata) ---------- */
quiz.questions.questions.forEach(q => {
  q.options?.forEach(o => {
    if (o.weights_energy) o.weights_energy = sanitize(o.weights_energy, VALID_ENERGIES);
  });
});

/* ---------- Upsert ---------- */
(async function main() {
  try {
    const { data, error } = await admin
      .from('quizzes')
      .upsert(quiz, { onConflict: 'slug' })
      .select();
    if (error) throw error;
    console.log('✅ Quiz seeded:', (data || []).map(r => `${r.slug} v${r.questions?.version}`));
  } catch (e) {
    console.error('💥 Seed failed:', e.message || e);
    process.exit(1);
  }
})();

