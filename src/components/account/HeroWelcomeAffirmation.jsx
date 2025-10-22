// src/components/account/HeroWelcomeAffirmation.jsx
import React from "react";

/* ---------- tiny deterministic picker (legacy lead fallback) ---------- */
function hashStr(str) {
  let h = 2166136261 >>> 0; // FNV-1a base
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return (h >>> 0) / 2 ** 32; // 0..1
}
function pickDaily(list, seedKey) {
  if (!list?.length) return "";
  const idx = Math.floor(hashStr(seedKey) * list.length);
  return list[idx];
}

/* ---------- default intro phrases (legacy lead fallback) ---------- */
const DEFAULT_LEADS = [
  "Here’s your affirmation for today:",
  "Carry this with you today:",
  "A gentle reminder for your spirit:",
  "Receive today’s guiding word:",
  "A note to anchor you today:",
  "Let this be your quiet companion:",
  "For the path you’re walking today, know:",
  "In the softness of this moment, remember:",
  "A small light for your day:",
  "Hold this close to your heart:",
];

/**
 * Reconciled component:
 * - Prefers `data` (welcome-message JSON) when provided.
 * - Falls back to legacy props (username, affirmation string, daily lead).
 *
 * Props (new + legacy):
 * - data?: {
 *     welcome?: { greeting?: string, lines?: string[], nudge?: { kind?: "breath"|"product"|"gift"|"none", variant?: "box"|"4-7-8"|null, cta_label?: string|null, product?: {id,slug,name}|null, gift?: {code,label,expires_at}|null } },
 *     affirmation?: { id?: string, text?: string, tone?: "warm"|"rooted"|"bright" },
 *     provenance?: { cached?: boolean, tod?: string, date?: string }
 *   }
 * - username?: string
 * - streak?: number
 * - theme?: { primary?, text?, border? }
 * - affirmation?: string  (legacy text fallback)
 * - leadPhrases?: string[] (legacy lead)
 * - userKey?: string       (legacy lead seeding)
 * - onStartBreath?(variant: "box"|"4-7-8"): void
 * - onOpenProductQuickBuy?(product: {id,slug,name}): void
 * - onRedeemGift?(gift: {code,label,expires_at}): void
 * - onSaveAffirmation?(text: string, id?: string): Promise<void>|void
 */
export default function HeroWelcomeAffirmation({
  data,
  username,
  streak = 0,
  theme = {},
  affirmation: legacyAffirmation,
  leadPhrases = DEFAULT_LEADS,
  userKey,

  // new action handlers coming from WelcomeOfDayCard
  onStartBreath,
  onOpenProductQuickBuy,
  onRedeemGift,
  onSaveAffirmation,
}) {
  // ----- Theming (keep original look) -----
  const border = theme.border || "#333";
  const gold = theme.primary || "#ffd75e";
  const text = theme.text || "#fff";

  // ----- Prefer GPT payload when present; otherwise use legacy props -----
  const w = data?.welcome || {};
  const affObj = data?.affirmation || {};
  const greeting =
    (typeof w.greeting === "string" && w.greeting) ||
    (username ? `Welcome back, ${username}` : "Welcome back, love.");

  // Legacy supportive message (kept; only shown when model didn’t provide lines)
  const supportiveMessage = "Your space is ready.";

  // Lines from model (0–3 short lines). If absent, we show the supportive message instead.
  const hasModelLines = Array.isArray(w.lines) && w.lines.length > 0;

  // Legacy lead + affirmation fallback (only used if no model data)
  const today = new Date().toISOString().slice(0, 10);
  const seed = `${userKey || username || "anon"}|${today}`;
  const legacyLead = pickDaily(leadPhrases, seed);

  // Affirmation text preference order:
  // 1) data.affirmation.text from model
  // 2) legacy `affirmation` prop
  // 3) placeholder "…"
  const affirmationText =
    (typeof affObj.text === "string" && affObj.text) ||
    (typeof legacyAffirmation === "string" && legacyAffirmation) ||
    "…";

  // Optional nudge (single CTA max)
  const nudge = w?.nudge || { kind: "none" };

  // ----- Actions -----
  const handleCTA = () => {
    if (!nudge || nudge.kind === "none") return;
    if (nudge.kind === "breath" && onStartBreath) {
      onStartBreath(nudge.variant === "4-7-8" ? "4-7-8" : "box");
    } else if (nudge.kind === "product" && nudge.product && onOpenProductQuickBuy) {
      onOpenProductQuickBuy(nudge.product);
    } else if (nudge.kind === "gift" && nudge.gift && onRedeemGift) {
      onRedeemGift(nudge.gift);
    }
  };

  const handleSaveAff = async () => {
    if (!onSaveAffirmation) return;
    try {
      await onSaveAffirmation(affirmationText, affObj.id);
    } catch {
      /* swallow */
    }
  };

  return (
    <section
      className=""
      style={{
        padding: 32,
        textAlign: "center",
        position: "relative",
        color: text,
      }}
    >
      {/* Streak badge pinned (original UI) */}
      <div
        title="Current streak"
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          fontSize: 14,
          border: `1px solid ${border}`,
          padding: "6px 10px",
          borderRadius: 999,
          color: text,
          opacity: 0.9,
        }}
      >
        🔥 {streak || 0}-day streak
      </div>

      {/* Greeting in gold (original UI) */}
      <h1
        style={{
          margin: 0,
          fontSize: 28,
          color: gold,
          marginBottom: 8,
        }}
      >
        {greeting}
      </h1>

      {/* When model gave lines, show those; otherwise show the supportive message (legacy). */}
      {!hasModelLines ? (
        <div style={{ opacity: 0.9, marginBottom: 20 }}>{supportiveMessage}</div>
      ) : null}

      {/* Divider (original UI) */}
      <hr
        style={{
          border: 0,
          borderTop: `1px solid ${border}`,
          opacity: 0.5,
          margin: "16px auto",
          maxWidth: 480,
        }}
      />

      {/* Welcome lines (model) OR legacy lead */}
      {hasModelLines ? (
        <div style={{ lineHeight: 1.6, opacity: 0.95, marginBottom: 10 }}>
          {w.lines.map((line, i) => (
            <p key={`l-${i}`} style={{ margin: i ? "6px 0 0" : 0 }}>
              {line}
            </p>
          ))}
        </div>
      ) : (
        <>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{legacyLead}</div>
        </>
      )}

      {/* Optional CTA (keeps your button styles) */}
      {nudge?.kind && nudge.kind !== "none" && (
        <div style={{ marginTop: 10 }}>
          <button className="btn btn-outline-gold" onClick={handleCTA}>
            {nudge.cta_label ||
              (nudge.kind === "breath"
                ? nudge.variant === "4-7-8"
                  ? "Do 4-7-8 for 60s"
                  : "Box breath for 60s"
                : nudge.kind === "product"
                ? "Quick add"
                : "Open gift")}
          </button>
        </div>
      )}

      {/* Divider (original UI) */}
      <hr
        style={{
          border: 0,
          borderTop: `1px solid ${border}`,
          opacity: 0.5,
          margin: "16px auto",
          maxWidth: 480,
        }}
      />

      {/* Affirmation heading + text (original typography) */}
      <div style={{ fontWeight: 600, marginBottom: 8 }}>
        Today’s affirmation
      </div>
      <blockquote
        style={{
          margin: 0,
          fontStyle: "italic",
          opacity: 0.95,
        }}
      >
        “{affirmationText}”
      </blockquote>

      {/* Save button only if provided (kept subtle; compact ghost) */}
{onSaveAffirmation && (
  <div
    style={{
      marginTop: 12,
      display: "flex",
      justifyContent: "center",
    }}
  >
    <button
      className="btn btn--ghost"
      onClick={handleSaveAff}
      aria-label="Save affirmation"
      style={{
        padding: "6px 12px",
        fontSize: "clamp(12px, 1.1vw, 14px)",
        lineHeight: 1.1,
        borderRadius: 999,
        opacity: 0.9,
      }}
    >
      Save affirmation
    </button>
  </div>
)}


      {/* (Optional) Provenance hint if you want: keep off by default to avoid clutter */}
      {data?.provenance?.cached ? (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>
          Loaded from today’s cache.
        </div>
      ) : null}
    </section>
  );
}
