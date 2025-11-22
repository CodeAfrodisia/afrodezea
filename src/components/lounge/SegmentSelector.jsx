import React from "react";
import segments from "@pages/../mocks/lounge/segments.json";

export default function SegmentSelector({ onSelect }) {
  const handleClick = (key) => {
    if (onSelect) onSelect(key);
    // stub: would switch the radio stream/segment
    console.log("Switch segment →", key);
  };

  return (
    <section className="ui-section" aria-label="Segment Selector">
      <div className="container" style={{ padding: 16 }}>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))' }} className="segment-grid">
          {segments.map((s) => (
            <article key={s.key} className="ui-card segment-card" onClick={() => handleClick(s.key)} style={{ cursor: 'pointer', borderRadius: 14, overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'relative', minHeight: 160, background: `url(${s.image}) center/cover no-repeat` }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.1), rgba(0,0,0,.6))' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'grid', alignContent: 'end', padding: 16, color: '#F7F4ED' }}>
                  <h3 style={{ margin: 0, color: 'var(--brand-gold)' }}>{s.title}</h3>
                  <p style={{ margin: '4px 0 0', opacity: .9 }}>{s.description}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
