// scripts/seed_attachment_style.mjs

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;


const admin = createClient(url, key);

async function main() {
  const quiz = {
    slug: "attachment-style",
    title: "What Is Your Attachment Style?",
    category: "Romance",
    description:
      "Discover how you bond, trust, and seek closeness in relationships. This is reflective guidance — not a verdict. Your result will say “may be your style…” by design.",
    is_published: true,
    questions: {
      version: 3,
      min_required: 7,
      results: [
        {
          key: "secure",
          label: "Secure Attachment",
          headline: "You may lean toward a Secure Style.",
          summary:
            "You feel comfortable with intimacy and independence. Trust, openness, and balance shape your relationships.",
          guidance: [
            "Celebrate your steadiness, and honor your own needs as you support others.",
            "Use your stability to anchor relationships without overextending yourself."
          ],
          product_suggestions: [
            { kind: "candle", sku: "i-am-grateful", reason: "Deepen appreciation rituals." },
            { kind: "candle", sku: "i-am-love",     reason: "Anchor warm, steady connection." }
          ]
        },
        {
          key: "anxious",
          label: "Anxious Attachment",
          headline: "You may lean toward an Anxious Style.",
          summary:
            "You love deeply and give generously, but may fear abandonment or crave frequent reassurance.",
          guidance: [
            "Ground in rituals that affirm your inherent worth.",
            "Cultivate self-reassurance alongside seeking support from partners."
          ],
          product_suggestions: [
            { kind: "candle", sku: "i-am-enough", reason: "Affirm unconditional self-worth." },
            { kind: "candle", sku: "i-am-love",   reason: "Channel devotion into healthy expression." }
          ]
        },
        {
          key: "avoidant",
          label: "Avoidant Attachment",
          headline: "You may lean toward an Avoidant Style.",
          summary:
            "You value independence and self-reliance, but vulnerability or closeness can feel uncomfortable.",
          guidance: [
            "Practice small, safe steps toward openness with trusted people.",
            "Create rituals to share without feeling engulfed."
          ],
          product_suggestions: [
            { kind: "candle", sku: "i-am-confident", reason: "Encourage safe, bold expression." },
            { kind: "candle", sku: "i-am-healthy",   reason: "Reinforce steadiness and self-trust." }
          ]
        },
        {
          key: "disorganized",
          label: "Disorganized (Fearful-Avoidant) Attachment",
          headline: "You may lean toward a Disorganized Style.",
          summary:
            "You long for closeness but also fear it, often swinging between pursuit and withdrawal.",
          guidance: [
            "Hold compassion for your contradictions — they reflect deep sensitivity.",
            "Use journaling and breath to bridge the push-pull and grow self-trust."
          ],
          product_suggestions: [
            { kind: "candle", sku: "i-am-who-i-am", reason: "Honor your whole, complex self." },
            { kind: "candle", sku: "i-am-enough",   reason: "Anchor into steady self-worth." }
          ]
        }
      ],
      questions: [
        {
          id: "q1",
          prompt: "How do you usually feel when someone wants to get emotionally close to you?",
          optional: false,
          options: [
            { key: "safe", label: "Safe, warm, natural.", weights: { secure: 2 } },
            { key: "overjoyed", label: "Overjoyed, though I sometimes fear losing it.", weights: { anxious: 2 },
              suggestion: "If joy brings a hint of fear, try a two-breath pause to let your body feel safe receiving care.",
              tags: ["anxious-openness"]
            },
            { key: "suffocated", label: "A little overwhelmed by closeness.", weights: { avoidant: 2 },
              suggestion: "You can set gentle boundaries and still stay present — share one feeling, then take a breath.",
              tags: ["avoidant-intimacy"]
            },
            { key: "torn", label: "Torn — I want it, and I fear it.", weights: { disorganized: 2 },
              suggestion: "Name both truths: ‘I want closeness and I feel scared.’ Naming can reduce the push–pull.",
              tags: ["disorg-intimacy"]
            }
          ]
        },
        {
          id: "q2",
          prompt: "When conflict arises, how do you usually respond?",
          optional: false,
          options: [
            { key: "calm", label: "Stay calm and talk it through.", weights: { secure: 2 } },
            { key: "worry", label: "Worry they’ll leave me.", weights: { anxious: 2 },
              suggestion: "Before reaching out, place a hand on your chest and say: ‘I am worthy of steady love.’",
              tags: ["anxious-conflict"]
            },
            { key: "shutdown", label: "Shut down or avoid it.", weights: { avoidant: 2 },
              suggestion: "Try sharing one sentence (no solutions yet): ‘I need a moment, and I care about this.’",
              tags: ["avoidant-conflict"]
            },
            { key: "swing", label: "Cling, then withdraw — it varies.", weights: { disorganized: 2 },
              suggestion: "Invite structure: agree on a time to talk and a time to pause. Rhythm reduces volatility.",
              tags: ["disorg-conflict"]
            }
          ]
        },
        {
          id: "q3",
          prompt: "After an argument, I usually…",
          optional: false,
          options: [
            { key: "trust", label: "Trust we’ll resolve it.", weights: { secure: 2 } },
            { key: "replay", label: "Replay it endlessly, fear damage.", weights: { anxious: 2 },
              suggestion: "Journal a 3-line summary and a 1-line takeaway. Then close the notebook — loop complete.",
              tags: ["anxious-rumination"]
            },
            { key: "ignore", label: "Move on quickly, skip the feelings part.", weights: { avoidant: 2 },
              suggestion: "Try a 60-second debrief with yourself: ‘What did I feel? What do I need?’",
              tags: ["avoidant-debrief"]
            },
            { key: "conflict", label: "Feel desperate for repair and scared to engage.", weights: { disorganized: 2 },
              suggestion: "Co-create a repair ritual: a safe word, a tea, and 10 minutes of reflective listening.",
              tags: ["disorg-repair"]
            }
          ]
        },
        {
          id: "q4",
          prompt: "Which balance feels most natural to you?",
          optional: false,
          options: [
            { key: "balanced", label: "Intimacy and independence in balance.", weights: { secure: 2 } },
            { key: "closeness", label: "Lots of closeness and reassurance.", weights: { anxious: 2 }, tags: ["anxious-closeness"] },
            { key: "space", label: "More space and independence.", weights: { avoidant: 2 }, tags: ["avoidant-space"] },
            { key: "pull", label: "Desire closeness but push away when it appears.", weights: { disorganized: 2 }, tags: ["disorg-approach-avoid"] }
          ]
        },
        {
          id: "q5",
          prompt: "When someone pulls away, I usually…",
          optional: false,
          options: [
            { key: "space", label: "Give them space, stay trusting.", weights: { secure: 2 } },
            { key: "chase", label: "Feel urgent or chase.", weights: { anxious: 2 },
              suggestion: "Try a 5-minute timer before texting — breathe, write, then choose if you still want to send.",
              tags: ["anxious-pursuit", "comm-trigger"]
            },
            { key: "relief", label: "Feel relief and keep more distance.", weights: { avoidant: 2 },
              suggestion: "If you want connection later, schedule it now: ‘Can we talk at 7?’ Boundaries + bond.",
              tags: ["avoidant-distance"]
            },
            { key: "panic", label: "Feel both panic and distrust.", weights: { disorganized: 2 },
              suggestion: "Name your nervous system state (fight/flight/freeze) and choose one body-based reset.",
              tags: ["disorg-panic"]
            }
          ]
        },
        {
          id: "q6",
          prompt: "Which statement feels most true?",
          optional: false,
          options: [
            { key: "dependable", label: "People are dependable.", weights: { secure: 2 } },
            { key: "leave", label: "People often leave or stop caring.", weights: { anxious: 2 }, tags: ["anxious-belief"] },
            { key: "selfrely", label: "Rely on yourself first; closeness is secondary.", weights: { avoidant: 2 }, tags: ["avoidant-belief"] },
            { key: "dangerous", label: "People can be unpredictable or unsafe.", weights: { disorganized: 2 }, tags: ["disorg-belief"] }
          ]
        },
        {
          id: "q7",
          prompt: "I usually express love by…",
          optional: false,
          options: [
            { key: "support", label: "Consistency and support.", weights: { secure: 2 } },
            { key: "attention", label: "Extra reassurance and attention.", weights: { anxious: 2 }, tags: ["anxious-reassure"] },
            { key: "practical", label: "Acts of independence/practical help.", weights: { avoidant: 2 }, tags: ["avoidant-practical"] },
            { key: "hesitant", label: "Both longing and hesitation.", weights: { disorganized: 2 }, tags: ["disorg-hesitation"] }
          ]
        },
        {
          id: "q8",
          prompt: "When someone doesn’t respond to your messages for a while, how do you usually feel?",
          optional: false,
          options: [
            { key: "trust", label: "They’ll reply when they can.", weights: { secure: 2 } },
            { key: "ruminate", label: "Anxious — I replay what I did wrong.", weights: { anxious: 2 },
              suggestion: "Whisper: ‘Their silence is not my story.’ Send a gratitude text later, not a probe.",
              tags: ["anxious-comm", "comm-trigger"]
            },
            { key: "relieved", label: "Relieved — I like the space.", weights: { avoidant: 2 },
              suggestion: "If connection matters, put a gentle touchpoint on the calendar now.",
              tags: ["avoidant-comm"]
            },
            { key: "conflicted", label: "Both anxious and distrustful; I hesitate.", weights: { disorganized: 2 },
              suggestion: "Try a two-step: regulate first, then draft (not send) what you wish to say.",
              tags: ["disorg-comm", "comm-trigger"]
            }
          ]
        },
        {
          id: "q9",
          prompt: "When a relationship ends, my first instinct is…",
          optional: false,
          options: [
            { key: "accept", label: "Accept and honor the closure.", weights: { secure: 2 } },
            { key: "panic", label: "Panic, plead, or obsess.", weights: { anxious: 2 },
              suggestion: "A closing ritual helps: light a candle, write a goodbye, name one lesson to keep.",
              tags: ["anxious-breakup"]
            },
            { key: "detach", label: "Detach quickly and move on.", weights: { avoidant: 2 },
              suggestion: "Leave room for meaning: one compassionate check-in with yourself before you close.",
              tags: ["avoidant-breakup"]
            },
            { key: "swing", label: "Swing between desperation and withdrawal.", weights: { disorganized: 2 },
              suggestion: "Ask a trusted friend to co-create a gentle plan for the first 72 hours.",
              tags: ["disorg-breakup"]
            }
          ]
        },
        {
          id: "q10",
          prompt: "How do you feel when someone shows you consistent love and care?",
          optional: false,
          options: [
            { key: "receptive", label: "Grateful, receptive, comfortable.", weights: { secure: 2 } },
            { key: "relief", label: "Relieved — but I still fear it won’t last.", weights: { anxious: 2 },
              suggestion: "Practice receiving without preparing for loss. ‘Today I receive; tomorrow is tomorrow.’",
              tags: ["anxious-receiving"]
            },
            { key: "uneasy", label: "Uncomfortable — too much closeness overwhelms.", weights: { avoidant: 2 },
              suggestion: "You can co-author the pace: name what feels nourishing, and set a rhythm.",
              tags: ["avoidant-receiving"]
            },
            { key: "doubt", label: "Conflicted — part of me leans in, part doubts.", weights: { disorganized: 2 },
              suggestion: "Try a micro-dose of intimacy (5 minutes) followed by a breath ritual to anchor safety.",
              tags: ["disorg-receiving"]
            }
          ]
        }
      ]
    }
  };

  const { data, error } = await admin
    .from("quizzes")
    .upsert(quiz, { onConflict: "slug" })
    .select();

  if (error) {
    console.error("❌ Error seeding Attachment Style Quiz:", error);
    process.exit(1);
  } else {
    console.log("✅ Attachment Style Quiz seeded:", data?.[0]?.slug || "ok");
  }
}

main();

