// web/src/pages/ArtistUpload.tsx
import React, { useMemo, useState } from 'react';
import { calcCommission, themes } from '../theme/rooms';
import { SafeImage } from '../components/common/SafeImage';

export default function ArtistUploadPage() {
  const [title, setTitle] = useState('Untitled');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState<keyof typeof themes>('Afrodisia');
  const [tier, setTier] = useState<'digital'|'print'|'original'>('digital');
  const [desired, setDesired] = useState<number>(75);
  const [editionSize, setEditionSize] = useState<number>(50);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [fulfillment, setFulfillment] = useState<'digital'|'afrodezea_print'|'artist_ships'>('digital');
  const [agree, setAgree] = useState(false);

  const price = useMemo(() => calcCommission(tier, Number.isFinite(desired) ? desired : 0), [tier, desired]);

  const canSubmit = agree && title.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[ArtistUpload] submit mock', { title, description, theme, tier, desired, editionSize, imageUrl, fulfillment, price });
    alert('Mock: Artwork saved (Phase 1).');
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-serif text-amber-200">Artist Upload</h1>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-3">
          <div className="rounded-lg border border-white/10 p-3 bg-black/30">
            <label className="block text-xs text-amber-200/70">Title</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} className="mt-1 w-full rounded-md bg-neutral-900 border border-white/15 px-2 py-1" />
          </div>
          <div className="rounded-lg border border-white/10 p-3 bg-black/30">
            <label className="block text-xs text-amber-200/70">Description (Story)</label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={4} className="mt-1 w-full rounded-md bg-neutral-900 border border-white/15 px-2 py-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/10 p-3 bg-black/30">
              <label className="block text-xs text-amber-200/70">Theme</label>
              <select value={theme} onChange={e=>setTheme(e.target.value as any)} className="mt-1 w-full rounded-md bg-neutral-900 border border-white/15 px-2 py-1">
                {Object.keys(themes).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="rounded-lg border border-white/10 p-3 bg-black/30">
              <label className="block text-xs text-amber-200/70">Tier</label>
              <select value={tier} onChange={e=>setTier(e.target.value as any)} className="mt-1 w-full rounded-md bg-neutral-900 border border-white/15 px-2 py-1">
                <option value="digital">Digital Collector’s Edition</option>
                <option value="print">Limited Edition Print</option>
                <option value="original">Original Artwork</option>
              </select>
            </div>
            {tier === 'limited' && (
              <div className="rounded-lg border border-white/10 p-3 bg-black/30">
                <label className="block text-xs text-amber-200/70">Edition Size</label>
                <input type="number" min={1} value={editionSize} onChange={e=>setEditionSize(Number(e.target.value))} className="mt-1 w-full rounded-md bg-neutral-900 border border-white/15 px-2 py-1" />
              </div>
            )}
          </div>

          <div className="rounded-lg border border-white/10 p-3 bg-black/30">
            <label className="block text-xs text-amber-200/70">Upload image (Phase 1: URL)</label>
            <input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="https://...jpg" className="mt-1 w-full rounded-md bg-neutral-900 border border-white/15 px-2 py-1" />
            <div className="mt-2 relative h-48 rounded-md overflow-hidden border border-white/10">
              <SafeImage src={imageUrl} alt={title} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 shimmer-overlay" />
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-lg border border-white/10 p-3 bg-black/30">
            <div className="text-sm text-amber-100/90">Pricing</div>
            <div className="mt-2 text-xs text-amber-200/80">Your Earnings (USD)</div>
            <input type="number" min={0} value={desired} onChange={e=>setDesired(Number(e.target.value))} className="mt-1 w-full rounded-md bg-neutral-900 border border-white/15 px-2 py-1" />
            <div className="mt-2 text-xs text-amber-200/80">Afrodezea Commission: {Math.round(price.rate*100)}% = ${price.commission}</div>
            <div className="mt-1 font-medium text-amber-300">List Price: ${price.total}</div>
          </div>

          <div className="rounded-lg border border-white/10 p-3 bg-black/30">
            <div className="text-sm text-amber-100/90">Fulfillment</div>
            <select value={fulfillment} onChange={e=>setFulfillment(e.target.value as any)} className="mt-2 w-full rounded-md bg-neutral-900 border border-white/15 px-2 py-1">
              <option value="digital">Digital (Vault)</option>
              <option value="afrodezea_print">Afrodezea Print</option>
              <option value="artist_ships">Artist Ships Original</option>
            </select>
          </div>

          <div className="rounded-lg border border-white/10 p-3 bg-black/30 space-y-2 text-xs text-amber-200/80">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)} />
              I agree to the Afrodezea terms and the displayed commission structure for v1.
            </label>
            <button disabled={!canSubmit} className="w-full rounded-md bg-amber-500 text-black px-3 py-2 text-sm disabled:opacity-50">Save Artwork</button>
          </div>
        </aside>
      </form>
    </div>
  );
}
