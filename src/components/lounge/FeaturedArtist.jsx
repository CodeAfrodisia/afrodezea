import React from "react";
import artist from "@pages/../mocks/lounge/featuredArtist.json";

export default function FeaturedArtist() {
  const { image, name, badge, description } = artist || {};
  return (
    <section className="ui-section" aria-label="Featured Artist">
      <div className="container" style={{ padding: 16 }}>
        <article className="ui-card artist-spotlight" style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(220px, 360px) 1fr', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', inset: -12, background: 'radial-gradient(240px 180px at 40% 40%, rgba(212,175,55,.18), transparent 70%)', filter: 'blur(8px)', zIndex: 0 }} />
            <img src={image} alt={name} style={{ position: 'relative', zIndex: 1, width: '100%', borderRadius: 12, objectFit: 'cover', aspectRatio: '4 / 3', boxShadow: '0 20px 40px rgba(0,0,0,.35)' }} />
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {badge && <span className="chip" style={{ color: 'var(--brand-gold)' }}>{badge}</span>}
            <h3 style={{ margin: 0 }}>{name}</h3>
            <p style={{ marginTop: 4, opacity: .9 }}>{description}</p>
            <div style={{ marginTop: 8 }}>
              <button className="btn btn-outline-gold">View Artist</button>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
