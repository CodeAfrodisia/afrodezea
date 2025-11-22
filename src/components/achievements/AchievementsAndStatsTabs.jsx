// src/components/achievements/AchievementsAndStatsTabs.jsx

import React, { useState } from "react";
import ErrorBoundary from "@components/ErrorBoundary.jsx";
import { useAuth } from "@context/AuthContext.jsx";
import { useDashboard } from "@context/DashboardContext.jsx";
import { useTheme } from "@lib/useTheme.jsx";

import Tab_Achievements from "@components/achievements/Tab_Achievements.jsx";
import Tab_FavoritesRanking from "@components/achievements/Tab_FavoritesRanking.jsx";
import StatsTab from "@components/achievements/Tab_Stats.jsx";  // ✅ using your uploaded file

// Optional dev helper for seeding profile widgets
import { supabase } from "@lib/supabaseClient.js";

export default function AchievementsAndStatsTabs() {
  const { user } = useAuth();
  const { stats } = useDashboard();
  const theme = safeUseTheme();

  const [activeTabKey, setActiveTabKey] = useState("achievements");

  const tabs = [
    {
      key: "achievements",
      label: "Achievements",
      render: () => <Tab_Achievements userId={user?.id ?? null} />,
    },
    {
      key: "favorites",
      label: "Favorites",
      render: () => <Tab_FavoritesRanking userId={user?.id ?? null} />,
    },
    {
      key: "stats",
      label: "Stats",
      render: () => <StatsTab userId={user?.id ?? null} />,   // ✅ now active
    },
    // Future:
    // { key: "insights", label: "Insights", render: () => <Tab_Insights /> },
  ];

  const activeTab = tabs.find((t) => t.key === activeTabKey) ?? tabs[0];

  const xp = typeof stats?.xp === "number" ? stats.xp : null;
  const level = typeof stats?.level === "number" ? stats.level : null;

  return (
    <section style={{ padding: "8px 0" }}>
      {/* XP summary */}
      {xp !== null && (
        <div
          className="surface"
          style={{
            padding: 12,
            borderRadius: 12,
            marginBottom: 12,
            fontSize: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ opacity: 0.8 }}>Your current XP</span>
          <span style={{ fontWeight: 600 }}>
            {xp} {level ? `• Level ${level}` : ""}
          </span>
        </div>
      )}

      {/* Pills */}
      <div
        className="tabsbar"
        style={{
          marginBottom: 16,
          borderBottom: "none",
          paddingBottom: 0,
        }}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {tabs.map((tab) => {
            const active = tab.key === activeTabKey;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTabKey(tab.key)}
                className="chip"
                data-active={active ? "true" : "false"}
                aria-pressed={active}
                style={{
                  padding: "10px 18px",
                  borderRadius: 999,
                  border: theme.border ?? "1px solid var(--c-border-subtle)",
                  background: active
                    ? theme.accent ?? "var(--c-gold)"
                    : "transparent",
                  color: active
                    ? theme.background ?? "#111"
                    : theme.text ?? "var(--c-ink)",
                  fontWeight: 600,
                  fontSize: 14,
                  letterSpacing: ".03em",
                  textTransform: "uppercase",
                  transition: "background .12s ease, color .12s ease",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="surface glass" style={{ padding: 16, borderRadius: 16 }}>
        <ErrorBoundary
          fallback={<div style={{ opacity: 0.8 }}>This tab had a hiccup.</div>}
        >
          {activeTab.render()}
        </ErrorBoundary>
      </div>
    </section>
  );
}

function safeUseTheme() {
  try {
    const t = useTheme();
    return t && typeof t === "object" ? t : {};
  } catch {
    return {};
  }
}


/**
 * Dev-only helper to seed profile widgets with some demo layout.
 * Not wired to UI; you can call this from a temporary button
 * or from a console import during development if you want.
 */
async function publishDemoWidgets() {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return;

    // Clear existing widgets for this user
    await supabase
      .from("profile_widgets")
      .delete()
      .eq("user_id", userId);

    const rows = [
      {
        user_id: userId,
        widget_key: "today",
        position: 1,
        size: "w2h1",
        is_public: true,
        payload: {},
      },
      {
        user_id: userId,
        widget_key: "breathe",
        position: 2,
        size: "w2h1",
        is_public: true,
        payload: { seconds: 60 },
      },
      {
        user_id: userId,
        widget_key: "quizzes.latest",
        position: 3,
        size: "w2h2",
        is_public: true,
        payload: { limit: 4 },
      },
      {
        user_id: userId,
        widget_key: "favorites.public",
        position: 4,
        size: "w2h1",
        is_public: true,
        payload: { limit: 6 },
      },
    ];

    const { error } = await supabase
      .from("profile_widgets")
      .insert(rows);

    if (error) {
      console.error("[widgets] insert failed:", error);
    } else {
      console.log("✅ demo widgets published");
    }
  } catch (err) {
    console.error("[widgets] unexpected error:", err);
  }
}
