import Sentiment from "sentiment"
import nlp from "compromise"
import { createClient } from "@supabase/supabase-js"

const sentiment = new Sentiment()

console.log("Supabase URL:", process.env.SUPABASE_URL)

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
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" })
    }

    const { text } = req.body

    if (!text || typeof text !== "string" || text.length < 40) {
        return res
            .status(400)
            .json({ error: "Journal entry must be at least 40 characters." })
    }

    const user = await getUser(req)
    if (!user) {
        return res.status(401).json({ error: "Unauthorized" })
    }

    const sentimentResult = sentiment.analyze(text)
    const doc = nlp(text)
    const keywords = doc.nouns().concat(doc.adjectives()).out("frequency")

    const topKeywords = keywords
        .filter((k) => k.count >= 1 && k.normal.length > 3)
        .slice(0, 10)
        .map((k) => k.normal.toLowerCase())

    return res.status(200).json({
        sentiment: sentimentResult,
        keywords: topKeywords,
        userId: user.id,
    })
}
