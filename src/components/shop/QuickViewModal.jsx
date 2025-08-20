// src/components/shop/QuickViewModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useCart } from "../../context/CartContext.jsx";
import NotesRadar from "./NotesRadar.jsx";
import { profileFromText } from "../../lib/profileHeuristics.js";

function formatMoney(x) {
  if (!x) return "";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: x.currencyCode || "USD",
    }).format(Number(x.amount ?? 0));
  } catch {
    const n = Number(x?.amount ?? 0);
    return `$${n.toFixed(2)}`;
  }
}

export default function QuickViewModal({ open, onClose, product }) {
  const { add } = useCart();

  // 🔒 Hooks must run on every render (even if we early-return later)
  const gallery = useMemo(() => {
    if (!product) return [];
    const out = [];
    if (product.image_url) out.push({ url: product.image_url });
    if (product.images?.nodes?.length) out.push(...product.images.nodes);
    return out.length ? out : [{ url: "" }];
  }, [product]);

  const [active, setActive] = useState(0);

  // Reset hero index when product changes
  useEffect(() => setActive(0), [product?.id]);

  const price = useMemo(() => {
    if (!product) return null;
    return (
      product.priceRange?.minVariantPrice ||
      (product.price_cents != null
        ? { amount: product.price_cents / 100, currencyCode: "USD" }
        : null)
    );
  }, [product]);

  const inferredProfile = useMemo(() => {
    const text = (product?.description || "").replace(/<[^>]+>/g, " ");
    return profileFromText(text);
  }, [product?.description]);

  // ✅ Early return after hooks
  if (!open || !product) return null;

  return (
    <>
      <div className="modalOverlay" onClick={onClose} />
      <div className="modal">
        <div className="modalInner">
          {/* Glassy header */}
          <div className="glass-header">
            <div style={{ display: "grid" }}>
              <div className="modalTitle">{product.title}</div>
              {product.collection && (
                <small style={{ opacity: 0.7 }}>{product.collection}</small>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <strong className="modalPrice">{formatMoney(price)}</strong>
              <button className="btn btn--icon" onClick={onClose} aria-label="Close">
                ✕
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="modalBody">
            {/* Media */}
            <div>
              <div className="qv-hero">
                {gallery[active]?.url ? (
                  <img
                    src={gallery[active].url}
                    alt={product.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : null}
              </div>

              {gallery.length > 1 && (
                <div className="qv-thumbs">
                  {gallery.map((g, i) => (
                    <button
                      key={i}
                      className={`qv-thumb ${i === active ? "active" : ""}`}
                      onClick={() => setActive(i)}
                    >
                      {g.url ? (
                        <img
                          src={g.url}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="modalInfo">
              <p style={{ margin: 0, opacity: 0.9 }}>
                {product.description || "—"}
              </p>

              <NotesRadar compact profile={inferredProfile} />

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="btn btn--gold"
                  onClick={() =>
                    add({
                      productId: product.id,
                      title: product.title,
                      variantId: `${product.id}:default`,
                      variantTitle: "Default",
                      image: gallery[0] || null,
                      price: price || { amount: 0, currencyCode: "USD" },
                      qty: 1,
                    })
                  }
                >
                  Add to Cart
                </button>
                <button className="btn btn--ghost" onClick={onClose}>
                  Continue Browsing
                </button>
              </div>
            </div>
          </div>
          {/* /Body */}
        </div>
      </div>
    </>
  );
}
