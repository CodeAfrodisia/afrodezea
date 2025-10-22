// src/lib/quizResultSummary.ts

// If your quiz uses different keys, pass them in via options.keys
const DEFAULT_KEYS = [
  "accountability",
  "repair",
  "gift",
  "time",
  "words",
  "change",
];

export type SummaryOptions = {
  keys?: string[];
  // Max possible points per style in this quiz version.
  // For forgiveness v3: 16 (6 scenario x2 + 2 head-to-head x2)
  capPerStyle?: number;
  // Return percentages as 0..100 (true) or 0..1 (false)
  asPercent?: boolean;
};

export type Distribution = {
  keys: string[];
  counts: Record<string, number>;       // raw tallies per style
  normalized: Record<string, number>;   // counts / capPerStyle
  percentages: Record<string, number>;  // 0..100 by default
  order: string[];                      // keys sorted by counts desc
  winner: string | null;
  runnerUp: string | null;
  margin: number;                       // (winner - second) in raw points
  confidence: number;                   // margin / capPerStyle (0..1)
  totalAnsweredWeight: number;          // sum of all style counts
};

// Defensive number getter
const n = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : 0);

/**
 * Summarize quiz scores into a tidy distribution (counts + normalized),
 * compute winner/runner-up, and a simple confidence metric.
 */
export function summarizeResults(
  totals: Record<string, number> | null | undefined,
  opts: SummaryOptions = {}
): Distribution {
  const keys = (opts.keys && opts.keys.length ? opts.keys : DEFAULT_KEYS).slice();
  const capPerStyle = typeof opts.capPerStyle === "number" ? opts.capPerStyle : 16;
  const asPercent = opts.asPercent !== false; // default true

  // Build counts map with zero defaults
  const counts: Record<string, number> = {};
  for (const k of keys) counts[k] = n(totals?.[k]);

  // Ranking
  const order = keys.slice().sort((a, b) => counts[b] - counts[a]);
  const winner = order[0] ?? null;
  const runnerUp = order[1] ?? null;
  const margin = winner && runnerUp ? counts[winner] - counts[runnerUp] : 0;
  const confidence = capPerStyle > 0 ? margin / capPerStyle : 0;

  // Normalized + percentages
  const normalized: Record<string, number> = {};
  const percentages: Record<string, number> = {};
  for (const k of keys) {
    const norm = capPerStyle > 0 ? counts[k] / capPerStyle : 0;
    normalized[k] = norm;
    percentages[k] = asPercent ? Math.round(norm * 100) : norm;
  }

  // Simple total (not used for the winner logic—just handy for charts)
  const totalAnsweredWeight = Object.values(counts).reduce((s, v) => s + v, 0);

  return {
    keys,
    counts,
    normalized,
    percentages,
    order,
    winner,
    runnerUp,
    margin,
    confidence,
    totalAnsweredWeight,
  };
}

/**
 * Convenience: “Top: A (8) · Runner-up: C (6) · Others: …”
 */
export function distributionLabel(d: Distribution): string {
  const { winner, runnerUp, counts, order } = d;
  const parts: string[] = [];
  if (winner) parts.push(`Top: ${winner} (${counts[winner]})`);
  if (runnerUp) parts.push(`Runner-up: ${runnerUp} (${counts[runnerUp]})`);
  const rest = order.slice(2).map(k => `${k} (${counts[k]})`);
  if (rest.length) parts.push(`Others: ${rest.join(", ")}`);
  return parts.join(" · ");
}

/**
 * Minimal, stable LLM signal payload derived from distribution.
 * You can add your own traits later—this just keeps structure consistent.
 */
export function buildNarrativeSignals(args: {
  quiz_slug: string | null | undefined;
  result_title: string | null | undefined;
  totals: Record<string, number> | null | undefined;
  archetype?: { role?: string | null; energy?: string | null; title?: string | null } | null;
  capPerStyle?: number; // pass 16 for forgiveness v3
  keys?: string[];      // override style keys if needed
}) {
  const dist = summarizeResults(args.totals || {}, {
    capPerStyle: args.capPerStyle ?? 16,
    keys: args.keys,
  });

  return {
    quiz_slug: args.quiz_slug ?? null,
    result_title: args.result_title ?? null,
    distribution: {
      counts: dist.counts,
      percentages: dist.percentages, // 0..100 ints
      order: dist.order,
      winner: dist.winner,
      runner_up: dist.runnerUp,
      confidence: dist.confidence,   // 0..1 (margin / cap)
      cap_per_style: args.capPerStyle ?? 16,
    },
    archetype: args.archetype
      ? {
          role: args.archetype.role ?? null,
          energy: args.archetype.energy ?? null,
          title: args.archetype.title ?? null,
        }
      : null,
  };
}

