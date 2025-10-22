// scripts/seed_soul_connection.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Hard guard with helpful logging (mask key)
if (!url || !key) {
  console.error('❌ Missing env: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('   VITE_SUPABASE_URL =', url || '(undefined)');
  console.error('   SUPABASE_SERVICE_ROLE_KEY length =', key ? key.length : 0);
  console.error('👉 Create a .env file in project root with:');
  console.error('   SUPABASE_URL=https://YOUR-PROJECT.supabase.co');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, key);

const quiz = {
  slug: "soul-connection",
  title: "What Kind of Soul Connection Do You Share?",
  category: "Archetypal",
  description:
    "Answer based on how you feel in their presence. This is reflective guidance—not a fixed label. Results will say “may be your…” on purpose.",
  is_published: true,
  questions: {
    version: 1,
    min_required: 7,
    results: [
      { key: "soulmate", label: "Soulmate (The Harmonizer)",
        headline: "This person **may be** your Soulmate.",
        summary: "Peaceful, supportive, enduring. The connection feels like home—grounding, gentle growth, low drama.",
        guidance: [
          "Nurture consistency: weekly rituals, gratitude notes.",
          "Balance comfort with shared novelty to keep spark alive."
        ],
        product_suggestions: [
          { kind: "candle", sku: "iam-love", reason: "Anchor safety & warmth." },
          { kind: "journal", sku: "gratitude-journal", reason: "Deepen appreciation." }
        ]
      },
      { key: "twin_flame", label: "Twin Flame (The Fire)",
        headline: "This person **may be** your Twin Flame.",
        summary: "Magnetic, transformative, sometimes volatile. Passion intertwines with shadow work and rapid growth.",
        guidance: [
          "Create safety: boundaries + breathwork before big talks.",
          "Pause/react cycle: respond after grounding, not during flare-ups."
        ],
        product_suggestions: [
          { kind: "candle", sku: "iam-power", reason: "Channel intensity intentionally." },
          { kind: "ritual", sku: "breath-4-7-8", reason: "Downshift nervous system." }
        ]
      },
      { key: "twin_soul", label: "Twin Soul (The Mirror)",
        headline: "This person **may be** your Twin Soul.",
        summary: "Deep recognition and quiet resonance—same essence, shared direction, minimal chaos with profound depth.",
        guidance: [
          "Practice mirrored journaling: ‘I feel/You reflect/We choose’.",
          "Build a shared vision doc; align choices to it monthly."
        ],
        product_suggestions: [
          { kind: "bundle", sku: "duality-pair", reason: "Honor the two-as-one symbolism." },
          { kind: "journal", sku: "reflection-journal", reason: "Amplify mutual clarity." }
        ]
      },
      { key: "karmic", label: "Karmic Connection (The Teacher)",
        headline: "This person **may be** a Karmic Teacher.",
        summary: "Growth through friction, repeating loops until a lesson lands. Valuable, sometimes temporary.",
        guidance: [
          "Name the loop out loud together; set one boundary to break it.",
          "Choose a lesson to keep—release the rest without blame."
        ],
        product_suggestions: [
          { kind: "candle", sku: "iam-resilient", reason: "Reframe challenge into growth." },
          { kind: "ritual", sku: "smoke-cleanse", reason: "Symbolic reset after conflict." }
        ]
      },
      { key: "kindred", label: "Kindred Spirit (The Companion)",
        headline: "This person **may be** a Kindred Spirit.",
        summary: "Aligned, light, often seasonal. Easy presence, meaningful moments, minimal heavy lessons.",
        guidance: [
          "Savor simple rituals—walks, tea, small adventures.",
          "Let it breathe—no need to force permanence."
        ],
        product_suggestions: [
          { kind: "candle", sku: "travel-set", reason: "Take the vibe wherever you go." },
          { kind: "affirmation", sku: "light-heart", reason: "Celebrate ease and play." }
        ]
      }
    ],
    questions: [
      { id: "q1", prompt: "When you’re with this person, how does your energy shift?", optional: false,
        options: [
          { key: "calm",    label: "Lighter, calmer, at peace.",            weights: { soulmate: 2, kindred: 1 } },
          { key: "intense", label: "Intensified—high highs, low lows.",     weights: { twin_flame: 2, karmic: 1 } },
          { key: "mirror",  label: "Mirrored—hidden parts exposed.",        weights: { twin_soul: 2, twin_flame: 1 } },
          { key: "guided",  label: "Challenged to grow, strongly.",         weights: { karmic: 2, twin_flame: 1 } },
          { key: "aligned", label: "Aligned—already on the same path.",     weights: { twin_soul: 2, soulmate: 1 } }
        ]
      },
      { id: "q2", prompt: "What role does this person play in your life right now?", optional: false,
        options: [
          { key: "companion", label: "Steady companion.",                    weights: { soulmate: 2, kindred: 1 } },
          { key: "catalyst",  label: "Intense catalyst.",                    weights: { twin_flame: 2, karmic: 1 } },
          { key: "mirror",    label: "Familiar mirror.",                     weights: { twin_soul: 2, soulmate: 1 } },
          { key: "teacher",   label: "Teacher of lessons.",                  weights: { karmic: 2 } },
          { key: "traveler",  label: "Fellow traveler.",                     weights: { kindred: 2 } }
        ]
      },
      { id: "q3", prompt: "How does conflict between you usually feel?", optional: false,
        options: [
          { key: "gentle",   label: "Gentle; resolves naturally.",           weights: { soulmate: 2, kindred: 1 } },
          { key: "explosive",label: "Explosive—passion & pain interwoven.",  weights: { twin_flame: 2 } },
          { key: "lit",      label: "Confrontational but illuminating.",     weights: { twin_soul: 2, twin_flame: 1 } },
          { key: "cyclical", label: "Cyclical—same lesson repeats.",         weights: { karmic: 2 } },
          { key: "minimal",  label: "Minimal; we mostly flow.",              weights: { kindred: 2, soulmate: 1 } }
        ]
      },
      { id: "q4", prompt: "How would you describe the timing of your connection?", optional: false,
        options: [
          { key: "effortless", label: "Effortless arrival; smooth weaving.", weights: { soulmate: 2, kindred: 1 } },
          { key: "chaotic",    label: "Chaotic collision, not eased.",       weights: { twin_flame: 2 } },
          { key: "uncanny",    label: "Uncanny, predestined, eerie.",        weights: { twin_soul: 2, twin_flame: 1 } },
          { key: "timely",     label: "Timely wake-up call.",                weights: { karmic: 2 } },
          { key: "flexible",   label: "Flexible—ebb & flow feels right.",    weights: { kindred: 2 } }
        ]
      },
      { id: "q5", prompt: "Which best captures how you feel in their presence?", optional: false,
        options: [
          { key: "safe",     label: "Safe, supported, seen.",                weights: { soulmate: 2 } },
          { key: "onfire",   label: "Obsessed, overwhelmed, on fire.",       weights: { twin_flame: 2 } },
          { key: "bare",     label: "Stripped bare, facing myself.",         weights: { twin_soul: 2 } },
          { key: "tested",   label: "Tested—discipline, humility, patience.",weights: { karmic: 2 } },
          { key: "familiar", label: "Familiar, like forever known.",         weights: { twin_soul: 1, kindred: 2 } }
        ]
      },
      { id: "q6", prompt: "How do synchronicities show up around this person?", optional: false,
        options: [
          { key: "small",  label: "Small serendipities; finishing sentences.", weights: { soulmate: 2, kindred: 1 } },
          { key: "grand",  label: "Big signs—repeating numbers, vivid dreams.",weights: { twin_flame: 2, twin_soul: 1 } },
          { key: "reflect",label: "Perfectly timed reflections.",             weights: { twin_soul: 2 } },
          { key: "lesson", label: "Challenges align when we’re together.",    weights: { karmic: 2 } },
          { key: "gentle", label: "Gentle alignments, not flashy.",           weights: { kindred: 2, soulmate: 1 } }
        ]
      },
      { id: "q7", prompt: "What do you feel this person awakens most in you?", optional: false,
        options: [
          { key: "ease",    label: "Love, ease, balance.",                    weights: { soulmate: 2 } },
          { key: "passion", label: "Fire, passion, intensity.",               weights: { twin_flame: 2 } },
          { key: "shadow",  label: "Shadow work & self-reflection.",          weights: { twin_soul: 2, twin_flame: 1 } },
          { key: "lesson",  label: "Lessons—resilience, boundaries.",         weights: { karmic: 2 } },
          { key: "belong",  label: "Wholeness & belonging.",                  weights: { twin_soul: 2, soulmate: 1 } }
        ]
      },
      { id: "q8", prompt: "If they left tomorrow, what lesson would remain?", optional: true,
        options: [
          { key: "peace",   label: "Love is peaceful and enduring.",          weights: { soulmate: 2 } },
          { key: "wild",    label: "Love is wild and transformative.",        weights: { twin_flame: 2 } },
          { key: "mirror",  label: "I am my own greatest mirror.",            weights: { twin_soul: 2 } },
          { key: "growth",  label: "Growth requires discomfort sometimes.",   weights: { karmic: 2 } },
          { key: "beside",  label: "Some souls simply walk beside you.",      weights: { kindred: 2 } }
        ]
      },
      { id: "q9", prompt: "How does your intuition speak about this connection?", optional: true,
        options: [
          { key: "home",    label: "They are home.",                          weights: { soulmate: 2 } },
          { key: "fire",    label: "They are fire.",                          weights: { twin_flame: 2 } },
          { key: "mirror",  label: "They are your mirror.",                   weights: { twin_soul: 2 } },
          { key: "teacher", label: "They are your teacher.",                  weights: { karmic: 2 } },
          { key: "comp",    label: "They are your companion.",                weights: { kindred: 2 } }
        ]
      }
    ]
  }
};

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

