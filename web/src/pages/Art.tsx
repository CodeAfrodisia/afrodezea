// web/src/pages/Art.tsx
import React, { useMemo, useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { themes } from '../theme/rooms';
import { DiscoverGrid } from '../components/art/DiscoverGrid';
import { Immerse } from '../components/art/Immerse';
import { Admire } from '../components/art/Admire';
import { AudioToggle } from '../components/art/AudioToggle';
import { ArtModal } from '../components/art/ArtModal';
import { RoomHeader } from '../components/art/RoomHeader';
import { DiscoverSidebar, type DiscoverFilters } from '../components/art/DiscoverSidebar';

export type Mode = 'immerse' | 'discover' | 'admire';

export interface Artist {
  id: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  archetypes?: string[];
}

export type Tier = 'digital' | 'print' | 'original';

export interface Artwork {
  id: string;
  title: string;
  theme: keyof typeof themes;
  artist: Artist;
  imageUrl: string;
  shimmer?: boolean;
  tier: Tier;
  priceDesired: number; // desired artist earnings
  edition?: {
    type: 'open' | 'limited' | 'original';
    size?: number;
    remaining?: number;
  };
  story?: string;
}

function useMockArt(): Artwork[] {
  return useMemo(() => {
    const a: Artist = { id: 'a1', name: 'Afrodezea Studio', archetypes: ['Curated'], avatarUrl: '/art/artist-default.png' };
    return Object.keys(themes).flatMap((k) => {
      const themeKey = k as keyof typeof themes;
      return [0,1,2].map((n) => ({
        id: `${themeKey}-${n}`,
        title: `${k} — Piece ${n+1}`,
        theme: themeKey,
        artist: a,
        imageUrl: `/art/placeholders/${themeKey}-${(n%3)+1}.jpg`,
        tier: n === 0 ? 'digital' : n === 1 ? 'print' : 'original',
        priceDesired: n === 2 ? 1400 : n === 1 ? 300 : 75,
        edition: n === 2 ? { type: 'original' } : n === 1 ? { type: 'limited', size: 50, remaining: 37 } : { type: 'open' },
        story: 'Inspired by Afrodezea\'s Afrodisia soundscape.'
      } as Artwork));
    });
  }, []);
}

export default function ArtPage() {
  const [mode, setMode] = useState<Mode>('discover');
  const art = useMockArt();
  const [active, setActive] = useState<Artwork | null>(null);

  // Discover filters state
  const [filters, setFilters] = useState<DiscoverFilters>({
    q: '',
    room: 'All',
    tiers: new Set(['digital','print','original']),
    sort: 'featured',
    availableOnly: false,
  } as DiscoverFilters);

  const filtered = useMemo(() => {
    let list = art.filter((a) => {
      const okRoom = filters.room === 'All' || a.theme === filters.room;
      const okTier = filters.tiers.has(a.tier);
      const q = filters.q.trim().toLowerCase();
      const okQ = !q || a.title.toLowerCase().includes(q) || a.artist.name.toLowerCase().includes(q);
      const okAvail = !filters.availableOnly || (a.edition?.type === 'open' || a.edition?.type === 'original' || (a.edition?.remaining ?? 0) > 0);
      return okRoom && okTier && okQ && okAvail;
    });
    if (filters.sort === 'price-asc') list = list.slice().sort((a,b)=> (a.priceDesired||0)-(b.priceDesired||0));
    if (filters.sort === 'price-desc') list = list.slice().sort((a,b)=> (b.priceDesired||0)-(a.priceDesired||0));
    // newest/featured keep mock order
    return list;
  }, [art, filters]);

  // keyboard ESC to close modal
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setActive(null);
  }, []);
  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const headerRoom = mode === 'discover' ? filters.room : 'All';

  // responsive like ProductsPage
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new (window as any).ResizeObserver?.((entries: any[]) => {
      const w = entries?.[0]?.contentRect?.width ?? el.clientWidth;
      setIsNarrow(w < 900);
    }) || { observe(){}, disconnect(){} };
    try { (ro as any).observe(el); } catch {}
    // initial
    setIsNarrow((el.clientWidth || 0) < 900);
    return () => { try { (ro as any).disconnect?.(); } catch {} };
  }, []);

  return (
    <div
      ref={frameRef}
      style={{
        /* Match ProductsPage frame */
        padding: 24,
        paddingBottom: 'calc(var(--footer-height, 0px) + 16px)',
        width: '100%',
        maxWidth: '1440px',
        margin: '0 auto',
      }}
    >
      {/* Top tabs (reuse global tabs styling) */}
      <div className="tabsbar" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div className="ui-tabs" style={{ borderBottom: 'none', padding: 0 }}>
          <button className="ui-tabs__btn" data-selected={mode==='immerse'} onClick={() => setMode('immerse')}>Immerse</button>
          <button className="ui-tabs__btn" data-selected={mode==='discover'} onClick={() => setMode('discover')}>Discover</button>
          <button className="ui-tabs__btn" data-selected={mode==='admire'} onClick={() => setMode('admire')}>Admire</button>
        </div>
        <div style={{ alignSelf: 'center' }}>
          <AudioToggle />
        </div>
      </div>

      {/* Context header beneath tabs */}
      <div style={{ marginTop: 12 }}>
        <RoomHeader room={headerRoom as any} />
      </div>

      {/* Views */}
      {mode === 'immerse' && (
        <div style={{ marginTop: 16 }}>
          <Immerse artworks={art} onOpen={setActive} />
        </div>
      )}

      {mode === 'discover' && (
        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: isNarrow ? '1fr' : '280px minmax(0, 1fr)',
            gap: 24,
            alignItems: 'start',
          }}
        >
          {/* Sidebar (same structure as ProductsPage) */}
          <aside
            style={{
              position: isNarrow ? 'static' : 'sticky',
              top: isNarrow ? undefined : 'calc(var(--topnav-h, 64px) + 16px)',
              alignSelf: 'start',
              maxHeight: isNarrow ? 'none' : 'calc(var(--vh) - 16px - 16px - 1px)',
              overflow: isNarrow ? 'visible' : 'auto',
              zIndex: 2,
            }}
          >
            <DiscoverSidebar value={filters} onChange={setFilters} />
          </aside>

          {/* Content */}
          <main
            style={{
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              overflowX: 'clip',
              overflowY: 'visible',
              zIndex: 1,
            }}
          >
            <section style={{ position: 'relative', flex: '1 1 auto' }}>
              <DiscoverGrid artworks={filtered} onOpen={setActive} />
            </section>
          </main>
        </div>
      )}

      {mode === 'admire' && (
        <div style={{ marginTop: 16 }}>
          <Admire artworks={art} active={active} setActive={setActive} />
        </div>
      )}

      {active && <ArtModal art={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function Tab({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="transition"
      style={{
        padding: '0.5rem 1rem',
        borderRadius: 999,
        border: active ? '1px solid transparent' : '1px solid var(--afro-gold)',
        background: active ? 'var(--afro-gold)' : 'transparent',
        color: active ? 'var(--afro-charcoal)' : 'var(--afro-ivory)'
      }}
    >
      {label}
    </button>
  );
}
