// scripts/seed_soul_connection_v2.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('❌ Missing env vars');
  process.exit(1);
}
const admin = createClient(url, key);

// Optional: attach a name/initials for the relationship being assessed
// Store per-result at run-time as quizRun.meta.subject_label

const quiz = {
  slug: "soul-connection",
  title: "What Kind of Soul Connection Do You Share?",
  category: "Archetypal",
  description:
    "Answer based on how you feel in their presence. This is reflective guidance—not a fixed label. Results will say “may be your…” on purpose.",
  is_published: true,
  questions: {
    version: 2,
    min_required: 10,
    results: [
      {
        key: "soulmate",
        label: "Soulmate (The Harmonizer)",
        headline: "This person **may be** your Soulmate.",
        summary: "Peaceful, supportive, enduring. The connection feels like home—grounding, gentle growth, low drama.",
        guidance: [
          "Keep weekly rituals and gratitude notes.",
          "Mix comfort with small novelty to keep the spark alive."
        ],
        green_flags: ["Repair feels easy and kind", "Shared rhythms and reciprocity"],
        yellow_flags: ["Complacency, taking each other for granted"]
      },
      {
        key: "twin_flame",
        label: "Twin Flame (The Fire)",
        headline: "This person **may be** your Twin Flame.",
        summary: "Magnetic, transformative, sometimes volatile. Passion intertwines with shadow work and rapid growth.",
        guidance: [
          "Co-create a de-escalation plan: pause word, breathset, reconnection time.",
          "Do the work *between* highs and lows (journaling, therapy, somatics)."
        ],
        green_flags: ["Intensity + repair + respect for boundaries"],
        yellow_flags: ["Name-calling, control, isolation — intensity ≠ love"]
      },
      {
        key: "twin_soul",
        label: "Twin Soul (The Mirror)",
        headline: "This person **may be** your Twin Soul.",
        summary: "Deep recognition and quiet resonance—same essence, shared direction, minimal chaos with profound depth.",
        guidance: [
          "Create a shared vision doc and review monthly.",
          "Mirror journaling: ‘I feel / You reflect / We choose’."
        ],
        green_flags: ["Aligned life direction, easy depth"],
        yellow_flags: ["Merging identities; neglecting personal growth edges"]
      },
      {
        key: "karmic",
        label: "Karmic Connection (The Teacher)",
        headline: "This person **may be** a Karmic Teacher.",
        summary: "Growth through friction, repeating loops until a lesson lands. Valuable, sometimes temporary.",
        guidance: [
          "Name the loop; set one boundary to break it.",
          "Choose the lesson to keep; release the rest without blame."
        ],
        green_flags: ["Lessons integrated, loops slowing"],
        yellow_flags: ["Same wound, same fight, no change over time"]
      },
      {
        key: "kindred",
        label: "Kindred Spirit (The Companion)",
        headline: "This person **may be** a Kindred Spirit.",
        summary: "Aligned, light, often seasonal. Easy presence, meaningful moments, minimal heavy lessons.",
        guidance: [
          "Savor simple rituals—walks, tea, small adventures.",
          "Let it breathe—no need to force permanence."
        ],
        green_flags: ["Ease, laughter, mutual availability"],
        yellow_flags: ["Mismatch in long-term goals if you try to force it"]
      }
    ],
    // Optional safety flags (stored per run; not surfaced as a “type”)
    flags_meta: { keys: ["dysregulation","boundary_erosion","one_sided","isolation"] },

    questions: [
      // 1 — Energy effect (as is)
      {
        id: "q1",
        type: "scenario",
        prompt: "When you’re with this person, how does your energy shift?",
        optional: false,
        options: [
          { key: "calm",    label: "Lighter, calmer, at peace.",            weights: { soulmate: 2, kindred: 1 } },
          { key: "intense", label: "Intensified—high highs, low lows.",     weights: { twin_flame: 2, karmic: 1 } },
          { key: "mirror",  label: "Mirrored—hidden parts exposed.",        weights: { twin_soul: 2, twin_flame: 1 } },
          { key: "guided",  label: "Challenged to grow, strongly.",         weights: { karmic: 2, twin_flame: 1 } },
          { key: "aligned", label: "Aligned—already on the same path.",     weights: { twin_soul: 2, soulmate: 1 } }
        ]
      },

      // 2 — Role they play (as is)
      {
        id: "q2",
        type: "quick_pref",
        prompt: "What role does this person play in your life right now?",
        optional: false,
        options: [
          { key: "companion", label: "Steady companion.",    weights: { soulmate: 2, kindred: 1 } },
          { key: "catalyst",  label: "Intense catalyst.",    weights: { twin_flame: 2, karmic: 1 } },
          { key: "mirror",    label: "Familiar mirror.",     weights: { twin_soul: 2, soulmate: 1 } },
          { key: "teacher",   label: "Teacher of lessons.",  weights: { karmic: 2 } },
          { key: "traveler",  label: "Fellow traveler.",     weights: { kindred: 2 } }
        ]
      },

      // 3 — Conflict texture (as is)
      {
        id: "q3",
        type: "scenario",
        prompt: "How does conflict between you usually feel?",
        optional: false,
        options: [
          { key: "gentle",   label: "Gentle; resolves naturally.",          weights: { soulmate: 2, kindred: 1 } },
          { key: "explosive",label: "Explosive—passion & pain interwoven.", weights: { twin_flame: 2 } },
          { key: "lit",      label: "Confrontational but illuminating.",    weights: { twin_soul: 2, twin_flame: 1 } },
          { key: "cyclical", label: "Cyclical—same lesson repeats.",        weights: { karmic: 2 } },
          { key: "minimal",  label: "Minimal; we mostly flow.",             weights: { kindred: 2, soulmate: 1 } }
        ]
      },

      // 4 — Timing (as is)
      {
        id: "q4",
        type: "quick_pref",
        prompt: "How would you describe the timing of your connection?",
        optional: false,
        options: [
          { key: "effortless", label: "Effortless arrival; smooth weaving.", weights: { soulmate: 2, kindred: 1 } },
          { key: "chaotic",    label: "Chaotic collision, not eased.",       weights: { twin_flame: 2 } },
          { key: "uncanny",    label: "Uncanny, predestined, eerie.",        weights: { twin_soul: 2, twin_flame: 1 } },
          { key: "timely",     label: "Timely wake-up call.",                weights: { karmic: 2 } },
          { key: "flexible",   label: "Flexible—ebb & flow feels right.",    weights: { kindred: 2 } }
        ]
      },

      // 5 — Presence feeling (as is)
      {
        id: "q5",
        type: "scenario",
        prompt: "Which best captures how you feel in their presence?",
        optional: false,
        options: [
          { key: "safe",     label: "Safe, supported, seen.",                weights: { soulmate: 2 } },
          { key: "onfire",   label: "Obsessed, overwhelmed, on fire.",       weights: { twin_flame: 2 } },
          { key: "bare",     label: "Stripped bare, facing myself.",         weights: { twin_soul: 2 } },
          { key: "tested",   label: "Tested—discipline, humility, patience.",weights: { karmic: 2 } },
          { key: "familiar", label: "Familiar, like forever known.",         weights: { twin_soul: 1, kindred: 2 } }
        ]
      },

      // 6 — Synchronicities (as is)
      {
        id: "q6",
        type: "quick_pref",
        prompt: "How do synchronicities show up around this person?",
        optional: false,
        options: [
          { key: "small",  label: "Small serendipities; finishing sentences.", weights: { soulmate: 2, kindred: 1 } },
          { key: "grand",  label: "Big signs—repeating numbers, vivid dreams.",weights: { twin_flame: 2, twin_soul: 1 } },
          { key: "reflect",label: "Perfectly timed reflections.",             weights: { twin_soul: 2 } },
          { key: "lesson", label: "Challenges align when we’re together.",    weights: { karmic: 2 } },
          { key: "gentle", label: "Gentle alignments, not flashy.",           weights: { kindred: 2, soulmate: 1 } }
        ]
      },

      // 7 — What they awaken (as is)
      {
        id: "q7",
        type: "quick_pref",
        prompt: "What do you feel this person awakens most in you?",
        optional: false,
        options: [
          { key: "ease",    label: "Love, ease, balance.",                    weights: { soulmate: 2 } },
          { key: "passion", label: "Fire, passion, intensity.",               weights: { twin_flame: 2 } },
          { key: "shadow",  label: "Shadow work & self-reflection.",          weights: { twin_soul: 2, twin_flame: 1 } },
          { key: "lesson",  label: "Lessons—resilience, boundaries.",         weights: { karmic: 2 } },
          { key: "belong",  label: "Wholeness & belonging.",                  weights: { twin_soul: 2, soulmate: 1 } }
        ]
      },

      // 8 — Repair style (new; separates Soulmate/Kindred vs Twin Soul)
      {
        id: "q8",
        type: "scenario",
        prompt: "After a disagreement, repair usually looks like…",
        optional: false,
        options: [
          { key: "soft",   label: "Gentle check-ins, quick repair, back to baseline.", weights: { soulmate: 2, kindred: 1 } },
          { key: "deep",   label: "Thoughtful talk, shared insight, we grow noticeably.", weights: { twin_soul: 2 } },
          { key: "spiky",  label: "Volatile but passionate reconnection.", weights: { twin_flame: 2 } },
          { key: "stuck",  label: "We circle the same issue again later.",  weights: { karmic: 2 } }
        ]
      },

      // 9 — Values & trajectory (new; Twin Soul vs Soulmate)
      {
        id: "q9",
        type: "head_to_head",
        prompt: "Which feels closer to your shared path?",
        optional: false,
        options: [
          { key: "a", label: "We share a life direction / mission that keeps aligning.", weights: { twin_soul: 2, soulmate: 1 } },
          { key: "b", label: "We share daily rhythms and care; the mission can differ.", weights: { soulmate: 2, kindred: 1 } }
        ]
      },

      // 10 — Nervous system check (new safety flag; not type-scored)
      {
        id: "q10",
        type: "likert",
        prompt: "“Most of the time, this connection regulates my nervous system (I feel safer, clearer).”",
        scale: ["Strongly Disagree","Disagree","Neutral","Agree","Strongly Agree"],
        optional: false,
        options: [
          { key: "sd", label: "Strongly Disagree", flags: { dysregulation: 2 } },
          { key: "d",  label: "Disagree",          flags: { dysregulation: 1 } },
          { key: "n",  label: "Neutral",           flags: {} },
          { key: "a",  label: "Agree",             flags: {} },
          { key: "sa", label: "Strongly Agree",    flags: {} }
        ]
      },

      // 11 — Boundaries (new safety flag)
      {
        id: "q11",
        type: "head_to_head",
        prompt: "How do your boundaries fare in this connection?",
        optional: false,
        options: [
          { key: "ok", label: "Respected—we adjust with care.", flags: {} , weights: { soulmate: 1, twin_soul: 1, kindred: 1 } },
          { key: "thin", label: "Often eroded—hard to hold my non-negotiables.", flags: { boundary_erosion: 2 }, weights: { twin_flame: 1, karmic: 1 } }
        ]
      },

      // 12 — Reciprocity (new safety flag)
      {
        id: "q12",
        type: "head_to_head",
        prompt: "Overall effort feels…",
        optional: false,
        options: [
          { key: "mutual", label: "Mutual—we both show up reliably.", flags: {}, weights: { soulmate: 1, twin_soul: 1, kindred: 1 } },
          { key: "onesided", label: "Uneven—one of us carries most of it.", flags: { one_sided: 2 }, weights: { karmic: 1 } }
        ]
      },

      // 13 — Optional reflections (kept)
      {
        id: "q13",
        type: "quick_pref",
        prompt: "If they left tomorrow, what lesson would remain?",
        optional: true,
        options: [
          { key: "peace",   label: "Love is peaceful and enduring.",          weights: { soulmate: 2 } },
          { key: "wild",    label: "Love is wild and transformative.",        weights: { twin_flame: 2 } },
          { key: "mirror",  label: "I am my own greatest mirror.",            weights: { twin_soul: 2 } },
          { key: "growth",  label: "Growth requires discomfort sometimes.",   weights: { karmic: 2 } },
          { key: "beside",  label: "Some souls simply walk beside you.",      weights: { kindred: 2 } }
        ]
      },

      // 14 — Intuition (kept)
      {
        id: "q14",
        type: "quick_pref",
        prompt: "How does your intuition speak about this connection?",
        optional: true,
        options: [
          { key: "home",    label: "They are home.",           weights: { soulmate: 2 } },
          { key: "fire",    label: "They are fire.",           weights: { twin_flame: 2 } },
          { key: "mirror",  label: "They are your mirror.",    weights: { twin_soul: 2 } },
          { key: "teacher", label: "They are your teacher.",   weights: { karmic: 2 } },
          { key: "comp",    label: "They are your companion.", weights: { kindred: 2 } }
        ]
      }
    ]
  }
};

// Upsert
const { data, error } = await admin
  .from('quizzes')
  .upsert(quiz, { onConflict: 'slug' })
  .select();

if (error) {
  console.error("❌ Error seeding quiz:", error);
  process.exit(1);
} else {
  console.log("✅ Quiz seeded:", data?.map(r => r.slug));
}

