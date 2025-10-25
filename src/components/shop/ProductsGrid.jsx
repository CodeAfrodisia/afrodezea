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
  const min = Math.max(200, Number(cardMin) || 300); // safety lower bound

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(${cardMin}px, 1fr))`,
 // ← flex to container
        gap,
        alignItems: "start",
        justifyItems: "stretch",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
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
