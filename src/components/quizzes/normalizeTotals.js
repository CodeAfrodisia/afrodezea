// src/components/quizzes/normalizeTotals.js

// Maps for migrating older quiz keys → canonical keys
const apologyKeyMapOldToNew = {
  verbal: "words",
  responsibility: "accountability",
};

const forgivenessKeyMapOldToNew = {
  repair: "accountability",
  restitution: "amends",
  gestures: "gesture",
};

/**
 * remapTotalsKeys(slug, totals)
 * - Use for schema migration / compatibility. It renames legacy keys in `totals`
 *   based on the quiz `slug`, and returns a new object.
 * - Safe if called wrong: if the first arg looks like an object, it just returns it.
 */
export function remapTotalsKeys(slug = null, totals = {}) {
  // Guard: if called as remapTotalsKeys(totalsObj, labels) by mistake, just return it
  if (slug && typeof slug === "object" && !Array.isArray(slug)) return slug;

  const map =
    slug === "apology-style" ? apologyKeyMapOldToNew
    : slug === "forgiveness" || slug === "forgiveness-language" ? forgivenessKeyMapOldToNew
    : null;

  if (!map) return totals;

  const next = { ...totals };
  for (const [oldK, newK] of Object.entries(map)) {
    if (oldK in next) {
      next[newK] = (next[newK] || 0) + next[oldK];
      delete next[oldK];
    }
  }
  return next;
}
