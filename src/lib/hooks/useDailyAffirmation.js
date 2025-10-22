// lib/hooks/useDailyAffirmation.js
import { useEffect, useState } from "react"

export function useDailyAffirmation({ forceNew = false } = {}) {
  const [affirmation, setAffirmation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchAffirmation = async () => {
      try {
        const response = await fetch("/api/daily-affirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ forceNew }),  // ← align with API
        })
        if (!response.ok) throw new Error("Failed to fetch affirmation")
        const data = await response.json()
        setAffirmation(data.affirmation)
      } catch (err) {
        console.error("Affirmation Error:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAffirmation()
  }, [forceNew])

  return { affirmation, loading, error }
}

