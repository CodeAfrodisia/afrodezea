// src/components/profile/PersonalInsightsPanel.jsx
import React from "react";

export default function PersonalInsightsPanel({ insights }) {
  if (!insights) return null;

  const arche = insights.archetype;
  const doms = insights.domains || {};
  const weaving = insights.weaving;

  const renderDomain = (key) => {
    const d = doms[key];
    if (!d) return null;
    return (
      <div key={key} className="surface" style={{ padding: 12 }}>
        <h4 style={{ marginTop: 0, textTransform: "capitalize" }}>{key}</h4>
        <p><strong>Strength:</strong> {d.strength}</p>
        <p><strong>Shadow:</strong> {d.shadow}</p>
        {/* stress may contain bold/italics; render safely */}
        <p dangerouslySetInnerHTML={{ __html: d.stress }} />
        <p>
          <strong>Micro-practice (~{d?.micro_practice?.minutes} min):</strong>{" "}
          {d?.micro_practice?.text}
        </p>
        <p><strong>Partner script:</strong> {d.partner_script}</p>
        {d.deep_link && (
          <div style={{ marginTop: 6 }}>
            <button className="btn btn--ghost">{d.deep_link}</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <section style={{ display: "grid", gap: 12 }}>
      {/* Archetype ribbon */}
      {(arche?.title || arche?.ribbon) && (
        <div className="surface" style={{ padding: 12 }}>
          {arche?.title && <strong>{arche.title}</strong>}
          {arche?.ribbon && <p style={{ margin: "6px 0" }}>{arche.ribbon}</p>}
        </div>
      )}

      {/* Domains */}
      {["giving","receiving","apology","forgiveness","attachment"].map(renderDomain)}

      {/* Weaving */}
      {weaving && (
        <div className="surface" style={{ padding: 12 }}>
          <h4 style={{ marginTop: 0 }}>Weaving the threads</h4>
          {Array.isArray(weaving.principles) && (
            <ul>{weaving.principles.map((p,i)=><li key={i}>{p}</li>)}</ul>
          )}
          {Array.isArray(weaving.experiment_7day) && (
            <div style={{ marginTop: 6 }}>
              <strong>7-day experiment:</strong>
              <ul>{weaving.experiment_7day.map((p,i)=><li key={i}>{p}</li>)}</ul>
            </div>
          )}
          {Array.isArray(weaving.notes) && weaving.notes.length > 0 && (
            <div style={{ marginTop: 6, opacity: 0.9 }}>
              {weaving.notes.map((n,i)=><div key={i}>{n}</div>)}
            </div>
          )}
        </div>
      )}

      {/* Optional answer-level one-liners */}
      {Array.isArray(insights.inserts) && insights.inserts.length > 0 && (
        <div className="surface" style={{ padding: 12 }}>
          <h4 style={{ marginTop: 0 }}>Personalized notes</h4>
          <ul>
            {insights.inserts.map((it, i) => (
              <li key={i}><em>{it.domain}:</em> {it.text}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

