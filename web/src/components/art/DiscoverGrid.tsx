// web/src/components/art/DiscoverGrid.tsx
import React, { useState } from 'react';
import type { Artwork } from '../../pages/Art';
import { ArtCard } from './ArtCard';

export function DiscoverGrid({ artworks, onOpen }: { artworks: Artwork[]; onOpen: (a: Artwork) => void }) {
  const [limit, setLimit] = useState(24);
  const [columns, setColumns] = useState(3);
  const cardMin = 300; // align with ProductsGrid
  const gap = 24;

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new (window as any).ResizeObserver?.((entries: any[]) => {
      const w = entries?.[0]?.contentRect?.width ?? el.clientWidth;
      const cols = Math.max(1, Math.min(4, Math.floor((w + gap) / (cardMin + gap))));
      setColumns(cols);
    }) || { observe(){}, disconnect(){} };
    try { (ro as any).observe(el); } catch {}
    // initial
    const w = el.clientWidth || 0;
    setColumns(Math.max(1, Math.min(4, Math.floor((w + gap) / (cardMin + gap)))));
    return () => { try { (ro as any).disconnect?.(); } catch {} };
  }, []);

  const visible = artworks.slice(0, limit);

  return (
    <div>
      <div
        ref={containerRef}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, ${cardMin}px)`,
          gridAutoRows: 'max-content',
          gap,
          rowGap: 24,
          justifyContent: 'start',
          alignContent: 'start',
          padding: 0,
          boxSizing: 'border-box',
          width: '100%',
          maxWidth: '100%',
          overflow: 'visible',
        }}
      >
        {visible.map(a => (
          <div key={a.id} style={{ width: cardMin }}>
            <ArtCard art={a} onOpen={onOpen} />
          </div>
        ))}
      </div>

      {visible.length < artworks.length && (
        <div style={{ textAlign: 'center', paddingTop: 16 }}>
          <button
            onClick={() => setLimit(v => v + 24)}
            className="btn btn--ghost"
            style={{ borderRadius: 999 }}
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
