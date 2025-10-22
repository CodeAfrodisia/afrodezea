import { useEffect } from "react"
import { useInsights } from ".@insights/InsightContextProvider.jsx"
import { getMoodStreakInsight } from "@insightRules.js"

export function useInsightTrigger(moodEntries, archetype) {
    const { addInsight } = useInsights()

    useEffect(() => {
        if (!moodEntries || moodEntries.length < 7) return

        const insight = getMoodStreakInsight(moodEntries, archetype.name)
        if (insight) {
            addInsight(insight)
        }
    }, [moodEntries])
}

