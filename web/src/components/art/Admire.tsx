// web/src/components/art/Admire.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Artwork } from '../../pages/Art';

export function Admire({ artworks, active, setActive }: { artworks: Artwork[]; active: Artwork | null; setActive: (a: Artwork | null) => void }) {
  const [index, setIndex] = useState(0);
  const list = useMemo(() => artworks, [artworks]);

  useEffect(() => {
    if (active) {
      const idx = list.findIndex(a => a.id === active.id);
      if (idx >= 0) setIndex(idx);
    }
  }, [active, list]);

  const go = useCallback((dir: number) => {
    setIndex((i) => (i + dir + list.length) % list.length);
  }, [list.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'Escape') setActive(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, setActive]);

  const current = list[index];
  if (!current) return <div className="text-amber-200/80 text-sm">No artwork selected.</div>;

  return (
    <div className="relative h-[70vh] w-full overflow-hidden rounded-xl border border-white/10 bg-black">
      <SafeImage src={current.imageUrl} alt={current.title} className="absolute inset-0 h-full w-full object-contain" />
      <div className="absolute inset-0 shimmer-overlay" />
      <div className="absolute inset-x-0 top-0 p-3 text-center text-xs text-amber-200/80">Use ← → to cycle · ESC to exit</div>
      <button onClick={() => go(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-sm hover:bg-white/20">←</button>
      <button onClick={() => go(1)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-sm hover:bg-white/20">→</button>
      <div className="absolute inset-x-0 bottom-0 p-3 text-center text-amber-100/90 bg-gradient-to-t from-black/60 to-transparent">{current.title}</div>
    </div>
  );
}
