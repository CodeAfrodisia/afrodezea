// scripts/seed_self_love_style_v2.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("🔧 Seeding: self-love-style v2 (archetypes installed)");
if (!url || !key) {
  console.error("❌ Missing env. Add VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local");
  process.exit(1);
}
const admin = createClient(url, key);

// Allow-lists
const VALID_ROLES = new Set(["Navigator","Protector","Architect","Guardian","Artisan","Catalyst","Nurturer","Herald","Seeker"]);
const VALID_ENERGIES = new Set([
  "Muse","Sage","Visionary","Healer","Warrior","Creator","Lover","Magician","Rebel","Caregiver","Trickster","Hermit","Sovereign","Jester"
]);
const VALID_SHADOWS = new Set(["Victim","Saboteur","Addict","Shadow Rebel","Tyrant","Trickster","Hermit","Martyr","Nihilist"]);

function sanitize(map, valid) {
  if (!map || typeof map !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(map)) {
    if (valid.has(k) && typeof v === "number" && v > 0) out[k] = v;
  }
  return out;
}

async function main() {
  const quiz = {
    slug: "self-love-style",
    title: "What’s Your Self-Love Style?",
    category: "Wellness",
    description:
      "Self-love shows up in many languages: ritual, rest, creation, reflection, connection, and achievement. Answer honestly—this is reflective guidance, not a verdict.",
    is_published: true,
    questions: {
      version: 2,
      min_required: 9,

      // ---------------- RESULTS (6 styles) ----------------
      results: [
        {
          key: "ritualist",
          label: "The Ritualist",
          headline: "You may be a Ritualist.",
          summary:
            "Routines, structure, and sacred daily practices refill your cup. Consistency is how you show yourself love.",
          guidance: [
            "Design a 10-minute morning or evening ritual you can actually keep.",
            "Protect your ‘non-negotiables’ with gentle boundaries."
          ],
          green_flags: ["Predictable rhythms soothe your nervous system", "Your space cues care (light, scent, order)"],
          watch_outs: ["Rigidity over kindness—let rituals bend when life does"]
        },
        {
          key: "indulger",
          label: "The Indulger",
          headline: "You may be an Indulger.",
          summary:
            "Pleasure, pampering, and sensory beauty restore you. You honor your body with rest and tenderness.",
          guidance: [
            "Schedule your softness—don’t wait until you’re depleted.",
            "Upgrade one everyday thing (the good lotion, the soft robe) as a love note to yourself."
          ],
          green_flags: ["You refuel before burnout", "You normalize rest & receiving"],
          watch_outs: ["Numbing vs nourishing—choose comforts that truly restore"]
        },
        {
          key: "creator",
          label: "The Creator",
          headline: "You may be a Creator.",
          summary:
            "Expression is medicine. Making, styling, cooking, singing, curating vibes—this is how you care for your spirit.",
          guidance: [
            "Give your creativity a container: a weekly creative hour.",
            "Celebrate process, not just polished outcomes."
          ],
          green_flags: ["Flow states reset you", "You share beauty that uplifts others"],
          watch_outs: ["Perfectionism can freeze the fun—ship the draft"]
        },
        {
          key: "reflector",
          label: "The Reflector",
          headline: "You may be a Reflector.",
          summary:
            "Self-inquiry, prayer, therapy, and stillness help you feel whole. You love yourself by listening within.",
          guidance: [
            "Create a weekly reflection ritual—same day, same chair, same cup.",
            "Use a 3-line journal: ‘What I felt / What I needed / One step I’ll take.’"
          ],
          green_flags: ["You metabolize emotions cleanly", "You name needs with compassion"],
          watch_outs: ["Isolation creep—pair reflection with gentle reconnection"]
        },
        {
          key: "connector",
          label: "The Connector",
          headline: "You may be a Connector.",
          summary:
            "Community, friendship, and fellowship refill you. You love yourself by letting yourself be loved.",
          guidance: [
            "Nurture two micro-rituals of connection (weekly call, Sunday dinner).",
            "Name what kind of support actually lands for you and ask for it."
          ],
          green_flags: ["You co-regulate with healthy people", "You normalize asking & receiving"],
          watch_outs: ["Overbooking—protect alone-time that lets you hear yourself"]
        },
        {
          key: "achiever",
          label: "The Achiever",
          headline: "You may be an Achiever.",
          summary:
            "Progress, goals, and milestones feel like care. You love yourself by keeping promises to yourself.",
          guidance: [
            "Define ‘minimums’ instead of ‘maximums’ to avoid burnout.",
            "Celebrate tiny wins with a tangible ritual (coin in a jar, gold star, dance break)."
          ],
          green_flags: ["Self-trust grows from follow-through", "Momentum regulates your mood"],
          watch_outs: ["Self-worth ≠ output—rest also ‘counts’"]
        }
      ],

      // ---------------- QUESTIONS (14 total, archetypes added) ----------------
      questions: [
        // -------- Scenario (8) --------
        {
          id: "s1",
          prompt: "You’ve had a draining week. What feels most like self-love right now?",
          optional: false,
          options: [
            { key: "s1_a", label: "Run a luxurious bath, deep moisture routine, soft pajamas.",
              weights: { indulger: 2 },
              weights_role: { Nurturer: 1, Artisan: 1 },
              weights_energy: { Lover: 2, Muse: 1, Jester: 1 },
              weights_shadow: { Addict: 1 },
              tags: ["rest","body-care"] },
            { key: "s1_b", label: "Light your candle, journal 10 minutes, early bedtime.",
              weights: { reflector: 2, ritualist: 1 },
              weights_role: { Guardian: 1 },
              weights_energy: { Sage: 1, Caregiver: 1, Hermit: 1 } ,
              tags: ["reflection","stillness"] },
            { key: "s1_c", label: "Cook a favorite meal while playing your playlist.",
              weights: { creator: 2, indulger: 1 },
              weights_role: { Artisan: 1 },
              weights_energy: { Creator: 2, Lover: 1, Muse: 1 },
              tags: ["creative-care"] },
            { key: "s1_d", label: "Call a friend / facetime to decompress together.",
              weights: { connector: 2 },
              weights_role: { Herald: 1, Nurturer: 1 },
              weights_energy: { Caregiver: 1, Lover: 1, Muse: 1 },
              tags: ["community"] },
            { key: "s1_e", label: "Lay out next week’s plan, tidy your space, reset.",
              weights: { ritualist: 2, achiever: 1 },
              weights_role: { Architect: 2, Navigator: 1 },
              weights_energy: { Sovereign: 1, Warrior: 1 },
              tags: ["structure"] }
          ]
        },
        {
          id: "s2",
          prompt: "You hit a milestone you’re proud of. How do you honor yourself?",
          optional: false,
          options: [
            { key: "s2_a", label: "Schedule a celebratory dinner with your people.",
              weights: { connector: 2 },
              weights_role: { Herald: 1 },
              weights_energy: { Lover: 1, Muse: 1, Caregiver: 1 },
              tags: ["celebration","community"] },
            { key: "s2_b", label: "Buy or make something special to mark the moment.",
              weights: { creator: 1, indulger: 1, achiever: 1 },
              weights_role: { Artisan: 1 },
              weights_energy: { Creator: 1, Lover: 1, Sovereign: 1 },
              tags: ["keepsake"] },
            { key: "s2_c", label: "Document the journey—journal, photos, memory box.",
              weights: { reflector: 2, creator: 1 },
              weights_role: { Seeker: 1 },
              weights_energy: { Sage: 1, Creator: 1 },
              tags: ["meaning-making"] },
            { key: "s2_d", label: "Set the next tiny goal and keep momentum.",
              weights: { achiever: 2, ritualist: 1 },
              weights_role: { Navigator: 1, Architect: 1 },
              weights_energy: { Warrior: 1, Sovereign: 1 },
              tags: ["progress"] },
            { key: "s2_e", label: "Take a slow day to rest and receive the moment.",
              weights: { indulger: 2 },
              weights_role: { Nurturer: 1 },
              weights_energy: { Lover: 1, Healer: 1 },
              tags: ["rest"] }
          ]
        },
        {
          id: "s3",
          prompt: "A free Saturday arrives. What sounds most like you?",
          optional: false,
          options: [
            { key: "s3_a", label: "Solo rituals—reading, journaling, a quiet walk.",
              weights: { reflector: 1, ritualist: 1 },
              weights_role: { Guardian: 1 },
              weights_energy: { Hermit: 1, Sage: 1 } },
            { key: "s3_b", label: "A calm coffee with one close person.",
              weights: { connector: 2 },
              weights_role: { Herald: 1 },
              weights_energy: { Caregiver: 1, Lover: 1 } },
            { key: "s3_c", label: "Mix of solo time and a creative hour.",
              weights: { creator: 2 },
              weights_role: { Artisan: 1, Seeker: 1 },
              weights_energy: { Creator: 2, Visionary: 1 } },
            { key: "s3_d", label: "Brunch + browsing with a few friends.",
              weights: { connector: 1, indulger: 1 },
              weights_role: { Herald: 1 },
              weights_energy: { Muse: 1, Jester: 1 } },
            { key: "s3_e", label: "Reset the house, prep food, plan the week.",
              weights: { ritualist: 2, achiever: 1 },
              weights_role: { Architect: 2 },
              weights_energy: { Sovereign: 1 } }
          ]
        },
        {
          id: "s4",
          prompt: "You’re feeling disconnected from yourself. What’s your next move?",
          optional: false,
          options: [
            { key: "s4_a", label: "Guided meditation, prayer, or therapy homework.",
              weights: { reflector: 2 },
              weights_role: { Navigator: 1 },
              weights_energy: { Healer: 1, Sage: 1 } ,
              tags: ["inner-work"] },
            { key: "s4_b", label: "Make something beautiful: playlist, mood board, recipe.",
              weights: { creator: 2 },
              weights_role: { Artisan: 1 },
              weights_energy: { Creator: 2, Muse: 1 },
              tags: ["creative-care"] },
            { key: "s4_c", label: "Text a friend to take a walk and talk.",
              weights: { connector: 2 },
              weights_role: { Herald: 1, Nurturer: 1 },
              weights_energy: { Caregiver: 1, Lover: 1 } },
            { key: "s4_d", label: "Close loops: emails, laundry, calendar—a clean slate.",
              weights: { ritualist: 1, achiever: 1 },
              weights_role: { Architect: 1 },
              weights_energy: { Sovereign: 1 } },
            { key: "s4_e", label: "Full body pamper—mask, steam, oils, the good robe.",
              weights: { indulger: 2 },
              weights_role: { Nurturer: 1 },
              weights_energy: { Lover: 2 },
              tags: ["body-care"] }
          ]
        },
        {
          id: "s5",
          prompt: "You’re tempted to overwork. The self-loving boundary is…",
          optional: false,
          options: [
            { key: "s5_a", label: "Stop at the time you set and keep your evening ritual.",
              weights: { ritualist: 2 },
              weights_role: { Guardian: 1, Architect: 1 },
              weights_energy: { Sovereign: 1 },
              tags: ["boundary"] },
            { key: "s5_b", label: "Book a massage or bath to help you downshift.",
              weights: { indulger: 2 },
              weights_role: { Nurturer: 1 },
              weights_energy: { Lover: 1, Healer: 1 },
              tags: ["body-care"] },
            { key: "s5_c", label: "Schedule accountability with a friend to log off together.",
              weights: { connector: 2 },
              weights_role: { Herald: 1 },
              weights_energy: { Caregiver: 1 },
              tags: ["accountability"] },
            { key: "s5_d", label: "Choose one ‘must do’ and let the rest wait—win defined by you.",
              weights: { achiever: 2 },
              weights_role: { Navigator: 1 },
              weights_energy: { Warrior: 1, Sovereign: 1 },
              tags: ["scope"] },
            { key: "s5_e", label: "Put on music and cook something nourishing.",
              weights: { creator: 1, indulger: 1 },
              weights_role: { Artisan: 1 },
              weights_energy: { Creator: 1, Lover: 1 } }
          ]
        },
        {
          id: "s6",
          prompt: "You have 30 minutes between obligations. How do you refill?",
          optional: false,
          options: [
            { key: "s6_a", label: "Breathe, journal a page, sip tea in silence.",
              weights: { reflector: 2 },
              weights_role: { Seeker: 1 },
              weights_energy: { Hermit: 1, Sage: 1 },
              tags: ["micro-ritual"] },
            { key: "s6_b", label: "Tidy one small zone; reset your space.",
              weights: { ritualist: 2 },
              weights_role: { Architect: 1 },
              weights_energy: { Sovereign: 1 },
              tags: ["order"] },
            { key: "s6_c", label: "Voice note with a friend—laugh, vent, reconnect.",
              weights: { connector: 2 },
              weights_role: { Herald: 1 },
              weights_energy: { Jester: 1, Muse: 1, Caregiver: 1 },
              tags: ["micro-connection"] },
            { key: "s6_d", label: "Put on a song and sketch/plan/create.",
              weights: { creator: 2 },
              weights_role: { Artisan: 1 },
              weights_energy: { Creator: 2, Visionary: 1 },
              tags: ["spark"] },
            { key: "s6_e", label: "Moisturize, stretch, and drink water.",
              weights: { indulger: 2 },
              weights_role: { Nurturer: 1 },
              weights_energy: { Lover: 1, Healer: 1 },
              tags: ["body-care"] }
          ]
        },
        {
          id: "s7",
          prompt: "You woke up low-energy. What is the kindest first step?",
          optional: false,
          options: [
            { key: "s7_a", label: "Move gently: slow stretch, short walk, sunlight.",
              weights: { indulger: 1, ritualist: 1 },
              weights_role: { Protector: 1 },
              weights_energy: { Healer: 1, Warrior: 1 },
              tags: ["body-care"] },
            { key: "s7_b", label: "Read a devotional / grounding paragraph and breathe.",
              weights: { reflector: 2 },
              weights_role: { Seeker: 1 },
              weights_energy: { Sage: 1, Magician: 1 },
              tags: ["spirit"] },
            { key: "s7_c", label: "Send one loving check-in text.",
              weights: { connector: 2 },
              weights_role: { Herald: 1 },
              weights_energy: { Lover: 1, Caregiver: 1 },
              tags: ["connection"] },
            { key: "s7_d", label: "Plan one tiny win to build momentum.",
              weights: { achiever: 2 },
              weights_role: { Navigator: 1 },
              weights_energy: { Warrior: 1, Sovereign: 1 },
              tags: ["momentum"] },
            { key: "s7_e", label: "Dress in a fit that inspires you; add scent and soundtrack.",
              weights: { creator: 2 },
              weights_role: { Artisan: 1 },
              weights_energy: { Creator: 1, Muse: 1 },
              tags: ["aesthetic-energy"] }
          ]
        },
        {
          id: "s8",
          prompt: "Your space feels chaotic. What’s your self-love play?",
          optional: false,
          options: [
            { key: "s8_a", label: "One-song tidy ritual—reset surfaces, light a candle.",
              weights: { ritualist: 2, creator: 1 },
              weights_role: { Architect: 1 },
              weights_energy: { Sovereign: 1, Creator: 1 },
              tags: ["order","vibe"] },
            { key: "s8_b", label: "Make a cozy nook and sink into rest.",
              weights: { indulger: 2 },
              weights_role: { Nurturer: 1 },
              weights_energy: { Lover: 1 } ,
              tags: ["nesting"] },
            { key: "s8_c", label: "Invite a friend for a reset session—with snacks and music.",
              weights: { connector: 2 },
              weights_role: { Herald: 1 },
              weights_energy: { Caregiver: 1, Jester: 1 },
              tags: ["togetherness"] },
            { key: "s8_d", label: "Create a mood board for how you want the space to feel, then start small.",
              weights: { creator: 2 },
              weights_role: { Artisan: 1 },
              weights_energy: { Creator: 2, Visionary: 1 },
              tags: ["vision"] },
            { key: "s8_e", label: "Declutter one category and donate—clear stuntin’ energy.",
              weights: { achiever: 2 },
              weights_role: { Navigator: 1 },
              weights_energy: { Warrior: 1, Sovereign: 1 },
              tags: ["decisive-care"] }
          ]
        },

        // -------- Likert (3) --------
        {
          id: "l1",
          prompt: "Keeping small promises to myself is one of the ways I feel loved by me.",
          optional: false,
          options: [
            { key: "l1_sd", label: "Strongly disagree", weights: {} },
            { key: "l1_d",  label: "Disagree",          weights: {} },
            { key: "l1_n",  label: "Neutral",           weights: { achiever: 1 }, weights_energy: { Warrior: 1 } },
            { key: "l1_a",  label: "Agree",             weights: { achiever: 2, ritualist: 1 }, weights_role: { Architect: 1 }, weights_energy: { Sovereign: 1 } },
            { key: "l1_sa", label: "Strongly agree",    weights: { achiever: 2, ritualist: 2 }, weights_role: { Navigator: 1, Architect: 1 }, weights_energy: { Warrior: 1, Sovereign: 1 }, weights_shadow: { Martyr: 1 } }
          ]
        },
        {
          id: "l2",
          prompt: "Beauty, scent, texture, and ambiance are not extras for me—they’re part of my healing.",
          optional: false,
          options: [
            { key: "l2_sd", label: "Strongly disagree", weights: {} },
            { key: "l2_d",  label: "Disagree",          weights: {} },
            { key: "l2_n",  label: "Neutral",           weights: { creator: 1 }, weights_energy: { Creator: 1 } },
            { key: "l2_a",  label: "Agree",             weights: { indulger: 2, creator: 1 }, weights_role: { Artisan: 1 }, weights_energy: { Lover: 1, Muse: 1 } },
            { key: "l2_sa", label: "Strongly agree",    weights: { indulger: 2, creator: 2 }, weights_role: { Artisan: 1 }, weights_energy: { Lover: 1, Muse: 1, Creator: 1 }, weights_shadow: { Addict: 1 } }
          ]
        },
        {
          id: "l3",
          prompt: "Silence, prayer, or journaling regularly helps me feel whole.",
          optional: false,
          options: [
            { key: "l3_sd", label: "Strongly disagree", weights: {} },
            { key: "l3_d",  label: "Disagree",          weights: {} },
            { key: "l3_n",  label: "Neutral",           weights: { reflector: 1 }, weights_energy: { Sage: 1 } },
            { key: "l3_a",  label: "Agree",             weights: { reflector: 2, ritualist: 1 }, weights_role: { Guardian: 1 }, weights_energy: { Hermit: 1, Healer: 1 } },
            { key: "l3_sa", label: "Strongly agree",    weights: { reflector: 2, ritualist: 2 }, weights_role: { Seeker: 1 }, weights_energy: { Sage: 1, Hermit: 1 }, weights_shadow: { Hermit: 1 } }
          ]
        },

        // -------- Head-to-Head (2) --------
        {
          id: "h1",
          prompt: "Which feels more like self-love today?",
          optional: false,
          options: [
            { key: "h1_a", label: "Saying no and protecting your rest.",
              weights: { indulger: 1, ritualist: 1, reflector: 1 },
              weights_role: { Guardian: 1, Protector: 1 },
              weights_energy: { Caregiver: 1, Healer: 1 } },
            { key: "h1_b", label: "Showing up and finishing something you promised yourself.",
              weights: { achiever: 2 },
              weights_role: { Navigator: 1 },
              weights_energy: { Warrior: 2, Sovereign: 1 } }
          ]
        },
        {
          id: "h2",
          prompt: "Which would refill you more right now?",
          optional: false,
          options: [
            { key: "h2_a", label: "Creating something just because it delights you.",
              weights: { creator: 2, indulger: 1 },
              weights_role: { Artisan: 1 },
              weights_energy: { Creator: 2, Muse: 1, Jester: 1 } },
            { key: "h2_b", label: "Quality time with someone who pours back into you.",
              weights: { connector: 2 },
              weights_role: { Herald: 1, Nurturer: 1 },
              weights_energy: { Lover: 1, Caregiver: 1 } }
          ]
        },

        // -------- Quick Preference (1) --------
        {
          id: "qp1",
          prompt: "If I had to choose one doorway into self-love, it would be through…",
          optional: false,
          options: [
            { key: "qp1_a", label: "Designing simple rituals I can trust every day.",
              weights: { ritualist: 2 },
              weights_role: { Architect: 1, Guardian: 1 },
              weights_energy: { Sovereign: 1, Sage: 1 } },
            { key: "qp1_b", label: "Savoring rest, beauty, and embodied care.",
              weights: { indulger: 2 },
              weights_role: { Nurturer: 1 },
              weights_energy: { Lover: 2, Muse: 1 } },
            { key: "qp1_c", label: "Making, curating, or styling something that expresses me.",
              weights: { creator: 2 },
              weights_role: { Artisan: 1 },
              weights_energy: { Creator: 2, Visionary: 1, Magician: 1 } },
            { key: "qp1_d", label: "Listening within—prayer, therapy, or journaling.",
              weights: { reflector: 2 },
              weights_role: { Seeker: 1 },
              weights_energy: { Sage: 2, Hermit: 1 } },
            { key: "qp1_e", label: "Letting myself be loved—time with my people.",
              weights: { connector: 2 },
              weights_role: { Herald: 1, Nurturer: 1 },
              weights_energy: { Lover: 1, Caregiver: 1 } },
            { key: "qp1_f", label: "Keeping promises to myself and celebrating progress.",
              weights: { achiever: 2 },
              weights_role: { Navigator: 1, Architect: 1 },
              weights_energy: { Warrior: 2, Sovereign: 1 } }
          ]
        }
      ]
    }
  };

  // sanitize archetype/shadow maps
  quiz.questions.questions.forEach(q => {
    q.options?.forEach(o => {
      if (o.weights_role)   o.weights_role   = sanitize(o.weights_role, VALID_ROLES);
      if (o.weights_energy) o.weights_energy = sanitize(o.weights_energy, VALID_ENERGIES);
      if (o.weights_shadow) o.weights_shadow = sanitize(o.weights_shadow, VALID_SHADOWS);
    });
  });

  console.log("→ Upserting quiz…");
  const { data, error } = await admin
    .from('quizzes')
    .upsert(quiz, { onConflict: 'slug' })
    .select();

  if (error) {
    console.error("❌ Error seeding Self-Love Style v2:", error);
    process.exit(1);
  }
  console.log("✅ Seeded:", data?.map(r => `${r.slug} (v${r.questions?.version ?? "?"})`).join(", "));
  console.log(`ℹ️  Inserted/updated with ${quiz.questions.questions.length} questions and ${quiz.questions.results.length} result buckets.`);
}

main().catch((e) => {
  console.error("❌ Uncaught error:", e);
  process.exit(1);
});

