import React from "react";

export default function AlbumShowcase() {
  return (
    <section className="ui-section" aria-label="Afrodisia Album Showcase" style={{ background: 'var(--c-surface-2)' }}>
      <div className="container" style={{ padding: 20 }}>
        <div className="album-showcase" style={{ display: 'grid', gap: 24, gridTemplateColumns: 'minmax(200px, 360px) 1fr', alignItems: 'center' }}>
          <div>
            <img src="/cover-afrodisia.jpg" alt="Afrodisia Album Cover" style={{ width: '100%', borderRadius: 12, boxShadow: '0 24px 48px rgba(0,0,0,.35)' }} />
          </div>
          <div>
            <h3 style={{ marginTop: 0, color: 'var(--brand-gold)' }}>Afrodisia</h3>
            <p style={{ opacity: .9 }}>A love-letter to velvet nights and slow-burning dawns. The official Afrodezea album — crafted for deep listening and gentle becoming.</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
              <a className="btn btn-outline-gold" href="/products/afrodisia-digital">Digital Copy</a>
              <a className="btn btn-outline-gold" href="/products/afrodisia-cd">Physical CD</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
