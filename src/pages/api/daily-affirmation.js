// pages/api/daily-affirmation.js
import { supabase } from "@/lib/supabaseClient.js"          // ← standard path/name
import { getUserIdFromSession } from "@/lib/auth.js"
import { OpenAIStream } from "@/lib/openai"        // keep your wrapper
import { formatISO, startOfDay, endOfDay } from "date-fns"

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })

  const userId = await getUserIdFromSession(req)
  if (!userId) return res.status(401).json({ error: "Unauthorized" })

  const { archetype, forceNew = false } = req.body || {}

  const todayStart = formatISO(startOfDay(new Date()))
  const todayEnd   = formatISO(endOfDay(new Date()))

  // Fetch today if not forcing
  const { data: existing } = await supabase
    .from("daily_affirmations")
    .select("*")
    .eq("user_id", userId)
    .gte("generatedAt", todayStart)
    .lte("generatedAt", todayEnd)
    .maybeSingle()

  if (existing && !forceNew) {
    return res.status(200).json({
      affirmation: existing.affirmation,
      generatedAt: existing.generatedAt,
    })
  }

  // Prompt
  let prompt = `Create a short, poetic, deeply loving daily affirmation to uplift the user. The tone should be nurturing and empowering.\n`
  prompt += archetype
    ? `The user’s archetype is '${archetype}'. Weave this energetically into the message.\n`
    : `The user has no archetype profile. Keep it universally empowering.\n`
  prompt += `Return ONLY the affirmation text.`

  // Call OpenAI via your helper
  const gptRes = await OpenAIStream({
    model: "gpt-4o",
    temperature: 0.8,
    messages: [{ role: "user", content: prompt }],
  })

  // Your helper might already return { text } or a fetch Response – support both
  let affirmation
  if (typeof gptRes === "string") {
    affirmation = gptRes.trim()
  } else if (gptRes?.ok) {
    const result = await gptRes.json()
    affirmation = result?.choices?.[0]?.message?.content?.trim()
  } else if (gptRes?.text) {
    affirmation = gptRes.text.trim()
  }

  if (!affirmation) return res.status(500).json({ error: "Failed to generate affirmation" })

  const generatedAt = new Date().toISOString()

  // Upsert for the day (keep latest when forceNew)
  const { error: upsertError } = await supabase
    .from("daily_affirmations")
    .upsert({ user_id: userId, affirmation, generatedAt }, { onConflict: "user_id" })

  if (upsertError) return res.status(500).json({ error: "Failed to save affirmation" })

  return res.status(200).json({ affirmation, generatedAt })
}

