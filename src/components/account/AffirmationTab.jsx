// src/components/account/AffirmationTab.jsx
import { useEffect, useState } from "react"
import { supabase } from "@lib/supabaseClient.js"
import { getUnifiedAffirmation } from "@logic/useAffirmations.jsx"

export default function AffirmationTab({ userId }) {
  const [archetype, setArchetype] = useState(null)
  const [mood, setMood] = useState("neutral")
  const [loveLanguage, setLoveLanguage] = useState("Words of Affirmation")
  const [affirmation, setAffirmation] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const [hasLoggedToday, setHasLoggedToday] = useState(false)

  // Load user profile basics (archetype + love language)
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return

      const { data, error } = await supabase
        .from("profiles")
        .select("archetype, love_language")
        .eq("user_id", userId)
        .maybeSingle()

      if (error) {
        console.error("Error fetching profile:", error)
        return
      }

      if (data) {
        setArchetype(data.archetype ?? null)
        setLoveLanguage(data.love_language || "Words of Affirmation")
      }
    }

    fetchUserData()
  }, [userId])

  // Load today's mood and build affirmation
  useEffect(() => {
    const fetchMoodAndAffirmation = async () => {
      if (!archetype || !loveLanguage || !userId) return

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayIso = today.toISOString()

      const { data: moodData, error: moodError } = await supabase
        .from("moods")
        .select("mood, created_at")
        .eq("user_id", userId)
        .gte("created_at", todayIso)
        .order("created_at", { ascending: false })
        .limit(1)

      if (moodError) {
        console.error("❌ Error fetching mood:", moodError)
        return
      }

      const moodResult = moodData?.[0]?.mood || "neutral"
      setMood(moodResult)

      // Normalize love-language key for getUnifiedAffirmation
      const normalizedLL = (loveLanguage || "Words of Affirmation").replace(/\s+/g, "")
      const unified = getUnifiedAffirmation(moodResult, archetype, normalizedLL)
      setAffirmation(unified)

      // Avoid duplicate log for today (same mood)
      const { count, error: logError } = await supabase
        .from("affirmation_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("mood", moodResult)
        .gte("created_at", todayIso)

      if (logError) {
        console.error("❌ Error checking affirmation logs:", logError)
        return
      }

      if ((count ?? 0) === 0) {
        const { error: insertError } = await supabase.from("affirmation_logs").insert([
          {
            user_id: userId,
            mood: moodResult,
            archetype,
            love_language: loveLanguage,
            affirmation: unified,
          },
        ])
        if (insertError) {
          console.error("❌ Error inserting affirmation log:", insertError)
        } else {
          setHasLoggedToday(true)
        }
      }
    }

    fetchMoodAndAffirmation()
  }, [archetype, loveLanguage, userId])

  const handleSaveAffirmation = async () => {
    if (!affirmation || !userId) return
    setIsSaving(true)
    setSaveMessage("")

    const { error } = await supabase
      .from("profiles")
      .update({
        saved_affirmation: affirmation,
        affirmation_updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)

    if (error) {
      console.error("❌ Failed to save affirmation:", error)
      setSaveMessage("Failed to save. Please try again.")
    } else {
      setSaveMessage("✅ Affirmation saved!")
    }

    setIsSaving(false)
  }

  const emojiForMood = (m) =>
    ({
      happy: "😊",
      sad: "😔",
      neutral: "😐",
    }[m] || "🧘")

  if (!userId) {
    return <div style={{ color: "white" }}>Loading affirmation...</div>
  }

  if (!archetype || !loveLanguage) {
    return (
      <div style={{ color: "white", padding: "2rem" }}>
        Please complete your profile to receive personalized affirmations.
      </div>
    )
  }

  return (
    <div
      style={{
        padding: "3rem",
        textAlign: "center",
        color: "white",
        background: "linear-gradient(145deg, #1e0b0b, #2a1a0a)",
        borderRadius: "20px",
        boxShadow: "0 0 25px rgba(255, 95, 46, 0.3)",
        maxWidth: "700px",
        margin: "0 auto",
      }}
    >
      <h2 style={{ fontSize: "1.6rem", marginBottom: "1rem" }}>
        {emojiForMood(mood)} Today’s Personalized Affirmation
      </h2>

      {affirmation ? (
        <p style={{ fontSize: "1.3rem", fontStyle: "italic" }}>{affirmation}</p>
      ) : (
        <p>Loading affirmation...</p>
      )}

      <div style={{ marginTop: "4rem", textAlign: "center" }}>
        <button
          onClick={handleSaveAffirmation}
          disabled={isSaving}
          style={{
            backgroundColor: isSaving ? "#ccc" : "#eee",
            color: "#111",
            padding: "12px 24px",
            fontSize: "16px",
            border: "1px solid #aaa",
            borderRadius: "9px",
            cursor: isSaving ? "not-allowed" : "pointer",
            minWidth: "120px",
            height: "42px",
            lineHeight: "1",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 500,
            transition: "0.2s",
          }}
        >
          {isSaving ? "Saving..." : "Save Affirmation"}
        </button>

        {saveMessage && (
          <div
            style={{
              marginTop: "1rem",
              fontSize: "0.9rem",
              color: "#eee",
            }}
          >
            {saveMessage}
          </div>
        )}
      </div>
    </div>
  )
}
