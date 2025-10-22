type AnyRec = Record<string, any>;

function num(v: any): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}

// Accept objects like {k: 1, ...}, or arrays [{key:'X', value:1}] or [['X',1],...]
function topOf(maybe: any): string | null {
  if (!maybe) return null;

  // Object case
  if (typeof maybe === "object" && !Array.isArray(maybe)) {
    let bestK: string | null = null, bestV = -Infinity;
    for (const [k, v] of Object.entries(maybe)) {
      const n = num(v);
      if (Number.isFinite(n) && n > bestV) { bestV = n; bestK = k; }
    }
    return bestK;
  }

  // Array of pairs or objects
  if (Array.isArray(maybe)) {
    let bestK: string | null = null, bestV = -Infinity;
    for (const it of maybe) {
      let k: any, v: any;
      if (Array.isArray(it)) [k, v] = it;
      else if (typeof it === "object") { k = it.key ?? it.k ?? it.name; v = it.value ?? it.v ?? it.score; }
      const n = num(v);
      if (typeof k === "string" && Number.isFinite(n) && n > bestV) { bestV = n; bestK = k; }
    }
    return bestK;
  }

  return null;
}

export function resolveArchetypeFromRow(row: AnyRec) {
  if (!row) return { label: null, key: null, role: null, energy: null, totals: {} };

  const totals: AnyRec =
    row.result_totals ?? row.totals ?? row.payload ?? {};

  const roleTotals   = totals.role    ?? totals.roles    ?? null;
  const energyTotals = totals.energy  ?? totals.energies ?? null;

  const roleTop   = topOf(roleTotals);
  const energyTop = topOf(energyTotals);

  // Try plain fields and common JSON primaries
  let label: string | null =
    row.result_title
    ?? totals?.primary?.label
    ?? totals?.winner?.label
    ?? (roleTop && energyTop ? `${roleTop} × ${energyTop}` : null);

  let key: string | null =
    row.result_key
    ?? totals?.primary?.key
    ?? totals?.winner?.key
    ?? (roleTop && energyTop ? `${roleTop.toLowerCase()}__${energyTop.toLowerCase()}` : null);

  return {
    label,
    key,
    role: roleTop ?? null,
    energy: energyTop ?? null,
    totals,
  };
}
