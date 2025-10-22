// src/components/account/SoulProfile.jsx
import React, { useMemo, useState } from "react";
import { useSoul } from "@context/SoulContext.jsx";

/**
 * SoulProfile
 *
 * Props (all optional; falls back to SoulContext):
 * - profile: {
 *     element?: string,
 *     role?: { label?: string, description?: string },
 *     totals?: Record<string, number> | Record<string, unknown>,
 *     analyses?: { mood?: string, love?: string, archetype?: string },
 *     quiz_slug?: string
 *   }
 * - defaultPublic?: boolean
 * - onTogglePublic?: (next:boolean) => void
 * - onCreateSnapshot?: () => void
 * - onEditQuizzes?: () => void
 * - onShare?: () => void
 * - saving?: boolean
 */
export default function SoulProfile({
  profile,
  defaultPublic = false,
  onTogglePublic,
  onCreateSnapshot,
  onEditQuizzes,
  onShare,
  saving = false,
}) {
  // Context fallback so this component still works standalone
  const { soulData, userArchetype } = useSoul();

  const archetype = useMemo(() => {
    // Prefer explicit profile.role/element if supplied
    if (profile?.role?.label || profile?.element) {
      const ctx = soulData?.find((a) => a.name === userArchetype);
      return {
        name: userArchetype || profile?.role?.label || "Your Archetype",
        element: profile?.element || ctx?.element || "—",
        affirmation: ctx?.affirmation || "",
        traits: ctx?.traits || { light: [], shadow: [] },
        strengths: ctx?.strengths || [],
        challenges: ctx?.challenges || [],
        description: profile?.role?.description || "",
      };
    }

    // Otherwise resolve completely from context
    if (!soulData || soulData.length === 0) return null;
    const a = soulData.find((x) => x.name === userArchetype);
    if (!a) return null;
    return {
      name: a.name,
      element: a.element,
      affirmation: a.affirmation,
      traits: a.traits || { light: [], shadow: [] },
      strengths: a.strengths || [],
      challenges: a.challenges || [],
      description: a.description || "",
    };
  }, [profile, soulData, userArchetype]);

  const analyses = {
    mood: profile?.analyses?.mood || "",
    love: profile?.analyses?.love || "",
    archetype: profile?.analyses?.archetype || "",
  };

  const [isPublic, setIsPublic] = useState(!!defaultPublic);

  if (!archetype) {
    return (
      <div className="surface" style={{ padding: 16, borderRadius: 12 }}>
        Loading soul data…
      </div>
    );
  }

  function handleTogglePublic(e) {
    const next = !!e.target.checked;
    setIsPublic(next);
    onTogglePublic?.(next);
  }

  return (
    <div
      className="surface"
      style={{
        background: "linear-gradient(180deg, var(--surface), var(--surface-2))",
        border: "1px solid var(--hairline)",
        borderRadius: 16,
        boxShadow: "var(--shadow)",
        padding: 20,
        color: "var(--text)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 12,
          alignItems: "start",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 28, lineHeight: 1.25 }}>
            {archetype.name}
          </h2>
          <div style={{ opacity: 0.8, marginTop: 4 }}>
            <strong>Element:</strong> {archetype.element}
            {archetype.description ? (
              <div style={{ marginTop: 6 }}>{archetype.description}</div>
            ) : null}
          </div>
        </div>

        {/* Public toggle */}
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            userSelect: "none",
            fontSize: 14,
            padding: "8px 10px",
            border: "1px solid var(--hairline)",
            borderRadius: 999,
            background: "var(--surface)",
          }}
          title="Toggle public visibility of your Soul Profile"
        >
          <input
            type="checkbox"
            checked={isPublic}
            disabled={saving}
            onChange={handleTogglePublic}
          />
          <span>{isPublic ? "Public" : "Private"}</span>
        </label>
      </div>

      {/* Affirmation */}
      {archetype.affirmation ? (
        <div
          style={{
            marginTop: 14,
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid var(--hairline)",
            background:
              "linear-gradient(180deg, rgba(212,175,55,0.06), transparent)",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Affirmation</div>
          <div style={{ opacity: 0.9 }}>{archetype.affirmation}</div>
        </div>
      ) : null}

     {/* Analyses */}
<div
  style={{
    marginTop: 16,
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr auto 1fr", // 3 cards, 2 dividers
    columnGap: 12,
    alignItems: "stretch",
  }}
>
  <AnalysisCard
    title="Mood Insight"
    text={analyses.mood}
    placeholder="We’ll craft a short mood reflection once you have a few recent check-ins."
  />

  <div className="rule-gold-vertical" />

  <AnalysisCard
    title="Love Insight"
    text={analyses.love}
    placeholder="We’ll add guidance based on your recent love-language needs."
  />

  <div className="rule-gold-vertical" />

  <AnalysisCard
    title="Archetype Insight"
    text={analyses.archetype}
    placeholder="We’ll share a quick note on how to lean into your archetype this week."
  />
</div>

{/* Actions */}
<div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
  <button className="btn btn-action" onClick={onShare} disabled={saving}>
    Share
  </button>

  <div className="rule-gold-vertical" />

  <button className="btn btn-action" onClick={onCreateSnapshot} disabled={saving}>
    Create Snapshot
  </button>

  <div className="rule-gold-vertical" />

  <button className="btn btn-action" onClick={onEditQuizzes} disabled={saving}>
    Edit Quizzes
  </button>
</div>





{/* Traits / Strengths / Challenges */}
<div
  style={{
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr auto 1fr auto 1fr", // 4 cards, 3 dividers
    columnGap: 16,
    alignItems: "stretch",
  }}
>
  <ListCard title="Light Traits" items={archetype.traits?.light} />

  <div className="rule-gold-vertical" />

  <ListCard title="Shadow Traits" items={archetype.traits?.shadow} />

  <div className="rule-gold-vertical" />

  <ListCard title="Strengths" items={archetype.strengths} />

  <div className="rule-gold-vertical" />

  <ListCard title="Challenges" items={archetype.challenges} />
</div>


    </div>
  );
}

/* ---------- Small presentational helpers ---------- */

function AnalysisCard({ title, text, placeholder }) {
  const body =
    (typeof text === "string" && text.trim().length > 0 ? text : null) ||
    null;
  return (
    <div
      className="surface"
      style={{
        border: "1px solid var(--hairline)",
        borderRadius: 12,
        padding: 12,
        minHeight: 120,
        background: "var(--surface)",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div style={{ opacity: body ? 0.95 : 0.7, whiteSpace: "pre-wrap" }}>
        {body || placeholder}
      </div>
    </div>
  );
}

function ListCard({ title, items }) {
  const list = Array.isArray(items) ? items : [];
  return (
    <div
      className="surface"
      style={{
        border: "1px solid var(--hairline)",
        borderRadius: 12,
        padding: 12,
        background: "var(--surface)",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{title}</div>
      {list.length === 0 ? (
        <div style={{ opacity: 0.7 }}>No items yet.</div>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {list.map((t, i) => (
            <li key={i} style={{ marginBottom: 4 }}>
              {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function btnStyle() {
  return {
    background: "var(--surface)",
    border: "1px solid var(--btn-border, var(--hairline))",
    borderRadius: 10,
    padding: "8px 12px",
    boxShadow: "var(--shadow)",
  };
}

function btnGhostStyle() {
  return {
    background: "transparent",
    border: "1px solid var(--hairline)",
    borderRadius: 10,
    padding: "8px 12px",
  };
}
