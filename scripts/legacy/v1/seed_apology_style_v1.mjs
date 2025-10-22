// scripts/seedApologyStyle.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

// --- Guard & diagnostics ----------------------------------------------------
console.log('⚙️  Seeding: apology-style');
console.log('• SUPABASE URL:', url || '(missing)');
console.log('• SERVICE ROLE key length:', key ? key.length : 0);

if (!url || !key) {
  console.error('❌ Missing environment variables.');
  console.error('   Ensure .env.local has:');
  console.error('   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, key);

// --- The quiz payload -------------------------------------------------------
const quiz = {
  slug: "apology-style",
  title: "What’s Your Apology Style?",
  category: "Communication",
  description:
    "How do you naturally repair after harm? Answer as honestly as you can. Results are reflective guidance — not verdicts. You’ll see a primary style with a runner-up.",
  is_published: true,
  questions: {
    version: 1,
    min_required: 7,
    results: [
      {
        key: "words",
        label: "Words Apologist",
        headline: "You **may be** a Words Apologist.",
        summary: "Clear verbal ownership and the phrase “I’m sorry” matter deeply to you.",
        guidance: [
          "Lead with a specific, unambiguous apology (“I did X; it impacted you Y; I’m sorry.”).",
          "Avoid explanations that sound like excuses; keep it short and accountable."
        ],
        product_suggestions: [
          { kind: "journal", sku: "reflection-journal", reason: "Draft sincere, specific apologies." },
          { kind: "candle", sku: "iam-honest", reason: "Set the tone for integrity and clarity." }
        ]
      },
      {
        key: "accountability",
        label: "Accountability Apologist",
        headline: "You **may be** an Accountability Apologist.",
        summary: "You believe repair starts with full ownership and making a plan to do better.",
        guidance: [
          "Name the harm without softening the language.",
          "Share the concrete steps you’ll take to prevent repeats—and check back."
        ],
        product_suggestions: [
          { kind: "planner", sku: "repair-planner", reason: "Track commitments and follow-ups." },
          { kind: "candle", sku: "iam-responsible", reason: "Anchor your resolve." }
        ]
      },
      {
        key: "behavior",
        label: "Changed Behavior Apologist",
        headline: "You **may be** a Changed Behavior Apologist.",
        summary: "Actions speak loudest; proof over promises.",
        guidance: [
          "Confirm expectations and timelines before acting, so the change meets the need.",
          "Pair your actions with a concise apology to avoid seeming cold or performative."
        ],
        product_suggestions: [
          { kind: "ritual", sku: "habit-ritual", reason: "Ritualize the new behavior." },
          { kind: "candle", sku: "iam-consistent", reason: "Reinforce steady change." }
        ]
      },
      {
        key: "amends",
        label: "Amends Apologist",
        headline: "You **may be** an Amends Apologist.",
        summary: "You try to restore what was lost—repair the specific damage you caused.",
        guidance: [
          "Ask what repair would be meaningful to them; don’t guess.",
          "Be proportionate—avoid grand gestures if a practical fix is needed."
        ],
        product_suggestions: [
          { kind: "kit", sku: "make-it-right", reason: "Frameworks for tailored repair." },
          { kind: "candle", sku: "iam-humble", reason: "Stay grounded and receptive." }
        ]
      },
      {
        key: "empathy",
        label: "Empathy/Validation Apologist",
        headline: "You **may be** an Empathy-First Apologist.",
        summary: "Being fully seen and emotionally validated is the doorway to repair.",
        guidance: [
          "Mirror the impact before anything else; let them correct you.",
          "Once they feel understood, move to accountability and amends."
        ],
        product_suggestions: [
          { kind: "journal", sku: "empathy-prompts", reason: "Build your validation muscle." },
          { kind: "candle", sku: "iam-open", reason: "Open the space for emotion." }
        ]
      },
      {
        key: "time",
        label: "Consistency Over Time Apologist",
        headline: "You **may be** a Consistency-Over-Time Apologist.",
        summary: "Repair, for you, is demonstrated through reliability and steady follow-through.",
        guidance: [
          "Set small, realistic commitments and keep them—then check in.",
          "Avoid promising big turnarounds; let consistency build trust."
        ],
        product_suggestions: [
          { kind: "tracker", sku: "consistency-tracker", reason: "See progress accrue." },
          { kind: "candle", sku: "iam-patient", reason: "Honor slow, steady repair." }
        ]
      },
      {
        key: "gesture",
        label: "Thoughtful Gestures Apologist",
        headline: "You **may be** a Thoughtful Gestures Apologist.",
        summary: "You offer symbolic care—notes, small gifts, helpful favors—to convey remorse.",
        guidance: [
          "Pair gestures with ownership; otherwise they can read as avoidance.",
          "Customize to their love language; don’t default to your own."
        ],
        product_suggestions: [
          { kind: "gift", sku: "care-bundle", reason: "Curated, thoughtful tokens." },
          { kind: "candle", sku: "i-love", reason: "Carry tenderness into the room." }
        ]
      }
    ],

    // ---- QUESTIONS (10) ----
    questions: [
      {
        id: "q1",
        prompt: "You spill coffee on your friend’s last clean shirt before a big meeting. How do you most likely apologize?",
        optional: false,
        options: [
          { key: "q1_a", label: "Say, “I’m so sorry—I wasn’t careful,” and acknowledge the stress I caused.",
            weights: { words:2, empathy:1, accountability:1 } },
          { key: "q1_b", label: "Offer your own shirt or get an immediate replacement delivered.",
            weights: { amends:2, behavior:1 } },
          { key: "q1_c", label: "Quietly handle cleanup and solve logistics without much talk.",
            weights: { behavior:2, time:1 } },
          { key: "q1_d", label: "Own it fully, outline how I’ll prevent this in the future, check in later.",
            weights: { accountability:2, time:1, words:1 } },
          { key: "q1_e", label: "Bring a small, thoughtful comfort (their favorite drink) and apologize.",
            weights: { gesture:2, words:1 } }
        ]
      },

      {
        id: "q2",
        prompt: "You forgot a meaningful date. What’s your first move?",
        optional: false,
        options: [
          { key: "q2_a", label: "A direct apology naming the impact, no excuses.",
            weights: { words:2, accountability:1 } },
          { key: "q2_b", label: "Plan a make-up experience tailored to what matters to them.",
            weights: { amends:2, empathy:1 } },
          { key: "q2_c", label: "Adjust my calendar system so it can’t happen again; tell them my plan.",
            weights: { behavior:2, accountability:1, time:1 } },
          { key: "q2_d", label: "Start by reflecting their feelings back to them until they feel understood.",
            weights: { empathy:2, words:1 } },
          { key: "q2_e", label: "Send a small, symbolic gift the same day with a note.",
            weights: { gesture:2, words:1 } }
        ]
      },

      {
        id: "q3",
        prompt: "You interrupted them repeatedly in a sensitive conversation.",
        optional: false,
        options: [
          { key: "q3_a", label: "Say, “I cut you off and that wasn’t fair. I’m sorry.”",
            weights: { words:2, accountability:1 } },
          { key: "q3_b", label: "Offer to continue now by actively listening, and ask how to make it right.",
            weights: { empathy:2, amends:1 } },
          { key: "q3_c", label: "Propose a communication rule I’ll follow (e.g., 3-second pause).",
            weights: { behavior:2, time:1 } },
          { key: "q3_d", label: "Bring a calming tea/snack and restart with more intention.",
            weights: { gesture:2, empathy:1 } }
        ]
      },

      {
        id: "q4",
        prompt: "You missed their performance after promising to attend.",
        optional: false,
        options: [
          { key: "q4_a", label: "Acknowledge the broken promise and name the specific hurt.",
            weights: { words:2, accountability:1, empathy:1 } },
          { key: "q4_b", label: "Buy tickets to their next show and arrange transport; calendar it together.",
            weights: { amends:2, behavior:1, time:1 } },
          { key: "q4_c", label: "Set a recurring reminder system and share it so they see the change.",
            weights: { behavior:2, time:1 } },
          { key: "q4_d", label: "Thoughtful gesture plus a concise apology.",
            weights: { gesture:2, words:1 } }
        ]
      },

      {
        id: "q5",
        prompt: "You made a sharp comment in public that embarrassed them.",
        optional: false,
        options: [
          { key: "q5_a", label: "Apologize in the moment, plainly, then check in privately about impact.",
            weights: { words:2, empathy:1, accountability:1 } },
          { key: "q5_b", label: "Repair in the same arena: publicly clarify and affirm them.",
            weights: { amends:2, accountability:1 } },
          { key: "q5_c", label: "Institute a personal rule (no jokes at their expense) and stick to it.",
            weights: { behavior:2, time:1 } },
          { key: "q5_d", label: "Write a short note recognizing how that must have felt.",
            weights: { empathy:2, words:1 } },
          { key: "q5_e", label: "Bring a small kindness to decompress after.",
            weights: { gesture:2 } }
        ]
      },

      {
        id: "q6",
        prompt: "You broke something they care about.",
        optional: false,
        options: [
          { key: "q6_a", label: "Say I’m sorry and ask how they’d like it repaired or replaced.",
            weights: { words:2, amends:1, empathy:1 } },
          { key: "q6_b", label: "Source the exact replacement/repair and update them on timing.",
            weights: { amends:2, behavior:1, time:1 } },
          { key: "q6_c", label: "Offer a symbolic gesture alongside a plan to make it right.",
            weights: { gesture:2, amends:1 } },
          { key: "q6_d", label: "Document how I’ll prevent similar accidents (storage, routines).",
            weights: { behavior:2, accountability:1 } }
        ]
      },

      {
        id: "q7",
        prompt: "You got defensive and shut down a real concern they raised.",
        optional: false,
        options: [
          { key: "q7_a", label: "Own my defensiveness and apologize for blocking them.",
            weights: { accountability:2, words:1 } },
          { key: "q7_b", label: "Reflect their concern back until they say I got it right.",
            weights: { empathy:2 } },
          { key: "q7_c", label: "Schedule a follow-up to revisit calmly and stick to it.",
            weights: { time:2, behavior:1 } },
          { key: "q7_d", label: "Offer a small restorative gesture to re-open connection.",
            weights: { gesture:2, empathy:1 } }
        ]
      },

      {
        id: "q8",
        prompt: "You were late and didn’t communicate.",
        optional: false,
        options: [
          { key: "q8_a", label: "Apologize for the lack of respect and inconvenience—no excuse.",
            weights: { words:2, accountability:1 } },
          { key: "q8_b", label: "Pay for parking/ride or cover a lost cost if there was one.",
            weights: { amends:2 } },
          { key: "q8_c", label: "Adopt a leave-earlier rule + location sharing when running late.",
            weights: { behavior:2, time:1 } },
          { key: "q8_d", label: "Bring a small ‘thank-you for waiting’ token.",
            weights: { gesture:2 } }
        ]
      },

      {
        id: "q9",
        prompt: "You violated a boundary after it was clearly stated.",
        optional: false,
        options: [
          { key: "q9_a", label: "Name the boundary and the violation explicitly; apologize for the harm.",
            weights: { words:2, accountability:1 } },
          { key: "q9_b", label: "Ask how to make it right and follow their lead within reason.",
            weights: { amends:2, empathy:1 } },
          { key: "q9_c", label: "Implement and share a concrete safeguard to prevent repeats.",
            weights: { behavior:2, time:1, accountability:1 } },
          { key: "q9_d", label: "Offer a meaningful gesture after doing the above.",
            weights: { gesture:2 } }
        ]
      },

      {
        id: "q10",
        prompt: "They’re still hurt a week later. What’s your follow-through?",
        optional: false,
        options: [
          { key: "q10_a", label: "Check in with a short, specific message validating their feelings.",
            weights: { empathy:2, words:1 } },
          { key: "q10_b", label: "Show continued changed behavior without prompting.",
            weights: { behavior:2, time:1 } },
          { key: "q10_c", label: "Revisit what ‘made right’ looks like now and commit.",
            weights: { amends:2, accountability:1 } },
          { key: "q10_d", label: "A small, thoughtful gesture that aligns with their love language.",
            weights: { gesture:2 } }
        ]
      }
    ]
  }
};

// --- Seed flow with rich logging -------------------------------------------
async function main() {
  try {
    console.log('🔗 Connecting to Supabase project...');
    // "Ping" with a quick select to verify the key works
    const { data: ping, error: pingErr } = await admin
      .from('quizzes')
      .select('id')
      .limit(1);
    if (pingErr) {
      console.error('❌ Cannot query database with provided credentials:', pingErr);
      process.exit(1);
    }
    console.log('✅ Connection OK.');

    // Show the BEFORE row (if any)
    console.log('🔎 Checking existing quiz row (before)…');
    const { data: before, error: beforeErr } = await admin
      .from('quizzes')
      .select('id, slug, is_published, updated_at, questions')
      .eq('slug', quiz.slug)
      .maybeSingle();
    if (beforeErr) {
      console.warn('⚠️  Could not read existing row:', beforeErr.message);
    } else if (before) {
      const ver = before?.questions?.version ?? before?.questions?.['version'];
      const firstPrompt = before?.questions?.questions?.[0]?.prompt;
      console.log('• BEFORE id:', before.id);
      console.log('• BEFORE version:', ver);
      console.log('• BEFORE first prompt:', firstPrompt);
      console.log('• BEFORE updated_at:', before.updated_at);
    } else {
      console.log('• BEFORE: no existing row');
    }

    // Upsert
    console.log('⬆️  Upserting quiz (on slug)…');
    const { data, error } = await admin
      .from('quizzes')
      .upsert(quiz, { onConflict: 'slug' })
      .select('id, slug, updated_at, questions');

    if (error) {
      console.error('❌ Upsert failed:', error);
      process.exit(1);
    }
    console.log('✅ Upsert OK. Returned rows:', Array.isArray(data) ? data.length : 0);

    // Show the AFTER row
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      const ver = row?.questions?.version ?? row?.questions?.['version'];
      const firstPrompt = row?.questions?.questions?.[0]?.prompt;
      console.log('• AFTER id:', row.id);
      console.log('• AFTER version:', ver);
      console.log('• AFTER first prompt:', firstPrompt);
      console.log('• AFTER updated_at:', row.updated_at);
    }

    // Safety: read once more straight from DB to ensure it’s persisted
    console.log('🔁 Verifying persisted row…');
    const { data: after, error: afterErr } = await admin
      .from('quizzes')
      .select('id, slug, updated_at, questions')
      .eq('slug', quiz.slug)
      .maybeSingle();
    if (afterErr) {
      console.warn('⚠️  Read-after-write failed:', afterErr.message);
    } else {
      const ver = after?.questions?.version ?? after?.questions?.['version'];
      console.log('• VERIFY version:', ver);
      console.log('• VERIFY updated_at:', after?.updated_at);
      console.log('• VERIFY first prompt:', after?.questions?.questions?.[0]?.prompt);
    }

    console.log('🎉 Done.');
    process.exit(0);
  } catch (e) {
    console.error('💥 Unhandled error in seed:', e);
    process.exit(1);
  }
}

main();
