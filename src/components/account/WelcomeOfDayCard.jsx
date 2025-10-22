// src/components/account/WelcomeOfDayCard.jsx
import React from "react";

/**
 * Props:
 * - data: {
 *     welcome: { greeting, lines: string[], nudge: { kind, variant, cta_label, product, gift } },
 *     affirmation: { id, text, tone },
 *     provenance: { tod, date, cached }
 *   }
 * - onStartBreath?(variant: "box"|"4-7-8"): void
 * - onOpenProductQuickBuy?(product: {id,slug,name}): void
 * - onRedeemGift?(gift: {code,label,expires_at}): void
 * - onSaveAffirmation?(text: string, id?: string): Promise<void>|void
 */
export default function WelcomeOfDayCard({
  data,
  theme = {},
  onStartBreath,
  onOpenProductQuickBuy,
  onRedeemGift,
  onSaveAffirmation,
}) {
  const w = data?.welcome || {};
  const aff = data?.affirmation || {};

  const border = theme.border || "#333";
  const gold = theme.primary || "#ffd75e";
  const text = theme.text || "#fff";

  const handleCTA = () => {
    const n = w.nudge || {};
    if (n.kind === "breath" && onStartBreath) onStartBreath(n.variant || "box");
    if (n.kind === "product" && n.product && onOpenProductQuickBuy) onOpenProductQuickBuy(n.product);
    if (n.kind === "gift" && n.gift && onRedeemGift) onRedeemGift(n.gift);
  };

  const handleSaveAff = async () => {
    if (!onSaveAffirmation) return;
    try { await onSaveAffirmation(aff.text || "", aff.id); } catch {}
  };

  return (
    <section className="surface" style={{ padding: 20, borderRadius: 14, border: `1px solid ${border}`, color: text }}>
      {/* Greeting */}
      {w.greeting ? (
        <h2 style={{ margin: "0 0 6px", fontSize: 22, color: gold }}>{w.greeting}</h2>
      ) : (
        <h2 style={{ margin: "0 0 6px", fontSize: 22, color: gold }}>Welcome back.</h2>
      )}

      {/* Lines */}
      {(Array.isArray(w.lines) && w.lines.length > 0) ? (
        <div style={{ lineHeight: 1.6, opacity: 0.95 }}>
          {w.lines.map((line, i) => <p key={`l-${i}`} style={{ margin: i ? "6px 0 0" : 0 }}>{line}</p>)}
        </div>
      ) : (
        <p style={{ margin: 0, opacity: 0.95 }}>Let’s take one gentle step today.</p>
      )}

      {/* CTA (optional, single) */}
      {w?.nudge?.kind && w.nudge.kind !== "none" && (
        <div style={{ marginTop: 10 }}>
          <button className="btn btn-outline-gold" onClick={handleCTA}>
            {w.nudge.cta_label || (w.nudge.kind === "breath"
              ? (w.nudge.variant === "4-7-8" ? "Do 4-7-8 for 60s" : "Box breath for 60s")
              : (w.nudge.kind === "product" ? "Quick add" : "Open gift"))}
          </button>
        </div>
      )}

      {/* Divider */}
      <hr style={{ border: 0, borderTop: `1px solid ${border}`, opacity: 0.5, margin: "14px 0" }} />

      {/* Affirmation */}
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Today’s affirmation</div>
      <blockquote style={{ margin: 0, fontStyle: "italic", opacity: 0.95 }}>
        “{aff?.text || "I meet today with gentle presence."}”
      </blockquote>

      {/* Save action (optional) */}
      {onSaveAffirmation && (
        <div style={{ marginTop: 10 }}>
          <button className="btn btn--ghost" onClick={handleSaveAff}>Save affirmation</button>
        </div>
      )}

      {/* Provenance hint (subtle) */}
      {data?.provenance?.cached ? (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.6 }}>Loaded from today’s cache.</div>
      ) : null}
    </section>
  );
}

