// scripts/seed_archetype_dual_v5.mjs
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("❌ Missing Supabase env vars"); process.exit(1); }
const admin = createClient(url, key);

// ------- Canon -------
const VALID_ROLES = new Set([
  "Navigator","Protector","Architect","Guardian","Artisan",
  "Catalyst","Nurturer","Herald","Seeker"
]);

// Updated canon: adds Sovereign & Jester; removes Trickster/Hermit from Energies
const VALID_ENERGIES = new Set([
  "Muse","Sage","Visionary","Healer","Warrior",
  "Creator","Lover","Magician","Rebel","Caregiver",
  "Sovereign","Jester"
]);

// ------- Helpers -------
function sanitize(map, valid) {
  if (!map || typeof map !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(map)) {
    if (valid.has(k) && typeof v === "number" && v > 0) out[k] = v;
  }
  return out;
}
const wR = (o) => sanitize(o, VALID_ROLES);
const wE = (o) => sanitize(o, VALID_ENERGIES);

// ------- Quiz -------
const quiz = {
  slug: "archetype-dual",
  title: "Archetype — Role + Energy",
  category: "Archetypal",
  description: "Discover your functional Role (how you contribute) and your Energy (the presence people feel from you).",
  is_published: true,
  questions: {
    version: 5,
    min_required: 12,
    results: [],
    meta: {
      is_preference: false,
      axes: ["role","energy"],
      notes: "Updated to include Sovereign & Jester energies; identity-focused (no shadow identities)."
    },
    questions: [
      // ------- Role Focus -------
      {
        id: "q1_role_instinct",
        type: "scenario",
        prompt: "When a group faces a tough challenge, what’s your instinct?",
        optional: false,
        options: [
          { key: "A", label: "Find the best route forward.",                         weights_role: wR({ Navigator: 2 }) },
          { key: "B", label: "Take the heaviest load so others don’t have to.",      weights_role: wR({ Protector: 2 }) },
          { key: "C", label: "Design a clear plan or structure.",                    weights_role: wR({ Architect: 2 }) },
          { key: "D", label: "Keep everyone calm and stable.",                       weights_role: wR({ Guardian: 2 }) },
          { key: "E", label: "Find a creative solution.",                            weights_role: wR({ Artisan: 2 }) },
          { key: "F", label: "Push everyone into action.",                           weights_role: wR({ Catalyst: 2 }) },
          { key: "G", label: "Care for those who are struggling.",                   weights_role: wR({ Nurturer: 2 }) },
          { key: "H", label: "Speak up and rally the group.",                        weights_role: wR({ Herald: 2 }) },
          { key: "I", label: "Explore alternatives no one’s tried yet.",             weights_role: wR({ Seeker: 2 }) }
        ]
      },
      {
        id: "q2_rely_on_you",
        type: "quick_pref",
        prompt: "What do people most often rely on you for?",
        optional: false,
        options: [
          { key: "A", label: "Guidance or advice.",               weights_role: wR({ Navigator: 2 }) },
          { key: "B", label: "Safety and protection.",            weights_role: wR({ Protector: 2 }) },
          { key: "C", label: "Organization and systems.",         weights_role: wR({ Architect: 2 }) },
          { key: "D", label: "Consistency and dependability.",    weights_role: wR({ Guardian: 2 }) },
          { key: "E", label: "Creativity or skillful work.",      weights_role: wR({ Artisan: 2 }) },
          { key: "F", label: "Energy and momentum.",              weights_role: wR({ Catalyst: 2 }) },
          { key: "G", label: "Care and emotional support.",       weights_role: wR({ Nurturer: 2 }) },
          { key: "H", label: "Communication or inspiration.",     weights_role: wR({ Herald: 2 }) },
          { key: "I", label: "New ideas and exploration.",        weights_role: wR({ Seeker: 2 }) }
        ]
      },
      {
        id: "q3_life_work",
        type: "quick_pref",
        prompt: "If you could spend your life doing one type of work, what would it be?",
        optional: false,
        options: [
          { key: "A", label: "Guiding others.",                weights_role: wR({ Navigator: 2 }) },
          { key: "B", label: "Defending what matters.",        weights_role: wR({ Protector: 2 }) },
          { key: "C", label: "Building systems.",              weights_role: wR({ Architect: 2 }) },
          { key: "D", label: "Preserving traditions.",         weights_role: wR({ Guardian: 2 }) },
          { key: "E", label: "Creating things.",               weights_role: wR({ Artisan: 2 }) },
          { key: "F", label: "Driving change.",                weights_role: wR({ Catalyst: 2 }) },
          { key: "G", label: "Caring for others.",             weights_role: wR({ Nurturer: 2 }) },
          { key: "H", label: "Sharing stories.",               weights_role: wR({ Herald: 2 }) },
          { key: "I", label: "Searching for truth.",           weights_role: wR({ Seeker: 2 }) }
        ]
      },
      {
        id: "q4_satisfaction",
        type: "quick_pref",
        prompt: "What brings you the deepest satisfaction?",
        optional: false,
        options: [
          { key: "A", label: "Helping someone find direction.",                                          weights_role: wR({ Navigator: 2 }) },
          { key: "B", label: "Standing up for someone.",                                                 weights_role: wR({ Protector: 2 }) },
          { key: "C", label: "Building something lasting.",                                              weights_role: wR({ Architect: 2 }) },
          { key: "D", label: "Guarding what’s sacred—loved ones, values, traditions.",                   weights_role: wR({ Guardian: 2 }) },
          { key: "E", label: "Creating something beautiful or useful.",                                  weights_role: wR({ Artisan: 2 }) },
          { key: "F", label: "Sparking change where change is needed.",                                  weights_role: wR({ Catalyst: 2 }) },
          { key: "G", label: "Comforting someone in pain.",                                              weights_role: wR({ Nurturer: 2 }) },
          { key: "H", label: "Sharing knowledge so it lands.",                                           weights_role: wR({ Herald: 2 }) },
          { key: "I", label: "Expanding your mind.",                                                     weights_role: wR({ Seeker: 2 }) }
        ]
      },
      {
        id: "q5_missing_in_group",
        type: "quick_pref",
        prompt: "What frustrates you most when it’s missing in a group?",
        optional: false,
        options: [
          { key: "A", label: "Clear direction.",                weights_role: wR({ Navigator: 2 }) },
          { key: "B", label: "Safety and boundaries.",          weights_role: wR({ Protector: 2 }) },
          { key: "C", label: "Organization.",                   weights_role: wR({ Architect: 2 }) },
          { key: "D", label: "Consistency.",                    weights_role: wR({ Guardian: 2 }) },
          { key: "E", label: "Creativity.",                     weights_role: wR({ Artisan: 2 }) },
          { key: "F", label: "Momentum.",                       weights_role: wR({ Catalyst: 2 }) },
          { key: "G", label: "Empathy.",                        weights_role: wR({ Nurturer: 2 }) },
          { key: "H", label: "Communication.",                  weights_role: wR({ Herald: 2 }) },
          { key: "I", label: "Curiosity.",                      weights_role: wR({ Seeker: 2 }) }
        ]
      },

      // ------- Energy Focus -------
      {
        id: "q6_people_come_for",
        type: "quick_pref",
        prompt: "People usually come to you for…",
        optional: false,
        options: [
          { key: "A", label: "Inspiration.",                    weights_energy: wE({ Muse: 2 }) },
          { key: "B", label: "Wisdom.",                         weights_energy: wE({ Sage: 2 }) },
          { key: "C", label: "Vision.",                         weights_energy: wE({ Visionary: 2 }) },
          { key: "D", label: "Healing.",                        weights_energy: wE({ Healer: 2 }) },
          { key: "E", label: "Courage.",                        weights_energy: wE({ Warrior: 2 }) },
          { key: "F", label: "Creativity.",                     weights_energy: wE({ Creator: 2 }) },
          { key: "G", label: "Passion.",                        weights_energy: wE({ Lover: 2 }) },
          { key: "H", label: "Intuition.",                      weights_energy: wE({ Magician: 2 }) },
          { key: "I", label: "Rebellion.",                      weights_energy: wE({ Rebel: 2 }) },
          { key: "J", label: "Comfort.",                        weights_energy: wE({ Caregiver: 2 }) }
        ]
      },
      {
        id: "q7_conversation_feel",
        type: "quick_pref",
        prompt: "In a conversation, what do others most feel from you?",
        optional: false,
        options: [
          { key: "A", label: "Joy & uplift.",                   weights_energy: wE({ Muse: 2 }) },
          { key: "B", label: "Calm, reflective insight.",       weights_energy: wE({ Sage: 2 }) },
          { key: "C", label: "Future focus & big picture.",     weights_energy: wE({ Visionary: 2 }) },
          { key: "D", label: "Ease & restoration.",             weights_energy: wE({ Healer: 2 }) },
          { key: "E", label: "Strength & resolve.",             weights_energy: wE({ Warrior: 2 }) },
          { key: "F", label: "Generative making/build energy.", weights_energy: wE({ Creator: 2 }) },
          { key: "G", label: "Warmth & intimacy.",              weights_energy: wE({ Lover: 2 }) },
          { key: "H", label: "Pattern-sensing, transformative presence.", weights_energy: wE({ Magician: 2 }) },
          { key: "I", label: "Boldness to defy what’s stale.",  weights_energy: wE({ Rebel: 2 }) },
          { key: "J", label: "Safety & steady care.",           weights_energy: wE({ Caregiver: 2 }) }
        ]
      },
      {
        id: "q8_mythic_self",
        type: "quick_pref",
        prompt: "If your life were a mythic story, you’d be…",
        optional: false,
        options: [
          { key: "A", label: "The Muse who inspires greatness.",            weights_energy: wE({ Muse: 2 }) },
          { key: "B", label: "The Sage who guides with wisdom.",            weights_energy: wE({ Sage: 2 }) },
          { key: "C", label: "The Visionary who sees the future.",          weights_energy: wE({ Visionary: 2 }) },
          { key: "D", label: "The Healer who restores balance.",            weights_energy: wE({ Healer: 2 }) },
          { key: "E", label: "The Warrior who fights for what’s right.",    weights_energy: wE({ Warrior: 2 }) },
          { key: "F", label: "The Creator who births new worlds.",          weights_energy: wE({ Creator: 2 }) },
          { key: "G", label: "The Lover who unites through passion.",       weights_energy: wE({ Lover: 2 }) },
          { key: "H", label: "The Magician who transforms reality.",        weights_energy: wE({ Magician: 2 }) },
          { key: "I", label: "The Rebel who defies oppression.",            weights_energy: wE({ Rebel: 2 }) },
          { key: "J", label: "The Caregiver who nurtures the tribe.",       weights_energy: wE({ Caregiver: 2 }) }
        ]
      },
      {
        id: "q9_room_presence",
        type: "quick_pref",
        prompt: "Which kind of presence do you most naturally embody in a room?",
        optional: false,
        options: [
          { key: "A", label: "Calm authority, holds the center.",           weights_energy: wE({ Sovereign: 2 }) },
          { key: "B", label: "Levity that loosens stuck energy.",           weights_energy: wE({ Jester: 2 }) },
          { key: "C", label: "Deep caring and protection.",                 weights_energy: wE({ Caregiver: 1, Warrior: 1 }) },
          { key: "D", label: "Future-casting perspective.",                 weights_energy: wE({ Visionary: 1, Sage: 1 }) },
          { key: "E", label: "Creative spark.",                             weights_energy: wE({ Creator: 1, Muse: 1 }) },
          { key: "F", label: "Intimate connection.",                        weights_energy: wE({ Lover: 2 }) }
        ]
      },
      {
        id: "q10_rel_role",
        type: "quick_pref",
        prompt: "What role do you naturally play in relationships?",
        optional: false,
        options: [
          { key: "A", label: "The one who uplifts.",                         weights_energy: wE({ Muse: 2 }) },
          { key: "B", label: "The one who advises.",                         weights_energy: wE({ Sage: 2 }) },
          { key: "C", label: "The one who dreams big.",                      weights_energy: wE({ Visionary: 2 }) },
          { key: "D", label: "The one who soothes and restores.",            weights_energy: wE({ Healer: 2, Caregiver: 1 }) },
          { key: "E", label: "The one who protects.",                        weights_energy: wE({ Warrior: 2 }) },
          { key: "F", label: "The one who creates experiences.",             weights_energy: wE({ Creator: 2 }) },
          { key: "G", label: "The one who connects deeply.",                 weights_energy: wE({ Lover: 2 }) },
          { key: "H", label: "The one who sees what others don't.",          weights_energy: wE({ Magician: 2 }) },
          { key: "I", label: "The one who challenges limits.",               weights_energy: wE({ Rebel: 2 }) },
          { key: "J", label: "The one who provides stability.",              weights_energy: wE({ Caregiver: 2 }) }
        ]
      },

      // ------- Tie-Breakers & Identity Lens -------
      {
        id: "q11_combo_reputation",
        type: "quick_pref",
        prompt: "In your circles, you’re most known for your…",
        optional: false,
        options: [
          { key: "A", label: "Guidance.",         weights_role: wR({ Navigator: 2 }), weights_energy: wE({ Sage: 1 }) },
          { key: "B", label: "Protection.",       weights_role: wR({ Protector: 2 }), weights_energy: wE({ Warrior: 1 }) },
          { key: "C", label: "Structure.",        weights_role: wR({ Architect: 2 }), weights_energy: wE({ Creator: 1 }) },
          { key: "D", label: "Tradition.",        weights_role: wR({ Guardian: 2 }),  weights_energy: wE({ Caregiver: 1 }) },
          { key: "E", label: "Beauty/craft.",     weights_role: wR({ Artisan: 2 }),   weights_energy: wE({ Muse: 1 }) },
          { key: "F", label: "Energy for change.",weights_role: wR({ Catalyst: 2 }),  weights_energy: wE({ Rebel: 1 }) },
          { key: "G", label: "Nurturing.",        weights_role: wR({ Nurturer: 2 }),  weights_energy: wE({ Healer: 1 }) },
          { key: "H", label: "Storytelling.",     weights_role: wR({ Herald: 2 }),    weights_energy: wE({ Visionary: 1 }) },
          { key: "I", label: "Curiosity.",        weights_role: wR({ Seeker: 2 }),    weights_energy: wE({ Magician: 1 }) }
        ]
      },
      {
        id: "q12_role_vs_energy",
        type: "head_to_head",
        prompt: "Which feels more important to you?",
        optional: false,
        options: [
          { key: "A", label: "What I do (my role).",            weights_role: wR({ Navigator:1, Protector:1, Architect:1, Guardian:1, Artisan:1, Catalyst:1, Nurturer:1, Herald:1, Seeker:1 }) },
          { key: "B", label: "How people experience me (my energy).", weights_energy: wE({ Muse:1, Sage:1, Visionary:1, Healer:1, Warrior:1, Creator:1, Lover:1, Magician:1, Rebel:1, Caregiver:1, Sovereign:1, Jester:1 }) }
        ]
      },
      {
        id: "q13_work_zone_h2h",
        type: "head_to_head",
        prompt: "Which work zone feels more like home?",
        optional: false,
        options: [
          { key: "A", label: "Hands-on making and craft.",                  weights_role: wR({ Artisan: 2 }) },
          { key: "B", label: "Helping someone through a stressful moment.", weights_role: wR({ Nurturer: 2, Protector: 1 }) }
        ]
      },
      {
        id: "q14_money_aside",
        type: "scenario",
        prompt: "Money aside, you’d spend your life primarily…",
        optional: false,
        options: [
          { key: "A", label: "Designing systems that help people thrive.",  weights_role: wR({ Architect: 2 }) },
          { key: "B", label: "Building/creating tangible things.",          weights_role: wR({ Artisan: 2 }) },
          { key: "C", label: "Mentoring or guiding.",                       weights_role: wR({ Navigator: 2, Herald: 1 }) },
          { key: "D", label: "Showing up for community needs.",             weights_role: wR({ Nurturer: 2, Guardian: 1 }) },
          { key: "E", label: "Challenging stale norms.",                    weights_role: wR({ Catalyst: 2 }) }
        ]
      },
      {
        id: "q15_room_needs_you",
        type: "head_to_head",
        prompt: "When a room needs you, what shows up first?",
        optional: false,
        options: [
          { key: "A", label: "Healing presence to de-escalate.",            weights_energy: wE({ Healer: 2, Caregiver: 1 }) },
          { key: "B", label: "Boldness to motivate action.",                weights_energy: wE({ Warrior: 2, Rebel: 1 }) },
          { key: "C", label: "Calm authority to set order.",                weights_energy: wE({ Sovereign: 2 }) },
          { key: "D", label: "Humor to loosen tension.",                    weights_energy: wE({ Jester: 2 }) }
        ]
      },

      // ------- Optional gentle stress lens (identity quiz; no shadow outputs) -------
      {
        id: "q16_under_pressure",
        type: "quick_pref",
        prompt: "Under pressure, you’re most likely to…",
        optional: false,
        options: [
          { key: "A", label: "Double down and carry more weight.",          weights_role: wR({ Protector: 1 }), weights_energy: wE({ Warrior: 1 }) },
          { key: "B", label: "Seek counsel and reorganize.",                weights_role: wR({ Architect: 1, Navigator: 1 }), weights_energy: wE({ Sage: 1 }) },
          { key: "C", label: "Soften the room so people can breathe.",      weights_role: wR({ Nurturer: 1 }), weights_energy: wE({ Healer: 1, Caregiver: 1 }) },
          { key: "D", label: "Push for a hard reset.",                      weights_role: wR({ Catalyst: 1, Seeker: 1 }), weights_energy: wE({ Rebel: 1 }) },
          { key: "E", label: "Lighten the mood to get movement.",           weights_role: wR({ Herald: 1 }), weights_energy: wE({ Jester: 1 }) }
        ]
      }
    ]
  }
};

// Defensive sanitize pass (should already be clean via wR/wE)
quiz.questions.questions.forEach(q => {
  q.options?.forEach(o => {
    if (o.weights_role)   o.weights_role   = sanitize(o.weights_role, VALID_ROLES);
    if (o.weights_energy) o.weights_energy = sanitize(o.weights_energy, VALID_ENERGIES);
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
