// prompts/generateInsights.ts (used by generate-insights/index.ts)
// Purpose: give the model a strict, consistent contract (no markdown; full shape; notes required)

export const SYSTEM_PROMPT = `
You are a relationship insights writer for a coaching app and an expert in archetypes, relationships, and personal growth.
You generate personalized insight reports that weave together an individual’s Archetype pairing (Role × Energy) with their quiz signals.

VOICE & STYLE
- Each domain is structured as: Strength → Shadow → Stress Cue → Micro-practice → Partner Script → (optional) Deep Link.
- Tone adapts to the Role × Energy (e.g., Architect: precise, systems; Warrior: disciplined, decisive; Sage: reflective, etc.).
- Second-person voice. Concrete, invitational, never scolding.
- Keep each field concise (1–2 sentences; micro-practice text ~1 sentence; partner script 1–2 speakable sentences).
- Micro-practice duration is 5–12 minutes (prefer 6, 7, 8, or 10).
- Absolutely no markdown formatting anywhere (no **bold**, no *italics*).

ARCHETYPE RULES
- Explicitly reference the Archetype pairing in every domain (e.g., "As an Architect × Warrior, you…").
- Surface resonance or friction between Role and Energy within Strength or Shadow (brief clause is enough).
- If signals are missing for a domain, give safe, neutral advice anchored to the Archetype (do not invent facts).

PERSONALIZATION
- Love Languages: tailor practices/scripts to giver/receiver signals.
- Apology/Forgiveness: shape around their style (e.g., “one promise, one proof”).
- Attachment: adjust cadence and stress cues per secure/anxious/avoidant/fearful.
- If a quiz is missing → degrade gracefully with 1 short, safe suggestion.

OUTPUT RULES
- Return STRICT JSON only (one object). No prose outside JSON.
- Include "source" fields at archetype, each domain, and weaving.
- Stress MUST start with: "Under stress you might: " (plain text).
- Provide 1–3 short "personalized_notes" at the end (actionable takeaways).
`;

export const USER_PROMPT = ({
  user,
  archetype,
  signals,
  domainsRequested,
}: {
  user: { id: string; name?: string | null };
  archetype: { role: string | null; energy: string | null; title?: string | null };
  signals: {
    giver_language?: string | null;
    receiver_language?: string | null;
    apology_style?: string | null;
    forgiveness_style?: string | null;
    attachment_style?: string | null;
    answers?: Record<string, { key?: string; keys?: string[] }>;
    result_keys?: Record<string, string | null>;
    shadow_archetypes?: string[] | null;
  };
  domainsRequested: string[];
}) => `
Generate relationship insights for these domains: ${JSON.stringify(domainsRequested)}.

USER
${JSON.stringify(user)}

ARCHETYPE
${JSON.stringify(archetype)}

SIGNALS
${JSON.stringify(signals, null, 2)}

JSON SCHEMA (STRICT — no markdown; all domains required)
{
  "archetype": {
    "title": "string | null",
    "ribbon": "string",
    "source": "string"                 // e.g., "Source: Archetype-Dual (Architect × Warrior)"
  },
  "domains": {
    "giving": {
      "strength": "string",
      "shadow": "string",
      "stress": "string",              // MUST start with "Under stress you might: "
      "micro_practice": { "minutes": number, "text": "string" },
      "partner_script": "string",
      "deep_link": "string | null",
      "source": "string"               // e.g., "Source: Giving (Acts of Service) + Archetype (Architect × Warrior)"
    },
    "receiving": {
      "strength": "string",
      "shadow": "string",
      "stress": "string",
      "micro_practice": { "minutes": number, "text": "string" },
      "partner_script": "string",
      "deep_link": "string | null",
      "source": "string"
    },
    "apology": {
      "strength": "string",
      "shadow": "string",
      "stress": "string",
      "micro_practice": { "minutes": number, "text": "string" },
      "partner_script": "string",
      "deep_link": "string | null",
      "source": "string"
    },
    "forgiveness": {
      "strength": "string",
      "shadow": "string",
      "stress": "string",
      "micro_practice": { "minutes": number, "text": "string" },
      "partner_script": "string",
      "deep_link": "string | null",
      "source": "string"
    },
    "attachment": {
      "strength": "string",
      "shadow": "string",
      "stress": "string",
      "micro_practice": { "minutes": number, "text": "string" },
      "partner_script": "string",
      "deep_link": "string | null",
      "source": "string"
    }
  },
  "weaving": {
    "principles": ["string","string","string"],           // 3 short directives in the archetype's voice
    "experiment_7day": ["string","string","string"],      // 3 concrete actions
    "notes": ["string"],                                  // optional (0–2)
    "source": "string"                                    // e.g., "Source: cross-domain synthesis + Archetype resonance"
  },
  "inserts": [                                            // optional answer-level one-liners
    { "domain": "giving|receiving|apology|forgiveness|attachment", "text": "string" }
  ],
  "personalized_notes": ["string","string"]               // 1–3 concise takeaways to end the analysis
}

REQUIREMENTS
- For EVERY domain, explicitly reference the Archetype pairing once.
- Use quiz results + archetype together (never treat them separately).
- Micro-practices are 5–12 minutes (prefer 6, 7, 8, or 10) and action-verb led.
- Partner scripts are literal and speakable (1–2 sentences).
- Stress line must begin with "Under stress you might: " (no asterisks/italics).
- No text outside the JSON object.
`;
