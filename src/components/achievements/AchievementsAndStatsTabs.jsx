// src/components/achievements/AchievementsAndStatsTabs.jsx
import React, { useState } from "react";
import ErrorBoundary from "@components/ErrorBoundary.jsx";
import { useAuth } from "@context/AuthContext.jsx";
import { useTheme } from "@lib/useTheme.jsx";

import Tab_Achievements from "@components/achievements/Tab_Achievements.jsx";
import Tab_FavoritesRanking from "@components/achievements/Tab_FavoritesRanking.jsx";

// (optional) demo widgets helper needs supabase; keep if you use it
import { supabase } from "@lib/supabaseClient.js";

export default function AchievementsAndStatsTabs() {
  const { user } = useAuth();
  const theme = (() => {
    try { return useTheme(); } catch { return {}; }
  })();

  // 0 = Achievements, 1 = Favorites
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { key: "achievements", label: "Achievements", render: () => <Tab_Achievements userId={user?.id || null} /> },
    { key: "favorites", label: "Favorites", render: () => <Tab_FavoritesRanking userId={user?.id || null} /> },
  ];

  async function publishDemoWidgets() {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return;

    await supabase.from("profile_widgets").delete().eq("user_id", userId);

    const rows = [
      { user_id: userId, widget_key: "today",            position: 1, size: "w2h1", is_public: true, payload: {} },
      { user_id: userId, widget_key: "breathe",          position: 2, size: "w2h1", is_public: true, payload: { seconds: 60 } },
      { user_id: userId, widget_key: "quizzes.latest",   position: 3, size: "w2h2", is_public: true, payload: { limit: 4 } },
      { user_id: userId, widget_key: "favorites.public", position: 4, size: "w2h1", is_public: true, payload: { limit: 6 } },
    ];

    const { error } = await supabase.from("profile_widgets").insert(rows);
    if (error) console.error("[widgets] insert failed:", error);
    else console.log("✅ demo widgets published");
  }

  return (
    <section style={{ padding: "8px 0" }}>
      {/* Pills */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map((t, i) => {
          const active = i === activeTab;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(i)}
              className="chip"
              aria-pressed={active}
              style={{
                padding: "10px 18px",
                borderRadius: 999,
                border: `1px solid ${theme.border || "var(--hairline)"}`,
                background: active ? (theme.accent || "var(--gold)") : "transparent",
                color: active ? (theme.background || "#111") : (theme.text || "var(--text)"),
                fontWeight: 600,
                transition: "background .12s ease, color .12s ease",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

   

      {/* Content panel */}
      <div className="surface glass" style={{ padding: 16, borderRadius: 16 }}>
        <ErrorBoundary fallback={<div style={{ opacity: .8 }}>This tab had a hiccup.</div>}>
          {tabs[activeTab]?.render()}
        </ErrorBoundary>
      </div>
    </section>
  );
}
