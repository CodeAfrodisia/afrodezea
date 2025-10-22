// src/components/account/logJournalAnalysis.js
import { supabase } from "@lib/supabaseClient.js";
import { extractKeywords } from "@logic/updateKeywordTracker.js";

// TEMP stub – replace with your real analyzer when ready
const analyzeSentiment = async (text) => ({ sentimentScore: 0.5, sentimentComparative: 0.95 });

export async function logJournalAnalysis(userId, moodId, journalText) {
  if (!userId || !moodId || !journalText) return;

  try {
    const { sentimentScore, sentimentComparative } = await analyzeSentiment(journalText);
    const keywords = extractKeywords(journalText).slice(0, 5).map(k => k.keyword);

    const { error } = await supabase.from("journal_analysis").insert([{
      user_id: userId,
      mood_id: moodId,
      sentiment_score: sentimentScore,
      sentiment_comparative: sentimentComparative,
      top_keywords: keywords,
    }]);

    if (error) console.error("journal_analysis insert:", error);
  } catch (err) {
    console.error("Journal analysis failed:", err);
  }
}

