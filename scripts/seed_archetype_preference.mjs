// scripts/seed_archetype_preference_v4.mjs
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("❌ Missing Supabase env vars"); process.exit(1); }
const admin = createClient(url, key);

// ---- Canon: Roles / Energies / Shadows ----
const VALID_ROLES = new Set([
  "Navigator","Protector","Architect","Guardian","Artisan",
  "Catalyst","Nurturer","Herald","Seeker"
]);

const VALID_ENERGIES = new Set([
  "Muse","Sage","Visionary","Healer","Warrior",
  "Creator","Lover","Magician","Rebel","Caregiver",
  "Sovereign","Jester"
]);

// Shadows are detected softly; not shown as identities
const VALID_SHADOWS = new Set([
  "Victim","Saboteur","Addict","ShadowRebel","Tyrant","Trickster",
  "Hermit","Martyr","ShadowLover","Nihilist"
]);

// ---- Helpers ----
function sanitizePos(map, validSet) {
  if (!map || typeof map !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(map)) {
    if (validSet.has(k) && typeof v === "number" && v > 0) out[k] = v;
  }
  return out;
}
function sanitizeShadow(map) {
  return sanitizePos(map, VALID_SHADOWS);
}
function wR(o){ return sanitizePos(o, VALID_ROLES); }
function wE(o){ return sanitizePos(o, VALID_ENERGIES); }
function wS(o){ return sanitizeShadow(o); }

// ---- Quiz definition ----
const quiz = {
  slug: "archetype-preference",
  title: "Archetype Preference — Attraction Map",
  category: "Archetypal",
  description: "Not compatibility — attraction. Which Roles and Energies are most magnetic to you right now?",
  is_published: true,
  questions: {
    version: 4,
    min_required: 10,
    results: [],
    meta: {
      is_preference: true,
      axes: ["role_pref","energy_pref"],
      notes: "Includes Sovereign & Jester energies and soft shadow detection (Q11–Q13)."
    },
    questions: [
      // -------- Magnetism (Q1–Q5) --------
      {
        id: "q1",
        type: "quick_pref",
        prompt: "In a group, who stands out to you in the most favorable way?",
        optional: false,
        options: [
          { key: "A", label: "The bold one who challenges everyone.",
            weights_role: wR({ Catalyst: 2 }), weights_energy: wE({ Rebel: 2 }) },
          { key: "B", label: "The calm one who keeps things steady (stability under pressure).",
            weights_role: wR({ Guardian: 2 }), weights_energy: wE({ Healer: 2 }) },
          { key: "C", label: "The clever one who always has a plan.",
            weights_role: wR({ Navigator: 2 }), weights_energy: wE({ Sage: 2 }) },
          { key: "D", label: "The warm one who makes everyone feel cared for (emotional support).",
            weights_role: wR({ Nurturer: 2 }), weights_energy: wE({ Lover: 2 }) },
          { key: "E", label: "The inventive one who’s hands-on creative.",
            weights_role: wR({ Artisan: 2 }), weights_energy: wE({ Creator: 2 }) },
          { key: "F", label: "The one who tells the story everyone remembers.",
            weights_role: wR({ Herald: 2 }), weights_energy: wE({ Muse: 2 }) },
        ]
      },
      {
        id: "q2",
        type: "quick_pref",
        prompt: "What type of energy do you find most magnetic?",
        optional: false,
        options: [
          { key: "A", label: "Intensity and passion.",
            weights_role: wR({ Catalyst: 1 }), weights_energy: wE({ Warrior: 2 }) },
          { key: "B", label: "Serenity and peace.",
            weights_role: wR({ Guardian: 1 }), weights_energy: wE({ Healer: 2 }) },
          { key: "C", label: "Mystery and depth.",
            weights_role: wR({ Navigator: 1 }), weights_energy: wE({ Visionary: 2 }) },
          { key: "D", label: "Playfulness and levity.",
            weights_role: wR({ Herald: 1 }), weights_energy: wE({ Jester: 2 }) },
          { key: "E", label: "Ingenuity and brilliance.",
            weights_role: wR({ Artisan: 1 }), weights_energy: wE({ Creator: 2 }) },
          { key: "F", label: "Steady leadership and calm authority.",
            weights_role: wR({ Protector: 1 }), weights_energy: wE({ Sovereign: 2 }) },
        ]
      },
      {
        id: "q3",
        type: "quick_pref",
        prompt: "In a conversation with someone, which trait draws your attention the most?",
        optional: false,
        options: [
          { key: "A", label: "Their confidence and presence.",
            weights_role: wR({ Catalyst: 1 }), weights_energy: wE({ Sovereign: 2 }) },
          { key: "B", label: "Their comforting, grounded vibe.",
            weights_role: wR({ Guardian: 1 }), weights_energy: wE({ Caregiver: 2 }) },
          { key: "C", label: "Their insightful perspective.",
            weights_role: wR({ Navigator: 1 }), weights_energy: wE({ Sage: 2 }) },
          { key: "D", label: "Their expressive creativity.",
            weights_role: wR({ Artisan: 1 }), weights_energy: wE({ Muse: 2 }) },
          { key: "E", label: "Their nurturing kindness.",
            weights_role: wR({ Nurturer: 1 }), weights_energy: wE({ Lover: 2 }) },
          { key: "F", label: "Their adventurous curiosity.",
            weights_role: wR({ Seeker: 1 }), weights_energy: wE({ Visionary: 2 }) },
        ]
      },
      {
        id: "q4",
        type: "quick_pref",
        prompt: "Which quality do you admire most in others?",
        optional: false,
        options: [
          { key: "A", label: "Courage to break rules.",
            weights_role: wR({ Catalyst: 1 }), weights_energy: wE({ Rebel: 2 }) },
          { key: "B", label: "Patience and dependability.",
            weights_role: wR({ Guardian: 2 }), weights_energy: wE({ Healer: 1 }) },
          { key: "C", label: "Wisdom and foresight.",
            weights_role: wR({ Navigator: 1 }), weights_energy: wE({ Sage: 2, Visionary: 1 }) },
          { key: "D", label: "Compassion and generosity.",
            weights_role: wR({ Nurturer: 2 }), weights_energy: wE({ Caregiver: 2 }) },
          { key: "E", label: "Imagination and artistry.",
            weights_role: wR({ Artisan: 2 }), weights_energy: wE({ Creator: 1, Muse: 1 }) },
          { key: "F", label: "Boldness in discovery.",
            weights_role: wR({ Seeker: 2 }), weights_energy: wE({ Magician: 1, Visionary: 1 }) },
        ]
      },
      {
        id: "q5",
        type: "quick_pref",
        prompt: "Which role would you love your partner or friend to play in your life?",
        optional: false,
        options: [
          { key: "A", label: "The fire that pushes me forward.",
            weights_role: wR({ Catalyst: 2 }), weights_energy: wE({ Warrior: 1, Rebel: 1 }) },
          { key: "B", label: "The anchor that steadies me.",
            weights_role: wR({ Guardian: 2 }), weights_energy: wE({ Healer: 1, Caregiver: 1 }) },
          { key: "C", label: "The compass that gives me direction.",
            weights_role: wR({ Navigator: 2 }), weights_energy: wE({ Sage: 1, Visionary: 1 }) },
          { key: "D", label: "The heart that makes me feel loved.",
            weights_role: wR({ Nurturer: 2 }), weights_energy: wE({ Lover: 2 }) },
          { key: "E", label: "The spark that inspires me.",
            weights_role: wR({ Artisan: 2 }), weights_energy: wE({ Muse: 1, Creator: 1 }) },
          { key: "F", label: "The shield that makes me feel safe.",
            weights_role: wR({ Protector: 2 }), weights_energy: wE({ Sovereign: 2 }) },
        ]
      },

      // -------- Relationship Pulls (Q6–Q10) --------
      {
        id: "q6",
        type: "quick_pref",
        prompt: "Which of the following sounds most appealing to you in a partner?",
        optional: false,
        options: [
          { key: "A", label: "Someone who pushes me out of my comfort zone.",
            weights_role: wR({ Catalyst: 2 }), weights_energy: wE({ Rebel: 1, Warrior: 1 }) },
          { key: "B", label: "Someone who calms and steadies me.",
            weights_role: wR({ Guardian: 2 }), weights_energy: wE({ Healer: 2 }) },
          { key: "C", label: "Someone who debates me and sharpens my thinking.",
            weights_role: wR({ Navigator: 2 }), weights_energy: wE({ Sage: 2 }) },
          { key: "D", label: "Someone who uplifts me emotionally.",
            weights_role: wR({ Nurturer: 2 }), weights_energy: wE({ Lover: 2, Healer: 1 }) },
          { key: "E", label: "Someone who creates with me.",
            weights_role: wR({ Artisan: 2 }), weights_energy: wE({ Creator: 2, Muse: 1 }) },
          { key: "F", label: "Someone who makes adventures fun.",
            weights_role: wR({ Herald: 2 }), weights_energy: wE({ Jester: 2 }) },
        ]
      },
      {
        id: "q7",
        type: "quick_pref",
        prompt: "What do you find most irresistible in relationships?",
        optional: false,
        options: [
          { key: "A", label: "Bold energy that keeps things exciting.",
            weights_role: wR({ Catalyst: 2 }), weights_energy: wE({ Rebel: 2, Warrior: 1 }) },
          { key: "B", label: "A protective presence that feels safe.",
            weights_role: wR({ Protector: 2 }), weights_energy: wE({ Sovereign: 2, Caregiver: 1 }) },
          { key: "C", label: "A visionary who helps me see differently.",
            weights_role: wR({ Navigator: 1 }), weights_energy: wE({ Visionary: 2, Sage: 1 }) },
          { key: "D", label: "Tenderness and affection.",
            weights_role: wR({ Nurturer: 2 }), weights_energy: wE({ Lover: 2, Healer: 1 }) },
          { key: "E", label: "Spark of creativity and originality.",
            weights_role: wR({ Artisan: 2 }), weights_energy: wE({ Creator: 2, Muse: 1 }) },
          { key: "F", label: "Humor that lightens the hardest moments.",
            weights_role: wR({ Herald: 2 }), weights_energy: wE({ Jester: 2 }) },
        ]
      },
      {
        id: "q8",
        type: "quick_pref",
        prompt: "What trait would frustrate you if it were missing from your relationships?",
        optional: false,
        options: [
          { key: "A", label: "Drive and boldness.",
            weights_role: wR({ Catalyst: 2 }), weights_energy: wE({ Warrior: 1 }) },
          { key: "B", label: "Stability and reliability.",
            weights_role: wR({ Guardian: 2 }), weights_energy: wE({ Caregiver: 2 }) },
          { key: "C", label: "Direction and wisdom.",
            weights_role: wR({ Navigator: 2 }), weights_energy: wE({ Sage: 2 }) },
          { key: "D", label: "Warmth and compassion.",
            weights_role: wR({ Nurturer: 2 }), weights_energy: wE({ Lover: 2, Healer: 1 }) },
          { key: "E", label: "Creativity and imagination.",
            weights_role: wR({ Artisan: 2 }), weights_energy: wE({ Creator: 2, Muse: 1 }) },
          { key: "F", label: "Playfulness and humor.",
            weights_role: wR({ Herald: 2 }), weights_energy: wE({ Jester: 2 }) },
        ]
      },
      {
        id: "q9",
        type: "quick_pref",
        prompt: "Imagine your ideal adventure buddy. What’s their vibe?",
        optional: false,
        options: [
          { key: "A", label: "Thrill-seeking and daring.",
            weights_role: wR({ Catalyst: 2 }), weights_energy: wE({ Rebel: 1, Warrior: 1 }) },
          { key: "B", label: "Reliable and careful.",
            weights_role: wR({ Guardian: 1, Protector: 1 }), weights_energy: wE({ Caregiver: 1, Sovereign: 1 }) },
          { key: "C", label: "Strategic and thoughtful.",
            weights_role: wR({ Navigator: 2 }), weights_energy: wE({ Visionary: 1, Sage: 1 }) },
          { key: "D", label: "Gentle and supportive.",
            weights_role: wR({ Nurturer: 2 }), weights_energy: wE({ Healer: 2 }) },
          { key: "E", label: "Fun and imaginative.",
            weights_role: wR({ Artisan: 2 }), weights_energy: wE({ Muse: 1, Creator: 1 }) },
          { key: "F", label: "Storytelling, playful, keeps spirits high.",
            weights_role: wR({ Herald: 2 }), weights_energy: wE({ Jester: 2 }) },
        ]
      },
      {
        id: "q10",
        type: "quick_pref",
        prompt: "When you think of the person who excites you most, what stands out?",
        optional: false,
        options: [
          { key: "A", label: "Their bold courage.",
            weights_role: wR({ Catalyst: 2 }), weights_energy: wE({ Warrior: 2 }) },
          { key: "B", label: "Their steady loyalty.",
            weights_role: wR({ Guardian: 2 }), weights_energy: wE({ Caregiver: 2 }) },
          { key: "C", label: "Their sharp mind.",
            weights_role: wR({ Navigator: 2 }), weights_energy: wE({ Sage: 2 }) },
          { key: "D", label: "Their tender love.",
            weights_role: wR({ Nurturer: 2 }), weights_energy: wE({ Lover: 2 }) },
          { key: "E", label: "Their wild creativity.",
            weights_role: wR({ Artisan: 2 }), weights_energy: wE({ Creator: 2, Muse: 1 }) },
          { key: "F", label: "Their humor and lightness.",
            weights_role: wR({ Herald: 2 }), weights_energy: wE({ Jester: 2 }) },
        ]
      },

      // -------- Shadow Detection (Q11–Q13) --------
      {
        id: "q11",
        type: "scenario",
        prompt: "When you’re close to success, what’s your usual pattern?",
        optional: false,
        options: [
          { key: "A", label: "Push harder until it’s done.",
            weights_role: wR({ Protector: 1, Catalyst: 1 }), weights_energy: wE({ Warrior: 1, Sovereign: 1 }) },
          { key: "B", label: "Share the credit and include others.",
            weights_role: wR({ Nurturer: 1, Guardian: 1 }), weights_energy: wE({ Caregiver: 1 }) },
          { key: "C", label: "Delay or self-sabotage at the last mile.",
            weights_shadow: wS({ Saboteur: 2 }) },
          { key: "D", label: "Celebrate early and lose momentum.",
            weights_energy: wE({ Jester: 1 }), weights_shadow: wS({ Trickster: 1 }) },
          { key: "E", label: "Doubt if it even matters.",
            weights_shadow: wS({ Nihilist: 2 }) },
        ]
      },
      {
        id: "q12",
        type: "scenario",
        prompt: "When someone depends on you and you feel drained, what do you do?",
        optional: false,
        options: [
          { key: "A", label: "Power through anyway.",
            weights_role: wR({ Protector: 1 }), weights_energy: wE({ Warrior: 1 }) },
          { key: "B", label: "Withdraw and shut down.",
            weights_shadow: wS({ Hermit: 2 }) },
          { key: "C", label: "Get resentful or over-give.",
            weights_shadow: wS({ Martyr: 2 }) },
          { key: "D", label: "Try to fix them even if it costs me.",
            weights_role: wR({ Nurturer: 1 }), weights_energy: wE({ Healer: 1, Caregiver: 1 }) },
          { key: "E", label: "Crack jokes to dodge the pressure.",
            weights_energy: wE({ Jester: 1 }), weights_shadow: wS({ Trickster: 1 }) },
        ]
      },
      {
        id: "q13",
        type: "scenario",
        prompt: "When you feel powerless, how do you respond?",
        optional: false,
        options: [
          { key: "A", label: "Look for allies and support.",
            weights_role: wR({ Guardian: 1, Nurturer: 1 }), weights_energy: wE({ Caregiver: 1 }) },
          { key: "B", label: "Find a new path or reinvent the situation.",
            weights_role: wR({ Navigator: 1, Seeker: 1 }), weights_energy: wE({ Magician: 1 }) },
          { key: "C", label: "Collapse or wait for rescue.",
            weights_shadow: wS({ Victim: 2 }) },
          { key: "D", label: "Rebel even if it makes things worse.",
            weights_shadow: wS({ ShadowRebel: 2 }) },
          { key: "E", label: "Escape into distraction or craving.",
            weights_shadow: wS({ Addict: 2 }) },
        ]
      },

      // -------- Integration (Q14–Q15) --------
      {
        id: "q14",
        type: "quick_pref",
        prompt: "What role feels most attractive to you right now in others?",
        optional: false,
        options: [
          { key: "A", label: "The leader who takes command.",
            weights_role: wR({ Protector: 1, Guardian: 1, Architect: 1 }), weights_energy: wE({ Sovereign: 2 }) },
          { key: "B", label: "The healer who restores balance.",
            weights_role: wR({ Nurturer: 1 }), weights_energy: wE({ Healer: 2, Caregiver: 1 }) },
          { key: "C", label: "The guide who clears the fog.",
            weights_role: wR({ Navigator: 2 }) , weights_energy: wE({ Sage: 1 }) },
          { key: "D", label: "The disruptor who sparks change.",
            weights_role: wR({ Catalyst: 2 }) , weights_energy: wE({ Rebel: 1 }) },
          { key: "E", label: "The builder who creates stability.",
            weights_role: wR({ Architect: 2, Guardian: 1 }) , weights_energy: wE({ Creator: 1 }) },
          { key: "F", label: "The creative who inspires beauty.",
            weights_role: wR({ Artisan: 2 }) , weights_energy: wE({ Muse: 1, Creator: 1 }) },
        ]
      },
      {
        id: "q15",
        type: "quick_pref",
        prompt: "Which energy feels like home to you when someone brings it?",
        optional: false,
        options: [
          { key: "A", label: "Tender love and devotion.",
            weights_energy: wE({ Lover: 2, Caregiver: 1 }) },
          { key: "B", label: "Creative spark and invention.",
            weights_energy: wE({ Creator: 2, Muse: 1 }) },
          { key: "C", label: "Courage and strength.",
            weights_energy: wE({ Warrior: 2 }) },
          { key: "D", label: "Wisdom and perspective.",
            weights_energy: wE({ Sage: 2 }) },
          { key: "E", label: "Inspiration and joy.",
            weights_energy: wE({ Muse: 2 }) },
          { key: "F", label: "Humor and levity.",
            weights_energy: wE({ Jester: 2 }) },
          { key: "G", label: "Authority and calm order.",
            weights_energy: wE({ Sovereign: 2 }) },
          { key: "H", label: "Mystery and transformation.",
            weights_energy: wE({ Magician: 2 }) },
        ]
      }
    ]
  }
};

// sanitize (already done inline via wR/wE/wS)
// but keep a defensive pass in case we tweak above later:
quiz.questions.questions.forEach(q => {
  q.options?.forEach(o => {
    if (o.weights_role)   o.weights_role   = sanitizePos(o.weights_role, VALID_ROLES);
    if (o.weights_energy) o.weights_energy = sanitizePos(o.weights_energy, VALID_ENERGIES);
    if (o.weights_shadow) o.weights_shadow = sanitizeShadow(o.weights_shadow);
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
