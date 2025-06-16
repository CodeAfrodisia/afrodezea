import Sentiment from "sentiment"
import nlp from "compromise"
import { createClient } from "@supabase/supabase-js"

const sentiment = new Sentiment()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

async function getUser(req) {
  const token = req.headers.authorization?.split(" ")[1]
  if (!token) return null

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

export default async function handler(req, res) {
  // ✅ Add CORS headers for every request
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

  // ✅ Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { text, mood_id = null } = req.body

  if (!text || typeof text !== "string" || text.length < 10) {
    return res.status(400).json({ error: "Journal entry must be at least 10 characters." })
  }

  const user = await getUser(req)
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  // Analyze text
  const sentimentResult = sentiment.analyze(text)
  const doc = nlp(text)
  const keywords = doc.nouns().concat(doc.adjectives()).out("frequency")
  const topKeywords = keywords
    .filter(k => k.count >= 1 && k.normal.length > 3)
    .slice(0, 10)
    .map(k => k.normal.toLowerCase())

 // Save to journal_analysis
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
  },
])

if (analysisError) {
console.error("❌ Failed to insert into journal_analysis:", analysisError)
} else {
console.log("✅ journal_analysis entry created:", analysisData)
}


  // Upsert to keyword_tracker
  for (let keyword of topKeywords) {
    await supabase
      .from("keyword_tracker")
      .upsert({
        user_id: user.id,
        keyword: keyword,
        frequency: 1,
        last_used: new Date().toISOString(),
        created_at: new Date().toISOString()
      }, {
        onConflict: "user_id,keyword",
        ignoreDuplicates: false
      })
      .then(async ({ error }) => {
        if (!error) {
          // Increment frequency if exists
          await supabase.rpc("increment_keyword_frequency", {
            p_user_id: user.id,
            p_keyword: keyword
          })
        } else {
          console.warn("Keyword insert error:", error)
        }
      })
  }

  return res.status(200).json({
    sentiment: sentimentResult,
    keywords: topKeywords,
    userId: user.id
  })
}
