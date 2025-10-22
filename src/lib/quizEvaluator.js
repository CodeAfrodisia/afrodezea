import { normalizeTotals as normalizeTotalsForCharts } from "@lib/quizMath.js";

export function evaluateSoulConnection(quiz, answersByQuestionId) {
  const resKeys = quiz.questions.results.map(r => r.key);
  const totalsRaw = Object.fromEntries(resKeys.map(k => [k, 0]));
  const maxRaw = Object.fromEntries(resKeys.map(k => [k, 0]));
  let answeredCore = 0;

  for (const q of quiz.questions.questions) {
    const chosenKey = answersByQuestionId[q.id];
    if (!chosenKey) continue;
    const opt = q.options.find(o => o.key === chosenKey);
    if (!opt) continue;
    if (!q.optional) answeredCore++;

    // contribute weights
    for (const [rk, val] of Object.entries(opt.weights || {})) {
      totalsRaw[rk] = (totalsRaw[rk] || 0) + Number(val || 0);
      maxRaw[rk] = (maxRaw[rk] || 0) + (q.max_points?.[rk] || Math.abs(Number(val)) || 0);
    }
  }

  const required = quiz.questions.min_required ?? 7;
  if (answeredCore < required) {
    return { ok: false, reason: `Please answer at least ${required} questions.` };
  }

  // winner logic (same as before)
  const maxVal = Math.max(...Object.values(totalsRaw));
  let candidates = Object.entries(totalsRaw)
    .filter(([, v]) => v === maxVal)
    .map(([k]) => k);

  if (candidates.length > 1) {
    const nonOptionalContribution = Object.fromEntries(candidates.map(k => [k, 0]));
    for (const q of quiz.questions.questions.filter(q => !q.optional)) {
      const chosenKey = answersByQuestionId[q.id];
      const opt = q.options.find(o => o.key === chosenKey);
      if (!opt) continue;
      for (const rk of candidates) {
        if (opt.weights?.[rk]) nonOptionalContribution[rk]++;
      }
    }
    const maxCoreHits = Math.max(...Object.values(nonOptionalContribution));
    candidates = candidates.filter(k => nonOptionalContribution[k] === maxCoreHits);

    const priority = ["twin_soul", "soulmate", "twin_flame", "karmic", "kindred"];
    candidates.sort((a,b) => priority.indexOf(a) - priority.indexOf(b));
  }

  const key = candidates[0];
  const result = quiz.questions.results.find(r => r.key === key);

  return {
    ok: true,
    result_key: key,
    result,
    totals_raw: totalsRaw,
    max_raw: maxRaw,
    totals_norm: normalizeTotalsForCharts(totalsRaw, maxRaw),
  };
}
