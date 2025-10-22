// useMoodData.js
import { supabase } from "@lib/supabaseClient.js"

export const saveMoodEntry = async (userId, moodData) => {
    try {
        const { data, error } = await supabase.from("moods").insert([
            {
                user_id: userId,
                reflection: moodData.reflection,
                mood: moodData.mood,
                //love_language: moodData.love_language,
                social_battery: moodData.social_battery,
                created_at: new Date().toISOString(),
            },
        ])

        if (error) {
            throw error
        }

        return { success: true, data }
    } catch (error) {
        console.error("Supabase insert error:", error)
        return { success: false, error }
    }
}

export const getMoodHistory = async (userId) => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data, error } = await supabase
        .from("moods")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Supabase fetch error:", error)
        return []
    }

    return data || []
}

