// src/lib/attractionProfile.js

// Split role_* and element_* vectors from one totals object
export function splitVectors(totals = {}) {
  const roles = {};
  const elements = {};
  for (const [k, v] of Object.entries(totals || {})) {
    if (/^role_/i.test(k)) roles[k] = Number(v) || 0;
    if (/^element_/i.test(k)) elements[k] = Number(v) || 0;
  }
  return { roles, elements };
}

// Rank any {key: score} map -> [{key, score, pct}]
export function rankVector(map = {}) {
  const entries = Object.entries(map);
  if (!entries.length) return [];
  const max = Math.max(...entries.map(([, v]) => v));
  return entries
    .map(([key, score]) => ({
      key,
      score,
      pct: max > 0 ? Math.round((score / max) * 100) : 0
    }))
    .sort((a, b) => b.score - a.score);
}

// Build a quick lookup {key -> label} from quiz.results[]
export function buildLabelIndex(results = []) {
  const idx = {};
  for (const r of results || []) {
    if (r?.key) idx[r.key] = r.label || r.key;
  }
  return idx;
}

// Compose one-liner summary
export function composeAttractionLine(topRoles = [], topElems = [], labelIndex = {}) {
  const role1 = topRoles[0] ? (labelIndex[topRoles[0].key] || topRoles[0].key) : null;
  const role2 = topRoles[1] ? (labelIndex[topRoles[1].key] || topRoles[1].key) : null;
  const el1   = topElems[0] ? (labelIndex[topElems[0].key]   || topElems[0].key)   : null;
  const el2   = topElems[1] ? (labelIndex[topElems[1].key]   || topElems[1].key)   : null;

  const rolePart = role2 ? `${role1} + ${role2}` : role1 || "—";
  const elemPart = el2 ? `${el1}/${el2}` : el1 || "—";

  return `You're pulled toward **${rolePart}** energy with an **${elemPart}** elemental vibe.`;
}

