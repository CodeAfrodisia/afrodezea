// src/lib/saveAttemptAndAnswers.js

/**
 * Saves a quiz attempt + per-question answers, then fetches nudges.
 *
 * @param {object} params
 * @param {import('@supabase/supabase-js').SupabaseClient} params.supabase
 * @param {string} params.userId
 * @param {{ id: string, slug: string }} params.quiz
 * @param {Record<string,string>} params.answersObj           // { question_id: option_key }
 * @param {object} params.persistPayload                      // { result_key, result_title, result_summary, result_totals, meta? }
 * @param {boolean} [params.isPublic=false]
 * @param {string}  [params.nudgesFn="compose-nudges"]        // edge function name
 *
 * @returns {Promise<{ attempt: { id: string }|null, nudges: any[] }>}
 */
export async function saveAttemptAndAnswers({
  supabase,
  userId,
  quiz,
  answersObj,
  persistPayload,
  isPublic = false,
  nudgesFn = "compose-nudges",
}) {
  let attempt = null;
  let nudges = [];

  // 1) Insert attempt and get its id back
  const { data: attemptRow, error: aerr } = await supabase
    .from("quiz_attempts")
    .insert({
      user_id: userId,
      quiz_id: quiz.id,
      quiz_slug: quiz.slug,
      completed_at: new Date().toISOString(),
      is_public: isPublic,
      ...persistPayload, // result_key, result_title, result_summary, result_totals, meta?
    })
    .select("id") // keep payload light; we only need id for answers + nudges
    .single();

  if (aerr) throw aerr;
  attempt = attemptRow;

  // 2) Insert per-question answers (optional but recommended for micro rules)
  const answerRows = Object.entries(answersObj || {}).map(([question_id, key]) => ({
    attempt_id: attempt.id,
    question_id,
    answer: { key }, // lock shape: { key: string }
  }));

  if (answerRows.length) {
    const { error: anserr } = await supabase.from("quiz_answers").insert(answerRows);
    if (anserr) {
      // Non-fatal: log and continue; nudges can still be computed from attempt-level data
      console.warn("[saveAttemptAndAnswers] quiz_answers insert failed:", anserr.message);
    }
  }

  // 3) Ask Edge Function to compose nudges for this attempt
  try {
    const { data, error: nerr } = await supabase.functions.invoke(nudgesFn, {
      body: { user_id: userId, attempt_id: attempt.id },
    });
    if (!nerr && data?.nudges && Array.isArray(data.nudges)) {
      nudges = data.nudges;
    }
  } catch (e) {
    console.warn("[saveAttemptAndAnswers] nudges invoke failed:", e?.message || e);
  }

  return { attempt, nudges };
}

