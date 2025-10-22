import { useSoul } from "@SoulContext.jsx"
import { useWeather } from "@useWeather.js"
import { useEffect, useState } from "react"

export default function SoulMessage({ theme = {} }) {
    const { soulData, userArchetype } = useSoul()
    const { weather, error } = useWeather()
    const [tooltipVisible, setTooltipVisible] = useState(false)
    const [tooltipPinned, setTooltipPinned] = useState(false)

    if (!soulData || !userArchetype) return null

    const archetype = soulData.find((a) => a.name === userArchetype)
    if (!archetype) return null

    const seasonalMessages = archetype.seasonalMessages || {}
    const currentSeason = (() => {
        const month = new Date().getMonth()
        if (month >= 2 && month < 5) return "Spring"
        if (month >= 5 && month < 8) return "Summer"
        if (month >= 8 && month < 11) return "Autumn"
        return "Winter"
    })()

    const seasonalIcon = {
        Spring: "🌸",
        Summer: "🌞",
        Autumn: "🍂",
        Winter: "❄️",
    }[currentSeason]

    const tooltipStyle = {
        position: "absolute",
        backgroundColor: "#111",
        color: "#fff",
        padding: "10px",
        borderRadius: "10px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        fontSize: "14px",
        top: "100%",
        left: 0,
        marginTop: "8px",
        zIndex: 999,
        opacity: tooltipVisible || tooltipPinned ? 1 : 0,
        transition: "opacity 0.5s ease-in-out",
        pointerEvents: tooltipVisible || tooltipPinned ? "auto" : "none",
        whiteSpace: "pre-wrap",
        maxWidth: "320px",
    }

    const renderWeatherTooltipContent = () => {
        if (!weather || !weather.main || !weather.weather || !weather.sys) {
            return <em>{error || "Loading weather data..."}</em>
        }

        const temp = Math.round(weather.main.temp)
        const description = weather.weather[0]?.description || "Unknown"
        const sunrise = new Date(
            weather.sys.sunrise * 1000
        ).toLocaleTimeString()
        const sunset = new Date(weather.sys.sunset * 1000).toLocaleTimeString()

        const outfitSuggestion = (() => {
            const condition = weather.weather[0].main.toLowerCase()
            if (temp >= 85) return "Light, breathable clothes. Stay hydrated!"
            if (temp >= 65) return "A casual outfit and maybe sunglasses."
            if (temp >= 50) return "Bring a light jacket or cardigan."
            if (temp >= 35) return "Bundle up—layers and a coat!"
            return condition.includes("rain")
                ? "Wear a raincoat and boots."
                : "Heavy coat, gloves, and hat."
        })()

        return (
            <>
                <strong>Current Weather:</strong> {temp}°F, {description} <br />
                <strong>Sunrise:</strong> {sunrise} | <strong>Sunset:</strong>{" "}
                {sunset}
                <br />
                <strong>Tip:</strong> {outfitSuggestion}
            </>
        )
    }

    const loreDescriptions = {
        Spring: "Spring represents emergence, renewal, and new spiritual invitations. It’s when your soul awakens to purpose.",
        Summer: "Summer symbolizes expansion and light. Your soul basks in clarity and warmth—an ideal time to take action.",
        Autumn: "Autumn brings introspection and shedding. What no longer serves you falls away like leaves returning to soil.",
        Winter: "Winter is a sacred silence—a time to rest, receive, and listen. Growth happens underground here.",
    }

    return (
        <section style={{ marginBottom: "120px" }}>
            <h3
                style={{
                    fontSize: "24px",
                    borderBottom: `1px solid ${theme.border || "#666"}`,
                    paddingBottom: "5px",
                    color: theme.accent || "#aaa",
                }}
            >
                Soul Message
            </h3>

            <p
                style={{
                    marginTop: "10px",
                    fontSize: "18px",
                    lineHeight: "1.6",
                }}
            >
                {archetype.message ||
                    "A message from your higher self will reveal itself soon."}
            </p>

            {seasonalMessages[currentSeason] && (
                <div style={{ marginTop: "30px", position: "relative" }}>
                    <h4
                        style={{
                            fontSize: "20px",
                            color: theme.primary || "#ddd",
                            marginBottom: "10px",
                            borderBottom: `1px solid ${theme.border || "#666"}`,
                            paddingBottom: "4px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            cursor: "pointer",
                            position: "relative",
                        }}
                        onMouseEnter={() =>
                            !tooltipPinned && setTooltipVisible(true)
                        }
                        onMouseLeave={() =>
                            !tooltipPinned && setTooltipVisible(false)
                        }
                        onClick={() => setTooltipPinned((prev) => !prev)}
                    >
                        <span>{seasonalIcon}</span> {currentSeason} Guidance
                        <div style={tooltipStyle}>
                            {renderWeatherTooltipContent()}
                        </div>
                    </h4>

                    <p
                        style={{
                            fontStyle: "italic",
                            fontSize: "17px",
                            color: theme.text,
                            lineHeight: "1.6",
                        }}
                    >
                        {seasonalMessages[currentSeason]}
                    </p>
                    <p
                        style={{
                            marginTop: "8px",
                            fontSize: "15px",
                            color: theme.accent || "#aaa",
                            fontStyle: "italic",
                        }}
                    >
                        {loreDescriptions[currentSeason]}
                    </p>
                </div>
            )}
        </section>
    )
}

