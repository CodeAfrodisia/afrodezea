// scripts/seed_emotional_regulation.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Hard guard + visibility
console.log('--- Seeding: emotional-regulation ---');
if (!url || !key) {
  console.error('❌ Missing env vars. Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('   VITE_SUPABASE_URL =', url || '(undefined)');
  console.error('   SUPABASE_SERVICE_ROLE_KEY length =', key ? key.length : 0);
  process.exit(1);
}
console.log('→ Project:', url.replace('https://', '').split('.')[0], '(ok)');

const admin = createClient(url, key);

async function main() {
  const quiz = {
    slug: "emotional-regulation",
    title: "How Do You Regulate Your Emotions?",
    category: "Wellbeing",
    description:
      "Discover your go-to regulation styles under stress—body-first, reframing, pausing, co-regulating, boundaries, or riding the wave. This is reflective guidance, not a verdict.",
    is_published: true,

    questions: {
      version: 1,
      min_required: 7,

      // ---------- RESULTS/STYLES ----------
      results: [
        {
          key: "somatic_grounder",
          label: "Somatic Grounder",
          headline: "You **may be** a Somatic Grounder.",
          summary:
            "You regulate through the body first—breath, movement, posture, sensory resets.",
          guidance: [
            "Stack tiny resets: shoulder drop, longer exhales, one-song walk.",
            "Pair body cues with one feeling word to integrate mind and body.",
            "Create a pre-conflict ritual: 4–7–8 breathing before you reply."
          ],
          product_suggestions: [
            { kind: "ritual", sku: "breath-4-7-8", reason: "Downshift quickly on demand." },
            { kind: "candle", sku: "i-am-calm", reason: "Sensory anchor for deactivation." }
          ]
        },
        {
          key: "reframer",
          label: "Name-It & Reframe-It",
          headline: "You **may be** a Name-It & Reframe-It Regulator.",
          summary:
            "You calm by labeling feelings and shifting perspective—meaning-making steadies you.",
          guidance: [
            "Try: “A part of me feels ___. Another part needs ___.”",
            "Use a 1-line reframe then act (“This is data, not a verdict”).",
            "Avoid overthinking: time-box reflection to 3–5 minutes."
          ],
          product_suggestions: [
            { kind: "journal", sku: "reflection-journal", reason: "Fast label → reframe flow." },
            { kind: "candle", sku: "i-am-clear", reason: "Cue for cognitive clarity." }
          ]
        },
        {
          key: "deliberate_pauser",
          label: "Deliberate Pauser",
          headline: "You **may be** a Deliberate Pauser.",
          summary:
            "Your strength is impulse control—delay, choose, and then act with intention.",
          guidance: [
            "Use a visible timer: 2–10 minute cool-off before decisions.",
            "Pair pauses with a return-plan so others feel secure.",
            "Protect the pause by shaping your environment (silence notifications)."
          ],
          product_suggestions: [
            { kind: "planner", sku: "repair-planner", reason: "Structure your return plan." },
            { kind: "candle", sku: "i-am-steady", reason: "Reinforce deliberate rhythm." }
          ]
        },
        {
          key: "wave_rider",
          label: "Wave Rider",
          headline: "You **may be** a Wave Rider.",
          summary:
            "You tolerate intensity and ride it out—feelings move through without derailing you.",
          guidance: [
            "Name the wave and rate it 1–10; watch it change over minutes.",
            "Add micro-boundaries so tolerance doesn’t become overexposure.",
            "Close the loop: 1-line takeaway after the wave passes."
          ],
          product_suggestions: [
            { kind: "ritual", sku: "urge-surf", reason: "Practice safe ‘urge surfing’ reps." },
            { kind: "candle", sku: "i-am-resilient", reason: "Symbolize strength through storms." }
          ]
        },
        {
          key: "connector_regulator",
          label: "Connector-Regulator",
          headline: "You **may be** a Connector-Regulator.",
          summary:
            "Co-regulation works for you—safe people and spaces help your system settle.",
          guidance: [
            "Pick 1–2 steady people and agree on 60-sec check-in scripts.",
            "Use voice notes for tone if text escalates misunderstanding.",
            "Blend co-reg with a body cue (breathe while you share)."
          ],
          product_suggestions: [
            { kind: "ritual", sku: "checkin-script", reason: "Shared scripts reduce friction." },
            { kind: "candle", sku: "i-am-open", reason: "Invite receptive presence." }
          ]
        },
        {
          key: "boundary_architect",
          label: "Boundary Architect",
          headline: "You **may be** a Boundary Architect.",
          summary:
            "You regulate by shaping context—limits, time-boxing, exits, and stimulus control.",
          guidance: [
            "Use compassionate exits: “I care and I’ll return at ___.”",
            "Time-box social plans and protect decompression windows.",
            "Design your space for calm (lighting, notifications, noise)."
          ],
          product_suggestions: [
            { kind: "planner", sku: "boundary-kit", reason: "Script and track your limits." },
            { kind: "candle", sku: "i-am-grounded", reason: "Anchor the boundary ritual." }
          ]
        }
      ],

      // ---------- QUESTIONS (16) ----------
      questions: [
        /* ===== Scenarios (8) ===== */
        {
          id: "s1",
          prompt: "You’re running late and feel your chest tighten. What’s your first move?",
          optional: false,
          options: [
            { key: "s1_a", label: "Slow your breathing, drop your shoulders, steady your pace.",
              weights: { somatic_grounder: 2 }, tags: ["time-pressure"] },
            { key: "s1_b", label: "Text a short heads-up, then plan the next 10 minutes.",
              weights: { deliberate_pauser: 1, boundary_architect: 1 }, tags: ["time-pressure"] },
            { key: "s1_c", label: "Tell yourself: “I’m safe; one thing at a time.”",
              weights: { reframer: 2 }, tags: ["grounding-selftalk"] },
            { key: "s1_d", label: "Call a steady friend for a 60-sec pep talk.",
              weights: { connector_regulator: 2 }, tags: ["co-reg"] }
          ]
        },
        {
          id: "s2",
          prompt: "A disagreement heats up with someone you care about. You…",
          optional: false,
          options: [
            { key: "s2_a", label: "Ask for 10 minutes to cool off and promise a return time.",
              weights: { deliberate_pauser: 2, boundary_architect: 1 }, tags: ["conflict-trigger"] },
            { key: "s2_b", label: "Reflect back what you heard before sharing your view.",
              weights: { reframer: 1, connector_regulator: 1 }, tags: ["conflict-trigger"] },
            { key: "s2_c", label: "Take a quick walk/drink water, then rejoin.",
              weights: { somatic_grounder: 2 }, tags: ["conflict-trigger"] },
            { key: "s2_d", label: "Agree to park it and schedule a calmer time.",
              weights: { boundary_architect: 2 }, tags: ["conflict-trigger"] }
          ]
        },
        {
          id: "s3",
          prompt: "A free Saturday arrives. What sounds most like you?",
          optional: false,
          options: [
            { key: "s3_a", label: "Solo rituals—reading, journaling, a quiet walk.",
              weights: { boundary_architect: 1, wave_rider: 1 }, tags: ["restorativeness"] },
            { key: "s3_b", label: "A calm coffee with one close person.",
              weights: { connector_regulator: 2 }, tags: ["cozy-social"] },
            { key: "s3_c", label: "Mix: a little solo time, a brief plan with friends.",
              weights: { deliberate_pauser: 1, connector_regulator: 1 }, tags: ["balance"] },
            { key: "s3_d", label: "Brunch + browsing with a few friends.",
              weights: { connector_regulator: 2 }, tags: ["social-energy"] },
            { key: "s3_e", label: "Full day out—markets, events, and a group dinner.",
              weights: { connector_regulator: 2 }, tags: ["high-social"] }
          ]
        },
        {
          id: "s4",
          prompt: "Critical feedback lands bluntly at work. Your move?",
          optional: false,
          options: [
            { key: "s4_a", label: "Ask 2 clarifying questions, summarize next steps.",
              weights: { deliberate_pauser: 1, reframer: 1 }, tags: ["work-stress"] },
            { key: "s4_b", label: "Reframe: “This is data, not a verdict.”",
              weights: { reframer: 2 }, tags: ["work-stress", "reframe"] },
            { key: "s4_c", label: "DM a trusted colleague for a temperature check.",
              weights: { connector_regulator: 2 }, tags: ["co-reg", "work-stress"] },
            { key: "s4_d", label: "Jot feelings privately; reply after lunch.",
              weights: { deliberate_pauser: 1, wave_rider: 1 }, tags: ["work-stress", "rumination-loop"] }
          ]
        },
        {
          id: "s5",
          prompt: "A plan you were excited about gets canceled last minute. You…",
          optional: false,
          options: [
            { key: "s5_a", label: "Name the feeling and pick a backup plan.",
              weights: { reframer: 1, wave_rider: 1 }, tags: ["disappointment"] },
            { key: "s5_b", label: "Create a small solo ritual to honor the letdown.",
              weights: { somatic_grounder: 1, wave_rider: 1 }, tags: ["disappointment"] },
            { key: "s5_c", label: "Reframe the bonus time and pivot intentionally.",
              weights: { reframer: 2 }, tags: ["reframe"] },
            { key: "s5_d", label: "Call a friend and co-plan something new.",
              weights: { connector_regulator: 2 }, tags: ["co-reg"] }
          ]
        },
        {
          id: "s6",
          prompt: "You feel socially overstimulated at an event.",
          optional: false,
          options: [
            { key: "s6_a", label: "Step outside, breathe, water, time-limit your stay.",
              weights: { boundary_architect: 1, somatic_grounder: 1 }, tags: ["social-overload"] },
            { key: "s6_b", label: "Find one safe person and relocate somewhere quieter.",
              weights: { connector_regulator: 1, boundary_architect: 1 }, tags: ["social-overload", "co-reg"] },
            { key: "s6_c", label: "Tell the host you’ll head out soon; exit in 10 minutes.",
              weights: { boundary_architect: 2 }, tags: ["social-overload"] },
            { key: "s6_d", label: "Push through and plan to recover later.",
              weights: { wave_rider: 1 }, tags: ["social-overload"] }
          ]
        },
        {
          id: "s7",
          prompt: "You snapped at someone by accident.",
          optional: false,
          options: [
            { key: "s7_a", label: "Pause, apologize for tone, restate your need.",
              weights: { deliberate_pauser: 1, wave_rider: 1 }, tags: ["repair"] },
            { key: "s7_b", label: "Notice the trigger and plan a boundary for next time.",
              weights: { boundary_architect: 2 }, tags: ["repair", "pattern"] },
            { key: "s7_c", label: "Ground your body first, then revisit the convo.",
              weights: { somatic_grounder: 2 }, tags: ["repair"] },
            { key: "s7_d", label: "Ask for a reset and reflect together.",
              weights: { connector_regulator: 2 }, tags: ["repair", "co-reg"] }
          ]
        },
        {
          id: "s8",
          prompt: "Multiple demands ping you all at once.",
          optional: false,
          options: [
            { key: "s8_a", label: "Triage: pick one thing, time-box 15 minutes.",
              weights: { deliberate_pauser: 1, boundary_architect: 1 }, tags: ["overwhelm"] },
            { key: "s8_b", label: "Reframe urgency; make a gentle sequence.",
              weights: { reframer: 2 }, tags: ["overwhelm"] },
            { key: "s8_c", label: "Ask for help / delegate one task.",
              weights: { connector_regulator: 2 }, tags: ["overwhelm", "co-reg"] },
            { key: "s8_d", label: "Quick somatic reset (stretch/water/light).",
              weights: { somatic_grounder: 2 }, tags: ["overwhelm"] }
          ]
        },

        /* ===== Likert (5) =====
           Use keys sd/d/n/a/sa mapped to 0/1/?, but we score +0/+1/+2 via relative tilt.
           (Your evaluator uses weights per selected option.)
        */
        {
          id: "l1",
          prompt: "Naming my exact feeling usually calms me.",
          optional: false,
          options: [
            { key: "sd", label: "Strongly disagree", weights: { } },
            { key: "d",  label: "Disagree",          weights: { } },
            { key: "n",  label: "Neutral",           weights: { } },
            { key: "a",  label: "Agree",             weights: { reframer: 1 } },
            { key: "sa", label: "Strongly agree",    weights: { reframer: 2 } }
          ]
        },
        {
          id: "l2",
          prompt: "I can delay a reaction even when I’m heated.",
          optional: false,
          options: [
            { key: "sd", label: "Strongly disagree", weights: { } },
            { key: "d",  label: "Disagree",          weights: { } },
            { key: "n",  label: "Neutral",           weights: { } },
            { key: "a",  label: "Agree",             weights: { deliberate_pauser: 1 } },
            { key: "sa", label: "Strongly agree",    weights: { deliberate_pauser: 2 } }
          ]
        },
        {
          id: "l3",
          prompt: "Changing the story I tell myself can shift my mood.",
          optional: false,
          options: [
            { key: "sd", label: "Strongly disagree", weights: { } },
            { key: "d",  label: "Disagree",          weights: { } },
            { key: "n",  label: "Neutral",           weights: { } },
            { key: "a",  label: "Agree",             weights: { reframer: 1 } },
            { key: "sa", label: "Strongly agree",    weights: { reframer: 2 } }
          ]
        },
        {
          id: "l4",
          prompt: "I can ride difficult feelings without numbing or escaping.",
          optional: false,
          options: [
            { key: "sd", label: "Strongly disagree", weights: { } },
            { key: "d",  label: "Disagree",          weights: { } },
            { key: "n",  label: "Neutral",           weights: { } },
            { key: "a",  label: "Agree",             weights: { wave_rider: 1 } },
            { key: "sa", label: "Strongly agree",    weights: { wave_rider: 2 } }
          ]
        },
        {
          id: "l5",
          prompt: "Asking someone I trust for co-support helps me regulate.",
          optional: false,
          options: [
            { key: "sd", label: "Strongly disagree", weights: { } },
            { key: "d",  label: "Disagree",          weights: { } },
            { key: "n",  label: "Neutral",           weights: { } },
            { key: "a",  label: "Agree",             weights: { connector_regulator: 1 } },
            { key: "sa", label: "Strongly agree",    weights: { connector_regulator: 2 } }
          ]
        },

        /* ===== Head-to-Head (2) ===== */
        {
          id: "h1",
          prompt: "What helps more in the first 60 seconds of a spike?",
          optional: false,
          options: [
            { key: "h1_a", label: "Body reset: breath, posture, brief movement.",
              weights: { somatic_grounder: 2 } },
            { key: "h1_b", label: "Thought reset: mantra or quick reframe.",
              weights: { reframer: 2 } }
          ]
        },
        {
          id: "h2",
          prompt: "In conflict, your go-to repair move is:",
          optional: false,
          options: [
            { key: "h2_a", label: "Time-out with a clear return plan.",
              weights: { deliberate_pauser: 2, boundary_architect: 1 } },
            { key: "h2_b", label: "Stay present and reflect back feelings.",
              weights: { connector_regulator: 2 } }
          ]
        },

        /* ===== Quick Preference (1) ===== */
        {
          id: "qp1",
          prompt: "When I’m overwhelmed, my most reliable doorway is…",
          optional: false,
          options: [
            { key: "qp1_a", label: "Move my body / breathe.",
              weights: { somatic_grounder: 2 } },
            { key: "qp1_b", label: "Name it to tame it.",
              weights: { reframer: 2 } },
            { key: "qp1_c", label: "Pause & choose deliberately.",
              weights: { deliberate_pauser: 2 } },
            { key: "qp1_d", label: "Phone-a-friend / safe person.",
              weights: { connector_regulator: 2 } },
            { key: "qp1_e", label: "Shape the setting / set a limit.",
              weights: { boundary_architect: 2 } }
          ]
        }
      ]
    }
  };

  console.log('→ Upserting quiz…');
  const { data, error } = await admin
    .from('quizzes')
    .upsert(quiz, { onConflict: 'slug' })
    .select('id, slug, title, category, is_published');

  if (error) {
    console.error('❌ Error seeding Emotional Regulation:', error);
    process.exit(1);
  }
  console.log('✅ Seeded:', data?.[0]?.slug, '| published =', data?.[0]?.is_published);
  console.log('--- Done: emotional-regulation ---');
}

main().catch((e) => {
  console.error('❌ Uncaught in seed:', e);
  process.exit(1);
});

