// /api/welcome-message.js  (or /pages/api/welcome-message.js depending on your app)
import { supabase } from "@lib/supabaseClient.js"                 // ← path fix
import OpenAI from "openai"
import { getUserIdFromSession } from "@lib/auth.js"         // ← path fix

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export default async function handler(req, res) {
  try {
    const userId = await getUserIdFromSession(req, res)
    if (!userId) return res.status(401).json({ error: "Unauthorized" })

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("username, last_login, login_streak, favorite_product, archetype, last_mood, recent_moods, achievements")
      .eq("id", userId)                         // ← was user_id
      .single()

    if (profileError || !profile) {
      return res.status(500).json({ error: "Failed to fetch profile data" })
    }

    const {
      username, last_login, login_streak, favorite_product,
      archetype, last_mood, recent_moods, achievements,
    } = profile

    const daysSince = last_login ? Math.floor((Date.now() - new Date(last_login)) / 86400000) : "unknown"

    const prompt = `
You are the AI concierge for a luxury spiritual wellness brand. Your tone is warm, poetic, intuitive, and uplifting. Greet the user with a personalized welcome message.

Use:
- Username: ${username || "Beloved Soul"}
- Login Streak: ${login_streak || 0} days
- Days Since Last Login: ${daysSince}
- Favorite Product: ${favorite_product || "None"}
- Archetype: ${archetype || "Undiscovered"}
- Recent Mood Logs: ${recent_moods ? recent_moods.join(", ") : "None"}
- Last Mood: ${last_mood || "Unknown"}
- Achievements: ${achievements?.length ? achievements.join(", ") : "None"}

Keep it short (2–3 sentences). Address them directly. Reflect beauty, elegance, and luxury.`

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o",
      temperature: 0.8,
    })

    const message = completion.choices[0].message.content?.trim() || "Welcome back. Your presence is precious."
    return res.status(200).json({ message })
  } catch (err) {
    console.error("🔥 Welcome message error:", err)
    return res.status(500).json({ error: "Something went wrong" })
  }
}

