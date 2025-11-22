import React, { useEffect, useState } from "react";
import affirmations from "@pages/../mocks/lounge/affirmations.json";

export default function SelfLoveStrip() {
  const [idx, setIdx] = useState(0);
  const total = affirmations.length;

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % total), 12000);
    return () => clearInterval(id);
  }, [total]);

  const prev = () => setIdx((i) => (i - 1 + total) % total);
  const next = () => setIdx((i) => (i + 1) % total);

  return (
    <section className="ui-section self-love-strip" aria-label="Self Love Notes">
      <div className="container" style={{ padding: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-outline-gold" aria-label="Previous" onClick={prev}>‹</button>
          <div style={{ position: 'relative', minHeight: 32, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
            {affirmations.map((text, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  transition: 'opacity 600ms ease',
                  opacity: idx === i ? 1 : 0,
                  willChange: 'opacity'
                }}
                aria-hidden={idx !== i}
              >
                <span style={{ color: 'var(--brand-gold)' }}>{text}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-outline-gold" aria-label="Next" onClick={next}>›</button>
        </div>
      </div>
    </section>
  );
}
