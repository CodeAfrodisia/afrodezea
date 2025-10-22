import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;



const admin = createClient(url, key);


async function main() {
  const quiz = {
    slug: "forgiveness-language",
    title: "What’s Your Forgiveness Language?",
    category: "Relationships",
    description:
      "We all receive apologies differently. This reflective quiz explores what makes an apology feel real to you. Results say “may be your…” on purpose.",
    is_published: true,
    questions: {
      version: 1,
      min_required: 7,
      results: [
        { key: "verbal", label: "Needs to Hear the Words", headline: "This may be your forgiveness language: Hearing the Words.", summary: "Apologies feel real when you hear 'I’m sorry' or the harm is clearly named.", guidance: ["Ask others to be specific in their words.", "Don’t dismiss gestures — pair them with clarity."] },
        { key: "responsibility", label: "Needs to See Ownership", headline: "This may be your forgiveness language: Seeing Ownership.", summary: "You need the other person to own their role without excuses.", guidance: ["Clarify that honesty matters more than perfection.", "Affirm ownership when you hear it."] },
        { key: "behavior", label: "Needs Changed Behavior", headline: "This may be your forgiveness language: Changed Behavior.", summary: "You forgive when you see consistent changes, not just words.", guidance: ["Notice small steps forward.", "Balance patience with clear boundaries."] },
        { key: "amends", label: "Needs Amends", headline: "This may be your forgiveness language: Amends.", summary: "You forgive when action is taken to repair the harm or restore balance.", guidance: ["Communicate what kind of repair matters most.", "Don’t confuse gifts with true amends."] },
        { key: "empathy", label: "Needs Emotional Validation", headline: "This may be your forgiveness language: Emotional Validation.", summary: "You forgive when your feelings are acknowledged and cared for.", guidance: ["Be clear about naming the emotion you want reflected.", "Pair validation with clarity so it doesn’t feel vague."] },
        { key: "time", label: "Needs Consistency Over Time", headline: "This may be your forgiveness language: Consistency Over Time.", summary: "You forgive when trust is rebuilt steadily across days and weeks.", guidance: ["Communicate the pace you need.", "Celebrate consistency when it shows up."] },
        { key: "gesture", label: "Needs Gestures", headline: "This may be your forgiveness language: Gestures.", summary: "You forgive when apologies are expressed through tangible effort — notes, acts, tokens.", guidance: ["Ask for gestures that feel authentic, not generic.", "Pair with words for maximum impact."] }
      ],
      questions: [
        { id: "q1", prompt: "When someone hurts you, what do you most need first?", options: [
          { key: "a", label: "Hear them say 'I’m sorry.'", weights: { verbal: 2 } },
          { key: "b", label: "See them admit it was their fault.", weights: { responsibility: 2 } },
          { key: "c", label: "Notice them acting differently.", weights: { behavior: 2 } },
          { key: "d", label: "Receive a thoughtful gesture (note, gift, action).", weights: { gesture: 2 } }
        ]},
        { id: "q2", prompt: "What makes an apology feel sincere to you?", options: [
          { key: "a", label: "Clear naming of the harm.", weights: { verbal: 2 } },
          { key: "b", label: "Owning their role without excuses.", weights: { responsibility: 2 } },
          { key: "c", label: "Taking concrete steps to fix it.", weights: { behavior: 2, amends: 1 } },
          { key: "d", label: "Validating your feelings.", weights: { empathy: 2 } }
        ]},
        { id: "q3", prompt: "Right after conflict, what helps you most to forgive?", options: [
          { key: "a", label: "Hearing them apologize in words.", weights: { verbal: 2 } },
          { key: "b", label: "Hearing them admit fault clearly.", weights: { responsibility: 2 } },
          { key: "c", label: "Seeing them try to repair with action.", weights: { amends: 2 } },
          { key: "d", label: "Them giving you a bit of space, then returning calmly.", weights: { time: 2 } }
        ]},
        { id: "q4", prompt: "An apology feels incomplete if they don’t…", options: [
          { key: "a", label: "Say the words 'I’m sorry.'", weights: { verbal: 2 } },
          { key: "b", label: "Own their part of the harm.", weights: { responsibility: 2 } },
          { key: "c", label: "Change their behavior afterward.", weights: { behavior: 2 } },
          { key: "d", label: "Repair with a gesture or amends.", weights: { amends: 2, gesture: 1 } }
        ]},
        { id: "q5", prompt: "To rebuild trust, you need them to…", options: [
          { key: "a", label: "Keep apologizing in words until it lands.", weights: { verbal: 2, time: 1 } },
          { key: "b", label: "Keep owning their fault if it resurfaces.", weights: { responsibility: 2 } },
          { key: "c", label: "Prove through consistent action.", weights: { behavior: 2, time: 1 } },
          { key: "d", label: "Offer a thoughtful gift or act.", weights: { gesture: 2 } }
        ]},
        { id: "q6", prompt: "Before you consider an apology 'real,' you need…", options: [
          { key: "a", label: "To hear them name the harm.", weights: { verbal: 2 } },
          { key: "b", label: "To hear them take full ownership.", weights: { responsibility: 2 } },
          { key: "c", label: "To see actual change.", weights: { behavior: 2 } },
          { key: "d", label: "To feel your feelings acknowledged.", weights: { empathy: 2 } }
        ]},
        { id: "q7", prompt: "If repair takes time, you most need…", options: [
          { key: "a", label: "Consistent clarity in words.", weights: { verbal: 1, time: 1 } },
          { key: "b", label: "Owning slips if they happen.", weights: { responsibility: 2 } },
          { key: "c", label: "Visible small steady changes.", weights: { behavior: 2, time: 1 } },
          { key: "d", label: "Gentle emotional check-ins.", weights: { empathy: 2 } }
        ]},
        { id: "q8", prompt: "Which apology line lands best for you?", options: [
          { key: "a", label: "“I’m sorry I hurt you.”", weights: { verbal: 2 } },
          { key: "b", label: "“I was wrong.”", weights: { responsibility: 2 } },
          { key: "c", label: "“Here’s what I’ll do differently.”", weights: { behavior: 2 } },
          { key: "d", label: "“I hear you felt __.”", weights: { empathy: 2 } }
        ]},
        { id: "q9", prompt: "Weeks later, forgiveness feels real when…", options: [
          { key: "a", label: "They re-state their apologies clearly.", weights: { verbal: 2 } },
          { key: "b", label: "They still own the impact.", weights: { responsibility: 2 } },
          { key: "c", label: "They’ve proven steady consistency.", weights: { time: 2, behavior: 1 } },
          { key: "d", label: "They offer thoughtful gestures.", weights: { gesture: 2 } }
        ]},
        { id: "q10", prompt: "If you need something different than their default apology, you want them to…", options: [
          { key: "a", label: "Ask you what words matter most.", weights: { verbal: 2 } },
          { key: "b", label: "Ask you what ownership you need.", weights: { responsibility: 2 } },
          { key: "c", label: "Agree on a visible change together.", weights: { behavior: 2, amends: 1 } },
          { key: "d", label: "Reflect your feelings first.", weights: { empathy: 2 } }
        ]}
      ]
    }
  };

  const { data, error } = await admin.from("quizzes").upsert(quiz, { onConflict: "slug" }).select();
  if (error) console.error("❌ Error seeding Forgiveness Language quiz:", error);
  else console.log("✅ Forgiveness Language quiz seeded:", data);
}

main();
