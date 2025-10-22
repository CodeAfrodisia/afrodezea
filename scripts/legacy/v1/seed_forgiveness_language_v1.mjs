// scripts/seed_forgiveness_language.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

// --- Guard & diagnostics ----------------------------------------------------
console.log('⚙️  Seeding: forgiveness-language');
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
  slug: "forgiveness-language",
  title: "What’s Your Forgiveness Language?",
  category: "Communication",
  description:
    "Which forms of repair help you actually feel better? Answer based on what lands for you. Results are reflective guidance—not verdicts.",
  is_published: true,
  questions: {
    version: 1,
    min_required: 7,
    results: [
      {
        key: "words",
        label: "Words Receiver",
        headline: "You **may be** a Words Receiver.",
        summary: "Hearing a direct, specific apology is essential for you to soften.",
        guidance: [
          "Ask for a clear ‘I’m sorry for X’ without qualifiers.",
          "Share examples of language that lands well for you."
        ],
        product_suggestions: [
          { kind: "journal", sku: "forgiveness-prompts", reason: "Clarify what you need to hear." },
          { kind: "candle", sku: "iam-open", reason: "Make space for honest talk." }
        ]
      },
      {
        key: "accountability",
        label: "Accountability Receiver",
        headline: "You **may be** an Accountability Receiver.",
        summary: "You forgive easier when responsibility is owned without defense.",
        guidance: [
          "Let them know that naming specifics and impact matters.",
          "Ask for a brief plan for preventing repeats."
        ],
        product_suggestions: [
          { kind: "planner", sku: "repair-planner", reason: "Track commitments clearly." },
          { kind: "candle", sku: "iam-honest", reason: "Invite truth-telling." }
        ]
      },
      {
        key: "behavior",
        label: "Changed Behavior Receiver",
        headline: "You **may be** a Changed Behavior Receiver.",
        summary: "You trust what you can see sustained over time.",
        guidance: [
          "Define what change would look like in practice.",
          "Agree on a simple check-in cadence to assess progress."
        ],
        product_suggestions: [
          { kind: "tracker", sku: "consistency-tracker", reason: "See change accumulate." },
          { kind: "candle", sku: "iam-consistent", reason: "Reinforce steady repair." }
        ]
      },
      {
        key: "amends",
        label: "Amends Receiver",
        headline: "You **may be** an Amends Receiver.",
        summary: "Restoring what was harmed makes you feel most at peace.",
        guidance: [
          "Be explicit about what would feel like it truly makes it right.",
          "Match the repair to the harm; avoid over- or under-doing it."
        ],
        product_suggestions: [
          { kind: "kit", sku: "make-it-right", reason: "Structure repair requests." },
          { kind: "candle", sku: "iam-grounded", reason: "Stay centered during repair." }
        ]
      },
      {
        key: "empathy",
        label: "Empathy/Validation Receiver",
        headline: "You **may be** an Empathy-First Receiver.",
        summary: "You need your feelings and experience fully seen before moving on.",
        guidance: [
          "Ask them to reflect back what they heard and felt.",
          "Only after you feel understood, discuss next steps."
        ],
        product_suggestions: [
          { kind: "journal", sku: "empathy-prompts", reason: "Language for being seen." },
          { kind: "candle", sku: "iam-soft", reason: "Invite tenderness into the room." }
        ]
      },
      {
        key: "time",
        label: "Consistency Over Time Receiver",
        headline: "You **may be** a Consistency-Over-Time Receiver.",
        summary: "Trust rebuilds for you through reliable, repeated follow-through.",
        guidance: [
          "Set realistic time horizons for repair.",
          "Notice progress, not perfection."
        ],
        product_suggestions: [
          { kind: "tracker", sku: "consistency-tracker", reason: "See trends clearly." },
          { kind: "candle", sku: "iam-patient", reason: "Pace forgiveness gently." }
        ]
      },
      {
        key: "gesture",
        label: "Thoughtful Gestures Receiver",
        headline: "You **may be** a Thoughtful Gestures Receiver.",
        summary: "Symbolic care—notes, small gifts, acts—help you feel considered.",
        guidance: [
          "Share what gestures actually feel meaningful (not generic).",
          "Combine with accountability or amends to avoid ‘shortcut’ vibes."
        ],
        product_suggestions: [
          { kind: "gift", sku: "care-bundle", reason: "Small, tailored kindnesses." },
          { kind: "candle", sku: "i-love", reason: "Carry warmth into the repair." }
        ]
      }
    ],

    // ---- QUESTIONS (10) ----
    questions: [
      {
        id: "q1",
        prompt: "A friend spills coffee on your last clean shirt before a meeting. Which apology would you most appreciate?",
        optional: false,
        options: [
          { key: "q1_a", label: "“I’m so sorry—I caused a mess and stress for you.”",
            weights: { words:2, accountability:1 } },
          { key: "q1_b", label: "They offer their shirt or rush a replacement to you.",
            weights: { amends:2, behavior:1 } },
          { key: "q1_c", label: "They quietly handle logistics and keep you on schedule.",
            weights: { behavior:2, time:1 } },
          { key: "q1_d", label: "They reflect your frustration and ask what would feel right.",
            weights: { empathy:2, amends:1 } },
          { key: "q1_e", label: "They bring a small comfort (fav drink) with a short apology.",
            weights: { gesture:2, words:1 } }
        ]
      },

      {
        id: "q2",
        prompt: "Someone forgot an important date. What moves forgiveness forward for you?",
        optional: false,
        options: [
          { key: "q2_a", label: "A direct apology naming the impact.",
            weights: { words:2, accountability:1 } },
          { key: "q2_b", label: "A make-up plan that aligns with what you value.",
            weights: { amends:2, empathy:1 } },
          { key: "q2_c", label: "Seeing they changed their system so it won’t repeat.",
            weights: { behavior:2, time:1 } },
          { key: "q2_d", label: "Feeling fully understood before anything else.",
            weights: { empathy:2 } },
          { key: "q2_e", label: "A thoughtful, personal gesture right away.",
            weights: { gesture:2 } }
        ]
      },

      {
        id: "q3",
        prompt: "They talked over you during a sensitive share.",
        optional: false,
        options: [
          { key: "q3_a", label: "A simple apology acknowledging what they did.",
            weights: { words:2, accountability:1 } },
          { key: "q3_b", label: "They offer to restart and truly listen.",
            weights: { empathy:2, amends:1 } },
          { key: "q3_c", label: "They promise a concrete change (e.g., 3-second pause).",
            weights: { behavior:2, time:1 } },
          { key: "q3_d", label: "A small gesture to reset the vibe plus brief apology.",
            weights: { gesture:2, words:1 } }
        ]
      },

      {
        id: "q4",
        prompt: "They missed your performance after saying they’d be there.",
        optional: false,
        options: [
          { key: "q4_a", label: "Plain ownership of the broken promise and its sting.",
            weights: { words:2, accountability:1, empathy:1 } },
          { key: "q4_b", label: "They buy tickets to your next show and ensure attendance.",
            weights: { amends:2, behavior:1, time:1 } },
          { key: "q4_c", label: "They show you the system changes they made.",
            weights: { behavior:2, time:1 } },
          { key: "q4_d", label: "A personal gesture that says “you matter.”",
            weights: { gesture:2 } }
        ]
      },

      {
        id: "q5",
        prompt: "They embarrassed you publicly with a sharp comment.",
        optional: false,
        options: [
          { key: "q5_a", label: "Apology now + private check-in on the impact.",
            weights: { words:2, empathy:1, accountability:1 } },
          { key: "q5_b", label: "Public clarification/affirmation to repair the arena of harm.",
            weights: { amends:2, accountability:1 } },
          { key: "q5_c", label: "A clear promise to stop jokes at your expense—and then they stick to it.",
            weights: { behavior:2, time:1 } },
          { key: "q5_d", label: "A written note recognizing how it felt.",
            weights: { empathy:2, words:1 } },
          { key: "q5_e", label: "A small kindness to decompress together.",
            weights: { gesture:2 } }
        ]
      },

      {
        id: "q6",
        prompt: "They broke something meaningful to you.",
        optional: false,
        options: [
          { key: "q6_a", label: "A sincere apology plus asking how to make it right.",
            weights: { words:2, amends:1, empathy:1 } },
          { key: "q6_b", label: "They repair/replace it and update you on timing.",
            weights: { amends:2, behavior:1, time:1 } },
          { key: "q6_c", label: "They add a small symbolic gesture alongside the fix.",
            weights: { gesture:2, amends:1 } },
          { key: "q6_d", label: "They show a concrete safeguard to prevent repeats.",
            weights: { behavior:2, accountability:1 } }
        ]
      },

      {
        id: "q7",
        prompt: "They dismissed your concern and got defensive.",
        optional: false,
        options: [
          { key: "q7_a", label: "They own the defensiveness outright.",
            weights: { accountability:2, words:1 } },
          { key: "q7_b", label: "They reflect back your point until you feel understood.",
            weights: { empathy:2 } },
          { key: "q7_c", label: "They schedule a calmer follow-up and keep it.",
            weights: { time:2, behavior:1 } },
          { key: "q7_d", label: "A small restorative gesture after owning it.",
            weights: { gesture:2 } }
        ]
      },

      {
        id: "q8",
        prompt: "They were late and didn’t text.",
        optional: false,
        options: [
          { key: "q8_a", label: "Direct apology naming the disrespect/inconvenience.",
            weights: { words:2, accountability:1 } },
          { key: "q8_b", label: "They cover a related cost you incurred.",
            weights: { amends:2 } },
          { key: "q8_c", label: "They implement a new routine so it won’t repeat.",
            weights: { behavior:2, time:1 } },
          { key: "q8_d", label: "A small ‘thank-you for waiting’ gesture.",
            weights: { gesture:2 } }
        ]
      },

      {
        id: "q9",
        prompt: "They violated a clearly stated boundary.",
        optional: false,
        options: [
          { key: "q9_a", label: "They name the boundary and the violation and apologize.",
            weights: { words:2, accountability:1 } },
          { key: "q9_b", label: "They ask how to make it right and follow your lead within reason.",
            weights: { amends:2, empathy:1 } },
          { key: "q9_c", label: "They add a concrete safeguard and show it to you.",
            weights: { behavior:2, time:1, accountability:1 } },
          { key: "q9_d", label: "They include a gesture that aligns with your love language.",
            weights: { gesture:2 } }
        ]
      },

      {
        id: "q10",
        prompt: "You’re still hurting a week later. What helps now?",
        optional: false,
        options: [
          { key: "q10_a", label: "A short, specific message validating your feelings.",
            weights: { empathy:2, words:1 } },
          { key: "q10_b", label: "Seeing the changed behavior continue without prompting.",
            weights: { behavior:2, time:1 } },
          { key: "q10_c", label: "Re-aligning on what ‘made right’ looks like now and committing.",
            weights: { amends:2, accountability:1 } },
          { key: "q10_d", label: "A thoughtful gesture that says “you matter” while repair continues.",
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
    const { error: pingErr } = await admin.from('quizzes').select('id').limit(1);
    if (pingErr) {
      console.error('❌ Cannot query database with provided credentials:', pingErr);
      process.exit(1);
    }
    console.log('✅ Connection OK.');

    // BEFORE
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

    // UPSERT
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

    // AFTER (from return)
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      const ver = row?.questions?.version ?? row?.questions?.['version'];
      const firstPrompt = row?.questions?.questions?.[0]?.prompt;
      console.log('• AFTER id:', row.id);
      console.log('• AFTER version:', ver);
      console.log('• AFTER first prompt:', firstPrompt);
      console.log('• AFTER updated_at:', row.updated_at);
    }

    // VERIFY
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
