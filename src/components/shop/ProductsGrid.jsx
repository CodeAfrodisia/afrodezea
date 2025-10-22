import React from "react";
import ProductCard from "./ProductCard.jsx";

export default function ProductsGrid({
  products = [],
  onQuickView,
  fromSearch,
  columns = 3,
  cardMin = 300,
  gap = 24,
}) {
  return (
    <div
      /* remove className="container" or override its padding */
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(${cardMin}px, ${cardMin}px))`,
        gap,
        rowGap: 24,
        justifyContent: "center",
        padding: 0,           // 🔴 important: no side padding
        boxSizing: "border-box",
        maxWidth: "100%",
      }}
    >
      {products.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          onQuickView={onQuickView}
          fromSearch={fromSearch}
        />
      ))}
    </div>
  );
}


