// src/pages/PersonalityProfile.jsx
import React, { useEffect, useMemo, useState } from "react";
import supabase from "@lib/supabaseClient.js"; // keep consistent with most of app
import { useAuth } from "@context/AuthContext.jsx";
import QuizRadarChart from "@components/quizzes/QuizRadarChart.jsx";
import { normalizeTotals as normalizeTotalsForCharts } from "@lib/quizMath.js";
// import { labelsMap } from "@components/quizzes/labels.js"; // not needed with LABELS below
import SoulProfileContainer from "@components/account/SoulProfileContainer.jsx";

/* -----------------------------------------------------------
   Label maps per quiz (keys must match result_totals keys)
----------------------------------------------------------- */
const LABELS = {
  // Attachment Style (example vector: secure/anxious/avoidant/fearful)
  attachment: {
    secure: "Secure",
    anxious: "Anxious",
    avoidant: "Avoidant",
    fearful: "Fearful-Avoidant",
  },
  // Soul Connection
  soul: {
    soulmate: "Soulmate",
    twin_flame: "Twin Flame",
    twin_soul: "Twin Soul",
    karmic: "Karmic",
    kindred: "Kindred",
  },
  // Apology Style (giver)
  apology: {
    verbal: "Words",
    responsibility: "Ownership",
    behavior: "Changed Behavior",
    amends: "Amends",
    empathy: "Validation",
    time: "Consistency",
    gesture: "Gestures",
  },
  // Forgiveness Language (receiver)
  forgiveness: {
    words: "Words",
    repair: "Ownership",
    behavior: "Changed Behavior",
    restitution: "Amends",
    validation: "Validation",
    time: "Consistency",
    gestures: "Gestures",
  },
  // Love Language
  love: {
    words: "Words",
    service: "Acts of Service",
    gifts: "Gifts",
    time: "Quality Time",
    touch: "Physical Touch",
  },
};
const LABELS_ARCH = {
  fire:"Fire", water:"Water", earth:"Earth", air:"Air", electricity:"Electricity",
  protector:"Protector", healer:"Healer", muse:"Muse", architect:"Architect",
  rebel:"Rebel", sage:"Sage", guardian:"Guardian", artisan:"Artisan",
  visionary:"Visionary", navigator:"Navigator",
};





/* -----------------------------------------------------------
   Small UI atoms
----------------------------------------------------------- */
function Section({ title, desc, children }) {
  return (
    <section className="surface" style={{ padding: 16, borderRadius: 16, marginBottom: 16 }}>
      {title ? <h2 style={{ marginTop: 0 }}>{title}</h2> : null}
      {desc ? <p style={{ opacity: 0.8, marginTop: -8, marginBottom: 12 }}>{desc}</p> : null}
      {children}
    </section>
  );
}
function Row({ children }) {
  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
      {children}
    </div>
  );
}

/* -----------------------------------------------------------
   Main page
----------------------------------------------------------- */
export default function PersonalityProfile() {
  const { user } = useAuth();
  const userId = user?.id || null;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Latest attempt vectors keyed by quiz slug
  const [latest, setLatest] = useState({}); // { [slug]: { result_key, result_totals, created_at } }

  // Snapshots
  const [snapshots, setSnapshots] = useState([]); // [{id, quiz_slug, totals, label, is_public, created_at}]
  const [snapLabel, setSnapLabel] = useState("");
  const [snapQuiz, setSnapQuiz] = useState(""); // which quiz to snapshot
  const [snapSaving, setSnapSaving] = useState(false);

  // Timeline (simple day->totals list)
  const [timeline, setTimeline] = useState([]); // [{ dt, totals }]

  // Radar render mode
  const [mode, setMode] = useState("percent"); // "percent" | "raw"

  // Choose which quiz is the "primary" for the page (defaults to attachment if present)
  const primarySlug = useMemo(() => {
    if (!latest) return null;
    if (latest["attachment-style"]) return "attachment-style";
    if (latest["apology-style"]) return "apology-style";
    if (latest["forgiveness-language"]) return "forgiveness-language";
    if (latest["soul-connection"]) return "soul-connection";
    return Object.keys(latest)[0] || null;
  }, [latest]);

  // On load: latest attempts + snapshots
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!userId) { setLoading(false); return; }
      setLoading(true);
      setErr("");
      try {
        // A) Latest attempts (uses created view if present; else fallback)
        let latestBySlug = {};
        // Try the view first
        {
          const { data, error } = await supabase
            .from("quiz_attempts_latest")
            .select("quiz_slug, result_key, result_totals, created_at")
            .eq("user_id", userId);
          if (error && error.code !== "42P01") throw error; // missing view -> handled by fallback
          if (data && data.length) {
            latestBySlug = data.reduce((acc, r) => {
              acc[r.quiz_slug] = r;
              return acc;
            }, {});
          } else {
            // Fallback: emulate latest-per-slug on client
            const { data: raw, error: e2 } = await supabase
              .from("quiz_attempts")
              .select("quiz_id, quiz_slug, result_key, result_totals, created_at, completed_at")
              .eq("user_id", userId)
              .order("completed_at", { ascending: false });
            if (e2) throw e2;
            for (const r of raw || []) {
              const slug = r.quiz_slug;
              if (!slug) continue;
              if (!latestBySlug[slug]) latestBySlug[slug] = r;
            }
          }
        }

        // (Optional) Profile analysis function – FIX: pass userId as value
        try {
  const { data, error } = await supabase.functions.invoke("profile-analysis", {
    body: { user_id: userId, section: "mood" },
  });
  // use data?.summary as needed
} catch (_) {
  // ok to ignore if function isn't deployed yet
}

        // B) Snapshots
        const { data: snaps, error: sErr } = await supabase
          .from("quiz_snapshots")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (sErr) throw sErr;

        if (!alive) return;
        setLatest(latestBySlug);
        setSnapshots(snaps || []);
        // default snapshot target
        setSnapQuiz(Object.keys(latestBySlug)[0] || "");
      } catch (e) {
        if (!alive) return;
        console.error("[Profile] load failed:", e);
        setErr(e.message || "Could not load your profile.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  // Load simple timeline for primary quiz
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!userId || !primarySlug) { setTimeline([]); return; }
      try {
        const { data, error } = await supabase
          .rpc("quiz_profile_timeseries", { p_user: userId, p_quiz: primarySlug, p_days: 120 });
        if (error) throw error;
        if (!alive) return;
        setTimeline(data || []);
      } catch (e) {
        if (!alive) return;
        console.warn("[Profile] timeseries failed (ok to ignore):", e.message);
        setTimeline([]);
      }
    })();
    return () => { alive = false; };
  }, [userId, primarySlug]);

  /* ------------------ Snapshot actions ------------------ */
  async function createSnapshot() {
    if (!userId || !snapQuiz || !latest[snapQuiz]) return;
    const label = snapLabel.trim() || "Snapshot";
    const totals = latest[snapQuiz]?.result_totals || {};
    setSnapSaving(true);
    try {
      const { error } = await supabase
        .from("quiz_snapshots")
        .insert({
          user_id: userId,
          quiz_slug: snapQuiz,
          label,
          totals,
          is_public: false,
        });
      if (error) throw error;
      setSnapLabel("");
      // reload
      const { data } = await supabase
        .from("quiz_snapshots")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setSnapshots(data || []);
    } catch (e) {
      console.error("snapshot create failed:", e);
    } finally {
      setSnapSaving(false);
    }
  }

  async function setSnapshotPublic(id, next) {
    try {
      const { error } = await supabase
        .from("quiz_snapshots")
        .update({ is_public: !!next })
        .eq("id", id);
      if (error) throw error;
      setSnapshots(s => s.map(x => x.id === id ? { ...x, is_public: !!next } : x));
    } catch (e) {
      console.error("snapshot toggle failed:", e);
    }
  }

/* ------------------ Derived for charts ----------------- */
const cards = useMemo(() => {
  const out = [];
  for (const [slug, row] of Object.entries(latest)) {
    let labels, title;

    if (slug === "attachment-style") {
      labels = LABELS.attachment; title = "Attachment Style";
    } else if (slug === "soul-connection") {
      labels = LABELS.soul; title = "Soul Connection";
    } else if (slug === "apology-style") {
      labels = LABELS.apology; title = "Apology Style (Giver)";
    } else if (slug === "forgiveness-language") {
      labels = LABELS.forgiveness; title = "Forgiveness Language (Receiver)";
    } else if (slug === "love-language") {
      labels = LABELS.love; title = "What’s Your Love Language?";
    } else if (slug === "archetype") {
      // 🔸 Archetype uses the merged totals we saved (elements + roles)
      labels = LABELS_ARCH;
      title  = "Your Afrodezea Archetype";
    } else {
      continue;
    }

    // row.result_totals is exactly what we inserted into quiz_attempts
    const totals = normalizeTotals(row.result_totals || {}, labels, 10);
    out.push({ key: slug, title, labels, totals });
  }
  return out;
}, [latest]);


  if (!userId) {
    return (
      <div className="container" style={{ padding: 24 }}>
        <Section title="Personality Profile">
          <p style={{ opacity: 0.85 }}>Sign in to view your profile insights.</p>
        </Section>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: 24 }}>
        <Section title="Personality Profile">
          <div className="skeleton" style={{ height: 140 }} />
        </Section>
      </div>
    );
  }

  if (err) {
    return (
      <div className="container" style={{ padding: 24 }}>
        <Section title="Personality Profile">
          <div className="surface" style={{ padding: 12, borderRadius: 12, border: "1px solid var(--hairline)" }}>
            {err}
          </div>
        </Section>
      </div>
    );
  }

  /* ------------------ Render ----------------------------- */
  return (
    <div className="container" style={{ padding: 24, display: "grid", gap: 16 }}>
      {/* HERO */}
      <Section
        title="Personality Profile"
        desc="A living snapshot of your patterns and growth. Charts are reflective guidance—not verdicts."
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div className="pill">Private by default</div>
          <div className="pill">Share select snapshots to your public profile</div>
          <div className="pill">Updated as you take quizzes</div>
        </div>
      </Section>

      <Section title="Soul Profile">
        <SoulProfileContainer />
      </Section>

      {/* RADAR GALLERY */}
      <Section title="Your Latest Readings" desc="Pulled from your most recent attempts.">
        {cards.length === 0 ? (
          <div style={{ opacity: 0.8 }}>No quiz data yet. Try the Attachment Style, Apology, or Soul Connection quizzes.</div>
        ) : (
          <>
            {/* Toggle */}
            <div style={{ display:"flex", gap:8, marginBottom:16 }}>
              <button className="chip" aria-pressed={mode==="percent"} onClick={()=>setMode("percent")}>% view</button>
              <button className="chip" aria-pressed={mode==="raw"} onClick={()=>setMode("raw")}>Raw view</button>
            </div>

            <Row>
              {cards.map(({ key, title, labels, totals }) => (
                <div key={key} className="card" style={{ padding: 12, borderRadius: 16 }}>
                  <QuizRadarChart
                    title={title}
                    totalsRaw={totals.raw}
                    maxRaw={totals.max}
                    labels={labels}
                    mode={mode}
                  />
                </div>
              ))}
            </Row>
          </>
        )}
      </Section>

      {/* GROWTH TIMELINE PREVIEW */}
      <Section
        title="Growth Over Time"
        desc={primarySlug ? `Quick view for ${primarySlug.replace("-", " ")}` : "Take a quiz to start tracking your growth."}
      >
        {timeline.length === 0 ? (
          <div style={{ opacity: 0.8 }}>No timeline yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {timeline.map((row, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 120, opacity: 0.8 }}>{new Date(row.dt).toLocaleDateString()}</div>
                <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,.08)", borderRadius: 999, overflow: "hidden" }}>
                  {/* super-light composite bar: average of values */}
                  {(() => {
                    const vals = Object.values(row.totals || {}).map(Number).filter(v => isFinite(v));
                    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                    const pct = Math.max(0, Math.min(100, (avg / 10) * 100));
                    return <div style={{ width: `${pct}%`, height: "100%", background: "var(--gold)" }} />;
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* SNAPSHOTS */}
      <Section title="Snapshots" desc="Freeze a moment in your journey and (optionally) share it on your public profile">
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={snapQuiz}
              onChange={(e) => setSnapQuiz(e.target.value)}
              className="input"
              style={{ maxWidth: 280 }}
            >
              {Object.keys(latest).map(slug => (
                <option key={slug} value={slug}>{slug}</option>
              ))}
            </select>
            <input
              className="input"
              style={{ maxWidth: 360 }}
              placeholder='Label (e.g., "30-day check-in")'
              value={snapLabel}
              onChange={(e) => setSnapLabel(e.target.value)}
            />
            <button className="btn btn--gold" disabled={!snapQuiz || snapSaving} onClick={createSnapshot}>
              {snapSaving ? "Saving…" : "Save Snapshot"}
            </button>
          </div>

          {snapshots.length === 0 ? (
            <div style={{ opacity: 0.8 }}>No snapshots yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
              {snapshots.map(s => {
                // Choose label map by slug
                const labels =
                  s.quiz_slug === "attachment-style" ? LABELS.attachment :
                  s.quiz_slug === "apology-style" ? LABELS.apology :
                  s.quiz_slug === "forgiveness-language" ? LABELS.forgiveness :
                  s.quiz_slug === "soul-connection" ? LABELS.soul :
                  {};
                const totalsN = normalizeTotalsForCharts(s.totals || {}, labels); // { raw, max }
                return (
                  <div key={s.id} className="card" style={{ padding: 12, borderRadius: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <strong>{s.label}</strong>
                      <span style={{ fontSize: 12, opacity: 0.7 }}>
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <QuizRadarChart
                        title={s.quiz_slug.replace("-", " ")}
                        totalsRaw={totalsN.raw}
                        maxRaw={totalsN.max}
                        labels={labels}
                        mode={mode}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                      <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={!!s.is_public}
                          onChange={(e) => setSnapshotPublic(s.id, e.target.checked)}
                        />
                        Show on my public profile
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
