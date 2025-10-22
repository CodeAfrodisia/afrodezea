// src/lib/evaluateArchetype2D.js
export function evaluateArchetype2D(quiz, answersByQuestionId = {}) {
  const elKeys = ["fire", "water", "earth", "air", "electricity"];
  const roleKeys = [
    "protector",
    "healer",
    "muse",
    "architect",
    "rebel",
    "sage",
    "guardian",
    "artisan",
    "visionary",
    "navigator",
  ];

  const el = Object.fromEntries(elKeys.map((k) => [k, 0]));
  const role = Object.fromEntries(roleKeys.map((k) => [k, 0]));

  let answeredCore = 0;

  for (const q of quiz?.questions?.questions || []) {
    const optKey = answersByQuestionId[q.id];
    if (!optKey) continue;
    const opt = (q.options || []).find((o) => o.key === optKey);
    if (!opt) continue;

    if (!q.optional) answeredCore++;

    for (const [k, v] of Object.entries(opt.weights_element || {})) {
      if (k in el) {
        const n = Number(v);
        el[k] += Number.isFinite(n) ? n : 0;
      }
    }
    for (const [k, v] of Object.entries(opt.weights_role || {})) {
      if (k in role) {
        const n = Number(v);
        role[k] += Number.isFinite(n) ? n : 0;
      }
    }
  }

  const required = quiz?.questions?.min_required ?? 8;
  if (answeredCore < required) {
    return { ok: false, reason: `Please answer at least ${required} questions.` };
  }

  const topEl = elKeys.reduce((best, k) => (el[k] > el[best] ? k : best), elKeys[0]);
  const topRole = roleKeys.reduce(
    (best, k) => (role[k] > role[best] ? k : best),
    roleKeys[0]
  );

  // Compose a single key + human title
  const result_key = `${topEl}_${topRole}`;
  const toTitle = (s) =>
    String(s || "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase());
  const result_title = `${toTitle(topRole)} × ${toTitle(topEl)}`;
  const result_summary =
    quiz?.meta?.summary_template
      ? quiz.meta.summary_template
          .replace(/\{\{role\}\}/g, toTitle(topRole))
          .replace(/\{\{element\}\}/g, toTitle(topEl))
      : `Your leading role is ${toTitle(topRole)}, expressed through ${toTitle(
          topEl
        )} element.`;

  // Provide a unified totals object so generic charts/UIs can render this quiz, too.
  // We prefix keys to avoid collisions and to match the pattern used elsewhere.
  const result_totals = {
    ...Object.fromEntries(Object.entries(role).map(([k, v]) => [`role_${toTitle(k)}`, +v || 0])),
    ...Object.fromEntries(
      Object.entries(el).map(([k, v]) => [`element_${toTitle(k)}`, +v || 0])
    ),
  };

  return {
    ok: true,
    result_key,
    result: { key: result_key, title: result_title, summary: result_summary },
    result_title,
    result_summary,
    element_key: topEl,
    role_key: topRole,
    element_totals: el,   // raw sums
    role_totals: role,    // raw sums
    result_totals,        // unified for charts/UIs
  };
}
