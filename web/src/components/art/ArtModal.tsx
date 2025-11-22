// web/src/components/art/ArtModal.tsx
import React, { useMemo, useState } from 'react';
import type { Artwork } from '../../pages/Art';
import { calcCommission, tierLabels } from '../../theme/rooms';
import { SafeImage } from '../common/SafeImage';

export function ArtModal({ art, onClose }: { art: Artwork; onClose: () => void }) {
  const [tab, setTab] = useState<'details' | 'story' | 'edition' | 'artist'>('details');
  const { commission, total, rate } = useMemo(() => calcCommission(art.tier, art.priceDesired), [art]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal>
      <div className="relative w-full max-w-3xl overflow-hidden rounded-xl border border-white/10 bg-neutral-950 shadow-2xl">
        <button className="absolute right-3 top-3 rounded-full bg-white/10 px-2 py-1 text-xs hover:bg-white/20" onClick={onClose}>
          ESC
        </button>
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="relative">
            <SafeImage src={art.imageUrl} alt={art.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 shimmer-overlay" />
          </div>
          <div className="p-4 space-y-3">
            <h3 className="text-lg font-semibold text-amber-100">{art.title}</h3>
            <Tabs value={tab} onChange={setTab} />

            {tab === 'details' && (
              <div className="space-y-2 text-sm">
                <div className="text-amber-200/90">{tierLabels[art.tier]}</div>
                <div className="text-amber-100">Price breakdown</div>
                <div className="text-amber-200/80">Artist earnings: ${art.priceDesired}</div>
                <div className="text-amber-200/80">Afrodezea commission ({Math.round(rate*100)}%): ${commission}</div>
                <div className="font-medium text-amber-300">Total: ${total}</div>
                <div className="pt-3 flex gap-2">
                  {art.tier === 'digital' ? (
                    <button className="rounded-md bg-emerald-500 px-3 py-2 text-black hover:bg-emerald-400">Add to Vault</button>
                  ) : (
                    <button className="rounded-md bg-amber-500 px-3 py-2 text-black hover:bg-amber-400">Add to Cart</button>
                  )}
                  <button className="rounded-md border border-white/20 px-3 py-2 hover:bg-white/10">Preview Overlay</button>
                </div>
              </div>
            )}

            {tab === 'story' && (
              <div className="text-sm text-amber-100/90 space-y-2">
                <p>{art.story ?? 'Artist reflection coming soon.'}</p>
                <button className="rounded-md border border-white/20 px-3 py-2 text-xs hover:bg-white/10">Play “In their words”</button>
              </div>
            )}

            {tab === 'edition' && (
              <div className="text-sm text-amber-100/90 space-y-2">
                <p>Edition type: <strong className="text-amber-300">{art.edition?.type ?? 'open'}</strong></p>
                {!!art.edition?.size && (
                  <p>Edition size: {art.edition.size} • Remaining: {art.edition.remaining ?? '—'}</p>
                )}
                <p className="text-amber-200/80">Certificate of Authenticity is generated upon fulfillment.</p>
              </div>
            )}

            {tab === 'artist' && (
              <div className="text-sm text-amber-100/90 space-y-2">
                <div className="flex items-center gap-3">
                  <img src={art.artist.avatarUrl} alt="avatar" className="h-10 w-10 rounded-full object-cover" />
                  <div>
                    <div className="font-medium">{art.artist.name}</div>
                    <div className="text-amber-200/70 text-xs">{art.artist.archetypes?.join(' · ')}</div>
                  </div>
                </div>
                <button className="rounded-md border border-white/20 px-3 py-2 text-xs hover:bg-white/10">View all works by this artist</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Tabs({ value, onChange }: { value: string; onChange: (v: any) => void }) {
  const Item = (v: string, label: string) => (
    <button
      key={v}
      onClick={() => onChange(v)}
      className={`px-3 py-1 rounded-full text-xs border ${value===v ? 'bg-amber-500 text-black border-transparent' : 'border-white/15 hover:bg-white/10'}`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex flex-wrap gap-2">
      {Item('details', 'Details')}
      {Item('story', 'Story')}
      {Item('edition', 'Edition Info')}
      {Item('artist', 'Artist')}
    </div>
  );
}
