// web/src/components/art/ArtCard.tsx
import React from 'react';
import type { Artwork } from '../../pages/Art';
import { TierBadge } from './TierBadge';
import { SafeImage } from '../common/SafeImage';

export function ArtCard({ art, onOpen }: { art: Artwork; onOpen: (a: Artwork) => void }) {
  const tagline = art.story || '';
  return (
    <div
      className="card shimmer-hover"
      style={{
        minWidth: 0,
        boxSizing: 'border-box',
        border: '1px solid #222',
        borderRadius: 16,
        overflow: 'hidden',
        background: '#121212',
        position: 'relative',
      }}
    >
      {/* Clickable image area */}
      <button onClick={() => onOpen(art)} style={{ display: 'block', width: '100%', cursor: 'pointer' }}>
        <div className="relative overflow-hidden" style={{ aspectRatio: '4 / 5', background: '#0a0a0a' }}>
          <SafeImage
            src={art.imageUrl}
            alt={art.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 pointer-events-none shimmer-overlay" />
        </div>
      </button>

      {/* Body */}
      <div style={{ padding: 14 }}>
        <div className="line-clamp-1" style={{ fontWeight: 700, lineHeight: 1.25, color: '#eee' }}>
          {art.title}
        </div>
        <div className="line-clamp-1" style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
          {art.artist.name}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 10 }}>
          <TierBadge tier={art.tier} />
          <div className="price" style={{ color: 'var(--brand-gold-500, #D4AF37)', fontWeight: 700 }}>
            ${art.priceDesired}
          </div>
        </div>

        {!!tagline && (
          <div className="line-clamp-1" style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
            {tagline}
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <button
            className="btn btn--ghost"
            style={{ width: '100%', borderRadius: 10 }}
            onClick={() => onOpen(art)}
            aria-label={`Open ${art.title}`}
            title="Open"
          >
            View Art
          </button>
        </div>
      </div>
    </div>
  );
}
