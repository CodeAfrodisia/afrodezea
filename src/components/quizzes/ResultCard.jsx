// src/components/quizzes/ResultCard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { labelsMap } from "@components/quizzes/labels.js";
import supabase from "@lib/supabaseClient.js"; // ensure named import matches your project

function startCase(s = "") {
  return String(s || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function topKey(obj = {}) {
  let key = null, best = -Infinity;
  for (const [k, v] of Object.entries(obj || {})) {
    const n = Number(v) || 0;
    if (n > best) { best = n; key = k; }
  }
  return key;
}

function bestLabeledKey(slug, totals = {}) {
  const k = topKey(totals);
  if (!k) return null;
  const label = (labelsMap?.[slug] && labelsMap[slug][k]) || startCase(k);
  return label;
}

function derivePrettyResult(attempt = {}) {
  const slug = attempt.quiz_slug || "";
  if (attempt.result_title) return attempt.result_title;
  if (attempt.result_key)   return startCase(attempt.result_key);

  // dual-key style
  const roleTop   = topKey(attempt.result_totals?.role || {});
  const energyTop = topKey(attempt.result_totals?.energy || {});
  if (roleTop && energyTop) {
    const roleLabel   = (labelsMap?.[slug]?.[`role_${roleTop}`])   || (labelsMap?.[slug]?.[roleTop])   || startCase(roleTop);
    const energyLabel = (labelsMap?.[slug]?.[`energy_${energyTop}`]) || (labelsMap?.[slug]?.[energyTop]) || startCase(energyTop);
    return `${roleLabel} × ${energyLabel}`;
  }

  if (attempt.result_totals && typeof attempt.result_totals === "object") {
    const label = bestLabeledKey(slug, attempt.result_totals);
    if (label) return label;
  }

  return "—";
}

// (Optional) tiny helper to read a safe intro if something fails
function fallbackIntro(prettyResult, quizTitle) {
  const title = prettyResult && prettyResult !== "—" ? prettyResult : quizTitle || "Your result";
  return `You tend toward ${title.toLowerCase()}. Notice how this shows up in your day-to-day choices and connections.`;
}

export default function ResultCard({
  attempt = {},
  quizTitle,
  className = "",
  style = {},
  ...rest
}) {
  const slug = attempt.quiz_slug || "";
  const titleForHeader =
    quizTitle ||
    attempt.quiz?.title ||
    (slug ? startCase(slug) : "Quiz");

  const prettyResult = derivePrettyResult(attempt);
  const whenRaw = attempt.completed_at || attempt.created_at || null;
  const when = whenRaw ? new Date(whenRaw) : null;

  // ---- NEW: load/generate voice-banked copy ----
  const [copy, setCopy] = useState(() => attempt.result_copy || null);
  const [loadingCopy, setLoadingCopy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (copy || !attempt?.id) return; // already have cached copy or no id
      setLoadingCopy(true);
      try {
        // 1) try to re-fetch attempt in case another tab already generated it
        const { data: fresh, error: refetchErr } = await supabase
          .from("quiz_attempts")
          .select("id, result_copy")
          .eq("id", attempt.id)
          .single();

        if (!cancelled && fresh?.result_copy) {
          setCopy(fresh.result_copy);
          setLoadingCopy(false);
          return;
        }

        // 2) otherwise, invoke the Edge Function to compose and cache
        const { data, error } = await supabase.functions.invoke("quiz-narrative", {
          body: { attempt_id: attempt.id },
        });

        if (error) throw error;

        if (!cancelled) {
          setCopy(data || null);
        }
      } catch (e) {
        console.warn("[ResultCard] quiz-narrative failed; using fallback", e);
        if (!cancelled) {
          setCopy({
            intro: fallbackIntro(prettyResult, titleForHeader),
            bullets: [],
            meta: { fallback: true },
          });
        }
      } finally {
        if (!cancelled) setLoadingCopy(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt?.id]);

  return (
    <div
      className={`card result-card ${className}`.trim()}
      style={{
        padding: 16,
        borderRadius: 16,
        background: "#121212",
        color: "rgba(249,249,249,0.9)",
        "--card-text": "rgba(249,249,249,0.9)",
        ...style,
      }}
      {...rest}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: 10,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(255,255,255,.06)",
            display: "grid", placeItems: "center", fontSize: 18
          }}
          aria-hidden
        >✨</div>
        <div>
          <div style={{ fontWeight: 700 }}>{titleForHeader}</div>
          {when && (
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {when.toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Headline / Result */}
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>Result</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          {prettyResult}
        </div>
      </div>

      {/* NEW: Brand-voiced paragraph + optional bullets */}
      <div style={{ marginTop: 10, lineHeight: 1.6 }}>
        {loadingCopy ? (
          <div style={{ opacity: 0.75 }}>Crafting your result…</div>
        ) : (
          <>
            {copy?.intro ? <p style={{ marginTop: 6 }}>{copy.intro}</p> : null}
            {Array.isArray(copy?.bullets) && copy.bullets.length > 0 ? (
              <ul style={{ margin: "6px 0 0 18px" }}>
                {copy.bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            ) : null}
          </>
        )}
      </div>

      {/* Existing “View quiz” + (recommended) link to the full Quizzes tab */}
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        {slug ? (
          <Link
            to={`/quizzes/${slug}`}
            className="btn btn--ghost"
            style={{ justifySelf: "start" }}
            aria-label={`View ${titleForHeader}`}
          >
            View quiz
          </Link>
        ) : null}

        

      </div>
    </div>
  );
}
