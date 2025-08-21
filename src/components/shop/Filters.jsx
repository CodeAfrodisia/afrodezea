// src/components/shop/Filters.jsx
import React, { useMemo } from "react";
import { track } from "../../lib/analytics.js";

/**
 * Backward-compatible filters component.
 *
 * Required:
 *  - query: string
 *  - onQueryChange: (string) => void
 *
 * Optional:
 *  - selectedTags: string[]
 *  - onToggleTag: (tag: string) => void
 *  - minPrice: number | null               // dollars
 *  - maxPrice: number | null
 *  - onPriceChange: (min: number|null, max: number|null) => void
 *  - order: 'new' | 'price_asc' | 'price_desc'
 *  - onOrderChange: (value: string) => void
 *  - tagsCatalog: string[]
 */
export default function Filters({
  query,
  onQueryChange,
  selectedTags,
  onToggleTag,
  minPrice,
  maxPrice,
  onPriceChange,
  order,
  onOrderChange,
  tagsCatalog,
}) {
  const TAGS = useMemo(
    () =>
      (tagsCatalog && tagsCatalog.length
        ? tagsCatalog
        : ["floral", "fruity", "citrus", "fresh", "woody", "spicy", "sweet", "smoky"]),
    [tagsCatalog]
  );

  const hasTags = Array.isArray(selectedTags) && typeof onToggleTag === "function";
  const hasPrice =
    typeof onPriceChange === "function" &&
    (minPrice === null || typeof minPrice === "number") &&
    (maxPrice === null || typeof maxPrice === "number");
  const hasOrder = typeof onOrderChange === "function" && typeof order === "string";

  return (
    <div className="surface" style={{ padding: 16, borderRadius: 16, display: "grid", gap: 12 }}>
      {/* Search */}
      <div>
        <label htmlFor="filter-search" style={{ display: "block", marginBottom: 8, color: "var(--text-muted)" }}>
          Search
        </label>
        <input
          id="filter-search"
          className="input"
          type="search"
          value={query}
          placeholder="Search candles…"
          onChange={(e) => {
            onQueryChange(e.target.value);
            track("search_change", { q: e.target.value });
          }}
        />
      </div>

      {/* Tags (optional) */}
      {hasTags && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <label style={{ color: "var(--text-muted)" }}>Scent notes</label>
            <button
              type="button"
              className="btn btn--ghost"
              style={{ padding: "2px 8px", fontSize: 12 }}
              // NOTE: this toggles each active tag off. It’s compatible with your API,
              // but if onToggleTag ever becomes asynchronous, replace with a dedicated onClearTags.
              onClick={() => selectedTags.forEach((t) => onToggleTag(t))}
              aria-label="Clear selected tags"
              title="Clear selected"
            >
              Clear
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {TAGS.map((t) => {
              const active = selectedTags.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => { onToggleTag(t); track("filter_tag_toggle", { tag: t }); }}
                  className={`chip ${active ? "active" : ""}`}
                  aria-pressed={active}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid var(--hairline)",
                    background: active ? "rgba(212,175,55,.12)" : "transparent",
                  }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Price (optional) */}
      {hasPrice && (
        <div>
          <label style={{ display: "block", marginBottom: 8, color: "var(--text-muted)" }}>
            Price range ($)
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <PriceInput
              placeholder="Min"
              value={minPrice ?? ""}
              onChange={(v) => {
                onPriceChange(v === "" ? null : num(v), maxPrice);
                track("filter_price_change", { min: v === "" ? null : num(v), max: maxPrice });
              }}
            />
            <span style={{ opacity: 0.6 }}>—</span>
            <PriceInput
              placeholder="Max"
              value={maxPrice ?? ""}
              onChange={(v) => {
                onPriceChange(minPrice, v === "" ? null : num(v));
                track("filter_price_change", { min: minPrice, max: v === "" ? null : num(v) });
              }}
            />
          </div>
        </div>
      )}

      {/* Sort (optional) */}
      {hasOrder && (
        <div>
          <label htmlFor="filter-order" style={{ display: "block", marginBottom: 8, color: "var(--text-muted)" }}>
            Sort by
          </label>
          <select
            id="filter-order"
            className="input"
            value={order}
            onChange={(e) => { onOrderChange(e.target.value); track("sort_change", { order: e.target.value }); }}
          >
            <option value="new">Newest</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
          </select>
        </div>
      )}
    </div>
  );
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function PriceInput({ value, onChange, placeholder }) {
  return (
    <input
      className="input"
      inputMode="numeric"
      pattern="[0-9]*"
      placeholder={placeholder}
      style={{ width: 100 }}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
    />
  );
}
