// src/components/quizzes/labels.js

// --- Love Language ----------------------------------------------------------
export const loveLanguageLabels = {
  words:   "Words",
  service: "Acts of Service",
  gifts:   "Gifts",
  time:    "Quality Time",
  touch:   "Physical Touch",
};

// --- Attachment Style -------------------------------------------------------
export const attachmentLabels = {
  secure:       "Secure",
  anxious:      "Anxious",
  avoidant:     "Avoidant",
  disorganized: "Fearful-Avoidant",
};

// --- Soul Connection --------------------------------------------------------
export const soulConnectionLabels = {
  soulmate:   "Soulmate",
  twin_flame: "Twin Flame",
  twin_soul:  "Twin Soul",
  karmic:     "Karmic",
  kindred:    "Kindred",
};

// --- Apology Style (support old & new keys) --------------------------------
// Your quiz emits: words, repair, change, gift, time
// Some older content used: accountability, behavior, amends, empathy, gesture
export const apologyLabels = {
  // current quiz keys
  words:  "Words",
  repair: "Repair / Amends",
  change: "Changed Behavior",
  gift:   "Gesture / Gift",
  time:   "Time / Consistency",

  // legacy aliases (keep for back-compat)
  accountability: "Ownership",
  behavior:       "Changed Behavior",
  amends:         "Amends",
  empathy:        "Validation",
  gesture:        "Gestures",
};

// --- Forgiveness (same surface labels as Apology) ---------------------------
export const forgivenessLabels = { ...apologyLabels };

// --- Archetype Preference (support energy_* and element_* mirrors) ----------
const ENERGY_LABELS = {
  Warrior:   "Warrior",
  Muse:      "Muse",
  Sage:      "Sage",
  Visionary: "Visionary",
  Healer:    "Healer",
  Creator:   "Creator",
  Lover:     "Lover",
  Magician:  "Magician",
  Rebel:     "Rebel",
  Caregiver: "Caregiver",
  Sovereign: "Sovereign",
  Jester:    "Jester",
};

export const archetypePreferenceLabels = {
  // roles
  role_Architect: "Architect",
  role_Guardian:  "Guardian",
  role_Navigator: "Navigator",
  role_Artisan:   "Artisan",
  role_Catalyst:  "Catalyst",
  role_Protector: "Protector",
  role_Nurturer:  "Nurturer",
  role_Herald:    "Herald",
  role_Seeker:    "Seeker",

  // energies
  ...Object.fromEntries(Object.keys(ENERGY_LABELS).map(k => [`energy_${k}`, ENERGY_LABELS[k]])),

  // mirror keys in case totals were aliased energy_* → element_* for the Attraction card
  ...Object.fromEntries(Object.keys(ENERGY_LABELS).map(k => [`element_${k}`, ENERGY_LABELS[k]])),
};

// --- Registry ---------------------------------------------------------------
export const labelsMap = {
  // Love language variants
  "love-language":            { title: "Love Language",       ...loveLanguageLabels },
  "love_language":            { title: "Love Language",       ...loveLanguageLabels },
  "love-language-receiving":  { title: "Receiving Style",     ...loveLanguageLabels },
  "love_language_receiving":  { title: "Receiving Style",     ...loveLanguageLabels },
  "love-language-giving":     { title: "Giving Style",        ...loveLanguageLabels },
  "love_language_giving":     { title: "Giving Style",        ...loveLanguageLabels },

  // Attachment
  "attachment":               { title: "Attachment Style",    ...attachmentLabels },
  "attachment-style":         { title: "Attachment Style",    ...attachmentLabels },
  "attachment_style":         { title: "Attachment Style",    ...attachmentLabels },

  // Soul connection
  "soul-connection":          { title: "Soul Connection",     ...soulConnectionLabels },

  // Apology (map all common slugs to same labels)
  "apology-style":            { title: "Apology Style",       ...apologyLabels },
  "apology_language":         { title: "Apology Style",       ...apologyLabels },
  "apology-language":         { title: "Apology Style",       ...apologyLabels },
  "apology":                  { title: "Apology Style",       ...apologyLabels },
  "repair-style":             { title: "Apology Style",       ...apologyLabels },
  "repair_apology":           { title: "Apology Style",       ...apologyLabels },

  // Forgiveness
  "forgiveness":              { title: "Forgiveness Language", ...forgivenessLabels },
  "forgiveness-language":     { title: "Forgiveness Language", ...forgivenessLabels },
  "forgiveness_language":     { title: "Forgiveness Language", ...forgivenessLabels },
  "repair-forgiver":          { title: "Forgiveness Language", ...forgivenessLabels },
  "repair_forgiver":          { title: "Forgiveness Language", ...forgivenessLabels },

  // Archetype Preference
  "archetype-preference":     { title: "Archetype Preference", ...archetypePreferenceLabels },
  "archetype_preference":     { title: "Archetype Preference", ...archetypePreferenceLabels },
};
