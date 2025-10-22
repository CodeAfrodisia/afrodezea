export function getMoodStreakInsight(moodEntries, archetypeName) {
    const last7 = moodEntries.slice(-7)
    const moods = last7.map((e) => e.mood)

    const happyDays = moods.filter((m) => m === "happy").length
    const sadDays = moods.filter((m) => m === "sad").length

    if (happyDays >= 5) {
        return `🌞 Your light is rising, ${archetypeName}. Consider sharing that energy this week.`
    }

    if (sadDays >= 5) {
        return `💧 The tides are low, ${archetypeName}. Perhaps this is your season for restoration.`
    }

    return null
}

