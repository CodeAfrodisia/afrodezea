// src/components/products/ProductGridPager.jsx
import React from "react";
import useGridPager from "@lib/useGridPager.js";

export default function ProductGridPager({ products, renderCard, gridClass = "" }) {
  const { itemsPerPage } = useGridPager();
  const [page, setPage] = React.useState(0);

  const totalPages = Math.max(1, Math.ceil((products?.length || 0) / itemsPerPage));
  const clamped = Math.min(Math.max(page, 0), totalPages - 1);
  const start = clamped * itemsPerPage;
  const visible = (products || []).slice(start, start + itemsPerPage);

  React.useEffect(() => {
    // if resize reduced itemsPerPage, keep page in range
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsPerPage, products?.length]);

  return (
    <section className="product-pager" style={{ display: "grid", gap: 12 }}>
      {/* grid */}
      <div
        className={`products-grid ${gridClass}`}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 16,
          overflow: "hidden",       // no scroll
        }}
      >
        {visible.map((p) => renderCard(p))}
      </div>

      {/* controls */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginTop: 8,
          }}
        >
          <button
            className="btn btn--ghost"
            onClick={() => setPage((n) => Math.max(0, n - 1))}
            disabled={clamped === 0}
          >
            ← Prev
          </button>

          {/* dots */}
          <div style={{ display: "flex", gap: 6 }}>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                aria-label={`Go to page ${i + 1}`}
                onClick={() => setPage(i)}
                style={{
                  width: 8, height: 8, borderRadius: 9999,
                  opacity: i === clamped ? 1 : 0.35,
                  background: "var(--c-gold, #f4c86a)",
                  border: "none",
                }}
              />
            ))}
          </div>

          <button
            className="btn btn--ghost"
            onClick={() => setPage((n) => Math.min(totalPages - 1, n + 1))}
            disabled={clamped >= totalPages - 1}
          >
            Next →
          </button>
        </div>
      )}
    </section>
  );
}

