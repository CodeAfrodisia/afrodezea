// src/lib/profileMapper.js

/** Utility: choose the max entry in a {key: number} bag */
function pickPrimary(totals = {}) {
  let bestKey = null, bestVal = -Infinity;
  for (const [k, v] of Object.entries(totals)) {
    const n = Number(v) || 0;
    if (n > bestVal) { bestKey = k; bestVal = n; }
  }
  return bestKey;
}

/** Labels for Love Language (Receiving) → romantic archetype */
const LOVE_RX_TO_ARCHETYPE = {
  words:   { key: "orator_lover",   label: "The Orator (Words)" },
  time:    { key: "keeper_lover",   label: "The Keeper (Quality Time)" },
  touch:   { key: "ember_lover",    label: "The Ember (Physical Touch)" },
  service: { key: "guardian_lover", label: "The Guardian (Acts of Service)" },
  gifts:   { key: "giver_lover",    label: "The Giver (Gifts)" },
};

/** Ambiversion → role-ish tilt (temporary until you add a true Role quiz) */
const AMBI_TO_ROLE = {
  introvert_strong: { key: "sage", label: "Sage" },
  introvert:        { key: "sage", label: "Sage" },
  ambivert:         { key: "weaver", label: "Weaver" },
  extrovert:        { key: "muse", label: "Muse" },
  extrovert_strong: { key: "muse", label: "Muse" },
};

/** Soul-connection → mystic flavor */
const SOUL_TO_MYSTIC = {
  twin_soul:  { key: "mirror",    label: "Mirror" },
  twin_flame: { key: "firepath",  label: "Firepath" },
  soulmate:   { key: "harmonic",  label: "Harmonic" },
  karmic:     { key: "teacher",   label: "Teacher" },
  kindred:    { key: "companion", label: "Companion" },
};

/** Optional aesthetic cues by element */
const ELEMENT_CUES = {
  Fire:   { colors: ["#ff6a3a", "#e83e00"], notes: ["Amber", "Spice"], texture: "Velvet heat" },
  Water:  { colors: ["#6bb6ff", "#1e5fff"], notes: ["Sea Salt", "Lotus"], texture: "Silk flow" },
  Earth:  { colors: ["#b89a6a", "#6d5a3c"], notes: ["Vetiver", "Cedar"], texture: "Suede ground" },
  Air:    { colors: ["#e5f5ff", "#9ed8ff"], notes: ["Linen", "Citrus"], texture: "Linen light" },
  Light:  { colors: ["#fff7cc", "#ffe066"], notes: ["Neroli", "Pear"], texture: "Sheer glow" },
  Shadow: { colors: ["#333", "#000"],       notes: ["Oud", "Smoke"],    texture: "Lacquer night" },
  Storm:  { colors: ["#9cb0ff", "#4253ff"], notes: ["Ozonic", "Rain"],  texture: "Satin charge" },
  Flux:   { colors: ["#f4b6ff", "#b25dff"], notes: ["Iris", "Musk"],    texture: "Iridescent" },
};

/**
 * mapAttemptsToProfile
 * @param {Object} args
 * - attemptsBySlug: { [slug]: { result_key, result_totals } }
 * - element: string (e.g., "Fire")  // from SoulContext or profiles table
 * - publicFlag: boolean
 */
export function mapAttemptsToProfile({ attemptsBySlug = {}, element, publicFlag = false }) {
  // romantic archetype from Love Language (Receiving)
  const loveRx = attemptsBySlug["love-language-receiving"] || attemptsBySlug["love-language-rx"];
  const lovePrimary = loveRx?.result_key || pickPrimary(loveRx?.result_totals);
  const romantic = LOVE_RX_TO_ARCHETYPE[lovePrimary] || null;

  // general role from Ambiversion spectrum
  const ambi = attemptsBySlug["ambiversion-spectrum"];
  const ambiPrimary = ambi?.result_key || pickPrimary(ambi?.result_totals);
  const role = AMBI_TO_ROLE[ambiPrimary] || null;

  // mystic layer from Soul Connection
  const soul = attemptsBySlug["soul-connection"];
  const soulPrimary = soul?.result_key || pickPrimary(soul?.result_totals);
  const mystic = SOUL_TO_MYSTIC[soulPrimary] || null;

  // Apology/Forgiveness patterns (optional footnotes)
  const apology   = attemptsBySlug["apology-style"];
  const forgiving = attemptsBySlug["forgiveness-language"];

  const cues = ELEMENT_CUES[element] || null;

  // Compose
  return {
    element: element || null,
    role,              // {key,label} or null
    romantic,          // {key,label} or null
    lifePath: null,    // fill later from your Life Path quiz
    friendship: null,  // fill later from Friendship Style quiz
    mystic,            // {key,label} or null
    cues,              // aesthetic cue bundle
    compatibility: {
      bestWith: [], growthWith: [], tensionsWith: [] // you’ll fill once we lock the grid
    },
    visibility: publicFlag,
    // small “insights” drawer: show top keys from apology/forgiveness if present
    notes: {
      apology: apology?.result_key || null,
      forgiveness: forgiving?.result_key || null,
    }
  };
}

