// src/lib/evaluateArchetypePreference.js
export function evaluateArchetypePreference(quiz, answersByQuestionId = {}) {
  // Canon (same set you used in seeds)
  const roleKeys = [
    "Navigator","Protector","Architect","Guardian","Artisan",
    "Catalyst","Nurturer","Herald","Seeker"
  ];
  const energyKeys = [
    "Muse","Sage","Visionary","Healer","Warrior",
    "Creator","Lover","Magician","Rebel","Caregiver",
    "Sovereign","Jester"
  ];

  const role = Object.fromEntries(roleKeys.map(k => [k, 0]));
  const energy = Object.fromEntries(energyKeys.map(k => [k, 0]));

  let answeredCore = 0;

  for (const q of quiz?.questions?.questions || []) {
    const choiceKey = answersByQuestionId[q.id];
    if (!choiceKey) continue;
    const opt = (q.options || []).find(o => o.key === choiceKey);
    if (!opt) continue;

    if (!q.optional) answeredCore++;

    // Sum weights (preference map—no normalization needed here)
    for (const [k, v] of Object.entries(opt.weights_role || {})) {
      if (k in role) role[k] += Number(v) || 0;
    }
    for (const [k, v] of Object.entries(opt.weights_energy || {})) {
      if (k in energy) energy[k] += Number(v) || 0;
    }
  }

  const required = quiz?.questions?.min_required ?? 10;
  if (answeredCore < required) {
    return { ok: false, reason: `Please answer at least ${required} questions.` };
  }

  // Top preferred role & energy (for convenience; UI can use totals as a radar)
  const topRole = roleKeys.reduce((best, k) => (role[k] > role[best] ? k : best), roleKeys[0]);
  const topEnergy = energyKeys.reduce((best, k) => (energy[k] > energy[best] ? k : best), energyKeys[0]);

  // Return combined totals with the same prefixed shape used by the dual UI
  const result_totals = {
    ...Object.fromEntries(Object.entries(role).map(([k, v]) => [`role_${k}`, v])),
    ...Object.fromEntries(Object.entries(energy).map(([k, v]) => [`energy_${k}`, v])),
  };

  return {
    ok: true,
    // Optional: set a friendly key/title so the rest of your UI can show a badge
    result_key: `${topRole}_${topEnergy}`,
    result_title: `${topRole} × ${topEnergy} (preference)`,
    result_totals,
    meta: { topRole, topEnergy, is_preference: true },
  };
}

