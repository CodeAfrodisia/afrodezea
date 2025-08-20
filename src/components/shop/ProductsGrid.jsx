import React from "react";
import ProductCard from "./ProductCard.jsx";

export default function ProductsGrid({ products = [], onQuickView }) {
  return (
    <div
      className="container"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 24,
        rowGap: 28,
      }}
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onQuickView={onQuickView} />
      ))}
    </div>
  );
}
