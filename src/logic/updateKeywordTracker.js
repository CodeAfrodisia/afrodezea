// src/components/account/updateKeywordTracker.js
import { supabase } from "@lib/supabaseClient.js";
import nlp from "compromise";

// remove: import { extractKeywords } from "./updateKeywordTracker.js"

const sanitizeKeyword = (kw) =>
  kw.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, "_").trim();

const slugify = (text) =>
  text.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");

export function extractKeywords(text) {
  const doc = nlp(text);
  const nounFreq = doc.nouns().out("frequency");
  const adjFreq  = doc.adjectives().out("frequency");
  const terms = [...nounFreq, ...adjFreq];

  const top = terms
    .filter(t => t.count >= 1 && t.normal.length > 3)
    .slice(0, 10)
    .map(t => ({ normal: t.normal, count: t.count, keyword: slugify(t.normal) }));

  return top;
}

export async function updateKeywordTracker(
    userId,
    newJournal,
    oldJournal = ""
) {
    if (!userId || !newJournal) return

    const newKeywords = extractKeywords(newJournal)
    const oldKeywords = extractKeywords(oldJournal)

    const newMap = keywordArrayToMap(newKeywords)
    const oldMap = keywordArrayToMap(oldKeywords)

    // Combine all unique keyword names
    const allKeywords = new Set([
        ...Object.keys(newMap),
        ...Object.keys(oldMap),
    ])

    for (const keyword of allKeywords) {
        const newFreq = newMap[keyword] || 0
        const oldFreq = oldMap[keyword] || 0
        const diff = newFreq - oldFreq

        if (diff === 0) continue

        const { data: existing, error: fetchError } = await supabase
            .from("keyword_tracker")
            .select("frequency")
            .eq("user_id", userId)
            .eq("keyword", keyword)
            .maybeSingle()

        if (fetchError) {
            console.error(`❌ Error fetching "${keyword}":`, fetchError)
            continue
        }

        const currentFreq = existing?.frequency || 0
        const updatedFreq = Math.max(currentFreq + diff, 0)

        const { error: upsertError } = await supabase
            .from("keyword_tracker")
            .upsert(
                {
                    user_id: userId,
                    keyword,
                    frequency: updatedFreq,
                    last_used: new Date(),
                },
                {
                    onConflict: ["user_id", "keyword"],
                    ignoreDuplicates: false,
                    updateColumns: ["frequency", "last_used"],
                }
            )

        if (upsertError) {
            console.error(`❌ Error upserting "${keyword}":`, upsertError)
        } else {
            console.log(
                `🔁 Updated "${keyword}": ${currentFreq} → ${updatedFreq}`
            )
        }
    }
}

function keywordArrayToMap(arr) {
    return arr.reduce((acc, cur) => {
        const k = sanitizeKeyword(cur.normal)
        if (k) acc[k] = (acc[k] || 0) + 1
        return acc
    }, {})
}


