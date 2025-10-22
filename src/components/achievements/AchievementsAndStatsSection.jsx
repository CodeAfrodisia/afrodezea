// /code/components/achievements/AchievementsAndStatsSection.jsx
import React, { useEffect, useState } from "react"
import { supabase } from "@lib/supabaseClient.js"
import { useTheme } from "@lib/useTheme.jsx"
import { getUserIdFromSession } from "@lib/getUserIdFromSession.js"
import XPProgressBar from "@components/achievements/XPProgressBar.jsx"

function nextTierLabel(current) {
    const order = ["Bronze", "Silver", "Gold", "Platinum"]
    const i = order.indexOf(current || "Bronze")
    return order[Math.min(i + 1, order.length - 1)]
}

export default function AchievementsStats() {
    const theme = useTheme()
    const [stats, setStats] = useState(null)
    const [achievements, setAchievements] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const run = async () => {
            try {
                setLoading(true)
                const userId = await getUserIdFromSession()
                if (!userId) {
                    return
                }

                // Read user_stats safely (handles 0 rows without 406)
                const { data: statsData, error: statsError } = await supabase
                    .from("user_stats")
                    .select("*")
                    .eq("user_id", userId)
                    .maybeSingle()

                if (statsError) {
                    console.error("Stats error:", statsError)
                    setStats(null)
                } else {
                    setStats(
                        statsData ?? {
                            // client-side fallback values (not persisted)
                            user_id: userId,
                            mood_checkins: 0,
                            reflections_logged: 0,
                            days_streak: 0,
                            affirmations_saved: 0,
                            gifts_given: 0,
                            total_purchases: 0,
                            most_purchased_item: null,
                            favorite_item: null,
                            social_battery_usage: 0,
                            user_interactions: 0,
                            profile_image_uploaded: false,
                            love_language_words: 0,
                            love_language_service: 0,
                            love_language_gifts: 0,
                            love_language_time: 0,
                            love_language_touch: 0,
                            xp: 0,
                            xp_tier: "Bronze",
                            xp_goal: 100,
                        }
                    )
                }

                // Fetch unlocked achievements (restore this block)
                const { data: unlocked, error: achErr } = await supabase
                    .from("user_achievements")
                    .select("*, achievements(*)")
                    .eq("user_id", userId)

                if (achErr) {
                    console.error("Achievements error:", achErr)
                } else {
                    setAchievements((unlocked ?? []).map((e) => e.achievements))
                }
            } finally {
                setLoading(false)
            }
        }
        run()
    }, [])

    if (loading)
        return <p style={{ color: theme.text }}>Loading your journey…</p>

    const statCardStyle = {
        background: theme.card || "rgba(255,255,255,0.03)",
        padding: 20,
        borderRadius: 12,
        flex: 1,
        textAlign: "center",
        color: theme.text,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        minWidth: 200,
    }

    const achievementCardStyle = {
        background: theme.card || "#1a1a1a",
        border: `1px solid ${theme.border || "#444"}`,
        padding: 16,
        borderRadius: 12,
        minWidth: 240,
        color: theme.text,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
    }

    const renderStatCard = (label, value) => (
        <div key={label} style={statCardStyle}>
            <h3>{label}</h3>
            <p style={{ fontSize: 24 }}>{value ?? 0}</p>
        </div>
    )

    return (
        <section style={{ padding: "30px 0" }}>
            {stats?.xp != null && (
                <div
                    style={{
                        maxWidth: 420,
                        margin: "0 auto 24px",
                        textAlign: "center",
                    }}
                >
                    <XPProgressBar
                        currentXP={stats.xp}
                        tierXP={stats.xp_goal || 100}
                        tier={stats.xp_tier || "Bronze"}
                        theme={theme}
                    />
                    <div
                        style={{
                            marginTop: 8,
                            color: theme.textMuted || "#aaa",
                            fontSize: 14,
                        }}
                    >
                        {(() => {
                            const current = stats.xp || 0
                            const goal = stats.xp_goal || 100
                            const tier = stats.xp_tier || "Bronze"
                            const next = nextTierLabel(tier)
                            const remaining = Math.max(0, goal - current)
                            return `${current} / ${goal} XP to ${next}`
                        })()}
                    </div>
                </div>
            )}

            <h2
                style={{
                    fontSize: 30,
                    color: theme.primary,
                    marginBottom: 20,
                    textAlign: "center",
                }}
            >
                Your Journey
            </h2>

            <div
                style={{
                    display: "flex",
                    gap: 20,
                    flexWrap: "wrap",
                    justifyContent: "center",
                    marginBottom: 40,
                }}
            >
                {renderStatCard("Mood Check-ins", stats?.mood_checkins)}
                {renderStatCard(
                    "Reflections Logged",
                    stats?.reflections_logged
                )}
                {renderStatCard("Streak", `${stats?.days_streak || 0} days`)}
                {renderStatCard(
                    "Affirmations Saved",
                    stats?.affirmations_saved
                )}
                {renderStatCard("Gifts Given", stats?.gifts_given)}
                {renderStatCard("Total Purchases", stats?.total_purchases)}
                {renderStatCard(
                    "Most Purchased Item",
                    stats?.most_purchased_item
                )}
                {renderStatCard("Favorite Item", stats?.favorite_item)}
                {renderStatCard(
                    "Social Battery Use",
                    stats?.social_battery_usage
                )}
                {renderStatCard("User Interactions", stats?.user_interactions)}
                {renderStatCard(
                    "Profile Image Uploaded",
                    stats?.profile_image_uploaded ? "✅" : "❌"
                )}
                {renderStatCard(
                    "Words of Affirmation",
                    stats?.love_language_words
                )}
                {renderStatCard(
                    "Acts of Service",
                    stats?.love_language_service
                )}
                {renderStatCard("Receiving Gifts", stats?.love_language_gifts)}
                {renderStatCard("Quality Time", stats?.love_language_time)}
                {renderStatCard("Physical Touch", stats?.love_language_touch)}
            </div>

           <h3 style={{ fontSize: 24, color: theme.accent, marginBottom: 12 }}>
  Achievements
</h3>

{Array.isArray(achievements) && achievements.length > 0 ? (
  <div style={{
    display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center"
  }}>
    {achievements.map((ach) => (
      <div key={ach.id} style={{
        background: theme.card || "#1a1a1a",
        border: `1px solid ${theme.border || "#444"}`,
        padding: 16, borderRadius: 12, minWidth: 240,
        color: theme.text, display: "flex", flexDirection: "column",
        alignItems: "center", gap: 10
      }}>
        <div style={{ fontSize: 32 }}>{ach.icon || "✨"}</div>
        <strong>{ach.name || "Unlocked"}</strong>
        <p style={{
          fontSize: 14, textAlign: "center", color: theme.textMuted || "#999"
        }}>
          {ach.description || "You earned an achievement."}
        </p>
      </div>
    ))}
  </div>
) : (
  <div style={{
    border: `1px dashed ${theme.border || "#444"}`,
    padding: 16, borderRadius: 12, color: theme.text, textAlign: "center"
  }}>
    No achievements yet—your journey is just beginning 🌱
  </div>
)}

        </section>
    )
}
