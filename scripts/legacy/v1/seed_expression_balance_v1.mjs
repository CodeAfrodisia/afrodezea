// scripts/seed_expression_balance.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // adjust if you keep env elsewhere

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Hard guard + helpful diagnostics (no secrets printed, only length)
console.log('— Seeding: Shadow vs. Light Expression —');
console.log('SUPABASE URL:', url || '(undefined)');
console.log('SERVICE ROLE LEN:', key ? String(key.length) : 0);

if (!url || !key) {
  console.error('❌ Missing env. You need VITE_SUPABASE_URL (or SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const admin = createClient(url, key);

/**
 * Scoring philosophy
 * - Result keys: light, balanced, shadow
 * - Most answers award { light: 2|1 } or { shadow: 2|1 } depending on “agree/disagree” and question valence
 * - A few “both/depends” answers tip toward balanced
 */
async function main() {
  const quiz = {
    slug: "expression-balance",
    title: "Shadow vs. Light: How Are You Showing Up Right Now?",
    category: "Self-awareness",
    description:
      "A gentle snapshot of your current state—not a verdict. Are you leaning toward your light, holding a healthy balance, or feeling pulled into shadow? Use this to notice and nudge, not to label.",
    is_published: true,
    questions: {
      version: 1,
      min_required: 8,

      results: [
        {
          key: "light",
          label: "Leaning Light",
          headline: "You’re currently leaning toward your Light Expression.",
          summary:
            "Your energy reads spacious, grounded, and responsive. You’re acting from your values with clarity and care.",
          guidance: [
            "Keep nervous-system regulation simple and steady (breath, water, 5-minute walks).",
            "Name one boundary and one priority for the week—protect your light without overextending.",
            "Share the goodness: encourage someone close with one sincere acknowledgment today."
          ],
          product_suggestions: [
            { kind: "candle", sku: "i-am-clear",     reason: "Anchor clarity and presence." },
            { kind: "journal", sku: "gratitude-mini", reason: "Savor momentum—small wins track." }
          ]
        },
        {
          key: "balanced",
          label: "Balanced / In Flux",
          headline: "You’re carrying a workable balance of Light and Shadow.",
          summary:
            "You’re moving between openness and contraction—normal for a changing season. Awareness is your ally.",
          guidance: [
            "Pick one micro-ritual (60 seconds) you’ll repeat daily—consistency beats intensity.",
            "Notice the first cue of contraction (jaw, chest, speed) and practice a 3-breath reset.",
            "Journal one line: “When I feel ___, I choose ___.”"
          ],
          product_suggestions: [
            { kind: "candle", sku: "i-am-steady", reason: "Invite rhythm over extremes." },
            { kind: "ritual", sku: "3-breath-reset", reason: "Create a quick, repeatable reset." }
          ]
        },
        {
          key: "shadow",
          label: "Leaning Shadow",
          headline: "You’re currently leaning toward your Shadow Expression.",
          summary:
            "Your system may be tighter: reactive, avoidant, or overcontrolling. That’s not failure—it’s a flag for care.",
          guidance: [
            "Dial it down to basics: hydrate, breathe, move gently. Nervous system first, narratives later.",
            "Shrink the goalpost—decide one next kind action (for you or another) and complete it.",
            "If possible, say a boundary sentence out loud: “I’m not available for ___ today.”"
          ],
          product_suggestions: [
            { kind: "candle", sku: "i-am-soft",     reason: "Soften edges during repair." },
            { kind: "journal", sku: "unwind-notes", reason: "Name the loop, choose the shift." }
          ]
        }
      ],

      // -------------------------
      // QUESTIONS (11 total)
      //  - Likert: 7
      //  - Scenario: 3
      //  - Quick Preference: 1
      // -------------------------
      questions: [
        // -------- Likert (valence: extro/intro style NOT important; it's light vs shadow tendencies)
        // Scale (labeling only; scoring handled in options):
        // 1 = Strongly Disagree, 3 = Somewhat Disagree, 5 = Neutral, 7 = Somewhat Agree, 9 = Strongly Agree

        {
          id: "l1",
          prompt: "I return to center quickly after being triggered.",
          optional: false,
          options: [
            { key: "l1_1", label: "Strongly Disagree", weights: { shadow: 2 }, tags: ["regulation"] },
            { key: "l1_3", label: "Somewhat Disagree", weights: { shadow: 1 }, tags: ["regulation"] },
            { key: "l1_5", label: "Neutral",           weights: { balanced: 1 } },
            { key: "l1_7", label: "Somewhat Agree",    weights: { light: 1 }, tags: ["regulation"] },
            { key: "l1_9", label: "Strongly Agree",    weights: { light: 2 }, tags: ["regulation"] }
          ]
        },

        {
          id: "l2",
          prompt: "When I’m under stress, I become rigid or controlling.",
          optional: false,
          options: [
            { key: "l2_1", label: "Strongly Disagree", weights: { light: 2 }, tags: ["control"] },
            { key: "l2_3", label: "Somewhat Disagree", weights: { light: 1 }, tags: ["control"] },
            { key: "l2_5", label: "Neutral",           weights: { balanced: 1 } },
            { key: "l2_7", label: "Somewhat Agree",    weights: { shadow: 1 }, tags: ["control"] },
            { key: "l2_9", label: "Strongly Agree",    weights: { shadow: 2 }, tags: ["control"] }
          ]
        },

        {
          id: "l3",
          prompt: "I can name my need without blaming or shaming.",
          optional: false,
          options: [
            { key: "l3_1", label: "Strongly Disagree", weights: { shadow: 2 }, tags: ["communication"] },
            { key: "l3_3", label: "Somewhat Disagree", weights: { shadow: 1 }, tags: ["communication"] },
            { key: "l3_5", label: "Neutral",           weights: { balanced: 1 } },
            { key: "l3_7", label: "Somewhat Agree",    weights: { light: 1 }, tags: ["communication"] },
            { key: "l3_9", label: "Strongly Agree",    weights: { light: 2 }, tags: ["communication"] }
          ]
        },

        {
          id: "l4",
          prompt: "I avoid difficult conversations even when they matter.",
          optional: false,
          options: [
            { key: "l4_1", label: "Strongly Disagree", weights: { light: 2 }, tags: ["avoidance"] },
            { key: "l4_3", label: "Somewhat Disagree", weights: { light: 1 }, tags: ["avoidance"] },
            { key: "l4_5", label: "Neutral",           weights: { balanced: 1 } },
            { key: "l4_7", label: "Somewhat Agree",    weights: { shadow: 1 }, tags: ["avoidance"] },
            { key: "l4_9", label: "Strongly Agree",    weights: { shadow: 2 }, tags: ["avoidance"] }
          ]
        },

        {
          id: "l5",
          prompt: "It’s easy for me to extend empathy without losing my boundary.",
          optional: false,
          options: [
            { key: "l5_1", label: "Strongly Disagree", weights: { shadow: 2 }, tags: ["empathy", "boundaries"] },
            { key: "l5_3", label: "Somewhat Disagree", weights: { shadow: 1 }, tags: ["empathy", "boundaries"] },
            { key: "l5_5", label: "Neutral",           weights: { balanced: 1 } },
            { key: "l5_7", label: "Somewhat Agree",    weights: { light: 1 }, tags: ["empathy", "boundaries"] },
            { key: "l5_9", label: "Strongly Agree",    weights: { light: 2 }, tags: ["empathy", "boundaries"] }
          ]
        },

        {
          id: "l6",
          prompt: "When I make a mistake, I get harsh with myself.",
          optional: false,
          options: [
            { key: "l6_1", label: "Strongly Disagree", weights: { light: 2 }, tags: ["self-talk"] },
            { key: "l6_3", label: "Somewhat Disagree", weights: { light: 1 }, tags: ["self-talk"] },
            { key: "l6_5", label: "Neutral",           weights: { balanced: 1 } },
            { key: "l6_7", label: "Somewhat Agree",    weights: { shadow: 1 }, tags: ["self-talk"] },
            { key: "l6_9", label: "Strongly Agree",    weights: { shadow: 2 }, tags: ["self-talk"] }
          ]
        },

        {
          id: "l7",
          prompt: "I can slow down and choose a response instead of reacting.",
          optional: false,
          options: [
            { key: "l7_1", label: "Strongly Disagree", weights: { shadow: 2 }, tags: ["reactivity"] },
            { key: "l7_3", label: "Somewhat Disagree", weights: { shadow: 1 }, tags: ["reactivity"] },
            { key: "l7_5", label: "Neutral",           weights: { balanced: 1 } },
            { key: "l7_7", label: "Somewhat Agree",    weights: { light: 1 }, tags: ["reactivity"] },
            { key: "l7_9", label: "Strongly Agree",    weights: { light: 2 }, tags: ["reactivity"] }
          ]
        },

        // -------- Scenarios (3)
        {
          id: "s1",
          prompt: "Someone you care about cancels last minute. What’s your first move?",
          optional: false,
          options: [
            { key: "s1_a", label: "Send a sharp message—this is disrespectful.",
              weights: { shadow: 2 }, tags: ["reactivity"] },
            { key: "s1_b", label: "Pause, breathe, then share disappointment calmly later.",
              weights: { light: 2 }, tags: ["regulation","communication"] },
            { key: "s1_c", label: "Say it’s fine and swallow it, even though it stings.",
              weights: { shadow: 1, balanced: 1 }, tags: ["avoidance"] },
            { key: "s1_d", label: "Ask for what would make it right (reschedule, acknowledgment).",
              weights: { light: 1, balanced: 1 }, tags: ["repair"] }
          ]
        },

        {
          id: "s2",
          prompt: "You made a mistake at work. What happens next, honestly?",
          optional: false,
          options: [
            { key: "s2_a", label: "Beat myself up, hide it, or overwork to compensate.",
              weights: { shadow: 2 }, tags: ["self-talk","avoidance"] },
            { key: "s2_b", label: "Own it briefly and outline a fix.",
              weights: { light: 2 }, tags: ["accountability","repair"] },
            { key: "s2_c", label: "I’m neutral—depends on the day and capacity.",
              weights: { balanced: 2 } },
            { key: "s2_d", label: "I rationalize it away and move on quickly.",
              weights: { shadow: 1 }, tags: ["minimizing"] }
          ]
        },

        {
          id: "s3",
          prompt: "A hard conversation is needed with someone you love. You tend to…",
          optional: false,
          options: [
            { key: "s3_a", label: "Prepare calmly, speak from impact and needs.",
              weights: { light: 2 }, tags: ["communication","empathy"] },
            { key: "s3_b", label: "Avoid it until it erupts.",
              weights: { shadow: 2 }, tags: ["avoidance"] },
            { key: "s3_c", label: "Go in hot, then cool off mid-way.",
              weights: { shadow: 1, balanced: 1 }, tags: ["reactivity"] },
            { key: "s3_d", label: "Ask for a time and ground rules so it feels safer.",
              weights: { light: 1, balanced: 1 }, tags: ["structure"] }
          ]
        },

        // -------- Quick Preference (1)
        {
          id: "q1",
          prompt: "Which sentence feels truest today?",
          optional: false,
          options: [
            { key: "q1_a", label: "“I can feel the tension, and I can feel my choices.”",
              weights: { light: 2 } },
            { key: "q1_b", label: "“I’m up and down—working with what I have.”",
              weights: { balanced: 2 } },
            { key: "q1_c", label: "“Everything feels tight; I’m just trying to cope.”",
              weights: { shadow: 2 } }
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
    console.error('❌ Upsert failed:', error);
    process.exit(1);
  }
  console.log('✅ Seeded quiz:', data?.map(r => r.slug));
}

main().catch((e) => {
  console.error('❌ Seed script crashed:', e);
  process.exit(1);
});

