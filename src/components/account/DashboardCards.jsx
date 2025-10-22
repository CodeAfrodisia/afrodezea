import React from "react";

function Shell({ id, title, right, children }) {
  return (
    <section id={id} className="surface" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
        {right ?? null}
      </div>
      {children}
    </section>
  );
}

export default function DashboardCards({
  theme,
  username,
  streak,
  handle,
  onSetupProfile,
  kpi,
  lastMood,
  loveLanguage,
  childrenTop,      // place for Welcome + Affirmation
  todayCTA,         // your “Ready to check in?” CTA
  favoritesBlock,   // your <PublicFavorites .../>
  insightsBlock,    // small blurb
  achievementsTabs, // your lazy tabs component
  quizzesHub,       // <QuizzesHub/>
  breathCard,       // <BreathCard/>
  onViewProfile,    // function
}) {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "18px 16px", display: "grid", gap: 16 }}>
      {/* HERO */}
      <section className="surface" id="overview" style={{ padding: 18 }}>
        <div style={{ display:"flex", gap:14, alignItems:"center", justifyContent:"space-between", flexWrap:"wrap" }}>
          <h1 style={{ margin:0, fontSize:28, color: theme.primary || "#ffd75e" }}>
            {username ? `Welcome back, ${username}` : "Welcome back"}
          </h1>
          <div title="Current streak" style={{
            fontSize:14, border:`1px solid ${theme.border || "#444"}`,
            padding:"6px 10px", borderRadius:999
          }}>🔥 {streak || 0}-day streak</div>
          {!handle && (
            <button onClick={onSetupProfile} className="btn btn--gold" style={{ marginLeft: "auto" }}>
              Set up Profile
            </button>
          )}
        </div>
        <div style={{ marginTop: 12, display:"grid", gap:12 }}>
          {childrenTop}
        </div>
      </section>

      {/* KPIs */}
      <section id="stats" className="surface" style={{ padding: 16 }}>
        <div style={{ display:"grid", gap:12, gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))" }}>
          <K label="Check-ins (30d)" v={kpi?.checkins ?? 0} />
          <K label="Avg Social Battery" v={kpi?.avgBattery != null ? `${kpi.avgBattery} / 3` : "—"} sub={batteryLabel(kpi?.avgBattery)} />
          <K label="Dominant Love Language" v={kpi?.dominantLove || "—"} />
          <K label="Last Mood" v={lastMood || "—"} />
        </div>
      </section>

      {/* TODAY & BREATHE */}
      <div id="today" style={{ display:"grid", gap:16, gridTemplateColumns:"1.2fr .8fr" }}>
        <Shell id="today-card" title="Today">
          {todayCTA}
        </Shell>
        <Shell id="breathe" title="Breathe">{breathCard}</Shell>
      </div>

      {/* QUIZZES */}
      <Shell id="quizzes" title="Quizzes">{quizzesHub}</Shell>

      {/* INSIGHTS + FAVORITES */}
      <div id="insights" style={{ display:"grid", gap:16, gridTemplateColumns:"1.2fr 1fr" }}>
        <Shell id="insights-card" title="Insights">
          {insightsBlock}
        </Shell>
        <Shell id="favorites" title="Favorites (Public)" right={
          <a href="/dashboard?tab=favorites" className="btn btn--ghost">Manage →</a>
        }>
          {favoritesBlock}
        </Shell>
      </div>

      {/* ACHIEVEMENTS / STATS TABS */}
      <Shell id="achievements" title="Achievements & Stats">
        {achievementsTabs}
      </Shell>

      {/* Profile entry */}
      <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
        <a href="/quizzes" className="btn btn--ghost">Explore Quizzes</a>
        <button onClick={onViewProfile} className="btn btn--ghost">{handle ? "View Public Profile" : "Set up Profile"}</button>
      </div>
    </div>
  );
}

function K({ label, v, sub }) {
  return (
    <div className="surface" style={{ padding: 12, borderRadius: 16 }}>
      <div style={{ fontSize: 12, opacity: .75 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{v ?? "—"}</div>
      {sub ? <div style={{ fontSize: 12, opacity: .7 }}>{sub}</div> : null}
    </div>
  );
}
function batteryLabel(avg){
  if (avg == null) return "—";
  if (avg >= 2.5) return "Mostly High";
  if (avg >= 1.5) return "Mostly Medium";
  return "Mostly Low";
}

