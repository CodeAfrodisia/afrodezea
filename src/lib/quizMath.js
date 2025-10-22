// src/lib/quizMath.js

function startCase(s = "") {
  return s
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

/**
 * normalizeTotals (existing)
 * Returns an ARRAY of [label, shapedValue] for display.
 */
export function normalizeTotals(
  totals = {},
  labels = {},
  maxValue = 10,
  opts = {}
) {
  const { gamma = 0.8, boost = 1.12, floor = 0.6 } = opts;

  const keys = Object.keys(labels).length
    ? Object.keys(labels)
    : Object.keys(totals || {});

  return keys.map((k) => {
    let v = Number((totals || {})[k] ?? 0);

    // Normalize to 0..maxValue
    if (v >= 0 && v <= 1) {
      v = v * maxValue;
    } else if (v > 1 && v <= 100) {
      v = (v / 100) * maxValue;
    }

    // Presentational shaping
    const unit = Math.max(0, Math.min(maxValue, v)) / maxValue; // 0..1
    let shaped = Math.pow(unit, gamma) * maxValue;              // gamma expand
    shaped = shaped * boost;                                    // gentle lift
    if (shaped > 0 && shaped < floor) shaped = floor;           // minimum tick
    shaped = Math.max(0, Math.min(maxValue, shaped));           // clamp

    const label = labels[k] || startCase(k);
    return [label, shaped];
  });
}

/**
 * normalizeTotalsObject (new)
 * Same math as normalizeTotals, but returns an OBJECT keyed by the ORIGINAL KEYS.
 * This keeps chart inputs as { key: value } while preserving your visual normalization.
 */
export function normalizeTotalsObject(
  totals = {},
  maxValue = 10,
  opts = {}
) {
  const { gamma = 0.8, boost = 1.12, floor = 0.6 } = opts;

  const out = {};
  for (const k of Object.keys(totals || {})) {
    let v = Number(totals[k] ?? 0);

    // Normalize to 0..maxValue
    if (v >= 0 && v <= 1) {
      v = v * maxValue;
    } else if (v > 1 && v <= 100) {
      v = (v / 100) * maxValue;
    }

    // Presentational shaping (identical to array version)
    const unit = Math.max(0, Math.min(maxValue, v)) / maxValue;
    let shaped = Math.pow(unit, gamma) * maxValue;
    shaped = shaped * boost;
    if (shaped > 0 && shaped < floor) shaped = floor;
    shaped = Math.max(0, Math.min(maxValue, shaped));

    out[k] = shaped;
  }
  return out;
}
