// scripts/seedApologyStyle.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;



const admin = createClient(url, key);

async function main() {
  const quiz = {
    slug: "apology-style",
    title: "What’s Your Apology Style?",
    category: "Relationships",
    description:
      "We all say 'sorry' differently. This reflective quiz explores how you naturally give apologies. Results say “may be your…” on purpose.",
    is_published: true,
    questions: {
      version: 1,
      min_required: 7,
      results: [
        { key: "verbal", label: "The Verbal Acknowledger", headline: "This may be your apology style: Verbal Acknowledger.", summary: "You say the words. Clarity and acknowledgment matter most to you.", guidance: ["Be direct: 'I’m sorry for ___.'", "Pair words with one supportive gesture."] },
        { key: "responsibility", label: "The Responsibility-Taker", headline: "This may be your apology style: Responsibility-Taker.", summary: "You own fault without excuses, which builds deep trust.", guidance: ["Balance accountability with warmth.", "Avoid over-apologizing for what isn’t yours."] },
        { key: "behavior", label: "The Behavior-Changer", headline: "This may be your apology style: Behavior-Changer.", summary: "Your focus is: don’t repeat the hurt. Changed behavior is your proof.", guidance: ["Tell them what change you’re making so they notice.", "Celebrate progress, not perfection."] },
        { key: "amends", label: "The Amends-Maker", headline: "This may be your apology style: Amends-Maker.", summary: "You show repair through action: fixing, replacing, or balancing the harm.", guidance: ["Ask what repair matters most to them.", "Small thoughtful acts can outweigh big grand ones."] },
        { key: "empathy", label: "The Empathizer", headline: "This may be your apology style: Empathizer.", summary: "You lead with emotional validation. Sitting with their feelings is your apology.", guidance: ["Keep listening until they exhale.", "Pair empathy with a practical step forward."] },
        { key: "time", label: "The Time-Giver", headline: "This may be your apology style: Time-Giver.", summary: "You believe consistency rebuilds trust. Space + steady follow-through is your way.", guidance: ["Name your intention so the wait doesn’t feel like silence.", "Check in gently at intervals."] },
        { key: "gesture", label: "The Gesture-Giver", headline: "This may be your apology style: Gesture-Giver.", summary: "You offer tangible signs — gifts, acts, tokens — to express care.", guidance: ["Pair the gesture with words of acknowledgment.", "Make sure it feels meaningful, not transactional."] }
      ],
      questions: [
        { id: "q1", prompt: "When you realize you’ve hurt someone, what do you most often do first?", options: [
          { key: "a", label: "Say 'I’m sorry' directly.", weights: { verbal: 2 }, suggestion: "Clarity first: keep it short, honest, direct." },
          { key: "b", label: "Admit fault right away.", weights: { responsibility: 2 }, suggestion: "Owning it builds trust quickly." },
          { key: "c", label: "Show through action I won’t repeat it.", weights: { behavior: 2 }, suggestion: "Name the change so they see it." },
          { key: "d", label: "Offer a token gesture (help, gift, note).", weights: { gesture: 2 }, suggestion: "Pair the gesture with words for balance." }
        ]},
        { id: "q2", prompt: "What makes your apology feel sincere to you?", options: [
          { key: "a", label: "Naming the harm out loud.", weights: { verbal: 2 } },
          { key: "b", label: "Saying 'I was wrong.'", weights: { responsibility: 2 } },
          { key: "c", label: "Taking concrete steps.", weights: { behavior: 2, amends: 1 } },
          { key: "d", label: "Validating their feelings.", weights: { empathy: 2 } }
        ]},
        { id: "q3", prompt: "Right after conflict, you usually…", options: [
          { key: "a", label: "Apologize with words first.", weights: { verbal: 2 } },
          { key: "b", label: "Acknowledge fault immediately.", weights: { responsibility: 2 } },
          { key: "c", label: "Do something to help or fix.", weights: { amends: 2 } },
          { key: "d", label: "Offer space, then return calmly.", weights: { time: 2 } }
        ]},
        { id: "q4", prompt: "An apology feels incomplete if you don’t…", options: [
          { key: "a", label: "Say the words 'I’m sorry.'", weights: { verbal: 2 } },
          { key: "b", label: "State your role clearly.", weights: { responsibility: 2 } },
          { key: "c", label: "Change your behavior.", weights: { behavior: 2 } },
          { key: "d", label: "Repair with a gesture.", weights: { amends: 2, gesture: 1 } }
        ]},
        { id: "q5", prompt: "To rebuild trust, you most often…", options: [
          { key: "a", label: "Use consistent words of apology.", weights: { verbal: 2, time: 1 } },
          { key: "b", label: "Keep admitting fault if it resurfaces.", weights: { responsibility: 2 } },
          { key: "c", label: "Demonstrate steady change.", weights: { behavior: 2, time: 1 } },
          { key: "d", label: "Give a thoughtful gift or act.", weights: { gesture: 2 } }
        ]},
        { id: "q6", prompt: "Before you consider an apology done, you usually check…", options: [
          { key: "a", label: "Did I name the harm?", weights: { verbal: 2 } },
          { key: "b", label: "Did I own it fully?", weights: { responsibility: 2 } },
          { key: "c", label: "Did I change something concrete?", weights: { behavior: 2 } },
          { key: "d", label: "Did I reflect their feelings?", weights: { empathy: 2 } }
        ]},
        { id: "q7", prompt: "If repair takes time, your focus is on…", options: [
          { key: "a", label: "Keeping words clear.", weights: { verbal: 1, time: 1 } },
          { key: "b", label: "Admitting slips quickly.", weights: { responsibility: 2 } },
          { key: "c", label: "Showing small steady changes.", weights: { behavior: 2, time: 1 } },
          { key: "d", label: "Checking in on their feelings.", weights: { empathy: 2 } }
        ]},
        { id: "q8", prompt: "The apology line you use most is…", options: [
          { key: "a", label: "“I’m sorry I hurt you.”", weights: { verbal: 2 } },
          { key: "b", label: "“I was wrong.”", weights: { responsibility: 2 } },
          { key: "c", label: "“Here’s what I’ll do differently.”", weights: { behavior: 2 } },
          { key: "d", label: "“I hear you felt __.”", weights: { empathy: 2 } }
        ]},
        { id: "q9", prompt: "Weeks later, you usually…", options: [
          { key: "a", label: "Re-state boundaries clearly.", weights: { verbal: 2 } },
          { key: "b", label: "Admit impact if it resurfaces.", weights: { responsibility: 2 } },
          { key: "c", label: "Keep proving consistency.", weights: { time: 2, behavior: 1 } },
          { key: "d", label: "Offer small gifts or notes.", weights: { gesture: 2 } }
        ]},
        { id: "q10", prompt: "If someone needs something different than your default, you usually…", options: [
          { key: "a", label: "Ask them to clarify what words matter.", weights: { verbal: 2 } },
          { key: "b", label: "Invite them to state what ownership they need.", weights: { responsibility: 2 } },
          { key: "c", label: "Co-create a visible change.", weights: { behavior: 2, amends: 1 } },
          { key: "d", label: "Sit with their feelings first.", weights: { empathy: 2 } }
        ]}
      ]
    }
  };

  const { data, error } = await admin.from("quizzes").upsert(quiz, { onConflict: "slug" }).select();
  if (error) console.error("❌ Error seeding Apology Style quiz:", error);
  else console.log("✅ Apology Style quiz seeded:", data);
}

main();

