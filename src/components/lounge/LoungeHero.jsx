import React from "react";

export default function LoungeHero() {
  return (
    <section className="ui-section hero-section" aria-label="Jenn Lounge Hero" style={{
      background: "linear-gradient(135deg, #0F0F10 0%, #2a1f0a 60%, rgba(212,175,55,0.18) 100%)",
      minHeight: 320, display: 'grid', placeItems: 'center', textAlign: 'center', position: 'relative', overflow: 'hidden'
    }}>
      <div className="container" style={{ padding: '32px 16px' }}>
        <div className="lounge-hero-shimmer" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(80% 60% at 50% 10%, rgba(212,175,55,0.08), transparent 60%)', pointerEvents: 'none', animation: 'shimmerFade 8s infinite ease-in-out' }} />
        <img src="/logo-afrodezea.svg" alt="Afrodezea" style={{ width: 72, height: 72, objectFit: 'contain', opacity: .95 }} />
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', letterSpacing: 3, margin: '12px 0 4px', color: 'var(--brand-gold, #D4AF37)' }}>JENN LOUNGE</h1>
        <p style={{ color: 'rgba(247,244,237,.9)' }}>
          "A sanctuary of sound. A home for your heart."
        </p>
      </div>
      {/* local keyframes to avoid touching global css */}
      <style>{`
        @keyframes shimmerFade { 0%,100%{opacity:.55} 50%{opacity:1} }
      `}</style>
    </section>
  );
}
