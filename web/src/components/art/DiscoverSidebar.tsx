// web/src/components/art/DiscoverSidebar.tsx
import React, { useMemo } from 'react';
import { themes } from '../../theme/rooms';

type SortKey = 'featured' | 'newest' | 'price-asc' | 'price-desc';

export interface DiscoverFilters {
  q: string;
  room: 'All' | keyof typeof themes;
  tiers: Set<'digital'|'print'|'original'>;
  sort: SortKey;
  availableOnly: boolean;
}

export function DiscoverSidebar({
  value,
  onChange,
}: {
  value: DiscoverFilters;
  onChange: (next: DiscoverFilters) => void;
}) {
  const rooms = useMemo(() => ['All', ...Object.keys(themes)] as (('All') | (keyof typeof themes))[], []);

  const set = (patch: Partial<DiscoverFilters>) => onChange({ ...value, ...patch });
  const toggleTier = (t: 'digital'|'print'|'original') => {
    const next = new Set(value.tiers);
    if (next.has(t)) next.delete(t); else next.add(t);
    set({ tiers: next });
  };

  return (
    <div className="surface" style={{ padding: 16, borderRadius: 16, display: 'grid', gap: 12 }}>
      {/* Search */}
      <div>
        <label htmlFor="art-filter-search" style={{ display: 'block', marginBottom: 8, color: 'var(--c-ink-muted)' }}>Search</label>
        <input
          id="art-filter-search"
          value={value.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Search title or artist"
          className="input"
          type="search"
        />
      </div>

      {/* Room selector */}
      <div>
        <label htmlFor="art-filter-room" style={{ display: 'block', marginBottom: 8, color: 'var(--c-ink-muted)' }}>Room</label>
        <select
          id="art-filter-room"
          value={value.room}
          onChange={(e) => set({ room: e.target.value as any })}
          className="input"
        >
          {rooms.map((r) => (
            <option key={String(r)} value={r as any}>{String(r)}</option>
          ))}
        </select>
      </div>

      {/* Tier filter pills (reuse .chip) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <label style={{ color: 'var(--c-ink-muted)' }}>Tiers</label>
          <button
            type="button"
            className="btn btn--ghost"
            style={{ padding: '2px 8px', fontSize: 12 }}
            onClick={() => ['digital','print','original'].forEach((t:any) => { if (value.tiers.has(t as any)) toggleTier(t as any); })}
            aria-label="Clear selected tiers"
            title="Clear selected"
          >
            Clear
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['digital','print','original'] as const).map((t) => {
            const active = value.tiers.has(t);
            const label = t === 'digital' ? 'Digital Collector’s' : t === 'print' ? 'Limited Print' : 'Original';
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTier(t)}
                className={`chip ${active ? 'active' : ''}`}
                aria-pressed={active}
                style={{ padding: '6px 10px', borderRadius: 999 }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort */}
      <div>
        <label htmlFor="art-filter-sort" style={{ display: 'block', marginBottom: 8, color: 'var(--c-ink-muted)' }}>Sort by</label>
        <select
          id="art-filter-sort"
          value={value.sort}
          onChange={(e) => set({ sort: e.target.value as SortKey })}
          className="input"
        >
          <option value="featured">Featured</option>
          <option value="newest">Newest</option>
          <option value="price-asc">Price: Low → High</option>
          <option value="price-desc">Price: High → Low</option>
        </select>
      </div>

      {/* Availability toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 14, color: 'var(--c-ink)' }}>Show only available editions</div>
        <label className="switch">
          <input
            type="checkbox"
            checked={value.availableOnly}
            onChange={(e) => set({ availableOnly: e.target.checked })}
          />
          <span className="slider" />
        </label>
      </div>
    </div>
  );
}

export type { SortKey };
