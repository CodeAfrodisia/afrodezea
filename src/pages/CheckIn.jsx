// src/pages/CheckIn.jsx
import React from "react"
import { Link } from "react-router-dom"
import MoodTab from "@components/account/MoodTab.jsx"
import { useAuth } from "@context/AuthContext.jsx"   // whatever your auth hook path is

export default function CheckIn() {
  const { user } = useAuth()          // must return { id } when logged in
  const userId = user?.id

  return (
    <div style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h1>Daily Check-in</h1>
        <Link className="chip" to="/account">← Back to Dashboard</Link>
      </div>

      {/* MoodTab already handles archetype/theme via props if provided; bare minimum is userId */}
      <MoodTab userId={userId} />
    </div>
  )
}

