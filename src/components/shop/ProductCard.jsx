// src/components/shop/ProductCard.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useCart } from "../../context/CartContext.jsx";
import { useWishlist } from "../../context/WishlistContext.jsx";
import { prefetchProductByHandle, warmForQuickView } from "../../lib/prefetch.js";
import { track } from "../../lib/analytics.js";

function formatMoney(n, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(n));
  } catch {
    return `$${Number(n).toFixed(2)}`;
  }
}

function priceFromProduct(p) {
  const vs = p?.variants?.nodes || [];
  if (vs.length) {
    const nums = vs.map(v => Number(v?.price?.amount ?? 0)).filter(Number.isFinite);
    if (nums.length) {
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      return { type: "range", min, max };
    }
  }
  const amt =
    p?.priceRange?.minVariantPrice?.amount ??
    (p?.price_cents != null ? p.price_cents / 100 : 0);
  return { type: "single", value: Number(amt) };
}

export default function ProductCard({ product, onQuickView, fromSearch = "", ...rest }) {
  const { add: addToCart } = useCart();
  const { ids = [], toggle } = useWishlist();

  const img = product.image_url
    ? { url: product.image_url }
    : (product.images?.nodes?.[0] || null);

  const priceObj =
    product.priceRange?.minVariantPrice || {
      amount: (product.price_cents ?? 0) / 100,
      currencyCode: "USD",
    };

  if (import.meta.env.DEV) {
    console.debug("[ProductCard] fromSearch:", fromSearch);
  }

  const inWish = ids.includes(product.id);
  const wishPayload = {
    id: product.id,
    title: product.title,
    handle: product.handle || product.slug || null,
    image_url: img?.url || null,
    price_cents: product.price_cents ?? Math.round(Number(priceObj.amount || 0) * 100),
    priceRange: product.priceRange || null,
  };

  const location = useLocation();
  const handle = product.handle || product.slug;
  const handlePath = `/product/${handle}`;

  return (
    <div
      className="card"
      style={{
        // ✅ Prevent min-content from forcing a wider track
        minWidth: 0,
        // ✅ So borders/padding don’t expand width unexpectedly
        boxSizing: "border-box",

        border: "1px solid #222",
        borderRadius: 16,
        overflow: "hidden",
        background: "#121212",
        position: "relative",
      }}
      onMouseEnter={() => warmForQuickView(handle)}
      onFocus={() => warmForQuickView(handle)}
      tabIndex={0}
      {...rest}
    >
      {/* Wishlist */}
      <button
        aria-label={inWish ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={inWish}
        onClick={() => {
          toggle(product.id, wishPayload);
          track(inWish ? "wishlist_remove" : "wishlist_add", {
            productId: product.id,
            handle,
          });
        }}
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          width: 36,
          height: 36,
          borderRadius: 999,
          border: "1px solid rgba(212,175,55,.35)",
          background: inWish
            ? "linear-gradient(180deg,#f0d981,#D4AF37 55%, #b4932a)"
            : "rgba(0,0,0,.35)",
          color: inWish ? "#111" : "#eee",
        }}
      >
        {inWish ? "♥" : "♡"}
      </button>

      {/* Image */}
      <div style={{ aspectRatio: "1 / 1", background: "#0a0a0a" }}>
        {img && (
          <Link to={handlePath} state={{ from: { pathname: "/products", search: fromSearch } }}>
            <img
              src={img.url}
              alt={product.title}
              loading="lazy"
              decoding="async"
              sizes="(max-width: 720px) 50vw, (max-width: 1200px) 33vw, 25vw"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </Link>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: 14 }}>
        <div style={{ fontWeight: 700, lineHeight: 1.3 }}>
          <Link
            to={handlePath}
            state={{ from: { pathname: "/products", search: fromSearch } }}
            style={{ color: "#eee", textDecoration: "none" }}
          >
            {product.title}
          </Link>
        </div>

        <div style={{ opacity: 0.8, marginTop: 6 }}>
          {(() => {
            const pr = priceFromProduct(product);
            if (pr.type === "range" && pr.min !== pr.max) {
              return `${formatMoney(pr.min)} – ${formatMoney(pr.max)}`;
            }
            return formatMoney(
              pr.type === "single"
                ? pr.value
                : (product?.priceRange?.minVariantPrice?.amount ?? 0)
            );
          })()}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #333",
              background: "#1a1a1a",
              color: "#eee",
              fontWeight: 700,
              cursor: "pointer",
            }}
            onClick={() => {
              onQuickView?.(product);
              track("quick_view_open", { productId: product.id });
            }}
          >
            Quick View
          </button>

          <button
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #333",
              background: "#ffd75e",
              color: "#111",
              fontWeight: 800,
              cursor: "pointer",
            }}
            onClick={() => {
              addToCart({
                productId: product.id,
                title: product.title,
                variantId: `${product.id}:default`,
                variantTitle: "Default",
                image: img,
                price: priceObj,
                qty: 1,
              });
              track("cart_add", { productId: product.id, price: Number(priceObj.amount || 0) });
            }}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
