// scripts/seed_love_language_giving.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

/* ========= ENV GUARDS (LOUD) ========= */
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Loading env from .env.local …');
console.log('   VITE_SUPABASE_URL            =', url || '(undefined)');
console.log('   SUPABASE_SERVICE_ROLE_KEY    =', key ? `(len ${key.length})` : '(undefined)');

if (!url || !key) {
  console.error('❌ Missing env. You need BOTH VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

/* ========= ADMIN CLIENT ========= */
const admin = createClient(url, key);

/* ========= QUIZ PAYLOAD ========= */
const quiz = {
  slug: "love-language-giving",
  title: "How Do You Most Naturally Give Love?",
  category: "Connection",
  description:
    "Answer honestly and intuitively. This quiz explores how you most naturally express love. The result is reflective guidance—not a verdict.",
  is_published: true,
  questions: {
    version: 1,
    min_required: 12,
    results: [
      {
        key: "words",
        label: "Words of Affirmation (Giver)",
        headline: "You may naturally give love through Words of Affirmation.",
        summary:
          "You speak love fluently—encouragement, appreciation, and naming the good are your go-to.",
        guidance: [
          "Keep it specific: name the moment, the effort, and the impact.",
          "Pair words with a small follow-through when stakes are high."
        ],
        product_suggestions: [
          { kind: "journal", sku: "affirmation-journal", reason: "Capture specific appreciations." },
          { kind: "candle",  sku: "i-am-love",          reason: "Set a warm tone for heartfelt talks." }
        ]
      },
      {
        key: "service",
        label: "Acts of Service (Giver)",
        headline: "You may naturally give love through Acts of Service.",
        summary:
          "You show care by lightening their load—solving, fixing, planning, or pitching in.",
        guidance: [
          "Ask before acting—align service with what actually helps.",
          "Celebrate your effort with rest to avoid ‘silent resentment’."
        ],
        product_suggestions: [
          { kind: "planner", sku: "care-planner",  reason: "Plan helpful, consensual support." },
          { kind: "candle",  sku: "i-am-healthy",  reason: "Remind yourself to refill, too." }
        ]
      },
      {
        key: "gifts",
        label: "Gift Giving (Giver)",
        headline: "You may naturally give love through Gift Giving.",
        summary:
          "You enjoy finding or creating thoughtful tokens that say ‘I see you’.",
        guidance: [
          "Prioritize meaning over price—tie gifts to memories or values.",
          "Ask for a wish-list sometimes to avoid ‘missed the mark’."
        ],
        product_suggestions: [
          { kind: "gift",   sku: "care-bundle",   reason: "Thoughtful, personal curation." },
          { kind: "candle", sku: "i-am-grateful", reason: "Anchor the spirit of appreciation." }
        ]
      },
      {
        key: "time",
        label: "Quality Time (Giver)",
        headline: "You may naturally give love through Quality Time.",
        summary:
          "Presence is your love currency—undivided attention, long talks, shared rituals.",
        guidance: [
          "Protect time with gentle boundaries (devices down, calendar blocks).",
          "Co-design mini rituals so presence stays fresh and mutual."
        ],
        product_suggestions: [
          { kind: "ritual", sku: "evening-ritual", reason: "Make presence a habit." },
          { kind: "candle", sku: "i-am-grateful",  reason: "Set ambience for slow moments." }
        ]
      },
      {
        key: "touch",
        label: "Physical Touch (Giver)",
        headline: "You may naturally give love through Physical Touch.",
        summary:
          "You reach for connection physically—hand-holding, hugs, leaning in, playful closeness.",
        guidance: [
          "Keep consent explicit and dynamic—check comfort in context.",
          "Blend touch with a few words when emotions are complex."
        ],
        product_suggestions: [
          { kind: "candle", sku: "i-am-soft",      reason: "Invite warmth and ease." },
          { kind: "ritual", sku: "wind-down-body", reason: "Soften into safe closeness." }
        ]
      }
    ],

    questions: [
      /* ----- 8 SCENARIOS (with your edits) ----- */
      {
        id: "s1",
        prompt: "Your partner had a terrible day at work. Which is closest to what you’d do first?",
        optional: false, shuffle: true,
        options: [
          { key: "a", label: "Affirm your belief in them or pray with them.", weights: { words: 2 } },
          { key: "b", label: "Help them prepare in whatever way is relevant (food, reset the space, do a task).", weights: { service: 2 } },
          { key: "c", label: "Give them a hug or hold their hand.", weights: { touch: 2 } },
          { key: "d", label: "Sit and talk with them.", weights: { time: 2, words: 1 } },
          { key: "e", label: "Bring a small pick-me-up you know they love.", weights: { gifts: 2 } }
        ]
      },
      {
        id: "s2",
        prompt: "They’re overwhelmed this week. How do you most naturally step in?",
        optional: false, shuffle: true,
        options: [
          { key: "a", label: "Take something off their plate without them asking.", weights: { service: 2 } },
          { key: "b", label: "Leave a note or voice message naming what you appreciate.", weights: { words: 2 } },
          { key: "c", label: "Clear an evening to be fully present together.", weights: { time: 2 } },
          { key: "d", label: "Offer grounding touch throughout the day.", weights: { touch: 2 } },
          { key: "e", label: "Surprise them with a small, meaningful gift.", weights: { gifts: 2 } }
        ]
      },
      {
        id: "s3",
        prompt: "They just hit a milestone. How do you celebrate in your style?",
        optional: false, shuffle: true,
        options: [
          { key: "a", label: "Speak life—tell them exactly what you’re proud of.", weights: { words: 2 } },
          { key: "b", label: "Plan a special evening or day built around their joy.", weights: { time: 2, service: 1 } },
          { key: "c", label: "Create or buy a keepsake tied to the moment.", weights: { gifts: 2 } },
          { key: "d", label: "Wrap them up—hugs, kisses, cozy closeness.", weights: { touch: 2 } },
          { key: "e", label: "Handle logistics so they can just bask.", weights: { service: 2 } }
        ]
      },
      {
        id: "s4",
        prompt: "They’re discouraged about a goal. What’s your instinctive support?",
        optional: false, shuffle: true,
        options: [
          { key: "a", label: "Speak encouragement and name their strengths.", weights: { words: 2 } },
          { key: "b", label: "Map a small step and do it with/for them.", weights: { service: 2 } },
          { key: "c", label: "Assure them you’ll take care of everything.", weights: { service: 2, words: 1 } },
          { key: "d", label: "Plan focused time to sit with it together.", weights: { time: 2 } },
          { key: "e", label: "Bring a thoughtful token tied to the goal.", weights: { gifts: 2 } }
        ]
      },
      {
        id: "s5",
        prompt: "They’re on their way home after a long day. What do you set up?",
        optional: false, shuffle: true,
        options: [
          { key: "a", label: "Do something to ease their arrival (take the bag, run a bath).", weights: { service: 2 } },
          { key: "b", label: "Cue a calm vibe and curl up together.", weights: { touch: 2, time: 1 } },
          { key: "c", label: "Have a few affirmations ready they need to hear.", weights: { words: 2 } },
          { key: "d", label: "Plan a device-free window to connect.", weights: { time: 2 } },
          { key: "e", label: "Set out a small surprise they’ll smile at.", weights: { gifts: 2 } }
        ]
      },
      {
        id: "s6",
        prompt: "They have a big presentation/interview tomorrow. How do you show up tonight?",
        optional: false, shuffle: true,
        options: [
          { key: "a", label: "Affirm your belief in them or pray with them.", weights: { words: 2 } },
          { key: "b", label: "Help them prepare in whatever way is relevant.", weights: { service: 2 } },
          { key: "c", label: "Give them a hug or hold their hand.", weights: { touch: 2 } },
          { key: "d", label: "Clear the schedule to keep things low-stress together.", weights: { time: 2 } },
          { key: "e", label: "Offer a small good-luck token.", weights: { gifts: 2 } }
        ]
      },
      {
        id: "s7",
        prompt: "They’re sick and low-energy. What’s your love signal?",
        optional: false, shuffle: true,
        options: [
          { key: "a", label: "Soup, meds, laundry—the practicals first.", weights: { service: 2 } },
          { key: "b", label: "Warm, soothing physical presence.", weights: { touch: 2 } },
          { key: "c", label: "Sit with them and watch something together.", weights: { time: 2 } },
          { key: "d", label: "A gentle note reminding them they’re cared for.", weights: { words: 2 } },
          { key: "e", label: "A cozy care package tailored to them.", weights: { gifts: 2 } }
        ]
      },
      {
        id: "s8",
        prompt: "They’ve been under-celebrated lately. What do you do?",
        optional: false, shuffle: true,
        options: [
          { key: "a", label: "Speak—all the ways they’re showing up.", weights: { words: 2 } },
          { key: "b", label: "Plan a mini-ritual just for them.", weights: { time: 2, service: 1 } },
          { key: "c", label: "Organize a small surprise with meaning.", weights: { gifts: 2, service: 1 } },
          { key: "d", label: "Extra physical closeness all day.", weights: { touch: 2 } },
          { key: "e", label: "Quietly handle lingering chores so they can rest.", weights: { service: 2 } }
        ]
      },

      /* ----- 8 HEAD-TO-HEAD (1,2,3,4,6,7,8,9) ----- */
      {
        id: "h1",
        prompt: "Which would you rather do right now?",
        optional: false, shuffle: true,
        options: [
          { key: "a", label: "Speak encouragement they need to hear.", weights: { words: 2 } },
          { key: "b", label: "Hold them close without many words.",   weights: { touch: 2 } }
        ]
      },
      {
        id: "h2",
        prompt: "Which feels like the better surprise for them?",
        optional: false, shuffle: true,
        options: [
          { key: "a", label: "Take something off their plate.",              weights: { service: 2 } },
          { key: "b", label: "Get them something you know they’ll love.",    weights: { gifts: 2 } }
        ]
      },
      {
        id: "h3",
        prompt: "You have a free afternoon together. What do you choose?",
        optional: false, shuffle: true,
        options: [
          { key: "a", label: "Plan a slow, device-free hang—just be together.", weights: { time: 2 } },
          { key: "b", label: "Plan a little gift hunt and surprise reveal.",    weights: { gifts: 2 } }
        ]
      },
      {
        id: "h4",
        prompt: "When they’re stressed, what’s your first impulse?",
        optional: false, shuffle: true,
        options: [
          { key: "a", label: "Say something grounding and specific.", weights: { words: 2 } },
          { key: "b", label: "Start quietly handling errands/tasks.", weights: { service: 2 } }
        ]
      },
      {
        id: "h6",
        prompt: "Big news to celebrate—what’s your signature move?",
        optional: false, shuffle: true,
        options: [
          { key: "a", label: "Quality time adventure, just us.",       weights: { time: 2 } },
          { key: "b", label: "Find or make the perfect memento.",      weights: { gifts: 2 } }
        ]
      },
      {
        id: "h7",
        prompt: "How do you most naturally show ‘I see you’?",
        optional: false, shuffle: true,
        options: [
          { key: "a", label: "Say it—call out their effort and growth.", weights: { words: 2 } },
          { key: "b", label: "Reach for them—hand on shoulder, hug.",    weights: { touch: 2 } }
        ]
      },
      {
        id: "h8",
        prompt: "Evening together—what feels most loving to offer?",
        optional: false, shuffle: true,
        options: [
          { key: "a", label: "Block off time and be fully present.",     weights: { time: 2 } },
          { key: "b", label: "Do a chore/meal so they can fully relax.", weights: { service: 2 } }
        ]
      },
      {
        id: "h9",
        prompt: "Quick check-in: which would you rather do?",
        optional: false, shuffle: true,
        options: [
          { key: "a", label: "Leave a heartfelt note.",              weights: { words: 2 } },
          { key: "b", label: "Pick up a small ‘thought of you’.",    weights: { gifts: 2 } }
        ]
      },

      /* ----- 2 LIKERT ----- */
      {
        id: "l1",
        prompt: "How comfortable are you establishing touch with your partner (holding hands, rubbing arm, hugging, etc.)?",
        optional: false, kind: "likert5",
        options: [
          { key: "sd", label: "Not at all comfortable",     weights: { touch: 0 } },
          { key: "d",  label: "A little uncomfortable",      weights: { touch: 0 } },
          { key: "n",  label: "Neutral / depends",           weights: { touch: 1 } },
          { key: "a",  label: "Comfortable",                 weights: { touch: 2 } },
          { key: "sa", label: "Very comfortable / natural",  weights: { touch: 2 } }
        ]
      },
      {
        id: "l2",
        prompt: "How comfortable are you telling your partner exactly how you feel?",
        optional: false, kind: "likert5",
        options: [
          { key: "sd", label: "Not at all comfortable",     weights: { words: 0 } },
          { key: "d",  label: "A little uncomfortable",      weights: { words: 0 } },
          { key: "n",  label: "Neutral / depends",           weights: { words: 1 } },
          { key: "a",  label: "Comfortable",                 weights: { words: 2 } },
          { key: "sa", label: "Very comfortable / natural",  weights: { words: 2 } }
        ]
      },

      /* ----- 1 QUICK PREFERENCE ----- */
      {
        id: "qpref",
        prompt: "Of the available ways, the easier path to express love for me is through…",
        optional: false, shuffle: true,
        options: [
          { key: "svc",  label: "Doing something meaningful that makes life a little easier for them.",       weights: { service: 2 } },
          { key: "w",    label: "Speaking words of encouragement and letting them know how I feel.",          weights: { words: 2 } },
          { key: "tch",  label: "Establishing physical closeness—holding, hugging, or leaning in.",           weights: { touch: 2 } },
          { key: "time", label: "Being fully present together—it doesn’t even matter what we’re doing.",      weights: { time: 2 } },
          { key: "gft",  label: "Finding or creating something special to give as a token of my love.",       weights: { gifts: 2 } }
        ]
      }
    ]
  }
};

/* ========= MAIN ========= */
async function main() {
  try {
    console.log('🚀 Seeding quiz:', quiz.slug);
    console.log('   Title:', quiz.title);
    console.log('   Category:', quiz.category);
    console.log('   is_published:', quiz.is_published);
    console.log('   Questions count:', quiz.questions?.questions?.length || 0);

    // Upsert by slug (creates or updates)
    const { data, error } = await admin
      .from('quizzes')
      .upsert(quiz, { onConflict: 'slug' })
      .select('id, slug, title, is_published');

    if (error) {
      console.error('❌ Supabase upsert error:', error);
      process.exit(1);
    }

    console.log('✅ Upserted:', data?.map(r => `${r.slug} (#${r.id})`) || '(none returned)');

    // Sanity read-back
    const { data: check, error: readErr } = await admin
      .from('quizzes')
      .select('id, slug, title, is_published, questions')
      .eq('slug', quiz.slug)
      .maybeSingle();

    if (readErr) {
      console.error('⚠️  Read-back error:', readErr);
    } else {
      const qCount = check?.questions?.questions?.length || 0;
      const rCount = check?.questions?.results?.length || 0;
      console.log(`🔎 Read-back ok → questions=${qCount}, results=${rCount}, is_published=${check?.is_published}`);
    }

    console.log('🎉 Done.');
    process.exit(0);
  } catch (e) {
    console.error('💥 Seed script crashed:', e);
    process.exit(1);
  }
}

main();

