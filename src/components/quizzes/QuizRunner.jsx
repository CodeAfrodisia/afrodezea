// src/components/quizzes/QuizRunner.jsx
import React, { useEffect, useMemo, useState } from "react";
import supabase from "@lib/supabaseClient.js";
import { useAuth } from "@context/AuthContext.jsx";
import { evaluateWeightedQuiz } from "@lib/evaluateWeightedQuiz.js";

function Card({ children, style }) {
  return (
    <div
      className="surface"
      style={{
        border: "1px solid var(--hairline)",
        borderRadius: 16,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function evaluateArchetypeDual(quiz, answers) {
  const roleTotals = {};
  const energyTotals = {};

  for (const q of quiz?.questions?.questions || []) {
    const chosenKey = answers[q.id];
    if (!chosenKey) continue;
    const opt = (q.options || []).find(o => (o.key ?? o.id) === chosenKey);
    if (!opt) continue;

    for (const [k, v] of Object.entries(opt.weights_role || {})) {
      roleTotals[k] = (roleTotals[k] || 0) + Number(v) || 0;
    }
    for (const [k, v] of Object.entries(opt.weights_energy || {})) {
      energyTotals[k] = (energyTotals[k] || 0) + Number(v) || 0;
    }
  }

  const topOf = (obj) => {
    let bestK = null, bestV = -Infinity;
    for (const [k, v] of Object.entries(obj)) {
      const n = Number(v) || 0;
      if (n > bestV) { bestV = n; bestK = k; }
    }
    return bestK;
  };

  const roleTop = topOf(roleTotals);
  const energyTop = topOf(energyTotals);

  return {
    ok: !!(roleTop && energyTop),
    roleTotals,
    energyTotals,
    roleTop,
    energyTop,
    result_key: roleTop && energyTop ? `${roleTop.toLowerCase()}__${energyTop.toLowerCase()}` : null,
    result_title: roleTop && energyTop ? `${roleTop} × ${energyTop}` : null,
  };
}



export default function QuizRunner({ slug, onFinished }) {
  const { user } = useAuth();
  const userId = user?.id || null;

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // qid -> optionKey
  const [saving, setSaving] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setError("");
      const { data: qs, error: qErr } = await supabase
        .from("quizzes")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (qErr) {
        setError(qErr.message || "Failed to fetch quiz");
        return;
      }
      if (!qs) {
        setError("Quiz not found");
        return;
      }

      const [{ data: qns }, { data: rs }] = await Promise.all([
        supabase
          .from("quiz_questions")
          .select("*")
          .eq("quiz_id", qs.id)
          .order("position", { ascending: true }),
        supabase.from("quiz_results").select("*").eq("quiz_id", qs.id),
      ]);

      if (!alive) return;
      setQuiz(qs);
      setQuestions(qns || []);
      setResults(rs || []);
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  const current = questions[idx];

  function selectOption(questionId, key) {
    setAnswers((a) => ({ ...a, [questionId]: key }));
  }

  function goNext() {
    if (idx < questions.length - 1) setIdx(idx + 1);
  }
  function goPrev() {
    if (idx > 0) setIdx(idx - 1);
  }

  const canFinish = useMemo(() => {
    if (!questions.length) return false;
    // all required answered
    return questions.every((q) => !q.required || answers[q.id]);
  }, [questions, answers]);

  async function finish() {
    if (!userId) {
      setError("Please log in to save");
      return;
    }
    if (!canFinish) {
      setError("Please answer all required questions");
      return;
    }

    setSaving(true);
    setError("");
    try {
      // Build a quiz shape that our evaluator expects
      const quizShape = {
        ...quiz,
        questions: {
          // allow evaluateWeightedQuiz to read uniform structure
          questions,
          results,
          min_required: quiz?.questions?.min_required ?? undefined,
        },
      };

if (quiz.slug === "archetype-dual" || quiz.slug === "archetype_dual") {
  const ev = evaluateArchetypeDual(quiz, answers);
  if (!ev.ok) {
    setError("Please answer a few more questions.");
    setSaving(false);
    return;
  }

  const totalsRaw = { role: ev.roleTotals, energy: ev.energyTotals };

  const { data: attempt, error: aerr } = await supabase
    .from("quiz_attempts")
    .insert([{
      user_id: userId,
      quiz_id: quiz.id,
      quiz_slug: quiz.slug,
      completed_at: new Date().toISOString(),
      is_public: isPublic,
      result_key: ev.result_key,
      result_title: ev.result_title,
      result_summary: "Your Role + Energy pairing.",
      result_totals: totalsRaw,
      meta: { role_top: ev.roleTop, energy_top: ev.energyTop },
    }])
    .select()
    .single();

  if (aerr) throw aerr;

  // (Optional) write quiz_answers as you already do…

  onFinished?.(attempt);
  setSaving(false);
  return;
}


      const evalRes = evaluateWeightedQuiz(quizShape, answers);
      if (!evalRes.ok) {
        setError(evalRes.reason || "Please answer more questions.");
        setSaving(false);
        return;
      }

      const { result_key, result } = evalRes;

     // Insert attempt (NO 'answers' column on quiz_attempts)
const { data: attempt, error: aerr } = await supabase
  .from("quiz_attempts")
  .insert([{
    user_id: userId,
    quiz_id: quiz.id,              // ✅ REQUIRED (fixes the error)
    quiz_slug: quiz.slug,          // ✅ used by profile tab
    completed_at: new Date().toISOString(),
    is_public: isPublic,
    result_key,
    result_title: result?.label || null,
    result_summary: result?.summary || null,
    result_totals: evalRes.totals_raw, // raw vector
    meta: { max_raw: evalRes.max_raw, confidence: evalRes.confidence },
  }])
  .select()
  .single();

if (aerr) throw aerr;


      // (Optional) Persist per-question answers in quiz_answers
      const rows = Object.entries(answers).map(([question_id, key]) => ({
        attempt_id: attempt.id,
        question_id,
        answer: { key },
      }));
      if (rows.length) {
        const { error: anserr } = await supabase.from("quiz_answers").insert(rows);
        if (anserr) throw anserr;
      }

      onFinished?.(attempt);
    } catch (e) {
      console.error(e);
      setError(e.message || "Could not save your result");
    } finally {
      setSaving(false);
    }
  }

  if (!quiz) return <div className="surface" style={{ padding: 16 }}>Loading…</div>;
  if (!questions.length) return <div className="surface" style={{ padding: 16 }}>Coming soon.</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <h2 style={{ margin: 0 }}>{quiz.title}</h2>
            {quiz.subtitle && <div style={{ opacity: 0.8 }}>{quiz.subtitle}</div>}
          </div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            {idx + 1} / {questions.length}
          </div>
        </div>
        {quiz.description && <p style={{ marginTop: 8, opacity: 0.9 }}>{quiz.description}</p>}
      </Card>

      <Card>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{current.prompt}</div>
        {current.help_text && <div style={{ opacity: 0.8, marginBottom: 8 }}>{current.help_text}</div>}

        {/* Single-choice buttons */}
        <div style={{ display: "grid", gap: 8 }}>
          {(current.options || []).map((opt) => {
            const isActive = answers[current.id] === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => selectOption(current.id, opt.key)}
                aria-pressed={isActive}
                className="chip"
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid var(--hairline)",
                  background: isActive ? "rgba(212,175,55,.12)" : "transparent",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "space-between" }}>
          <button className="btn" onClick={goPrev} disabled={idx === 0}>
            Back
          </button>
          {idx < questions.length - 1 ? (
            <button className="btn btn--gold" onClick={goNext} disabled={!answers[current.id]}>
              Next
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                Publish this result on my profile
              </label>
              <button className="btn btn--gold" onClick={finish} disabled={!canFinish || saving}>
                {saving ? "Saving…" : "See Result"}
              </button>
            </div>
          )}
        </div>

        {error && <div style={{ marginTop: 8, color: "#f88" }}>{error}</div>}
      </Card>
    </div>
  );
}
