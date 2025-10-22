// scripts/seed_resilience_style.mjs
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Guard + helpful logs
console.log("🔧 Seeding: Resilience Style Quiz");
console.log("• SUPABASE URL:", url || "(missing)");
console.log("• SERVICE ROLE key length:", key ? key.length : 0);
if (!url || !key) {
  console.error("❌ Missing VITE_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(url, key);

const quiz = {
  slug: "resilience-style",
  title: "How Do You Bounce Back? (Resilience Style)",
  category: "Wellbeing",
  description:
    "Resilience isn’t just toughness—it’s how you recover, adapt, and keep moving while staying whole. Answer honestly; results are reflective guidance, not a verdict.",
  is_published: true,
  questions: {
    version: 1,
    min_required: 9,

    // ===== RESULTS (6 styles) =====
    results: [
      {
        key: "optimist",
        label: "Optimistic Reframer",
        headline: "You **may be** an Optimistic Reframer.",
        summary:
          "You look for the lesson and the light. Meaning-making and hope help you move forward.",
        guidance: [
          "Balance silver linings with space for grief; both can be true.",
          "Try a 2-column journal: ‘What hurts’ and ‘What this might teach me.’",
        ],
        product_suggestions: [
          { kind: "journal", sku: "reframe-pages", reason: "Structure meaning-making." },
          { kind: "ritual",  sku: "gratitude-3x3", reason: "Anchor realistic optimism." },
        ],
      },
      {
        key: "solver",
        label: "Practical Problem-Solver",
        headline: "You **may be** a Practical Problem-Solver.",
        summary:
          "You plan, prioritize, and act. Progress—however small—restores your power.",
        guidance: [
          "Pair action with emotional check-ins to avoid burnout.",
          "Define ‘done for today’ so effort has a finish line.",
        ],
        product_suggestions: [
          { kind: "planner", sku: "mini-steps", reason: "Chunk problems into wins." },
          { kind: "candle",  sku: "i-am-steadfast", reason: "Mark effort with ritual." },
        ],
      },
      {
        key: "community",
        label: "Community Builder",
        headline: "You **may be** a Community Builder.",
        summary:
          "Support sustains you. You give and receive strength in connection.",
        guidance: [
          "Name your ‘inner circle’ and ask specific, small helps.",
          "Protect your bandwidth—helper’s fatigue is real.",
        ],
        product_suggestions: [
          { kind: "ritual", sku: "support-checkin", reason: "Schedule nourishing touchpoints." },
          { kind: "kit",    sku: "care-circle", reason: "Shareable prompts for mutual aid." },
        ],
      },
      {
        key: "endurer",
        label: "Steady Endurer",
        headline: "You **may be** a Steady Endurer.",
        summary:
          "Consistency is your superpower. You keep going—one step, one day at a time.",
        guidance: [
          "Revisit goals to ensure you’re steady on the *right* path.",
          "Celebrate micro-wins to keep morale high.",
        ],
        product_suggestions: [
          { kind: "tracker", sku: "streak-bands", reason: "Make consistency visible." },
          { kind: "candle",  sku: "i-am-rooted", reason: "Ground the long game." },
        ],
      },
      {
        key: "adapter",
        label: "Flexible Adapter",
        headline: "You **may be** a Flexible Adapter.",
        summary:
          "You pivot, experiment, and reinvent. Change feels like possibility.",
        guidance: [
          "Balance agility with a few anchor routines.",
          "Choose one experiment to pursue long enough to measure.",
        ],
        product_suggestions: [
          { kind: "journal", sku: "experiment-log", reason: "Track pivots into patterns." },
          { kind: "ritual",  sku: "weekly-reset", reason: "Anchor flexibility in rhythm." },
        ],
      },
      {
        key: "grounder",
        label: "Mindful Grounder",
        headline: "You **may be** a Mindful Grounder.",
        summary:
          "You pause, breathe, and feel before moving. Regulation unlocks wise action.",
        guidance: [
          "Close the loop: pick a next step after you self-soothe.",
          "Try the ‘90-second wave’ rule for intense emotion.",
        ],
        product_suggestions: [
          { kind: "ritual", sku: "breath-4-7-8", reason: "Downshift the nervous system." },
          { kind: "journal", sku: "feel-to-heal", reason: "Process, then act." },
        ],
      },
    ],

    // ===== QUESTIONS (14) =====
    questions: [
      /* ---------- Scenario (7) ---------- */
      {
        id: "s1",
        prompt: "Your project derails the day before a deadline. First instinct?",
        optional: false,
        options: [
          { key: "s1_a", label: "List issues, triage tasks, set a quick plan.",
            weights: { solver: 2, endurer: 1 }, tags: ["action-first"] },
          { key: "s1_b", label: "Pause to breathe, then return with a clear head.",
            weights: { grounder: 2 }, tags: ["regulate-first"] },
          { key: "s1_c", label: "Text a trusted person for a quick brainstorm.",
            weights: { community: 2, solver: 1 }, tags: ["support-buffer"] },
          { key: "s1_d", label: "Ask: ‘What can this teach me?’ and reset expectations.",
            weights: { optimist: 2, adapter: 1 }, tags: ["reframe"] },
          { key: "s1_e", label: "Focus on the next right step—slow and steady.",
            weights: { endurer: 2 }, tags: ["steady-pace"] },
        ],
      },
      {
        id: "s2",
        prompt: "A relationship conflict lingers. What moves you toward repair?",
        optional: false,
        options: [
          { key: "s2_a", label: "Write a short message naming my part and next step.",
            weights: { solver: 2, community: 1 }, tags: ["accountability"] },
          { key: "s2_b", label: "Regulate first—walk, breathe, pray—then engage.",
            weights: { grounder: 2 }, tags: ["self-soothe"] },
          { key: "s2_c", label: "Talk it out with a wise friend to gain perspective.",
            weights: { community: 2, optimist: 1 }, tags: ["support-buffer"] },
          { key: "s2_d", label: "Reframe: ‘Conflict can deepen us’—then schedule a talk.",
            weights: { optimist: 2, adapter: 1 }, tags: ["reframe"] },
          { key: "s2_e", label: "Agree on small, consistent check-ins to rebuild trust.",
            weights: { endurer: 2, solver: 1 }, tags: ["consistency"] },
        ],
      },
      {
        id: "s3",
        prompt: "You receive tough feedback on work you cared about.",
        optional: false,
        options: [
          { key: "s3_a", label: "Extract action items and revise with a checklist.",
            weights: { solver: 2, endurer: 1 }, tags: ["action-first"] },
          { key: "s3_b", label: "Name feelings, then revisit with fresh eyes.",
            weights: { grounder: 2 }, tags: ["emotions-first"] },
          { key: "s3_c", label: "Ask a mentor for framing and next steps.",
            weights: { community: 2, optimist: 1 }, tags: ["support-buffer"] },
          { key: "s3_d", label: "Reframe: ‘This is a path to excellence.’",
            weights: { optimist: 2 }, tags: ["reframe"] },
          { key: "s3_e", label: "Pivot approach—try a new direction altogether.",
            weights: { adapter: 2 }, tags: ["flex-choice"] },
        ],
      },
      {
        id: "s4",
        prompt: "You planned a big goal, then life changed unexpectedly.",
        optional: false,
        options: [
          { key: "s4_a", label: "Adapt the goal; new route, same essence.",
            weights: { adapter: 2, optimist: 1 }, tags: ["flex-choice"] },
          { key: "s4_b", label: "Keep a scaled-down version and stick to it.",
            weights: { endurer: 2, solver: 1 }, tags: ["steady-pace"] },
          { key: "s4_c", label: "Pause the goal; rebuild capacity first.",
            weights: { grounder: 2 }, tags: ["regulate-first"] },
          { key: "s4_d", label: "Form a mini-team for shared momentum.",
            weights: { community: 2 }, tags: ["support-buffer"] },
          { key: "s4_e", label: "Rewrite the story: this detour might be alignment.",
            weights: { optimist: 2 }, tags: ["reframe"] },
        ],
      },
      {
        id: "s5",
        prompt: "After a personal disappointment, how do you tend to yourself?",
        optional: false,
        options: [
          { key: "s5_a", label: "Grounding ritual (breath, prayer, movement).",
            weights: { grounder: 2 }, tags: ["self-soothe"] },
          { key: "s5_b", label: "Reframe with compassion and future focus.",
            weights: { optimist: 2 }, tags: ["reframe"] },
          { key: "s5_c", label: "Create a simple plan for one small win.",
            weights: { solver: 2 }, tags: ["action-first"] },
          { key: "s5_d", label: "Reach out to a friend who really gets me.",
            weights: { community: 2 }, tags: ["support-buffer"] },
          { key: "s5_e", label: "Return to routine—one foot in front of the other.",
            weights: { endurer: 2 }, tags: ["steady-pace"] },
        ],
      },
      {
        id: "s6",
        prompt: "You’re juggling too much at once.",
        optional: false,
        options: [
          { key: "s6_a", label: "Timebox tasks; cut scope; execute.",
            weights: { solver: 2, endurer: 1 }, tags: ["action-first"] },
          { key: "s6_b", label: "Say no/renegotiate to protect my energy.",
            weights: { grounder: 2, adapter: 1 }, tags: ["boundary-set"] },
          { key: "s6_c", label: "Delegate or ask for help—share the load.",
            weights: { community: 2 }, tags: ["support-buffer"] },
          { key: "s6_d", label: "Change the plan—simplify creatively.",
            weights: { adapter: 2 }, tags: ["flex-choice"] },
          { key: "s6_e", label: "Steady cadence; keep moving without drama.",
            weights: { endurer: 2 }, tags: ["steady-pace"] },
        ],
      },
      {
        id: "s7",
        prompt: "A long-term goal stalls for months. What’s your move?",
        optional: false,
        options: [
          { key: "s7_a", label: "Reset the ‘why’, then try again.",
            weights: { optimist: 2, endurer: 1 }, tags: ["reconnect-why"] },
          { key: "s7_b", label: "Ship a scrappy version to regain momentum.",
            weights: { solver: 2, adapter: 1 }, tags: ["action-first"] },
          { key: "s7_c", label: "Ask for an accountability buddy.",
            weights: { community: 2 }, tags: ["support-buffer"] },
          { key: "s7_d", label: "Pause intentionally and rebuild capacity first.",
            weights: { grounder: 2 }, tags: ["rest-restore"] },
          { key: "s7_e", label: "Pivot—new path, same destination.",
            weights: { adapter: 2 }, tags: ["flex-choice"] },
        ],
      },

      /* ---------- Likert (5) ---------- */
      // 1=Strongly Disagree, 3=Disagree, 5=Neutral, 7=Agree, 9=Strongly Agree
      {
        id: "l1",
        prompt: "When things go wrong, I can usually reframe the story and find meaning.",
        optional: false,
        options: [
          { key: "l1_1", label: "1", weights: { } },
          { key: "l1_3", label: "3", weights: { } },
          { key: "l1_5", label: "5", weights: { optimist: 1 } },
          { key: "l1_7", label: "7", weights: { optimist: 2 } },
          { key: "l1_9", label: "9", weights: { optimist: 3 } },
        ],
      },
      {
        id: "l2",
        prompt: "Taking a small concrete step helps me feel better, even before I feel ready.",
        optional: false,
        options: [
          { key: "l2_1", label: "1", weights: { } },
          { key: "l2_3", label: "3", weights: { } },
          { key: "l2_5", label: "5", weights: { solver: 1 } },
          { key: "l2_7", label: "7", weights: { solver: 2 } },
          { key: "l2_9", label: "9", weights: { solver: 3 } },
        ],
      },
      {
        id: "l3",
        prompt: "I bounce back faster when I’m connected to my people.",
        optional: false,
        options: [
          { key: "l3_1", label: "1", weights: { } },
          { key: "l3_3", label: "3", weights: { } },
          { key: "l3_5", label: "5", weights: { community: 1 } },
          { key: "l3_7", label: "7", weights: { community: 2 } },
          { key: "l3_9", label: "9", weights: { community: 3 } },
        ],
      },
      {
        id: "l4",
        prompt: "Consistency beats intensity for me—slow and steady wins my long games.",
        optional: false,
        options: [
          { key: "l4_1", label: "1", weights: { } },
          { key: "l4_3", label: "3", weights: { } },
          { key: "l4_5", label: "5", weights: { endurer: 1 } },
          { key: "l4_7", label: "7", weights: { endurer: 2 } },
          { key: "l4_9", label: "9", weights: { endurer: 3 } },
        ],
      },
      {
        id: "l5",
        prompt: "Before taking action, I benefit from pausing to regulate (breathe, pray, move).",
        optional: false,
        options: [
          { key: "l5_1", label: "1", weights: { } },
          { key: "l5_3", label: "3", weights: { } },
          { key: "l5_5", label: "5", weights: { grounder: 1 } },
          { key: "l5_7", label: "7", weights: { grounder: 2 } },
          { key: "l5_9", label: "9", weights: { grounder: 3 } },
        ],
      },

      /* ---------- Head-to-Head (2) ---------- */
      {
        id: "h1",
        prompt: "When the pressure is high, which helps you more in the *moment*?",
        optional: false,
        options: [
          { key: "h1_a", label: "Take one small action to create momentum.",
            weights: { solver: 2, endurer: 1 }, tags: ["action-first"] },
          { key: "h1_b", label: "Ground my body/mind, then decide.",
            weights: { grounder: 2, optimist: 1 }, tags: ["regulate-first"] },
        ],
      },
      {
        id: "h2",
        prompt: "Your plan falls apart. Which instinct sounds more like you?",
        optional: false,
        options: [
          { key: "h2_a", label: "Pivot the plan—there’s always another way.",
            weights: { adapter: 2, optimist: 1 }, tags: ["flex-choice"] },
          { key: "h2_b", label: "Call in community—don’t go it alone.",
            weights: { community: 2, endurer: 1 }, tags: ["support-buffer"] },
        ],
      },

      /* ---------- Quick Preference (1) ---------- */
      {
        id: "qpref",
        prompt: "When life knocks me down, I usually bounce back by…",
        optional: false,
        options: [
          { key: "qpref_a", label: "Reframing and finding meaning.",
            weights: { optimist: 2 } },
          { key: "qpref_b", label: "Making a small plan and moving.",
            weights: { solver: 2 } },
          { key: "qpref_c", label: "Leaning on people who hold me up.",
            weights: { community: 2 } },
          { key: "qpref_d", label: "Showing up consistently, day after day.",
            weights: { endurer: 2 } },
          { key: "qpref_e", label: "Pivoting quickly and trying something new.",
            weights: { adapter: 2 } },
          { key: "qpref_f", label: "Grounding myself first, then acting.",
            weights: { grounder: 2 } },
        ],
      },
    ],
  },
};

async function main() {
  try {
    console.log("⏫ Upserting quiz by slug:", quiz.slug);
    const { data, error } = await admin
      .from("quizzes")
      .upsert(quiz, { onConflict: "slug" })
      .select();

    if (error) {
      console.error("❌ Error upserting quiz:", error);
      process.exit(1);
    }
    console.log("✅ Seeded quiz rows:", data?.length || 0, data?.map(r => r.slug));
    console.log("➡️  Visit: /quizzes/resilience-style");
  } catch (e) {
    console.error("❌ Seed script crashed:", e);
    process.exit(1);
  }
}

main();

