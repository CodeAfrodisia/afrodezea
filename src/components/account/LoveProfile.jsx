import { useSoul } from "@SoulContext.jsx"
import { useEffect, useState } from "react"

export default function LoveProfile({ theme = {} }) {
    const { soulData, userArchetype } = useSoul()
    const [compatibilityInsight, setCompatibilityInsight] =
        useState("Loading insight...")

    useEffect(() => {
        const fetchInsight = async () => {
            try {
                const response = await fetch(
                    `/api/love-insight?archetype=${encodeURIComponent(userArchetype)}`
                )
                const result = await response.json()
                setCompatibilityInsight(result.insight)
            } catch (error) {
                console.error("Error fetching insight:", error)
                setCompatibilityInsight(
                    "Your love is a mystery still unfolding..."
                )
            }
        }

        if (userArchetype) {
            fetchInsight()
        }
    }, [userArchetype])

    if (!soulData || !userArchetype) return null

    const archetype = soulData.find((a) => a.name === userArchetype)
    if (!archetype) return null

    const {
        coreMatch = "To be revealed in divine timing.",
        preferencePull = [],
        connectionStyle = "Your love flows like a hidden stream—subtle, sacred, and sincere.",
    } = archetype.loveProfile || {}

    return (
        <section style={{ marginTop: "40px", textAlign: "center" }}>
            <h2
                style={{
                    fontSize: "28px",
                    borderBottom: `1px solid ${theme.border || "#666"}`,
                    paddingBottom: "6px",
                    color: theme.text,
                    marginBottom: "20px",
                }}
            >
                Love & Connection
            </h2>

            <p style={{ fontSize: "18px", marginBottom: "10px" }}>
                <strong title="The archetype most naturally aligned with your energy.">
                    Core Match:
                </strong>{" "}
                {coreMatch}
            </p>

            <p style={{ fontSize: "18px", marginBottom: "10px" }}>
                <strong title="Archetypes you may feel drawn to, even if they aren’t a perfect match.">
                    Preference Pull:
                </strong>{" "}
                {Array.isArray(preferencePull) && preferencePull.length > 0
                    ? preferencePull.join(", ")
                    : "Attraction stirs in mysterious ways."}
            </p>

            <p
                style={{
                    marginTop: "12px",
                    fontStyle: "italic",
                    color: theme.primary || "#ddd",
                    fontSize: "16px",
                }}
            >
                {connectionStyle}
            </p>

            <div
                style={{
                    marginTop: "30px",
                    backgroundColor: theme.card || "#111",
                    padding: "20px",
                    borderRadius: "12px",
                    border: `1px solid ${theme.border || "#333"}`,
                }}
            >
                <h4
                    style={{
                        color: theme.primary,
                        marginBottom: "12px",
                        fontSize: "20px",
                    }}
                >
                    Compatibility Insight
                </h4>
                <p style={{ fontSize: "16px", color: theme.text }}>
                    {compatibilityInsight}
                </p>
            </div>
        </section>
    )
}

