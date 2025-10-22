// src/lib/analysisClient.js
import supabase from "@lib/supabaseClient.js";

/**
 * generateAnalysis({ userId, topic })
 * topic: "mood" | "love" | "archetype" | "quizzes"
 * Returns: string (markdown or rich text styled for your pane)
 */
export async function generateAnalysis({ userId, topic = "quizzes", options = {} }) {
  if (!userId) return "Please sign in to see your personalized insights.";

  // Route quizzes to Edge Function (server-side OpenAI)
  if (topic === "quizzes") {
    try {
      const { data, error } = await supabase.functions.invoke("quiz-insights", {
        body: { userId, topic, ...options }
      });
      if (error) {
        console.warn("[quiz-insights] edge error:", error);
        return fallbackCopy();
      }
      return typeof data?.content === "string" ? data.content : fallbackCopy();
    } catch (e) {
      console.warn("[quiz-insights] invoke failed:", e);
      return fallbackCopy();
    }
  }

  // Stubs for other topics (you can route these to edge as well)
  if (topic === "mood") {
    return "Your mood analysis will appear here. (Coming soon)";
  }
  if (topic === "love") {
    return "Your love personality analysis will appear here. (Coming soon)";
  }
  if (topic === "archetype") {
    return "Your archetype insights will appear here. (Coming soon)";
  }

  return fallbackCopy();
}

function fallbackCopy() {
  return [
    "### Your Gentle Insights",
    "",
    "I’m still learning you. As your check-ins and quiz results grow, I’ll reflect your strengths,",
    "your needs, and loving next steps—always in your language, always with care.",
    "",
    "— With love, Afrodezea"
  ].join("\n");
}
