// src/lib/evaluateWeightedQuiz.js
export function evaluateWeightedQuiz(quiz, answersByQuestionId) {
  if (!quiz?.questions?.questions?.length) {
    return { ok: false, reason: "No questions." };
  }

  const qset = quiz.questions.questions;
  const results = quiz.questions.results || [];
  const resultKeys = results.map((r) => r.key);

  // Prepare raw totals & maxima (for the questions actually answered)
  const totalsRaw = Object.fromEntries(resultKeys.map((k) => [k, 0]));
  const maxRaw = Object.fromEntries(resultKeys.map((k) => [k, 0]));

  let answeredCore = 0;

  for (const q of qset) {
    const chosen = answersByQuestionId[q.id];
    if (!chosen) continue;

    const opt = (q.options || []).find((o) => o.key === chosen);
    if (!opt) continue;

    if (!q.optional) answeredCore++;

    // Add the actual weights picked
    for (const [rk, v] of Object.entries(opt.weights || {})) {
      if (!(rk in totalsRaw)) continue; // ignore unknown keys
      const n = Number(v);
      totalsRaw[rk] += Number.isFinite(n) ? n : 0;
    }

    // Add the maximum possible for this question per key
    const perKeyMaxForThisQ = {};
    for (const o of q.options || []) {
      for (const [rk, v] of Object.entries(o.weights || {})) {
        if (!(rk in maxRaw)) continue;
        const n = Math.abs(Number(v));
        perKeyMaxForThisQ[rk] = Math.max(perKeyMaxForThisQ[rk] || 0, Number.isFinite(n) ? n : 0);
      }
    }
    for (const [rk, m] of Object.entries(perKeyMaxForThisQ)) {
      maxRaw[rk] += Number.isFinite(m) ? m : 0;
    }
  }

  const required =
    quiz.questions.min_required ??
    Math.ceil(qset.filter((q) => !q.optional).length * 0.6);

  if (answeredCore < required) {
    return { ok: false, reason: `Please answer at least ${required} questions.` };
  }

  // Build normalized percentages (0..1, then 0..10 for charts)
  const perc01 = Object.fromEntries(
    Object.keys(totalsRaw).map((k) => {
      const max = Math.max(1e-9, maxRaw[k] || 0); // avoid div-by-zero
      return [k, (totalsRaw[k] || 0) / max];
    })
  );
  const perc10 = Object.fromEntries(
    Object.entries(perc01).map(([k, v]) => [k, Math.max(0, Math.min(10, +(v * 10)))])
  );

  // Winner by highest percent
  let best = -Infinity,
    winner = null;
  for (const k of Object.keys(perc01)) {
    if (perc01[k] > best) {
      best = perc01[k];
      winner = k;
    }
  }

  // Tie-breaks on percent
  const tied = Object.keys(perc01).filter((k) => Math.abs(perc01[k] - best) < 1e-9);
  let final = winner;

  if (tied.length > 1) {
    // Prefer the one that appears in more non-optional question weights
    const coreHits = Object.fromEntries(tied.map((k) => [k, 0]));
    for (const q of qset.filter((q) => !q.optional)) {
      const chosen = answersByQuestionId[q.id];
      const opt = (q.options || []).find((o) => o.key === chosen);
      if (!opt) continue;
      for (const k of tied) {
        if (opt.weights?.[k]) coreHits[k] += 1;
      }
    }
    const maxCore = Math.max(...Object.values(coreHits));
    const afterCore = tied.filter((k) => coreHits[k] === maxCore);

    if (afterCore.length === 1) {
      final = afterCore[0];
    } else {
      // Stable priority (default to author order)
      const priority = results.map((r) => r.key);
      afterCore.sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
      final = afterCore[0];
    }
  }

  // Confidence (distance to runner-up)
  const sorted = Object.entries(perc01).sort((a, b) => b[1] - a[1]);
  const confidence =
    sorted.length > 1 ? +(sorted[0][1] - sorted[1][1]).toFixed(3) : 1;

  const resultRow = results.find((r) => r.key === final) || results[0] || {};
  const result_title =
    resultRow.title ||
    String(final || "").replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  const result_summary = resultRow.summary || resultRow.blurb || null;

  return {
    ok: true,
    result_key: final || null,
    result: resultRow,                 // original row for rich UIs
    result_title,                      // convenience for simple UIs
    result_summary,                    // convenience for simple UIs
    result_totals: perc10,             // unified totals for charts (0..10)
    totals_raw: totalsRaw,             // raw sums (debug/analytics)
    max_raw: maxRaw,                   // per-key maxima (debug/analytics)
    confidence,                        // optional UI hint
  };
}
