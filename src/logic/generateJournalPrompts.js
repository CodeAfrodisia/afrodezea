// generateJournalPrompts.js

export function generateJournalPrompts({
    archetype,
    loveLanguage,
    moodTrend,
    insights,
}) {
    const prompts = []

    // ARCHETYPE — Flameheart example
    if (archetype === "Flameheart") {
        prompts.push(
            "When was the last time your fire felt like too much for the world? What did you do with that heat?",
            "Who or what has helped you feel seen without dimming your light?"
        )
    } else if (archetype === "Tidemaker") {
        prompts.push(
            "What emotional currents have been pulling at you lately?",
            "How do you honor your stillness and your waves alike?"
        )
    }

    // LOVE LANGUAGE
    switch (loveLanguage) {
        case "Quality Time":
            prompts.push(
                "What does sacred time with yourself look like? Describe the ideal solo moment that nourishes you."
            )
            break
        case "Acts of Service":
            prompts.push(
                "In what ways do you serve others to feel loved? In what ways do you serve yourself?"
            )
            break
        case "Receiving Gifts":
            prompts.push("What is a gift you crave but haven’t asked for? Why?")
            break
        case "Physical Touch":
            prompts.push(
                "How does your body respond to being held or touched with care? How does it respond to absence?"
            )
            break
        case "Words of Affirmation":
            prompts.push(
                "What words do you most need to hear this week, and why?"
            )
            break
    }

    // MOOD PATTERNS
    if (moodTrend === "sad") {
        prompts.push(
            "What sorrow are you holding that no one sees? Write to it like a friend."
        )
    } else if (moodTrend === "happy") {
        prompts.push(
            "What joy do you want to remember if this happiness ever fades?"
        )
    } else if (moodTrend === "neutral") {
        prompts.push(
            "What does neutrality feel like in your body? Is it peace, numbness, or something else entirely?"
        )
    }

    // INSIGHTS-INFORMED PROMPT
    if (insights && insights.some((i) => i.includes("low social battery"))) {
        prompts.push(
            "Who or what drains your spirit lately? What boundary might serve you well right now?"
        )
    }

    if (insights && insights.some((i) => i.includes("Words of Affirmation"))) {
        prompts.push(
            "Whose words shaped the way you love yourself? Do those words still serve you?"
        )
    }

    return prompts
}

