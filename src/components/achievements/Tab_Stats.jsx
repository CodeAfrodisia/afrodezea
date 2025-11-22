// src/components/achievements/Tab_Stats.jsx
import React from "react";
import { useDashboard } from "@context/DashboardContext.jsx";

/**
 * StatsTab
 *
 * Reads all user stats from DashboardContext and presents:
 * - Core KPIs (check-ins, streaks, XP, affirmations, journals)
 * - Mood / need / love-language / social battery patterns (when available)
 *
 * Purely presentational — no direct Supabase calls.
 */

export default function StatsTab({ userId }) {
  const { stats = {}, loadingStats = false, statsError = null } =
    useDashboard?.() || {};

  const isLoading = loadingStats;
  const hasError = !!statsError;
  const hasStats = !!stats && Object.keys(stats || {}).length > 0;

  // Safely pull fields, with fallbacks for slightly different column names
  const totalCheckins = stats.total_checkins ?? stats.checkins ?? 0;
  const currentStreak = stats.streak_current ?? stats.current_streak ?? stats.days_streak ?? 0;
  const longestStreak = stats.streak_longest ?? stats.best_streak ?? 0;

  const totalAffirmations =
    stats.total_affirmations_saved ?? stats.affirmations_saved ?? 0;
  const totalJournals =
    stats.total_journals ?? stats.journals ?? stats.journal_entries ?? 0;

  const xp = stats.xp ?? stats.total_xp ?? 0;
  const level = stats.level ?? stats.tier_level ?? stats.tier ?? 1;
  const nextTierXp = stats.next_tier_xp ?? stats.tier_xp ?? 100;

  const moodTop = stats.mood_top ?? stats.top_mood ?? null;
  const needTop = stats.need_top ?? stats.top_need ?? null;
  const loveTop =
    stats.love_language_top ?? stats.top_love_language ?? null;

  const socialAvgRaw =
    stats.social_battery_avg ?? stats.social_battery_average ?? null;
  const socialAvg =
    socialAvgRaw != null
      ? Number(
          typeof socialAvgRaw === "number"
            ? socialAvgRaw.toFixed?.(1) ?? socialAvgRaw
            : socialAvgRaw
        )
      : null;

  const horizonLabel =
    stats.horizon_label ||
    (stats.horizon_days ? `Last ${stats.horizon_days} days` : "Recent activity");

  // If no user, show a soft guard instead of crashing
  if (!userId) {
    return (
      <div
        className="unbox"
        style={{
          display: "grid",
          gap: 18,
        }}
      >
        <div>
          <div className="section-title" style={{ marginBottom: 6 }}>
            <div style={{ fontWeight: 700 }}>Your Stats</div>
            <span className="rule" />
          </div>
          <p style={{ margin: 0, opacity: 0.8 }}>
            Sign in to see your streaks, XP, and mood patterns.
          </p>
        </div>

        <div
          className="surface"
          style={{
            padding: 16,
            borderRadius: 12,
            opacity: 0.85,
          }}
        >
          Once you’ve checked in a few times, your stats will appear here.
        </div>
      </div>
    );
  }

  return (
    <div
      className="unbox"
      style={{
        display: "grid",
        gap: 18,
      }}
    >
      {/* Header */}
      <div>
        <div className="section-title" style={{ marginBottom: 6 }}>
          <div style={{ fontWeight: 700 }}>Your Stats</div>
          <span className="rule" />
        </div>
        <p style={{ margin: 0, opacity: 0.8 }}>
          A quick snapshot of your check-ins, streaks, and patterns across
          Afrodezea.
        </p>
      </div>

      {/* Loading / error / empty states */}
      {isLoading && (
        <div
          className="surface"
          style={{
            padding: 16,
            borderRadius: 12,
            opacity: 0.85,
          }}
        >
          Loading your stats…
        </div>
      )}

      {!isLoading && hasError && (
        <div
          className="surface"
          style={{
            padding: 16,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,0,0,0.06)",
          }}
        >
          We couldn’t load your stats just now. They’ll show here as soon as
          things reconnect.
        </div>
      )}

      {!isLoading && !hasError && !hasStats && (
        <div
          className="surface"
          style={{
            padding: 16,
            borderRadius: 12,
            opacity: 0.85,
          }}
        >
          Once you’ve logged a few check-ins and saved affirmations, your
          stats will appear here.
        </div>
      )}

      {/* Main content */}
      {!isLoading && !hasError && hasStats && (
        <>
          {/* Core KPIs */}
          <section
            className="surface"
            style={{
              padding: 16,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(0,0,0,0.35)",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 16,
            }}
          >
            <KpiCard
              label="Total Check-Ins"
              value={totalCheckins}
              hint={horizonLabel}
            />
            <KpiCard
              label="Current Streak"
              value={currentStreak}
              hint="Consecutive days checked in"
            />
            <KpiCard
              label="Best Streak"
              value={longestStreak}
              hint="Longest run you’ve held"
            />
            <KpiCard
              label="Reflections Logged"
              value={totalJournals}
              hint="Journal entries saved"
            />
            <KpiCard
              label="Affirmations Saved"
              value={totalAffirmations}
              hint="Pinned or favorited affirmations"
            />
            <KpiCard
              label="XP"
              value={xp}
              secondary={`Level ${level}`}
              hint={`Next tier at ~${nextTierXp} XP`}
            >
              <XPBar value={xp} max={nextTierXp} />
            </KpiCard>
          </section>

          {/* Patterns Row */}
          <section
            className="surface"
            style={{
              padding: 16,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(0,0,0,0.35)",
            }}
          >
            <div className="section-title" style={{ margin: "0 0 10px" }}>
              <div style={{ fontWeight: 700 }}>Patterns at a Glance</div>
              <span className="rule" />
            </div>

            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
              }}
            >
              <PatternCard
                label="Most frequent mood"
                value={moodTop}
                placeholder="We’ll show this once you’ve checked in a few times."
              />
              <PatternCard
                label="Most frequent need"
                value={needTop}
                placeholder="Patterns appear as you log needs in check-ins."
              />
              <PatternCard
                label="Most needed love language"
                value={loveTop}
                placeholder="We use your check-ins to estimate this over time."
              />
              <PatternCard
                label="Average social battery"
                value={
                  socialAvg != null
                    ? `${socialAvg} / 3 – ${formatBatteryLabel(socialAvg)}`
                    : null
                }
                meta={
                  socialAvg != null
                    ? "(1 = Low, 2 = Medium, 3 = High)"
                    : undefined
                }
                placeholder="Once you’ve logged some days, we’ll estimate your usual energy."
              />
            </div>

            <p style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
              These patterns are based on your recent check-ins and may shift
              as life does.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

/* ───────────────── Helpers ───────────────── */

function KpiCard({ label, value, secondary, hint, children }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(10,10,10,0.85)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.75 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>
        {value ?? "—"}
      </div>
      {secondary && (
        <div style={{ fontSize: 12, opacity: 0.85 }}>{secondary}</div>
      )}
      {hint && (
        <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>
          {hint}
        </div>
      )}
      {children}
    </div>
  );
}

function PatternCard({ label, value, placeholder, meta }) {
  const hasValue = value !== null && value !== undefined && value !== "";

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(10,10,10,0.85)",
        minHeight: 88,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 4,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.75 }}>{label}</div>
      <div
        style={{
          fontSize: 16,
          fontWeight: hasValue ? 600 : 400,
          opacity: hasValue ? 0.95 : 0.7,
        }}
      >
        {hasValue ? value : placeholder}
      </div>
      {hasValue && meta && (
        <div style={{ fontSize: 11, opacity: 0.7 }}>{meta}</div>
      )}
    </div>
  );
}

function XPBar({ value = 0, max = 100 }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));

  return (
    <div
      style={{
        marginTop: 6,
        height: 8,
        borderRadius: 999,
        background: "rgba(255,255,255,.08)",
        border: "1px solid rgba(255,255,255,0.14)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          borderRadius: 999,
          background:
            "linear-gradient(90deg, rgba(255,215,128,0.9), rgba(255,180,80,1))",
          transition: "width 0.25s ease-out",
        }}
      />
    </div>
  );
}

/**
 * Normalize social battery average to a user-friendly label.
 * If the DB already stores "low/medium/high", this falls through cleanly.
 */
function formatBatteryLabel(avg) {
  if (typeof avg === "string") return avg;

  const n = Number(avg);
  if (!Number.isFinite(n)) return "—";

  if (n >= 2.5) return "Mostly High";
  if (n >= 1.5) return "Mostly Medium";
  return "Mostly Low";
}
