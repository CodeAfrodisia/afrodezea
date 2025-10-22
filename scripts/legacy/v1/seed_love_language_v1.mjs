// scripts/seed_love_language.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

// --- Guard & diagnostics ----------------------------------------------------
console.log('⚙️  Seeding: love-language');
console.log('• SUPABASE URL:', url || '(missing)');
console.log('• SERVICE ROLE key length:', key ? key.length : 0);
if (!url || !key) {
  console.error('❌ Missing env vars. Add VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local');
  process.exit(1);
}

const admin = createClient(url, key);

// --- Quiz payload -----------------------------------------------------------
const quiz = {
  slug: "love-language",
  title: "What’s Your Love Language?",
  category: "Connection",
  description:
    "How do you most naturally give and receive care? Answer instinctively. Results are reflective guidance—not verdicts. You’ll see a primary and a runner-up.",
  is_published: true,
  questions: {
    version: 1,
    min_required: 8, // out of 12
    results: [
      {
        key: "words",
        label: "Words of Affirmation",
        headline: "You **may give/receive** love most through Words.",
        summary:
          "Specific praise, appreciation, and verbal reassurance land deeply for you.",
        guidance: [
          "Ask for (or offer) concrete, specific affirmations: name the action + impact.",
          "Create a tiny ritual: one 2-line note or text daily/weekly."
        ],
        product_suggestions: [
          { kind: "journal", sku: "gratitude-journal", reason: "Capture language that nourishes you." },
          { kind: "candle",  sku: "i-am-love",         reason: "Set a warm tone for speaking kindly." }
        ]
      },
      {
        key: "service",
        label: "Acts of Service",
        headline: "You **may give/receive** love most through Service.",
        summary:
          "Thoughtful help and practical support communicate love most clearly.",
        guidance: [
          "Trade vague offers for specific ones: “I’ll handle dinner Thursday.”",
          "Keep scorecards out—service works best when it’s freely given."
        ],
        product_suggestions: [
          { kind: "planner", sku: "ritual-planner", reason: "Schedule shared tasks with care." },
          { kind: "candle",  sku: "i-am-grateful",  reason: "Anchor appreciation around shared effort." }
        ]
      },
      {
        key: "gifts",
        label: "Receiving Gifts",
        headline: "You **may give/receive** love most through Gifts.",
        summary:
          "Tokens that show ‘I thought of you’—large or small—carry meaning.",
        guidance: [
          "Prioritize thoughtfulness over price; include a line about why it made you think of them.",
          "Share wish-lists or ‘delight’ notes to make it easier for loved ones."
        ],
        product_suggestions: [
          { kind: "gift",    sku: "care-bundle",   reason: "Curated little luxuries with intention." },
          { kind: "candle",  sku: "i-am-beautiful",reason: "Aesthetic rituals that feel like a treat." }
        ]
      },
      {
        key: "time",
        label: "Quality Time",
        headline: "You **may give/receive** love most through Time.",
        summary:
          "Undivided attention and shared presence speak loudest to you.",
        guidance: [
          "Design device-free pockets (even 15 minutes) and name them.",
          "Quality over quantity—ritual beats marathon hangouts."
        ],
        product_suggestions: [
          { kind: "ritual",  sku: "tea-ritual",    reason: "Simple, repeatable presence practice." },
          { kind: "candle",  sku: "i-am-grateful", reason: "Mark your time together with intention." }
        ]
      },
      {
        key: "touch",
        label: "Physical Touch",
        headline: "You **may give/receive** love most through Touch.",
        summary:
          "Affectionate contact—hugs, hand squeezes, closeness—reassures you.",
        guidance: [
          "Share your green-light touches and contexts (public vs private).",
          "Pair touch with words for extra resonance if your partner needs it."
        ],
        product_suggestions: [
          { kind: "candle",  sku: "i-am-healthy",  reason: "Ground your body before/after long days." },
          { kind: "bundle",  sku: "unwind-set",    reason: "Turn touch into a relaxing ritual." }
        ]
      }
    ],

    // 12 scenario questions (nuanced weights; some answers map to multiple)
    questions: [
      {
        id: "q1",
        prompt: "You’ve both had a busy week. What makes you feel most cared for tonight?",
        optional: false,
        options: [
          { key: "a", label: "They say, “I’m proud of how you handled this week.”",
            weights: { words: 2 } },
          { key: "b", label: "They pick up dinner and handle dishes without asking.",
            weights: { service: 2 } },
          { key: "c", label: "They bring home your favorite snack just because.",
            weights: { gifts: 2, words: 1 } },
          { key: "d", label: "They set aside an hour to be fully present with you.",
            weights: { time: 2 } },
          { key: "e", label: "They curl up with you on the couch and hold you close.",
            weights: { touch: 2 } }
        ]
      },

      {
        id: "q2",
        prompt: "It’s your birthday. Which part of the celebration matters most?",
        optional: false,
        options: [
          { key: "a", label: "Hearing a heartfelt toast or letter.",
            weights: { words: 2 } },
          { key: "b", label: "They orchestrate the logistics so you can relax.",
            weights: { service: 2 } },
          { key: "c", label: "A gift that shows they really ‘get’ you.",
            weights: { gifts: 2 } },
          { key: "d", label: "An unrushed day together doing your favorite things.",
            weights: { time: 2 } },
          { key: "e", label: "Extra cuddles, slow dancing in the kitchen.",
            weights: { touch: 2 } }
        ]
      },

      {
        id: "q3",
        prompt: "You feel a little insecure today. What helps most?",
        optional: false,
        options: [
          { key: "a", label: "They remind you of something true and kind about you.",
            weights: { words: 2 } },
          { key: "b", label: "They take a chore off your plate so you can breathe.",
            weights: { service: 2 } },
          { key: "c", label: "They leave a small surprise on your desk.",
            weights: { gifts: 2, words: 1 } },
          { key: "d", label: "They invite a short walk and listen without rushing.",
            weights: { time: 2 } },
          { key: "e", label: "A long hug or a gentle shoulder squeeze.",
            weights: { touch: 2 } }
        ]
      },

      {
        id: "q4",
        prompt: "On an ordinary Tuesday evening, what says ‘I love you’ the clearest?",
        optional: false,
        options: [
          { key: "a", label: "Random ‘thinking of you’ message.",
            weights: { words: 2 } },
          { key: "b", label: "They pre-empt a task you usually do.",
            weights: { service: 2 } },
          { key: "c", label: "They bring home a tiny treat that made them think of you.",
            weights: { gifts: 2 } },
          { key: "d", label: "They close their laptop and make eye contact for 20 minutes.",
            weights: { time: 2 } },
          { key: "e", label: "They sit close, leaning into you as you chat.",
            weights: { touch: 2 } }
        ]
      },

      {
        id: "q5",
        prompt: "You’re stressed about a deadline. What kind of support hits best?",
        optional: false,
        options: [
          { key: "a", label: "A pep talk that names your strengths.",
            weights: { words: 2 } },
          { key: "b", label: "They triage errands so you can focus.",
            weights: { service: 2, time: 1 } },
          { key: "c", label: "A care package for your late-night work block.",
            weights: { gifts: 2 } },
          { key: "d", label: "They block an hour just to sit with you while you work.",
            weights: { time: 2 } },
          { key: "e", label: "A grounding back rub between sprints.",
            weights: { touch: 2 } }
        ]
      },

      {
        id: "q6",
        prompt: "Travel day together. What moment feels most loving?",
        optional: false,
        options: [
          { key: "a", label: "They tell you how much they enjoy exploring with you.",
            weights: { words: 2 } },
          { key: "b", label: "They handle tickets and check-ins smoothly.",
            weights: { service: 2 } },
          { key: "c", label: "They pick a tiny souvenir they know you’ll cherish.",
            weights: { gifts: 2 } },
          { key: "d", label: "Slow café time—phones away, people watching.",
            weights: { time: 2 } },
          { key: "e", label: "Walking hand-in-hand between stops.",
            weights: { touch: 2 } }
        ]
      },

      {
        id: "q7",
        prompt: "After a disagreement, which repair attempt lands fastest?",
        optional: false,
        options: [
          { key: "a", label: "They say, “I hear you. I’m sorry for my part.”",
            weights: { words: 2, time: 1 } },
          { key: "b", label: "They make dinner so you can both reset.",
            weights: { service: 2 } },
          { key: "c", label: "They leave a small note/flower with a brief apology.",
            weights: { gifts: 2, words: 1 } },
          { key: "d", label: "They suggest a short walk to reconnect.",
            weights: { time: 2 } },
          { key: "e", label: "A gentle hug that says, “we’re okay.”",
            weights: { touch: 2 } }
        ]
      },

      {
        id: "q8",
        prompt: "Weekend plans: what makes you feel most loved?",
        optional: false,
        options: [
          { key: "a", label: "They plan a mini celebration of a recent win.",
            weights: { words: 2, gifts: 1 } },
          { key: "b", label: "They tackle a household task you’ve been dreading—together.",
            weights: { service: 2, time: 1 } },
          { key: "c", label: "A small present from a local maker.",
            weights: { gifts: 2 } },
          { key: "d", label: "A shared activity with no agenda.",
            weights: { time: 2 } },
          { key: "e", label: "Slow morning cuddles before anything else.",
            weights: { touch: 2 } }
        ]
      },

      {
        id: "q9",
        prompt: "You’re apart for a week. What keeps you feeling connected?",
        optional: false,
        options: [
          { key: "a", label: "A voice note or text that feels personal.",
            weights: { words: 2 } },
          { key: "b", label: "They arrange something helpful at home while you’re gone.",
            weights: { service: 2 } },
          { key: "c", label: "A small mailed surprise mid-week.",
            weights: { gifts: 2 } },
          { key: "d", label: "A scheduled call where you both show up fully.",
            weights: { time: 2 } },
          { key: "e", label: "A cuddle marathon the moment you reunite (what you look forward to).",
            weights: { touch: 2, time: 1 } }
        ]
      },

      {
        id: "q10",
        prompt: "You want to express love today. What do you naturally do?",
        optional: false,
        options: [
          { key: "a", label: "Send a sincere compliment or note.",
            weights: { words: 2 } },
          { key: "b", label: "Handle an errand for them.",
            weights: { service: 2 } },
          { key: "c", label: "Pick up a small something they’d like.",
            weights: { gifts: 2 } },
          { key: "d", label: "Block time together on the calendar.",
            weights: { time: 2 } },
          { key: "e", label: "Offer a hug or playful touch.",
            weights: { touch: 2 } }
        ]
      },

      {
        id: "q11",
        prompt: "Which statement feels most true?",
        optional: false,
        options: [
          { key: "a", label: "If you say it clearly, I feel it.",
            weights: { words: 2 } },
          { key: "b", label: "If you help me, I feel it.",
            weights: { service: 2 } },
          { key: "c", label: "If you thoughtfully pick it, I feel it.",
            weights: { gifts: 2 } },
          { key: "d", label: "If you’re present with me, I feel it.",
            weights: { time: 2 } },
          { key: "e", label: "If you hold me, I feel it.",
            weights: { touch: 2 } }
        ]
      },

      {
        id: "q12",
        prompt: "Your partner had a rough day. Which response feels most like love from you?",
        optional: false,
        options: [
          { key: "a", label: "Tell them three things you appreciate about them.",
            weights: { words: 2 } },
          { key: "b", label: "Run a bath / cook / handle dinner so they can decompress.",
            weights: { service: 2 } },
          { key: "c", label: "Bring a tiny comfort that’s ‘so them’.",
            weights: { gifts: 2 } },
          { key: "d", label: "Sit with them, phones down, and listen.",
            weights: { time: 2 } },
          { key: "e", label: "Offer a long hug and stay close.",
            weights: { touch: 2 } }
        ]
      }
    ]
  }
};

// --- Seed flow with logging -------------------------------------------------
async function main() {
  try {
    const { error: pingErr } = await admin.from('quizzes').select('id').limit(1);
    if (pingErr) {
      console.error('❌ Cannot query database with provided credentials:', pingErr);
      process.exit(1);
    }

    console.log('🔎 BEFORE check…');
    const { data: before } = await admin
      .from('quizzes')
      .select('id, slug, is_published, updated_at, questions')
      .eq('slug', quiz.slug)
      .maybeSingle();
    if (before) {
      console.log('• Existing row id:', before.id);
      console.log('• Existing version:', before?.questions?.version);
      console.log('• Existing Q1:', before?.questions?.questions?.[0]?.prompt);
    } else {
      console.log('• No existing row.');
    }

    console.log('⬆️  Upserting on slug…');
    const { data, error } = await admin
      .from('quizzes')
      .upsert(quiz, { onConflict: 'slug' })
      .select('id, slug, updated_at, questions');

    if (error) {
      console.error('❌ Upsert failed:', error);
      process.exit(1);
    }

    const row = Array.isArray(data) ? data[0] : data;
    console.log('✅ Upsert OK. id:', row?.id);
    console.log('• Version:', row?.questions?.version);
    console.log('• Q1 prompt:', row?.questions?.questions?.[0]?.prompt);

    console.log('🔁 Verify read-after-write…');
    const { data: after } = await admin
      .from('quizzes')
      .select('id, slug, updated_at, questions')
      .eq('slug', quiz.slug)
      .maybeSingle();
    console.log('• VERIFY version:', after?.questions?.version);
    console.log('• VERIFY Q count:', after?.questions?.questions?.length);

    console.log('🎉 Done.');
    process.exit(0);
  } catch (e) {
    console.error('💥 Unhandled error:', e);
    process.exit(1);
  }
}

main();

