// src/components/profile/ProfilePanels.jsx
import React, { useEffect, useMemo, useState } from "react";
import supabase from "@lib/supabaseClient.js";
import { useAuth } from "@context/AuthContext.jsx";
import QuizRadarChart from "@components/quizzes/QuizRadarChart.jsx";
import ResultModal from "@components/quizzes/ResultModal.jsx";   // <-- NEW
import { useTheme } from "@lib/useTheme.jsx";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { sbSafe } from "@lib/sbSafe";

function Card({ children, style }) {
  return (
    <div
      className="card surface"
      style={{
        padding: 16,
        borderRadius: 16,
        border: "1px solid var(--hairline)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function MiniTrend({ data, color, height = 120, yMax = 10 }) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeOpacity={0.08} />
          <XAxis dataKey="dt" hide />
          <YAxis domain={[0, yMax]} hide />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const QUIZ_LABELS = {
  "apology-style": {
    title: "Apology Style",
    labels: {
      words: "Words",
      responsibility: "Ownership",
      behavior: "Changed Behavior",
      amends: "Amends",
      empathy: "Validation",
      time: "Consistency",
      gesture: "Gestures",
    },
  },
  "forgiveness-language": {
    title: "Forgiveness Language",
    labels: {
      words: "Hearing 'I'm Sorry'",
      responsibility: "Owning It",
      behavior: "Seeing Change",
      amends: "Making It Right",
      empathy: "Being Understood",
      time: "Consistency Over Time",
      gesture: "Small Gestures",
    },
  },
  "attachment-style": {
    title: "Attachment Style",
    labels: {
      secure: "Secure",
      anxious: "Anxious",
      avoidant: "Avoidant",
      fearful: "Fearful",
    },
  },
  "soul-connection": {
    title: "Soul Connection",
    labels: {
      soulmate: "Soulmate",
      twin_flame: "Twin Flame",
      twin_soul: "Twin Soul",
      karmic: "Karmic",
      kindred: "Kindred",
    },
  },
};

export default function ProfilePanels() {
  const { user } = useAuth();
  const theme = (() => { try { return useTheme(); } catch { return {}; } })();
  const userId = user?.id || null;

  const [latest, setLatest] = useState([]);      // [{ quiz_slug, result_totals, created_at }]
  const [series, setSeries] = useState({});      // { slug: [{dt, totals}] }
  const [delta, setDelta] = useState({});        // { slug: { has_delta, delta, current, baseline } }
  const [loading, setLoading] = useState(true);

  // NEW: track which quiz modal is open
  const [openSlug, setOpenSlug] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!userId) { setLoading(false); return; }
      setLoading(true);

      // 1) Load latest per quiz
      const { data: latestRows, error: latestErr } = await sbSafe(
        () => supabase.from("quiz_attempts_latest").select("*").eq("user_id", userId),
        { label: "quiz_attempts_latest" }
      );
      if (latestErr) {
        const { data: raw, error } = await supabase
          .from("quiz_attempts")
          .select("quiz_slug, result_totals, created_at, completed_at, user_id")
          .eq("user_id", userId)
          .order("completed_at", { ascending: false })
          .order("created_at", { ascending: false });
        if (!error && raw) {
          const seen = new Set();
          const latest = [];
          for (const row of raw) {
            if (!row.quiz_slug || seen.has(row.quiz_slug)) continue;
            seen.add(row.quiz_slug);
            latest.push(row);
          }
          if (alive) setLatest(latest);
        }
      } else if (alive) {
        setLatest(latestRows || []);
      }

      // 2) Series + Delta per quiz (90 days window)
      const nextSeries = {};
      const nextDelta = {};
      const sourceRows = latestErr
        ? ((await supabase.from("quiz_attempts_latest").select("*").eq("user_id", userId)).data || [])
        : (latestRows || []);
      for (const r of sourceRows) {
        if (!r.quiz_slug) continue;
        const [{ data: ts }, { data: dlt }] = await Promise.all([
          supabase.rpc("quiz_profile_timeseries", { p_user: userId, p_quiz: r.quiz_slug, p_days: 90 }),
          supabase.rpc("quiz_profile_delta", { p_user: userId, p_quiz: r.quiz_slug, p_from: "30 days" }),
        ]);
        nextSeries[r.quiz_slug] = ts || [];
        nextDelta[r.quiz_slug] = dlt || { has_delta: false };
      }
      if (alive) { setSeries(nextSeries); setDelta(nextDelta); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [userId]);

  if (!userId) return <div style={{ opacity: .8 }}>Sign in to see your growth panels.</div>;
  if (loading) return <div style={{ opacity: .8 }}>Loading your profile…</div>;

  if (!latest.length) {
    return (
      <Card>
        <div style={{ opacity: .85 }}>
          Take a quiz to begin your growth profile. Your results will appear here.
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {latest.map((row) => {
        const slug = row.quiz_slug;
        const def = QUIZ_LABELS[slug];
        if (!def) return null;

        const labels = def.labels;
        const currentTotals = row.result_totals || {};
        const d = delta[slug] || { has_delta: false };
        const baselineTotals = d.has_delta ? (d.baseline || {}) : null;

        // flatten a single key's series into [{dt, value}] per dimension panel
        const ts = series[slug] || [];
        const dims = Object.keys(labels || {});
        const trendData = Object.fromEntries(
          dims.map(k => ([
            k,
            ts.map(item => ({ dt: item.dt, value: Number(item.totals?.[k] ?? 0) }))
          ]))
        );

        return (
          <Card key={slug}>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h3 style={{ margin: 0 }}>{def.title}</h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, opacity: .7 }}>
                    Updated {new Date(row.completed_at || row.created_at).toLocaleDateString()}
                  </span>
                  {/* Dedicated open button */}
                  <button
                    className="btn btn--ghost"
                    onClick={() => setOpenSlug(slug)}
                    aria-label="Open detailed results"
                    title="Open detailed results"
                  >
                    View Details
                  </button>
                </div>
              </div>

              {/* Radar — now clickable */}
              <QuizRadarChart
                title="Now vs baseline"
                subtitle={baselineTotals ? "Gold = now • Wine = ~30 days ago" : "Your current profile"}
                totals={currentTotals}
                baselineTotals={baselineTotals || undefined}
                labels={labels}
                maxValue={10}
                onOpenModal={() => setOpenSlug(slug)}   // <-- click radar to open modal
                allowDownload
              />

              {/* Trend minis */}
              <div style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              }}>
                {dims.map((k) => (
                  <div key={k} className="card" style={{ padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <strong style={{ fontSize: 14 }}>{labels[k]}</strong>
                      <span style={{ fontSize: 12, opacity: .7 }}>
                        {d?.delta?.[k] != null ? (d.delta[k] >= 0 ? `+${d.delta[k]}` : `${d.delta[k]}`) : "—"}
                      </span>
                    </div>
                    <MiniTrend
                      data={trendData[k] || []}
                      color={theme.primary || "#D4AF37"}
                      height={90}
                      yMax={10}
                    />
                  </div>
                ))}
              </div>

              {/* Snapshot actions */}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  className="btn btn--ghost"
                  onClick={async () => {
                    const label = prompt("Name this snapshot (e.g., ‘30-day check-in’):");
                    if (!label) return;
                    try {
                      const { error } = await supabase.from("quiz_snapshots").insert({
                        user_id: userId,
                        quiz_slug: slug,
                        label,
                        totals: currentTotals,
                        is_public: false,
                      });
                      if (error) throw error;
                      alert("Snapshot saved.");
                    } catch (e) {
                      console.warn("snapshot save failed:", e);
                      alert("Could not save snapshot.");
                    }
                  }}
                >
                  Save this moment
                </button>
              </div>

              {/* Modal instance per card (open only when slug matches) */}
              <ResultModal
                open={openSlug === slug}
                onClose={() => setOpenSlug(null)}
                title={def.title}
                subtitle={baselineTotals ? "Now vs ~30 days ago" : undefined}
                totals={currentTotals}
                baselineTotals={baselineTotals || undefined}
                labels={labels}
                maxValue={10}
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
