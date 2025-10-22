// getFollowUpPrompt.js

import { followUpPrompts } from "@logic/followUpPrompts.js"

/**
 * Randomly selects one of the user's response types (mood, battery, love_language)
 * and returns a follow-up prompt that hasn’t been used recently
 *
 * @param {Object} responses – { mood, social_battery, love_language }
 * @param {Array} usedPrompts – previously shown prompts (optional)
 * @returns {Object} – { prompt, sourceType, sourceValue }
 */
export function getFollowUpPrompt(responses, usedPrompts = []) {
    const options = [
        { type: "mood", value: responses.mood },
        { type: "social_battery", value: responses.social_battery },
        { type: "love_language", value: responses.love_language },
    ].filter((o) => o.value) // make sure the user gave a value

    // Pick one type randomly
    const chosen = options[Math.floor(Math.random() * options.length)]
    const { type, value } = chosen

    const promptSet = followUpPrompts[type]?.[value] || []

    // Filter out used prompts if any are passed in
    const available = promptSet.filter((p) => !usedPrompts.includes(p))

    const finalPrompt = available.length
        ? available[Math.floor(Math.random() * available.length)]
        : promptSet[Math.floor(Math.random() * promptSet.length)] ||
          "How are you really feeling right now?"

    return {
        prompt: finalPrompt,
        sourceType: type,
        sourceValue: value,
    }
}

