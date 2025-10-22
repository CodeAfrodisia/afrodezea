// scripts/seed_love_language_receiving.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

/* -----------------------------------------------------------
   Env + client
----------------------------------------------------------- */
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

function mask(k) {
  if (!k) return '(undefined)';
  const tail = String(k).slice(-6);
  return `***${tail}`;
}

console.log('🔧 Seeding: Love Language (Receiving)');
console.log('• VITE_SUPABASE_URL           =', url || '(undefined)');
console.log('• SUPABASE_SERVICE_ROLE_KEY   =', mask(key));

if (!url || !key) {
  console.error('❌ Missing required env. Create .env.local with:');
  console.error('   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, key);

/* -----------------------------------------------------------
   Quiz payload
   Keys (dimensions): words, service, gifts, time, touch
----------------------------------------------------------- */
const quiz = {
  slug: "love-language-receiving",
  title: "How Do You Receive Love Best?",
  category: "Romance",
  description:
    "Which gestures actually land for you? Answer from your gut. This is reflective guidance—not a verdict. You’ll get a primary and runner-up language.",
  is_published: true,
  questions: {
    version: 1,
    // We have 19 items; require enough that a partial still produces a signal
    min_required: 12,

    /* -------- Result types (for copy/UI) -------- */
    results: [
      {
        key: "words",
        label: "Words of Affirmation",
        headline: "You may receive love best through Words.",
        summary:
          "Specific, sincere words light you up—praise, reassurance, and being truly seen in language.",
        guidance: [
          "Ask for examples (what they saw you do, how it impacted them).",
          "Collect affirmations you can revisit on heavy days."
        ],
        product_suggestions: [
          { kind: "journal", sku: "affirmations-journal", reason: "Capture words that anchor you." },
          { kind: "candle",  sku: "i-am-love",            reason: "Set the tone for honest sharing." }
        ]
      },
      {
        key: "service",
        label: "Acts of Service",
        headline: "You may receive love best through Acts of Service.",
        summary:
          "Love looks like help—lightening your load, handling the details, dependable follow-through.",
        guidance: [
          "Share a short list of high-impact tasks that matter most to you.",
          "Celebrate the effort, not just the outcome."
        ],
        product_suggestions: [
          { kind: "planner", sku: "service-planner", reason: "Name the helpful moves that matter." },
          { kind: "candle",  sku: "i-am-grateful",   reason: "Mark the moments of care." }
        ]
      },
      {
        key: "gifts",
        label: "Receiving Gifts",
        headline: "You may receive love best through Gifts.",
        summary:
          "Thoughtful tokens speak loudly when they reflect your tastes, story, or inside jokes.",
        guidance: [
          "Keep a wishlist to help partners succeed at thoughtfulness.",
          "Small and personal often lands better than big and generic."
        ],
        product_suggestions: [
          { kind: "gift",   sku: "care-bundle",  reason: "Curated tokens that feel personal." },
          { kind: "candle", sku: "i-am-abundant", reason: "Invite a spirit of giving/receiving." }
        ]
      },
      {
        key: "time",
        label: "Quality Time",
        headline: "You may receive love best through Quality Time.",
        summary:
          "Undivided attention nourishes you—put the phone down and be here with me.",
        guidance: [
          "Name what ‘quality’ means for you (walks, cooking, quiet presence).",
          "Schedule it; spontaneity is lovely but reliability is love."
        ],
        product_suggestions: [
          { kind: "ritual", sku: "evening-ritual", reason: "Create recurring together-time." },
          { kind: "candle", sku: "i-am-present",   reason: "Set a focused, sacred vibe." }
        ]
      },
      {
        key: "touch",
        label: "Physical Touch",
        headline: "You may receive love best through Touch.",
        summary:
          "Warm, consensual closeness regulates your nervous system and says “I’m here.”",
        guidance: [
          "Share your touch preferences and boundaries clearly.",
          "Create micro-rituals (hug first, talk second) to anchor connection."
        ],
        product_suggestions: [
          { kind: "ritual", sku: "grounding-breath", reason: "Pair touch with soothing breath." },
          { kind: "candle", sku: "i-am-soft",         reason: "Invite tenderness into the room." }
        ]
      }
    ],

    /* -------- Questions (19) -------- */
    questions: [
      /* 8 — Scenarios (Receiving) */
      {
        id: "rec_s1",
        prompt: "You’ve had a long week. Which gesture makes you feel most loved?",
        options: [
          { key: "a", label: "Hearing kind words that recognize your effort.",               weights: { words: 2 } },
          { key: "b", label: "Someone tackling an errand or chore for you.",                 weights: { service: 2 } },
          { key: "c", label: "Getting a meaningful little gift or treat.",                   weights: { gifts: 2 } },
          { key: "d", label: "Having uninterrupted, quality time together.",                 weights: { time: 2 } },
          { key: "e", label: "Being held, hugged, or cuddled.",                              weights: { touch: 2 } }
        ]
      },
      {
        id: "rec_s2",
        prompt: "You’re celebrating your birthday. What gift of love matters most?",
        options: [
          { key: "a", label: "A heartfelt letter or speech.",                                weights: { words: 2 } },
          { key: "b", label: "A day where everything is handled for you.",                   weights: { service: 2 } },
          { key: "c", label: "A thoughtful gift chosen just for you.",                       weights: { gifts: 2 } },
          { key: "d", label: "A special outing or activity together.",                       weights: { time: 2 } },
          { key: "e", label: "Extra closeness and affection all day.",                       weights: { touch: 2 } }
        ]
      },
      {
        id: "rec_s3",
        prompt: "You’re discouraged about a goal. What response fills your heart?",
        options: [
          { key: "a", label: "Encouraging words reminding you of your strengths.",           weights: { words: 2 } },
          { key: "b", label: "Help mapping or handling the next step.",                      weights: { service: 2 } },
          { key: "c", label: "A small token of belief in you.",                              weights: { gifts: 2 } },
          { key: "d", label: "Focused time where they sit with you to talk it out.",         weights: { time: 2 } },
          { key: "e", label: "Reassuring touch that grounds and comforts you.",              weights: { touch: 2 } }
        ]
      },
      {
        id: "rec_s4",
        prompt: "You’re sick in bed. What feels like true care?",
        options: [
          { key: "a", label: "A steady stream of affirmations or prayer.",                   weights: { words: 2 } },
          { key: "b", label: "Soup delivered and chores handled.",                           weights: { service: 2 } },
          { key: "c", label: "A care package by your side.",                                 weights: { gifts: 2 } },
          { key: "d", label: "Someone staying beside you, even in silence.",                 weights: { time: 2 } },
          { key: "e", label: "Gentle, comforting touch.",                                    weights: { touch: 2 } }
        ]
      },
      {
        id: "rec_s5",
        prompt: "You’ve had a huge win. What celebration feels like love?",
        options: [
          { key: "a", label: "Hearing exactly why they’re proud of you.",                    weights: { words: 2 } },
          { key: "b", label: "A surprise gesture that lightens your load.",                  weights: { service: 2 } },
          { key: "c", label: "A meaningful keepsake to mark the moment.",                    weights: { gifts: 2 } },
          { key: "d", label: "Time carved out just to celebrate together.",                  weights: { time: 2 } },
          { key: "e", label: "A warm embrace that says it all.",                             weights: { touch: 2 } }
        ]
      },
      {
        id: "rec_s6",
        prompt: "You’ve been feeling unseen lately. What would fill the gap?",
        options: [
          { key: "a", label: "Clear words of appreciation.",                                 weights: { words: 2 } },
          { key: "b", label: "Someone stepping in with practical support.",                  weights: { service: 2 } },
          { key: "c", label: "A surprise gift that shows they know you.",                    weights: { gifts: 2 } },
          { key: "d", label: "Quality time with no distractions.",                           weights: { time: 2 } },
          { key: "e", label: "Being held close and reassured physically.",                   weights: { touch: 2 } }
        ]
      },
      {
        id: "rec_s7",
        prompt: "It’s a normal evening. Which of these makes you feel most loved?",
        options: [
          { key: "a", label: "A spontaneous compliment.",                                    weights: { words: 2 } },
          { key: "b", label: "Dinner cooked or dishes done for you.",                        weights: { service: 2 } },
          { key: "c", label: "A small, thoughtful surprise.",                                weights: { gifts: 2 } },
          { key: "d", label: "A cozy walk or sit-down together.",                            weights: { time: 2 } },
          { key: "e", label: "A playful touch, kiss, or cuddle.",                            weights: { touch: 2 } }
        ]
      },
      {
        id: "rec_s8",
        prompt: "You’ve had an argument. Which repair lands deepest?",
        options: [
          { key: "a", label: "Hearing sincere, specific apology words.",                     weights: { words: 2 } },
          { key: "b", label: "Seeing actions to make it right.",                             weights: { service: 2 } },
          { key: "c", label: "Receiving a thoughtful peace-offering gift.",                  weights: { gifts: 2 } },
          { key: "d", label: "Spending quality time reconnecting.",                          weights: { time: 2 } },
          { key: "e", label: "Comfort through reassuring touch.",                            weights: { touch: 2 } }
        ]
      },

      /* 8 — Head-to-Head (Receiving) */
      {
        id: "rec_h1",
        prompt: "Which would feel more loving right now?",
        options: [
          { key: "a", label: "Hearing them praise your strengths.",                          weights: { words: 2 } },
          { key: "b", label: "Feeling their arms around you.",                               weights: { touch: 2 } }
        ]
      },
      {
        id: "rec_h2",
        prompt: "Which brightens your day more?",
        options: [
          { key: "a", label: "A helpful task done for you.",                                 weights: { service: 2 } },
          { key: "b", label: "A small surprise gift.",                                       weights: { gifts: 2 } }
        ]
      },
      {
        id: "rec_h3",
        prompt: "Which fills your love tank more?",
        options: [
          { key: "a", label: "Undivided time together.",                                     weights: { time: 2 } },
          { key: "b", label: "Warm physical affection.",                                     weights: { touch: 2 } }
        ]
      },
      {
        id: "rec_h4",
        prompt: "In stress, what reassures you faster?",
        options: [
          { key: "a", label: "Encouraging words.",                                           weights: { words: 2 } },
          { key: "b", label: "Someone stepping in to help.",                                 weights: { service: 2 } }
        ]
      },
      {
        id: "rec_h5",
        prompt: "Which celebration lands deeper?",
        options: [
          { key: "a", label: "A keepsake gift.",                                             weights: { gifts: 2 } },
          { key: "b", label: "An adventure spent together.",                                 weights: { time: 2 } }
        ]
      },
      {
        id: "rec_h6",
        prompt: "Which most clearly says “you matter”?",
        options: [
          { key: "a", label: "Spoken affirmation.",                                          weights: { words: 2 } },
          { key: "b", label: "A tangible act of service.",                                   weights: { service: 2 } }
        ]
      },
      {
        id: "rec_h7",
        prompt: "At the end of the day, what feels more nourishing?",
        options: [
          { key: "a", label: "Cuddle time.",                                                 weights: { touch: 2 } },
          { key: "b", label: "Uninterrupted conversation.",                                  weights: { time: 2 } }
        ]
      },
      {
        id: "rec_h8",
        prompt: "Quick check-in lands better as…",
        options: [
          { key: "a", label: "A short note/text.",                                           weights: { words: 2 } },
          { key: "b", label: "A surprise treat.",                                            weights: { gifts: 2 } }
        ]
      },

      /* 2 — Likert (Receiving comfort) */
      {
        id: "rec_l1",
        prompt: "How comfortable are you receiving consistent physical affection (hugs, touches, hand-holding)?",
        options: [
          { key: "1", label: "Not at all",           weights: { touch: 0 } },
          { key: "2", label: "Slightly",             weights: { touch: 1 } },
          { key: "3", label: "Somewhat",             weights: { touch: 1 } },
          { key: "4", label: "Very",                 weights: { touch: 2 } },
          { key: "5", label: "Extremely",            weights: { touch: 2 } }
        ]
      },
      {
        id: "rec_l2",
        prompt: "How comfortable are you receiving direct words of affirmation (compliments, encouragement)?",
        options: [
          { key: "1", label: "Not at all",           weights: { words: 0 } },
          { key: "2", label: "Slightly",             weights: { words: 1 } },
          { key: "3", label: "Somewhat",             weights: { words: 1 } },
          { key: "4", label: "Very",                 weights: { words: 2 } },
          { key: "5", label: "Extremely",            weights: { words: 2 } }
        ]
      },

      /* 1 — Quick Preference (Receiving) */
      {
        id: "rec_qp1",
        prompt: "If someone wants to show you love, the path that lands easiest for you is…",
        options: [
          { key: "a", label: "They do something meaningful that makes your day lighter.",     weights: { service: 1 } },
          { key: "b", label: "They say exactly what you needed to hear.",                     weights: { words: 1 } },
          { key: "c", label: "They show physical affection and closeness.",                   weights: { touch: 1 } },
          { key: "d", label: "They give you their full, undivided time.",                     weights: { time: 1 } },
          { key: "e", label: "They surprise you with a thoughtful token or gift.",            weights: { gifts: 1 } }
        ]
      }
    ]
  }
};

/* -----------------------------------------------------------
   Upsert
----------------------------------------------------------- */
async function main() {
  try {
    console.log('⏫ Upserting quiz…');
    const { data, error } = await admin
      .from('quizzes')
      .upsert(quiz, { onConflict: 'slug' })
      .select();

    if (error) {
      console.error('❌ Upsert error:', error);
      process.exit(1);
    }

    const row = data?.[0];
    console.log('✅ Seeded:', row?.slug || '(no slug returned)');
    console.log('   id:', row?.id);
    console.log('   is_published:', row?.is_published);
    console.log('   title:', row?.title);

    // sanity check: read back exactly this slug
    const { data: check, error: checkErr } = await admin
      .from('quizzes')
      .select('id, slug, title, category, is_published')
      .eq('slug', quiz.slug)
      .maybeSingle();

    if (checkErr) {
      console.error('⚠️ Post-read error:', checkErr);
    } else {
      console.log('🔎 Read-back:', check);
    }

    console.log('\n👉 Visit /quizzes and /quizzes/love-language-receiving in your app to test.');
  } catch (e) {
    console.error('💥 Unexpected failure:', e);
    process.exit(1);
  }
}

main();

