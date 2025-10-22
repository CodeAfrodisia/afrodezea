import React from "react"

export default function StrengthsChallenges({ archetype, theme }) {
    if (!archetype) {
        return (
            <p style={{ color: theme?.text || "#ccc" }}>
                Loading archetype data...
            </p>
        )
    }

    const strengths = archetype.strengths || []
    const challenges = archetype.challenges || []

    // Debug: Show what’s coming through
    console.log("💡 Archetype received in StrengthsChallenges:", archetype)

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "2rem",
                gap: "32px",
                fontSize: "18px",
                color: theme?.text || "#f5f5f5",
                fontFamily: "Cormorant Garamond, serif",
            }}
        >
            <h2
                style={{
                    fontSize: "30px",
                    color: theme?.primary || "#fff",
                    textAlign: "center",
                    marginBottom: "-12px",
                }}
            >
                {archetype.name || "Your Archetype"}: Strengths & Challenges
            </h2>

            <div
                style={{
                    display: "flex",
                    flexDirection: window.innerWidth < 768 ? "column" : "row",
                    justifyContent: "center",
                    gap: "60px",
                    width: "100%",
                    maxWidth: "800px",
                }}
            >
                {/* Strengths */}
                <div style={{ flex: 1 }}>
                    <h3 style={{ color: theme?.primary || "#ffbf00" }}>
                        💪 Strengths
                    </h3>
                    <ul style={{ paddingLeft: "1.2rem" }}>
                        {strengths.length > 0 ? (
                            strengths.map((item, i) => (
                                <li key={i} style={{ marginBottom: "0.5rem" }}>
                                    {item}
                                </li>
                            ))
                        ) : (
                            <li style={{ fontStyle: "italic", color: "#aaa" }}>
                                No strengths recorded yet.
                            </li>
                        )}
                    </ul>
                </div>

                {/* Challenges */}
                <div style={{ flex: 1 }}>
                    <h3 style={{ color: theme?.primary || "#ff6961" }}>
                        🧩 Challenges
                    </h3>
                    <ul style={{ paddingLeft: "1.2rem" }}>
                        {challenges.length > 0 ? (
                            challenges.map((item, i) => (
                                <li key={i} style={{ marginBottom: "0.5rem" }}>
                                    {item}
                                </li>
                            ))
                        ) : (
                            <li style={{ fontStyle: "italic", color: "#aaa" }}>
                                No challenges recorded yet.
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    )
}

