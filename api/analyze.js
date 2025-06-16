import Sentiment from "sentiment"
import nlp from "compromise"
import { createClient } from "@supabase/supabase-js"

const sentiment = new Sentiment()

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })

  const token = req.headers.authorization?.split(" ")[1]
  if (!token) return res.status(401).json({ error: "Unauthorized – no token" })

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    }
  )

  const { text, mood_id = null } = req.body
  if (!text || typeof text !== "string" || text.length < 10) {
    return res.status(400).json({ error: "Journal entry must be at least 10 characters." })
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    console.error("❌ User fetch failed:", userError)
    return res.status(401).json({ error: "Unauthorized – invalid token" })
  }

  const sentimentResult = sentiment.analyze(text)
  const doc = nlp(text)
  const keywords = doc.nouns().concat(doc.adjectives()).out("frequency")
  const topKeywords = keywords
    .filter(k => k.count >= 1 && k.normal.length > 3)
    .slice(0, 10)
    .map(k => k.normal.toLowerCase())

  console.log("🧠 Top keywords extracted:", topKeywords)

  const { data: analysisData, error: analysisError } = await supabase
    .from("journal_analysis")
    .insert([
      {
        user_id: user.id,
        mood_id: mood_id || null,
        sentiment_score: sentimentResult.score,
        sentiment_comparative: sentimentResult.comparative,
        top_keywords: topKeywords,
        created_at: new Date().toISOString(),
      }
    ])

  if (analysisError) {
    console.error("❌ Failed to insert into journal_analysis:", analysisError)
    return res.status(500).json({ error: "Failed to insert journal analysis" })
  }

  console.log("✅ Journal analysis inserted")

  // 📌 Log and insert each keyword individually
  for (const keyword of topKeywords) {
    try {
      console.log("📌 Inserting keyword:", keyword)

      const { error: insertError } = await supabase
        .from("keyword_tracker")
        .insert({
          user_id: user.id,
          keyword,
          frequency: 1,
          last_used: new Date().toISOString(),
          created_at: new Date().toISOString(),
        })

      if (insertError) {
        console.warn("⚠️ Keyword insert error for", keyword, ":", insertError)
      } else {
        console.log("✅ Keyword inserted successfully:", keyword)
      }

      const { error: rpcError } = await supabase.rpc("increment_keyword_frequency", {
        p_user_id: user.id,
        p_keyword: keyword,
      })

      if (rpcError) {
        console.warn("⚠️ RPC increment failed for:", keyword, rpcError)
      } else {
        console.log("🔁 Frequency incremented for keyword:", keyword)
      }

    } catch (err) {
      console.error("❌ Unexpected error inserting keyword:", keyword, err)
    }
  }

  return res.status(200).json({
    sentiment: sentimentResult,
    keywords: topKeywords,
    userId: user.id,
  })
}
