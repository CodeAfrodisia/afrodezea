// src/components/account/SoulProfileContainer.jsx
import React, { memo, useMemo } from "react";

/** Simple list box (kept for "Patterns I Noticed") */
const Box = memo(function Box({ title, items }) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  return (
    <div className="plate plate--charcoal" style={{ padding: 14, borderRadius: 12 }}>
      <div className="section-title" style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <span className="rule" />
      </div>
      {list.length ? (
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          {list.map((t, i) => <li key={`${title}-${i}`}>{t}</li>)}
        </ul>
      ) : (
        <div style={{ opacity: 0.75 }}>No items yet.</div>
      )}
    </div>
  );
});

/** Extract "Architect × Warrior" from "Archetype-Dual (Architect × Warrior)" */
function titleFromSources(src) {
  if (!src) return null;
  const m = String(src).match(/\((.+?)\)/);
  return m?.[1] || null;
}

function BulletSection({ title, items }) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return null;
  return (
    <div className="plate plate--charcoal" style={{ padding: 14, borderRadius: 12 }}>
      <div className="section-title" style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <span className="rule" />
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
        {list.map((t, i) => <li key={`${title}-${i}`}>{t}</li>)}
      </ul>
    </div>
  );
}

function SoulProfileContainer({ userId, adi }) {
  // Accept either full response or insights payload
  const data = useMemo(() => (adi?.insights || adi) ?? null, [adi]);

  // Header bits
  const title =
    data?.title || titleFromSources(data?.sources?.archetype) || "Archetype";
  const ribbon = typeof data?.ribbon === "string" ? data.ribbon : "";

  // Canonical sections (for fallbacks)
  const comp = data?.compatibility || null;
  const conflict = data?.conflict || null;
  const selfCare = data?.self_care || null;

  // Prefer concise bullets if present
  const bullets = data?.bullets || {};
  const weave = data?.weave || {};

  // Build bullet lists with graceful fallbacks
  const highlights =
    bullets.highlights ||
    weave.highlights ||
    (Array.isArray(data?.patterns) ? data.patterns : []);

  const watchouts =
    bullets.watchouts ||
    weave.watchouts ||
    [];

  const crossLanguage =
    bullets.cross_language ||
    weave.cross_language ||
    [];

  const tensions =
    bullets.tensions ||
    weave.tensions ||
    [];

  const compatFits =
    bullets.compatibility_fits ||
    (Array.isArray(comp?.natural_fits)
      ? comp.natural_fits.map((f) => `${f.pair} — ${f.why}`)
      : []);

  const compatFriction =
    bullets.compatibility_friction ||
    (Array.isArray(comp?.likely_friction)
      ? comp.likely_friction.map((f) => `${f.pair} — ${f.why}`)
      : []);

  const conflictScripts =
    bullets.conflict_scripts ||
    (Array.isArray(conflict?.scripts) ? conflict.scripts : []);

  const microPractices =
    bullets.micro_practices ||
    (Array.isArray(selfCare?.micro_practices) ? selfCare.micro_practices : []);

  // Nothing to show yet
  if (!data) {
    return (
      <div className="plate plate--charcoal" style={{ padding: 16, borderRadius: 12 }}>
        We’ll generate your archetype insight as soon as your signals are ready.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Header */}
      <div>
        <h3 style={{ margin: "0 0 4px" }}>{title}</h3>
        {ribbon ? <div style={{ opacity: 0.85, fontSize: 14 }}>{ribbon}</div> : null}
      </div>

      {/* BULLETS-ONLY GRID */}
      <div
        className="unbox"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        <BulletSection title="Highlights" items={highlights} />
        <BulletSection title="Watch-outs" items={watchouts} />
        <BulletSection title="Cross-language notes" items={crossLanguage} />
        <BulletSection title="Tender tensions" items={tensions} />
        <BulletSection title="Compatibility — Natural Fits" items={compatFits} />
        <BulletSection title="Compatibility — Likely Friction" items={compatFriction} />
        <BulletSection title="Conflict — Scripts" items={conflictScripts} />
        <BulletSection title="Self-Care — Micro-practices" items={microPractices} />
      </div>

      {/* Sources */}
      {data?.sources && (
        <div style={{ opacity: 0.7, fontSize: ".9em" }}>
          <div><strong>Sources</strong></div>
          {data.sources.archetype && <div>Archetype: {data.sources.archetype}</div>}
          {Array.isArray(data.sources.signals) && data.sources.signals.length > 0 && (
            <div>Signals: {data.sources.signals.join(", ")}</div>
          )}
          {data.sources.checkins && <div>Check-ins: {data.sources.checkins}</div>}
          {data.sources.journals && <div>Journals: {data.sources.journals}</div>}
        </div>
      )}
    </div>
  );
}

export default memo(SoulProfileContainer, (a, b) => a.userId === b.userId && a.adi === b.adi);
