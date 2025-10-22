// utils/generateMoodInsights.js

import { format } from "date-fns"

/**
 * Returns part of day from ISO time
 */
function getTimeOfDay(isoString) {
    const hour = new Date(isoString).getHours()
    if (hour >= 5 && hour < 12) return "morning"
    if (hour >= 12 && hour < 17) return "afternoon"
    if (hour >= 17 && hour < 21) return "evening"
    return "night"
}

/**
 * Gets all keys tied for highest value
 */
function getTopTiedItems(obj) {
    const max = Math.max(...Object.values(obj))
    return Object.entries(obj)
        .filter(([_, v]) => v === max)
        .map(([k]) => k)
}

/**
 * Generates human-readable insights from mood entry data
 * @param {Array} entries - Array of mood entries (each includes created_at, mood, love_language, social_battery)
 * @returns {Array} insights - Array of strings (insights)
 */
export function generateMoodInsights(entries) {
    if (!entries || entries.length < 5) {
        return [
            "Keep logging your moods. Once you've submitted a few more entries, a beautiful insight will appear ✨",
        ]
    }

    const moodCount = {}
    const loveLangCount = {}
    const batteryCount = {}
    const timeOfDayCount = {}
    const dates = []
    const recentMoods = []

    entries.forEach((entry) => {
        const date = format(new Date(entry.created_at), "yyyy-MM-dd")
        dates.push(date)

        const mood = entry.mood || "unknown"
        const lang = entry.love_language || "unspecified"
        const battery = entry.social_battery || "unspecified"
        const tod = getTimeOfDay(entry.created_at)

        moodCount[mood] = (moodCount[mood] || 0) + 1
        loveLangCount[lang] = (loveLangCount[lang] || 0) + 1
        batteryCount[battery] = (batteryCount[battery] || 0) + 1
        timeOfDayCount[tod] = (timeOfDayCount[tod] || 0) + 1
        recentMoods.push(mood)
    })

    const topMoods = getTopTiedItems(moodCount)
    const topLangs = getTopTiedItems(loveLangCount)
    const topBatteries = getTopTiedItems(batteryCount)
    const topTimes = getTopTiedItems(timeOfDayCount)

    const insights = []

    if (topMoods.length) {
        const moodStr = topMoods.map((m) => `*${m}*`).join(", ")
        insights.push(
            `🌙 You've most often felt ${moodStr} recently. This may reflect your inner world asking to be witnessed.`
        )
    }

    if (topLangs.length) {
        const langStr = topLangs.map((l) => `*${l}*`).join(", ")
        insights.push(
            `💖 Your entries suggest a strong leaning toward ${langStr}. Consider how this love language shows up in your relationships—and in how you care for yourself.`
        )
    }

    if (topBatteries.length) {
        const batteryStr = topBatteries.map((b) => `*${b}*`).join(", ")
        insights.push(
            `🔋 You've most often logged a ${batteryStr} energy level. This may be a sign to adjust how much time you spend alone vs. with others.`
        )
    }

    if (topTimes.length) {
        const timeStr = topTimes.join(", ")
        insights.push(
            `🕰️ Your calmest or most reflective moods tend to occur in the ${timeStr}. Consider how that time of day influences your inner world.`
        )
    }

    const uniqueDates = new Set(dates)
    if (uniqueDates.size >= 3) {
        insights.push(
            `🗓️ You've logged moods on *${uniqueDates.size}* different days. Your consistency is powerful—keep going.`
        )
    }

    let streak = 1
    let last = recentMoods[recentMoods.length - 1]
    for (let i = recentMoods.length - 2; i >= 0; i--) {
        if (recentMoods[i] === last) {
            streak++
        } else {
            break
        }
    }

    if (streak >= 3) {
        insights.push(
            `💭 You've felt *${last}* for ${streak} entries in a row. This might be a moment to pause and reflect—or reach out to someone you trust.`
        )
    }

    return insights
}

