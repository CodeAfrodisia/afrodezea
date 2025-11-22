// web/src/pages/Vault.tsx
import React, { useMemo, useState } from 'react';
import type { Artwork } from './Art';
import { DiscoverGrid } from '../components/art/DiscoverGrid';
import { Admire } from '../components/art/Admire';
import { SafeImage } from '../components/common/SafeImage';

export default function VaultPage() {
  const [active, setActive] = useState<Artwork | null>(null);
  const owned = useMockOwned();

  const featured = owned[0];

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-serif text-amber-200">Your Vault</h1>
      </header>

      {/* Featured Piece */}
      <section className="rounded-xl border border-white/10 bg-gradient-to-br from-amber-900/10 to-neutral-900/40 overflow-hidden">
        {featured ? (
          <div className="grid grid-cols-1 md:grid-cols-3">
            <div className="relative md:col-span-2 h-56 md:h-72">
              <SafeImage src={featured.imageUrl} alt={featured.title} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 shimmer-overlay" />
              <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                <div className="text-amber-100 font-medium">{featured.title}</div>
                <div className="text-xs text-amber-200/80">Last acquired — Play track pairing</div>
              </div>
            </div>
            <div className="p-4 space-y-2">
              <div className="text-sm text-amber-100/90">Featured Piece</div>
              <button className="rounded-md bg-amber-500 text-black px-3 py-2 text-sm hover:bg-amber-400">Play pairing</button>
              <button className="rounded-md border border-white/20 px-3 py-2 text-xs hover:bg-white/10">Admire Mode</button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-amber-200/80">
            Your vault is quiet for now. Collect your first piece and we’ll light it here.
          </div>
        )}
      </section>

      {/* My Collection */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-amber-200">My Collection</h2>
          <div className="text-xs text-amber-200/70">Filters coming soon</div>
        </div>
        <DiscoverGrid artworks={owned} onOpen={setActive} />
      </section>

      {/* Admire Mode */}
      <section className="space-y-2">
        <h2 className="font-medium text-amber-200">Admire Mode</h2>
        <Admire artworks={owned} active={active} setActive={setActive} />
      </section>

      {/* Certificates */}
      <section className="space-y-2">
        <h2 className="font-medium text-amber-200">Certificates</h2>
        <div className="rounded-lg border border-white/10 p-3 text-sm text-amber-200/80">
          View and download your Certificates of Authenticity after fulfillment. Public verification will be available at /verify/AFD-2025-000124.
        </div>
      </section>
    </div>
  );
}

function useMockOwned(): Artwork[] {
  // simple reuse of placeholders
  const a = useMemo(() => {
    return [
      {
        id: 'owned-1',
        title: 'Afrodisia — Featured',
        theme: 'Afrodisia' as any,
        artist: { id: 'a1', name: 'Afrodezea Studio' },
        imageUrl: '/art/placeholders/Afrodisia-1.jpg',
        tier: 'digital' as const,
        priceDesired: 75,
        edition: { type: 'open' as const },
      },
      {
        id: 'owned-2',
        title: 'Deeper — Meditation',
        theme: 'Deeper' as any,
        artist: { id: 'a1', name: 'Afrodezea Studio' },
        imageUrl: '/art/placeholders/Deeper-2.jpg',
        tier: 'print' as const,
        priceDesired: 300,
        edition: { type: 'limited' as const, size: 50, remaining: 37 },
      },
      {
        id: 'owned-3',
        title: 'Genesis — Awakening',
        theme: 'Genesis' as any,
        artist: { id: 'a1', name: 'Afrodezea Studio' },
        imageUrl: '/art/placeholders/Genesis-1.jpg',
        tier: 'original' as const,
        priceDesired: 1400,
        edition: { type: 'original' as const },
      },
    ];
  }, []);
  return a as any;
}
