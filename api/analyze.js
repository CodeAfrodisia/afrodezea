// api/analyze.js
import Sentiment from "sentiment"
import nlp from "compromise"

const sentiment = new Sentiment()

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" })
    }

    const { text } = req.body
    if (!text) {
        return res.status(400).json({ error: "Missing journal text" })
    }

    const sentimentResult = sentiment.analyze(text)
    const sentimentScore = sentimentResult.score
    const sentimentLabel =
        sentimentScore > 1
            ? "positive"
            : sentimentScore < -1
            ? "negative"
            : "neutral"

    const doc = nlp(text)
    const terms = doc.nouns().concat(doc.adjectives()).out("frequency")
    const keywords = terms
        .filter((t) => t.count >= 1 && t.normal.length > 3)
        .slice(0, 10)
        .map((t) => t.normal.toLowerCase())

    return res.status(200).json({ sentimentLabel, sentimentScore, keywords })
}

