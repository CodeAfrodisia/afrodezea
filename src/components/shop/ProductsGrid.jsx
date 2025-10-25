// src/components/shop/ProductsGrid.jsx
import React from "react";
import ProductCard from "./ProductCard.jsx";

export default function ProductsGrid({
  products = [],
  onQuickView,
  fromSearch,
  columns = 3,
  cardMin = 300, // fixed card width
  gap = 24,
}) {
  return (
    <div
      style={{
        /* fixed-width columns so single/last items never stretch */
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, ${cardMin}px)`,
        gridAutoRows: "max-content",
        gap,
        rowGap: 24,

        /* keep the grid aligned to the left; don’t center on short rows */
        justifyContent: "start",
        alignContent: "start",

        /* container hygiene */
        padding: 0,
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "100%",
        overflow: "visible",
      }}
    >
      {products.map((p) => (
        <div key={p.id} style={{ width: cardMin }}>
          <ProductCard
            product={p}
            onQuickView={onQuickView}
            fromSearch={fromSearch}
          />
        </div>
      ))}
    </div>
  );
}
