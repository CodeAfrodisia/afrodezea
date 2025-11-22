import React from "react";
import data from "@pages/../mocks/lounge/nowPlaying.json";

export default function NowPlayingBar() {
  const { albumArt, title, artist, segment } = data || {};
  return (
    <section className="ui-section" aria-label="Now Playing" style={{ background: "var(--c-surface-2)", marginTop: 16 }}>
      <div className="container" style={{ padding: 12 }}>
        <div className="now-playing-bar" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center' }}>
          <img src={albumArt} alt={title} width={60} height={60} style={{ width:60, height:60, borderRadius: 8, objectFit: 'cover', boxShadow: '0 6px 18px rgba(0,0,0,.3)' }} />
          <div style={{ display:'grid', gap:4 }}>
            <div style={{ fontWeight:600 }}>{title} <span style={{ opacity:.8 }}>— {artist}</span></div>
            <div style={{ color: 'var(--brand-gold)' }}>{segment}</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-outline-gold" title="Favorite" aria-label="Favorite">♥</button>
            <button className="btn btn-outline-gold" title="Volume" aria-label="Volume">🔊</button>
            <button className="btn btn-outline-gold" title="Info" aria-label="Info">i</button>
          </div>
        </div>
      </div>
    </section>
  );
}
