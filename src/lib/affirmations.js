// src/lib/affirmations.js
import supabase from "@lib/supabaseClient.js";

const TABLE = "affirmations"; // change if your real table name differs
const FALLBACK = "Your presence is enough; move with quiet certainty today.";

/**
 * Read today's affirmation (if saved). Returns a safe default if:
 * - userId is missing
 * - the table/view doesn't exist yet
 * - no row for today
 * - any other error occurs
 */
export async function getTodaysAffirmation(userId) {
  if (!userId) return { text: FALLBACK };

  // Local midnight → ISO for PostgREST filter
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const sinceIso = start.toISOString();

  try {
    const { data, error, status } = await supabase
      .from(TABLE)
      .select("text")
      .eq("user_id", userId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      // Missing table/view (42P01) or REST 404: treat as "no data yet"
      if (error.code === "42P01" || status === 404) {
        console.info("[affirmations:get] table not found; returning fallback");
        return { text: FALLBACK };
      }
      console.warn("[affirmations:get] ignored error:", error);
      return { text: FALLBACK };
    }

    return { text: (Array.isArray(data) && data[0]?.text) || FALLBACK };
  } catch (e) {
    console.warn("[affirmations:get] unexpected error:", e);
    return { text: FALLBACK };
  }
}

/**
 * Regenerate an affirmation client-side (stub) and try to persist it.
 * If the table isn’t ready or the insert fails, we still return the text.
 */
export async function regenerateAffirmation(userId) {
  const choices = [
    "Breathe easy; you’re right on time.",
    "Soft steps forward still move you forward.",
    "You can trust the quiet work you’ve already done.",
    "You are allowed to take up gentle, steady space.",
  ];
  const text = choices[Math.floor(Math.random() * choices.length)];

  if (userId) {
    try {
      await supabase.from(TABLE).insert({ user_id: userId, text });
      // If your table doesn’t auto-set created_at, add `{ created_at: new Date().toISOString() }`
    } catch (e) {
      // Non-fatal by design (missing table, RLS, etc.)
      console.warn("[affirmations:insert] ignored error:", e);
    }
  }

  return { text };
}
