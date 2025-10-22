import { useEffect } from "react"
import { useInsights } from "./InsightContextProvider.jsx"

export default function InsightDisplay({ theme }) {
    const { activeInsight, dismissInsight } = useInsights()

    useEffect(() => {
        if (!activeInsight) return

        const timeout = setTimeout(() => {
            dismissInsight()
        }, 8000) // ⏳ auto-dismiss after 8 seconds

        return () => clearTimeout(timeout)
    }, [activeInsight])

    if (!activeInsight) return null

    return (
        <div
            style={{
                position: "fixed",
                bottom: "90px",
                left: "50%",
                transform: "translateX(-50%)",
                padding: "1.2rem 2rem",
                backgroundColor: theme.accent,
                color: theme.background,
                fontFamily: "Cormorant Garamond, serif",
                borderRadius: "1rem",
                boxShadow: `0 0 20px ${theme.accent}`,
                zIndex: 1000,
                animation: "fadeInUp 0.5s ease-out",
                maxWidth: "90%",
                textAlign: "center",
                fontSize: "1.2rem",
                lineHeight: "1.4",
            }}
        >
            {activeInsight}
        </div>
    )
}

