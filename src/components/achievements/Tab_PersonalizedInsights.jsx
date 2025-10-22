// /code/components/achievements/Tab_PersonalizedInsights.jsx
import React, { useEffect, useMemo, useState } from "react"
import { supabase } from "@lib/supabaseClient.js"
import { useTheme } from "@lib/useTheme.jsx"
import { getUserIdFromSession } from "@lib/getUserIdFromSession.js"
import RingStat from "@components/achievements/RingStat.jsx"
import Sparkline from "@components/achievements/Sparkline.jsx"



const MOOD_LABELS = {
    "😊": "Happy",
    "🥰": "Loved",
    "😌": "Calm",
    "😇": "Grateful",
    "😐": "Meh",
    "😵‍💫": "Overwhelmed",
    "🤡": "Playful",
    "😔": "Sad",
    "🫠": "Melting",
    "😤": "Frustrated",
}

const BATTERY_MAP = { low: 1, medium: 2, high: 3 }

const VALID_LOVE_LANGUAGES = [
    "Acts of Service",
    "Quality Time",
    "Words of Affirmation",
    "Receiving Gifts",
    "Physical Touch",
]

function batteryLabel(avg) {
    if (avg >= 2.5) return "Mostly High"
    if (avg >= 1.5) return "Mostly Medium"
    return "Mostly Low"
}

export default function Tab_PersonalizedInsights() {
    const theme = useTheme()
    const [userId, setUserId] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const [moods, setMoods] = useState([]) // last 30 days (latest per day)
    const [loveFreq, setLoveFreq] = useState({})
    const [batteryValues, setBatteryValues] = useState([]) // numeric 1..3

    const [topFavorites, setTopFavorites] = useState([]) // top 3 ranked

    useEffect(() => {
        ;(async () => {
            setLoading(true)
            setError(null)
            try {
                const uid = await getUserIdFromSession()
                if (!uid) throw new Error("Not signed in.")
                setUserId(uid)

                // 1) Recent moods (last 30d). We'll dedupe by day (latest only).
                const since = new Date()
                since.setDate(since.getDate() - 30)

                const { data: moodRows, error: moodErr } = await supabase
                    .from("moods")
                    .select("*")
                    .eq("user_id", uid)
                    .gte("created_at", since.toISOString())
                    .order("created_at", { ascending: false })

                if (moodErr) throw moodErr

                const latestByDay = {}
                for (const row of moodRows ?? []) {
                    const k = new Date(row.created_at)
                        .toISOString()
                        .slice(0, 10)
                    if (!latestByDay[k]) latestByDay[k] = row
                }
                const deduped = Object.values(latestByDay)
                setMoods(deduped)

                // Love language freq + battery values
                const lf = {}
                const bat = []
                for (const entry of deduped) {
                    const mood = (entry.mood || "").trim()
                    // love language
                    if (VALID_LOVE_LANGUAGES.includes(entry.love_language)) {
                        lf[entry.love_language] =
                            (lf[entry.love_language] || 0) + 1
                    }
                    // battery
                    const b = (entry.social_battery || "").trim().toLowerCase()
                    if (BATTERY_MAP[b]) bat.push(BATTERY_MAP[b])
                }
                setLoveFreq(lf)
                setBatteryValues(bat)

                // 2) Favorites (top 3 by rank)
                const { data: ranks, error: rErr } = await supabase
                    .from("user_item_rankings")
                    .select("item_id, rank, is_public")
                    .eq("user_id", uid)
                    .order("rank", { ascending: true })
                    .limit(3)
                if (rErr) throw rErr

                let favs = []
                if (ranks && ranks.length) {
                    const ids = ranks.map((r) => r.item_id)
                    const { data: products, error: pErr } = await supabase
                        .from("products") // rename if your product table differs
                        .select("id, name, image_url")
                        .in("id", ids)
                    if (pErr) throw pErr
                    const map = new Map((products ?? []).map((p) => [p.id, p]))
                    favs = ranks.map((r) => {
                        const p = map.get(r.item_id) || {}
                        return {
                            ...r,
                            name: p.name || "(Unnamed Product)",
                            image_url: p.image_url || null,
                        }
                    })
                }
                setTopFavorites(favs)
            } catch (e) {
                console.error(e)
                setError(e.message || "Failed to load insights.")
            } finally {
                setLoading(false)
            }
        })()
    }, [])

    // ------ Derived insights ------
    const moodCounts = useMemo(() => {
        const counts = {}
        for (const m of moods) {
            const key = Object.entries(MOOD_LABELS).find(([emoji, label]) => {
                const t = (m.mood || "").trim()
                return t === emoji || t.toLowerCase() === label.toLowerCase()
            })?.[0]
            if (key) counts[key] = (counts[key] || 0) + 1
        }
        return counts
    }, [moods])

    const topMood = useMemo(() => {
        let best = null,
            max = 0
        for (const [emoji, count] of Object.entries(moodCounts)) {
            if (count > max) {
                best = { emoji, label: MOOD_LABELS[emoji], count }
                max = count
            }
        }
        return best
    }, [moodCounts])

    const loveWinner = useMemo(() => {
        let best = null,
            max = 0
        for (const [k, v] of Object.entries(loveFreq)) {
            if (v > max) {
                best = { name: k, count: v }
                max = v
            }
        }
        return best
    }, [loveFreq])

    const batteryAvg = useMemo(() => {
        if (!batteryValues.length) return null
        const sum = batteryValues.reduce((a, b) => a + b, 0)
        return +(sum / batteryValues.length).toFixed(1)
    }, [batteryValues])

    // ------ UI ------
    const card = {
        background: theme.card || "rgba(255,255,255,0.03)",
        border: `1px solid ${theme.border || "#333"}`,
        color: theme.text || "#fff",
        borderRadius: 12,
        padding: 16,
        minWidth: 240,
        flex: 1,
    }
    const grid = {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 16,
    }

    if (loading)
        return <div style={{ color: theme.text }}>Loading insights…</div>
    if (error) return <div style={{ color: "#f66" }}>{error}</div>

    return (
        <section style={{ display: "grid", gap: 20 }}>
            <div style={grid}>
                <div style={card}>
                    <div style={{ opacity: 0.7, marginBottom: 6 }}>
                        Most Frequent Mood (30d)
                    </div>
                    {topMood ? (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 16,
                            }}
                        >
                            <RingStat
                                value={topMood.count}
                                max={moods.length || 1}
                                size={80}
                                label={`${topMood.emoji} ${topMood.label}`}
                                sub={`${topMood.count}/${moods.length}`}
                            />
                        </div>
                    ) : (
                        <div>No mood data yet.</div>
                    )}
                </div>

                {/* Dominant Love Language */}
                <div style={card}>
                    <div style={{ opacity: 0.7, marginBottom: 6 }}>
                        Dominant Love Language (30d)
                    </div>
                    {loveWinner ? (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 16,
                            }}
                        >
                            <RingStat
                                value={loveWinner.count}
                                max={
                                    Object.values(loveFreq).reduce(
                                        (a, b) => a + b,
                                        0
                                    ) || 1
                                }
                                size={80}
                                label={loveWinner.name}
                                sub={`${loveWinner.count} entries`}
                            />
                        </div>
                    ) : (
                        <div>No love language signals yet.</div>
                    )}
                </div>

                <div style={card}>
                    <div style={{ opacity: 0.7, marginBottom: 6 }}>
                        Social Battery (avg, 1–3)
                    </div>
                    {batteryAvg ? (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 16,
                            }}
                        >
                            <RingStat
                                value={batteryAvg}
                                max={3}
                                size={80}
                                label={batteryLabel(batteryAvg)}
                                sub={`${batteryAvg} / 3`}
                            />
                            {/* Optional: if you keep a recent-battery series, pass to Sparkline */}
                            {/* <Sparkline points={batterySeries} /> */}
                        </div>
                    ) : (
                        <div>No battery data yet.</div>
                    )}
                </div>
            </div>

            <div style={card}>
                <div style={{ opacity: 0.7, marginBottom: 6 }}>
                    Top Favorites
                </div>
                {topFavorites && topFavorites.length ? (
                    <div style={{ display: "grid", gap: 10 }}>
                        {topFavorites.map((r) => (
                            <div
                                key={r.item_id}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                }}
                            >
                                <div
                                    style={{
                                        width: 28,
                                        textAlign: "right",
                                        fontVariantNumeric: "tabular-nums",
                                        color: theme.textMuted || "#aaa",
                                    }}
                                >
                                    {r.rank}
                                </div>
                                {r.image_url ? (
                                    <img
                                        src={r.image_url}
                                        alt={r.name}
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 8,
                                            objectFit: "cover",
                                            border: `1px solid ${theme.border || "#333"}`,
                                        }}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 8,
                                            display: "grid",
                                            placeItems: "center",
                                            border: `1px solid ${theme.border || "#333"}`,
                                        }}
                                    >
                                        🕯️
                                    </div>
                                )}
                                <div
                                    style={{
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                >
                                    {r.name}
                                </div>
                                {!r.is_public && (
                                    <span
                                        style={{
                                            marginLeft: 8,
                                            fontSize: 12,
                                            color: theme.textMuted || "#aaa",
                                        }}
                                    >
                                        (Private)
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>No favorites ranked yet.</div>
                )}
            </div>

            {/* Simple narrative summary */}
            <div style={{ ...card, background: theme.card }}>
                <div style={{ opacity: 0.7, marginBottom: 6 }}>Quick Take</div>
                <div style={{ lineHeight: 1.6 }}>
                    {topMood ? (
                        <>
                            You’ve been feeling{" "}
                            <strong>{topMood.label.toLowerCase()}</strong> most
                            often.
                        </>
                    ) : (
                        <>Mood signals are still forming.</>
                    )}{" "}
                    {loveWinner ? (
                        <>
                            Your interactions lean toward{" "}
                            <strong>{loveWinner.name.toLowerCase()}</strong>.
                        </>
                    ) : (
                        <>
                            We’ll learn your love language as you check in more.
                        </>
                    )}{" "}
                    {batteryAvg ? (
                        <>
                            Social battery skews{" "}
                            <strong>
                                {batteryLabel(batteryAvg).toLowerCase()}
                            </strong>
                            .
                        </>
                    ) : (
                        <>No battery pattern yet.</>
                    )}{" "}
                    {topFavorites?.length ? (
                        <>
                            Your current #1 favorite is{" "}
                            <strong>{topFavorites[0].name}</strong>.
                        </>
                    ) : null}
                </div>
            </div>
        </section>
    )
}

