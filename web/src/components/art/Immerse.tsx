// web/src/components/art/Immerse.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Artwork } from '../../pages/Art';
import { themes } from '../../theme/rooms';

export function Immerse({ artworks, onOpen }: { artworks: Artwork[]; onOpen: (a: Artwork) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [roomIndex, setRoomIndex] = useState(0);

  const rooms = useMemo(() => Object.keys(themes) as (keyof typeof themes)[], []);
  const byRoom = useMemo(() => {
    const map: Record<string, Artwork[]> = {};
    for (const key of rooms) map[key] = [];
    artworks.forEach(a => { (map[a.theme] ||= []).push(a); });
    return map;
  }, [artworks, rooms]);

  // simple scroll-based breadcrumb of current room
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const w = el.scrollWidth; const vw = el.clientWidth; const x = el.scrollLeft;
      const per = x / (w - vw + 1e-6);
      const idx = Math.min(rooms.length - 1, Math.max(0, Math.floor(per * rooms.length)));
      setRoomIndex(idx);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [rooms.length]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="text-amber-200/80">Room: <span className="text-amber-300 font-medium">{rooms[roomIndex]}</span></div>
        <MiniMap count={rooms.length} active={roomIndex} />
      </div>
      <div ref={containerRef} className="relative overflow-x-auto overflow-y-hidden whitespace-nowrap rounded-xl border border-white/10 bg-black/30">
        {rooms.map((rk, i) => (
          <Room key={rk} roomKey={rk} index={i} artworks={byRoom[rk] || []} onOpen={onOpen} />
        ))}
        <Lounge />
      </div>
    </div>
  );
}

function Room({ roomKey, index, artworks, onOpen }: { roomKey: keyof typeof themes; index: number; artworks: Artwork[]; onOpen: (a: Artwork) => void }) {
  const theme = themes[roomKey];
  return (
    <section
      aria-label={roomKey}
      className="inline-block align-top w-[85vw] sm:w-[70vw] lg:w-[60vw] h-[60vh] relative"
      style={{ background: `linear-gradient(135deg, ${theme.palette[0]}22, transparent)`, boxShadow: 'inset 0 0 80px rgba(0,0,0,0.4)' }}
    >
      <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 20% 30%, ${theme.palette[1]}18, transparent 60%)` }} />
      <header className="p-3 flex items-center justify-between">
        <h3 className="font-serif text-amber-200 drop-shadow">{roomKey}</h3>
        <span className="text-[11px] text-amber-100/70">{theme.description}</span>
      </header>
      <div className="relative h-[calc(100%-48px)]">
        <div className="absolute inset-0 pointer-events-none shimmer-overlay" />
        <div className="absolute inset-0 grid grid-cols-2 md:grid-cols-3 gap-3 p-3">
          {artworks.slice(0,6).map(a => (
            <button key={a.id} className="group relative overflow-hidden rounded-lg border border-white/10 bg-neutral-900/40" onClick={() => onOpen(a)}>
              <SafeImage src={a.imageUrl} alt={a.title} className="h-full w-full object-cover group-hover:scale-105 transition" />
              <div className="absolute inset-0 shimmer-overlay" />
              <div className="absolute bottom-0 inset-x-0 p-2 text-[11px] bg-gradient-to-t from-black/60 to-transparent text-amber-100/90">{a.title}</div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Lounge() {
  return (
    <section className="inline-block align-top w-[85vw] sm:w-[70vw] lg:w-[60vw] h-[60vh] relative bg-gradient-to-br from-amber-900/20 via-rose-900/10 to-neutral-900/40 border-l border-white/10">
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 80% 40%, rgba(255,200,150,0.12), transparent 60%)' }} />
      <div className="absolute inset-0 p-6 flex flex-col items-start justify-end gap-3">
        <h3 className="text-amber-200 text-xl font-serif">Lounge</h3>
        <div className="text-amber-100/80 text-sm">Now Playing: Afrodezea Radio</div>
        <div className="text-amber-200/80 text-xs">Sit & Listen — camera pans around the space.</div>
        <a href="/radio" className="rounded-full bg-amber-500 text-black px-4 py-2 text-sm hover:bg-amber-400">Enter Radio Mode</a>
        <div className="absolute top-6 right-6 w-24 h-24 rounded-full blur-2xl" style={{ background: 'radial-gradient(circle, rgba(255,200,150,0.2), transparent 70%)' }} />
        <div className="absolute bottom-6 right-10 w-16 h-16 rounded-full blur-xl" style={{ background: 'radial-gradient(circle, rgba(255,230,200,0.25), transparent 70%)' }} />
      </div>
    </section>
  );
}

function MiniMap({ count, active }: { count: number; active: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: count + 1 /* lounge */ }).map((_, i) => (
        <span key={i} className={`h-1.5 w-6 rounded-full ${i===active ? 'bg-amber-400' : 'bg-white/20'}`} />
      ))}
    </div>
  );
}
