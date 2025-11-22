import React from "react";
import { Link } from "react-router-dom";

export default function EnterLoungeCTA() {
  return (
    <section className="ui-section" aria-label="Enter the Lounge">
      <div className="container" style={{ padding: 24 }}>
        <div className="cta-banner" style={{
          borderRadius: 16,
          padding: 32,
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(75, 14, 53, .75), rgba(20,20,22,.9))',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div aria-hidden style={{ position: 'absolute', inset: -40, background: 'radial-gradient(600px 240px at 50% -10%, rgba(212,175,55,.2), transparent 60%)' }} />
          <h3 style={{ color: 'var(--brand-gold)', margin: '0 0 6px' }}>Enter the Jenn Lounge</h3>
          <p style={{ margin: 0, opacity: .95, color: '#F7F4ED' }}>A virtual sanctuary of music and mood.</p>
          <div style={{ marginTop: 14 }}>
            <Link className="btn btn-outline-gold" to="/lounge/immersive">Enter</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
