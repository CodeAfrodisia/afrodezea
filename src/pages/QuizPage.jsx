// src/pages/QuizPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@lib/supabaseClient.js";
import { useAuth } from "@context/AuthContext.jsx";
import { evaluateSoulConnection } from "@lib/quizEvaluator.js";

/* ---------- Tiny primitives ---------- */
function Surface({ children, style }) {
  return (
    <div className="surface" style={{ padding: 16, borderRadius: 16, ...style }}>
      {children}
    </div>
  );
}
function Pill({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pill${active ? " active" : ""}`}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

/* ============================================================
   QuizPage — per-question flow with progress + reveal moment
   ============================================================ */
export default function QuizPage() {
  const { slug } = useParams();
  const { user } = useAuth();

  // data
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // answers
  const [answers, setAnswers] = useState({}); // { [qid]: optionKey, meta: { personLabel } }
  const [personLabel, setPersonLabel] = useState("");
  const [wantsReminder, setWantsReminder] = useState(false);

  // flow
  const [index, setIndex] = useState(0);              // current question index
  const [submitting, setSubmitting] = useState(false);
  const [revealing, setRevealing] = useState(false);  // transition screen
  const [result, setResult] = useState(null);         // { ok, result, result_key, totals }

  // config
  const zipOnClick = true;     // auto-advance when option clicked
  const showNextButton = true; // also expose Next for cautious users

  /* -------- Fetch quiz -------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      setResult(null);
      setRevealing(false);
      setIndex(0);
      setAnswers({});
      setPersonLabel("");
      setWantsReminder(false);
      try {
        const { data, error } = await supabase
          .from("quizzes")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Quiz not found.");
        if (alive) setQuiz(data);
      } catch (e) {
        if (alive) setError(e.message || "Could not load quiz.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [slug]);

  /* -------- Derived -------- */
  const minRequired = quiz?.questions?.min_required ?? 7;
  const qList = quiz?.questions?.questions ?? [];
  const resultDefs = quiz?.questions?.results ?? [];
  const totalQs = qList.length;

  const answeredRequired = useMemo(() => {
    return qList.filter(q => !q.optional && answers[q.id]).length;
  }, [answers, qList]);

  const progressPct = useMemo(() => {
    if (!totalQs) return 0;
    const answered = qList.filter(q => answers[q.id]).length;
    return Math.round((answered / totalQs) * 100);
  }, [answers, qList, totalQs]);

  const currentQ = qList[index];

  const setAnswer = useCallback((qid, optionKey) => {
    setAnswers(prev => ({ ...prev, [qid]: optionKey }));
  }, []);

  const goNext = useCallback(() => {
    setIndex(i => Math.min(totalQs - 1, i + 1));
  }, [totalQs]);

  const goPrev = useCallback(() => {
    setIndex(i => Math.max(0, i - 1));
  }, []);

  useEffect(() => {
    // keyboard support: left/right arrows navigate if an answer is chosen
    function onKey(e) {
      if (!currentQ) return;
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") {
        if (answers[currentQ.id]) goNext();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentQ, answers, goNext, goPrev]);

  /* -------- Submit / Evaluate -------- */
  async function handleSubmit() {
    if (!quiz) return;
    if (answeredRequired < minRequired) return;

    setSubmitting(true);
    setError("");
    setResult(null);

    const mergedAnswers = {
      ...answers,
      meta: { ...(answers.meta || {}), personLabel: personLabel?.trim() || undefined },
    };

    const evalRes = evaluateSoulConnection(quiz, mergedAnswers);
    if (!evalRes.ok) {
      setSubmitting(false);
      setError(evalRes.reason || "Please answer more questions.");
      return;
    }

    // mini reveal moment
    setRevealing(true);
    // Save attempt (best-effort)
    if (user?.id) {
      try {
        const insert = {
          quiz_slug: quiz.slug,
          user_id: user.id,
          answers: mergedAnswers,
          result_key: evalRes.result_key,
          result_totals: evalRes.totals,
          is_public: false,
        };
        const { error } = await supabase.from("quiz_attempts").insert(insert);
        if (error) throw error;
      } catch (e) {
        console.warn("quiz_attempt save failed:", e);
      }
    }
    // Optional reminder
    if (user?.id && wantsReminder) {
      try {
        const remindAt = new Date();
        remindAt.setDate(remindAt.getDate() + 30);
        await supabase.from("reminders").insert({
          user_id: user.id,
          type: "quiz_revisit",
          quiz_slug: quiz.slug,
          person_label: personLabel?.trim() || null,
          remind_at: remindAt.toISOString(),
          meta: { source: "quiz", result_key: evalRes.result_key },
        });
      } catch (e) {
        console.warn("Reminder creation failed:", e);
      }
    }

    // brief delay to make it feel like a moment (brand feel)
    setTimeout(() => {
      setResult(evalRes);
      setSubmitting(false);
      setRevealing(false);
    }, 1200);
  }

  /* -------- Screens -------- */
  if (loading) {
    return <div className="container quiz-page" style={{ padding: 24 }}>Loading…</div>;
  }
  if (error) {
    return <div className="container quiz-page" style={{ padding: 24, color: "tomato" }}>{error}</div>;
  }
  if (!quiz) return null;

  // Result screen
  if (result?.ok) {
    const res = result.result;
    const nickname = answers?.meta?.personLabel?.trim();
    const sortedTotals = Object.entries(result.totals).sort((a, b) => b[1] - a[1]);
    const runnerUpEntry = sortedTotals.find(([key]) => key !== result.result_key);
    const runnerUp = runnerUpEntry ? resultDefs.find(r => r.key === runnerUpEntry[0]) : null;

    return (
      <div className="container quiz-page" style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ marginBottom: 8 }}>{quiz.title}</h1>
        <p style={{ opacity: 0.75, marginBottom: 16 }}>
          Reflective guidance — <strong>not</strong> a verdict. Your result says <em>“may be your…”</em> by design.
        </p>

        <Surface>
          <h2 style={{ marginTop: 0 }}>
            {nickname
              ? `${nickname} ${res.headline.replace("This person", "").trim()}`
              : res.headline}
          </h2>
          <p style={{ opacity: 0.9 }}>{res.summary}</p>

          <h3 style={{ marginTop: 16 }}>Gentle guidance</h3>
          <ul style={{ marginTop: 8 }}>
            {res.guidance.map((g, i) => <li key={i}>{g}</li>)}
          </ul>

          {Array.isArray(res.product_suggestions) && res.product_suggestions.length > 0 && (
            <>
              <div style={{ height: 8 }} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {res.product_suggestions.map((p, i) => (
                  <button key={`${p.kind}-${p.sku}-${i}`} className="btn" title={p.reason}>
                    Explore {p.kind}: {p.sku}
                  </button>
                ))}
              </div>
            </>
          )}

          {!!runnerUp && (
            <Surface style={{ marginTop: 16 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                <h3 style={{ margin: 0 }}>Another angle</h3>
                <span style={{ fontSize: 12, opacity: 0.65 }}>We also noticed this resonance.</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <strong>{runnerUp.headline.replace("This person", nickname || "This person")}</strong>
                <p style={{ opacity: 0.9, marginTop: 6 }}>{runnerUp.summary}</p>
              </div>
            </Surface>
          )}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 16 }}>
            <button className="btn" onClick={() => { setResult(null); setIndex(0); setAnswers({}); }}>
              Retake or try for another person
            </button>
          </div>
        </Surface>
      </div>
    );
  }

  // Reveal transition
  if (revealing) {
    return (
      <div className="container quiz-page" style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ marginBottom: 8 }}>{quiz.title}</h1>
        <div className="reveal" style={{ marginTop: 12 }}>
          <div className="reveal__shine" />
          <div style={{ textAlign: "center" }}>
            <h3 className="heading" style={{ color: "var(--gold)" }}>Revealing your result…</h3>
            <p style={{ opacity: 0.8 }}>We’re reflecting on your answers with care.</p>
          </div>
        </div>
      </div>
    );
  }

  // Question screen
  if (!currentQ) return null;
  const canFinish = answeredRequired >= minRequired;
  const isLast = index === totalQs - 1;

  return (
    <div className="container quiz-page" style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 6 }}>{quiz.title}</h1>
      <p style={{ opacity: 0.75, marginBottom: 12 }}>
        {quiz.description} <br />
        Reflective guidance — <strong>not</strong> a verdict. Your result will say <em>“may be your…”</em>.
      </p>

      {/* nickname + reminder lives above the flow; optional but nice */}
      <Surface style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 8 }}>
          Who are you evaluating? <span style={{ opacity: 0.6 }}>(optional)</span>
        </label>
        <input
          type="text"
          value={personLabel}
          onChange={(e) => setPersonLabel(e.target.value)}
          placeholder="e.g., Alex, A.B., or a private nickname"
          className="input"
          style={{ background: "radial-gradient(120% 120% at 10% 0%, #161016, #0F0C0F)" }}
        />
        <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>
          We’ll use this name in your result (“Alex may be your…”). Stored privately if you’re signed in.
        </div>
      </Surface>

      {/* progress */}
      <div className="qprog" aria-label="progress">
        <div className="qprog__fill" style={{ width: `${progressPct}%` }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", margin: "6px 2px 10px" }}>
        <small className="muted">Question {index + 1} of {totalQs}</small>
        <small className="muted">{answeredRequired}/{minRequired} required answered</small>
      </div>

      {/* current question */}
      <Surface style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
          <h3 style={{ margin: 0, fontSize: 20 }}>{currentQ.prompt}</h3>
          {currentQ.optional && <span style={{ fontSize: 12, opacity: 0.6 }}>(optional)</span>}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {currentQ.options.map((opt) => (
            <Pill
              key={opt.key}
              active={answers[currentQ.id] === opt.key}
              onClick={() => {
                setAnswer(currentQ.id, opt.key);
                if (zipOnClick) {
                  // if not last, advance; if last, decide whether to finish automatically
                  if (!isLast) goNext();
                }
              }}
            >
              {opt.label}
            </Pill>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 16 }}>
          <button className="btn" disabled={index === 0} onClick={goPrev}>Back</button>

          <div style={{ display: "flex", gap: 8 }}>
            {showNextButton && (
              <button
                className="btn"
                onClick={() => goNext()}
                disabled={isLast || !answers[currentQ.id]}
              >
                Next
              </button>
            )}

            {isLast ? (
              <button
                className="btn btn--gold"
                onClick={handleSubmit}
                disabled={!canFinish || submitting}
                title={!canFinish ? `Answer at least ${minRequired} required questions` : "Reveal your result"}
              >
                {submitting ? "Scoring…" : "Reveal My Result"}
              </button>
            ) : (
              <button
                className="btn btn--gold"
                onClick={() => {
                  if (answers[currentQ.id]) goNext();
                }}
                disabled={!answers[currentQ.id]}
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </Surface>

      {!canFinish && (
        <div style={{ marginTop: 4, fontSize: 13, opacity: 0.75 }}>
          Answer at least {minRequired} required questions to finish.
        </div>
      )}

      {/* Reminder toggle sits under flow so users can set it anytime */}
      <div style={{ marginTop: 12 }}>
        <label style={{ display: "inline-flex", gap: 8, alignItems: "center", opacity: user?.id ? 1 : 0.6 }}>
          <input
            type="checkbox"
            disabled={!user?.id}
            checked={wantsReminder}
            onChange={(e) => setWantsReminder(e.target.checked)}
          />
          Remind me in 30 days to revisit
        </label>
      </div>
    </div>
  );
}
