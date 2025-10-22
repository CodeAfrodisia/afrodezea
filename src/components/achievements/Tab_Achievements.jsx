// src/components/achievements/Tab_Achievements.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@lib/supabaseClient.js";
import { useAuth } from "@context/AuthContext.jsx";
import { useTheme } from "@lib/useTheme.jsx";

/* ---- tiny UI helpers ---------------------------------------------------- */
function Card({ children, style }) {
  return (
    <div
      className="card"
      style={{
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,.08)",
        background: "rgba(255,255,255,.03)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Bar({ value = 0, max = 100, theme }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div
      style={{
        height: 10,
        borderRadius: 999,
        background: "rgba(255,255,255,.08)",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,.08)",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: theme?.accent || "#ffd75e",
        }}
      />
    </div>
  );
}

/* ---- field fallbacks to be resilient to schema tweaks ------------------- */
function achTitle(a = {}) {
  return a.name || a.title || "Achievement";
}
function achDesc(a = {}) {
  return a.description || "";
}
function achTarget(a = {}) {
  // your table uses unlock_value; keep fallbacks just in case
  return a.unlock_value ?? a.target ?? a.goal ?? null;
}

/* ========================================================================= */
export default function Tab_Achievements() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const theme = (() => {
    try { return useTheme(); } catch { return {}; }
  })();

  const [stats, setStats] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        if (!userId) {
          setStats(null);
          setAchievements([]);
          return;
        }

        // 1) Load user stats (xp, streak, etc.)
        const { data: s, error: se } = await supabase
          .from("user_stats")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        if (se) throw se;

        // 2) Load achievements for this user joined to achievements table
        const { data, error } = await supabase
  .from("user_achievements")
  .select(`
    id,
    user_id,
    achievement_id,
    progress,
    completed_at,
    achievement:achievements!user_achievements_achievement_fk (
      id,
      name,
      description,
      icon,
      stat_key,
      unlock_value
    )
  `)
  .eq("user_id", userId);


        if (error) throw error;

        if (!alive) return;
        setStats(s || null);
        setAchievements(data || []);
      } catch (e) {
        if (!alive) return;
        console.error("Achievements load failed:", e);
        setErr(e.message || "Failed to load achievements");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  const streak = stats?.days_streak ?? 0;
  const xp = stats?.xp ?? 0;
  const tier = stats?.tier ?? "Bronze";
  const nextTierXp = stats?.tier_xp ?? 100;

  const achieved = useMemo(
    () => (achievements || []).filter(a => !!a.completed_at),
    [achievements]
  );
  const inProgress = useMemo(
    () => (achievements || []).filter(a => !a.completed_at),
    [achievements]
  );

  return (
    <div style={{ padding: 8 }}>
      <h2 style={{ marginTop: 0 }}>Achievements</h2>

      {loading && <div style={{ opacity: 0.8 }}>Loading…</div>}
      {!loading && err && (
        <div
          className="alert"
          style={{
            border: "1px dashed #c66",
            padding: 12,
            borderRadius: 12,
            marginBottom: 12,
            background: "rgba(180,0,0,.08)",
          }}
        >
          {err}
        </div>
      )}

      {/* XP + Streak */}
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          marginBottom: 16,
        }}
      >
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Tier: {tier}</div>
          <div style={{ marginBottom: 6 }}>
            {xp} / {nextTierXp} XP
          </div>
          <Bar value={xp} max={nextTierXp} theme={theme} />
        </Card>

        <Card>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Daily Streak</div>
          <div style={{ fontSize: 28 }}>
            {streak} day{streak === 1 ? "" : "s"}
          </div>
        </Card>
      </div>

      {/* In progress */}
      <div style={{ marginTop: 8, marginBottom: 6, opacity: 0.85, fontWeight: 700 }}>
        In Progress
      </div>
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          marginBottom: 20,
        }}
      >
        {(inProgress || []).map((row) => {
          const a = row.achievement || {};
          const target = achTarget(a);
          return (
            <div key={row.id} className="card surface" style={{ padding: 16, borderRadius: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>{a.icon || "🏅"}</span>
                <h4 style={{ margin: 0 }}>{achTitle(a)}</h4>
              </div>
              {achDesc(a) && <p style={{ opacity: 0.85, marginTop: 8 }}>{achDesc(a)}</p>}
              {target != null && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    {row.progress ?? 0} / {target}
                  </div>
                  <Bar value={row.progress ?? 0} max={target} theme={theme} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completed */}
      <div style={{ marginTop: 8, marginBottom: 6, opacity: 0.85, fontWeight: 700 }}>
        Completed
      </div>
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        {(achieved || []).map((row) => {
          const a = row.achievement || {};
          const title = achTitle(a);
          const desc = achDesc(a);
          const icon = a.icon || "🏅";
          const target = achTarget(a);
          const current = row.progress ?? 0;

          return (
            <div key={row.id} className="card surface" style={{ padding: 16, borderRadius: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
                <h4 style={{ margin: 0 }}>{title}</h4>
              </div>
              {desc && <p style={{ opacity: 0.85, marginTop: 8 }}>{desc}</p>}
              {target != null && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>
                    Completed — {current}/{target}
                  </div>
                  <Bar value={current} max={target} theme={theme} />
                </div>
              )}
            </div>
          );
        })}

        {!achieved.length && (
          <Card>
            <div style={{ opacity: 0.8 }}>No completed achievements yet.</div>
          </Card>
        )}
      </div>
    </div>
  );
}
