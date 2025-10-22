import React, { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@context/AuthContext.jsx";
import { SoulProvider, useSoul } from "@context/SoulContext.jsx";
import LoadSoulFramework from "@components/account/LoadSoulFramework.jsx";

// Tabs (simple local components; we’ll refine)
function OverviewTab() {
  return (
    <div className="surface" style={{ padding: 18, borderRadius: 16 }}>
      <h2 className="display" style={{ marginTop: 0 }}>Welcome</h2>
      <p style={{ opacity: .9 }}>Your personalized space for guidance, stats, and favorites.</p>
      {/* TODO: GPT-generated welcome + XPProgress */}
    </div>
  );
}

function PersonalityTab() {
  const { soulData, userArchetype } = useSoul();
  const { user } = useAuth();
  return (
    <div className="surface" style={{ padding: 12, borderRadius: 16 }}>
      <PersonalityCarousel userId={user?.id} />
    </div>
  );


  return (
    <div className="surface" style={{ padding: 18, borderRadius: 16, display: "grid", gap: 12 }}>
      <h2 className="display" style={{ marginTop: 0 }}>{arche.name}</h2>
      <div style={{ opacity: .85 }}>Element: {arche.element}</div>
      <div style={{ opacity: .85 }}>Affirmation: {arche.affirmation}</div>

      {/* Light/Shadow/Strengths/Challenges */}
      <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
        {Array.isArray(arche?.traits?.light) && (
          <div>
            <strong>Light Traits</strong>
            <ul>{arche.traits.light.map((t,i)=> <li key={i}>{t}</li>)}</ul>
          </div>
        )}
        {Array.isArray(arche?.traits?.shadow) && (
          <div>
            <strong>Shadow Traits</strong>
            <ul>{arche.traits.shadow.map((t,i)=> <li key={i}>{t}</li>)}</ul>
          </div>
        )}
      </div>

      {/* Seasonal message */}
      {arche.seasonalMessages && (
        <div style={{ marginTop: 12 }}>
          <strong>Seasonal Guidance</strong>
          <div style={{ opacity: .9 }}>
            {arche.seasonalMessages[currentSeason()]}
          </div>
        </div>
      )}
    </div>
  );
}

function AchievementsTab() {
  return (
    <div className="surface" style={{ padding: 18, borderRadius: 16 }}>
      <h2 className="display" style={{ marginTop: 0 }}>Achievements & Stats</h2>
      <div style={{ opacity: .9 }}>Coming next: XP, streaks, purchases, favorites, gifting.</div>
    </div>
  );
}

function SettingsTab() {
  return (
    <div className="surface" style={{ padding: 18, borderRadius: 16 }}>
      <h2 className="display" style={{ marginTop: 0 }}>Settings</h2>
      <div style={{ opacity: .9 }}>Profile privacy, public username, avatar.</div>
    </div>
  );
}

const TABS = [
  { key: "overview", label: "Overview", node: <OverviewTab/> },
  { key: "personality", label: "Personality", node: <PersonalityTab/> },
  { key: "achievements", label: "Achievements & Stats", node: <AchievementsTab/> },
  { key: "settings", label: "Settings", node: <SettingsTab/> },
];

function currentSeason() {
  const m = new Date().getMonth();
  if (m>=2 && m<5) return "Spring";
  if (m>=5 && m<8) return "Summer";
  if (m>=8 && m<11) return "Autumn";
  return "Winter";
}

function AccountInner() {
  const { user, loading } = useAuth();
  const [active, setActive] = useState("overview");

  if (loading) return <div style={{ padding: 24 }}>Checking session…</div>;
  if (!user)    return <div style={{ padding: 24 }}>Please sign in to view your dashboard.</div>;

  const title = "My Account | Afrodezea";
  const desc  = "Your personal dashboard for guidance, achievements, and favorites.";

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href="/account" />
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
      </Helmet>

      <LoadSoulFramework />

      <div className="container" style={{ padding: 24 }}>
        {/* Tabs */}
        <div className="surface" style={{ padding: 12, borderRadius: 16, marginBottom: 12 }}>
          <nav style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {TABS.map(t => (
              <button
                key={t.key}
                className={`chip ${active===t.key ? "active" : ""}`}
                onClick={() => setActive(t.key)}
                aria-pressed={active===t.key}
                style={{ padding: "8px 12px", borderRadius: 999, border: "1px solid var(--hairline)" }}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Body */}
        <div style={{ display: "grid", gap: 12 }}>
          {TABS.find(t => t.key === active)?.node}
        </div>
      </div>
    </>
  );
}

export default function Account() {
  // Scope the SoulProvider to /account so we don’t load soul data globally
  return (
    <SoulProvider>
      <AccountInner />
    </SoulProvider>
  );
}

