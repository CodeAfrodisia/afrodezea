// src/components/shop/QuickViewModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import { useCart } from "../../context/CartContext.jsx";
import NotesRadar from "./NotesRadar.jsx";
import { profileFromText } from "../../lib/profileHeuristics.js";
import {
  getCachedProduct,
  prefetchProductByHandle,
  prefetchProductDetailChunks, // warms the detail route
} from "../../lib/prefetch.js";
import {
  fetchRatingSummaryVerified,
  fetchMyRating,
} from "../../lib/ratings.js";
import { useAuth } from "@context/AuthContext.jsx";

function fmtMoneyAmount(amount = 0, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(amount));
  } catch {
    return `$${Number(amount).toFixed(2)}`;
  }
}

export default function QuickViewModal({ open, onClose, product }) {
  const { add } = useCart();
  const { user } = useAuth();

  // Normalize incoming + local hydrated product
  const incoming = product || null;
  const baseHandle = (incoming?.handle || incoming?.slug || "").toLowerCase();
  const [fullProd, setFullProd] = useState(incoming);

  // Ratings state (mirror Product Detail pattern)
  const [verified, setVerified] = useState(null);   // community summary (verified)
  const [myRating, setMyRating] = useState(null);   // current user's rating (if signed in)

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = orig; };
  }, [open]);

  // Warm route chunk when the modal opens
  useEffect(() => {
    if (!open) return;
    prefetchProductDetailChunks();
  }, [open]);

  // Hydrate from cache/DB if the product is partial or missing key fields
  useEffect(() => {
    if (!open) return;
    if (!baseHandle) { setFullProd(incoming); return; }

    const needsHydration =
      !incoming?.variants?.nodes?.length ||
      !incoming?.description ||
      !incoming?.image_url;

    if (!needsHydration) { setFullProd(incoming); return; }

    // 1) Try cache
    const cached = getCachedProduct(baseHandle);
    if (cached) {
      setFullProd((prev) => (prev?.id === cached.id ? cached : { ...cached, ...prev }));
    }

    // 2) Fetch (also caches)
    (async () => {
      const fresh = await prefetchProductByHandle(baseHandle);
      if (fresh) {
        setFullProd((prev) => (prev?.id === fresh.id ? fresh : { ...fresh, ...prev }));
      } else {
        // fallback to incoming even if partial
        setFullProd((prev) => prev || incoming);
      }
    })();
  }, [open, baseHandle, incoming]);

  // Use hydrated product if available; otherwise fall back to incoming
  const p = fullProd || incoming;

  // Fetch ratings summary + my rating (if signed in) when product is ready
  useEffect(() => {
    if (!open || !p?.id) return;

    (async () => {
      try {
        const sum = await fetchRatingSummaryVerified(p.id);
        setVerified(sum || null);
      } catch {
        setVerified(null);
      }

      if (user?.id) {
        try {
          const mine = await fetchMyRating(p.id);
          setMyRating(mine || null);
        } catch {
          setMyRating(null);
        }
      } else {
        setMyRating(null);
      }
    })();
  }, [open, p?.id, user?.id]);

  // Gallery (defensive: p can be null on some renders)
  const gallery = useMemo(() => {
    if (!p) return [];
    const out = [];
    if (p.image_url) out.push({ url: p.image_url });
    if (p.images?.nodes?.length) out.push(...p.images.nodes);
    return out.length ? out : [{ url: "" }];
  }, [p]);

  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [p?.id]);

  // Variants / options (Path A)
  const options  = p?.options || [];
  const variants = p?.variants?.nodes || [];

  const [selected, setSelected] = useState({});
  useEffect(() => {
    if (!variants.length) { setSelected({}); return; }
    const first = variants.find(v => v.availableForSale) || variants[0];
    const def = {};
    (first.selectedOptions || []).forEach(o => { def[o.name] = o.value; });
    setSelected(def);
  }, [p?.id, variants.length]);

  // Canonicalize for robust matching: "Coconut-Soy" === "coconut soy" === "COCONUTSOY"
  const canon = (s) => String(s ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, ""); // strip spaces/punct

  const selectedVariant = useMemo(() => {
    if (!variants.length) return null;

    // exact canonical match on all declared options of the variant
    const exact = variants.find(v => {
      const opts = v.selectedOptions || [];
      return opts.every(o => canon(selected[o.name]) === canon(o.value));
    });
    if (exact) return exact;

    // loose match: if the user has only picked some options
    const keys = Object.keys(selected);
    if (keys.length) {
      const loose = variants.find(v => {
        const vmap = Object.fromEntries((v.selectedOptions || []).map(o => [o.name, o.value]));
        return keys.every(k => canon(selected[k]) === canon(vmap[k]));
      });
      if (loose) return loose;
    }

    // fallback
    return variants[0] || null;
  }, [variants, selected]);

  const priceAmount = useMemo(() => {
    if (selectedVariant?.price?.amount != null) return Number(selectedVariant.price.amount);
    if (p?.priceRange?.minVariantPrice?.amount != null)
      return Number(p.priceRange.minVariantPrice.amount);
    if (p?.price_cents != null) return p.price_cents / 100;
    return 0;
  }, [selectedVariant, p]);

  const canBuy = variants.length
    ? (selectedVariant ? selectedVariant.availableForSale !== false : true)
    : true;

  // ----- Ratings inputs for radar (mirror PD) -----

  // Creator profile: prefer embedded p.profile; else infer from description
  const creator = useMemo(() => {
    if (p?.profile) {
      return {
        Floral:   p.profile.floral   ?? 0,
        Fruity:   p.profile.fruity   ?? 0,
        Woody:    p.profile.woody    ?? 0,
        Fresh:    p.profile.fresh    ?? 0,
        Spicy:    p.profile.spice    ?? 0,
        Strength: p.profile.strength ?? 0,
        Citrus:   p.profile.citrus   ?? 0,
        Sweet:    p.profile.sweet    ?? 0,
        Smoky:    p.profile.smoky    ?? 0,
      };
    }
    const text = (p?.description || "").replace(/<[^>]+>/g, " ");
    const prof = profileFromText(text);
    return {
      Floral:   prof.floral,
      Fruity:   prof.fruity,
      Woody:    prof.woody,
      Fresh:    prof.fresh,
      Spicy:    prof.spice,
      Strength: prof.strength ?? 0,
      Citrus:   prof.citrus   ?? 0,
      Sweet:    prof.sweet    ?? 0,
      Smoky:    prof.smoky    ?? 0,
    };
  }, [p]);

  // Lowercase shape for radar keys
  const creatorLc = useMemo(() => ({
    floral:  creator.Floral   ?? 0,
    fruity:  creator.Fruity   ?? 0,
    citrus:  creator.Citrus   ?? 0,
    fresh:   creator.Fresh    ?? 0,
    woody:   creator.Woody    ?? 0,
    spicy:   creator.Spicy    ?? 0,
    sweet:   creator.Sweet    ?? 0,
    smoky:   creator.Smoky    ?? 0,
  }), [creator]);

  // Verified community summary → lowercase map compatible with radar
  const communityLc = useMemo(() => verified ? {
    floral:  verified.floral_avg   ?? 0,
    fruity:  verified.fruity_avg   ?? 0,
    citrus:  verified.citrus_avg   ?? 0,
    fresh:   verified.fresh_avg    ?? 0,
    woody:   verified.woody_avg    ?? 0,
    spicy:   verified.spicy_avg    ?? 0,
    sweet:   verified.sweet_avg    ?? 0,
    smoky:   verified.smoky_avg    ?? 0,
    strength: verified.strength_avg ?? 0,
    count:   verified.count_verified ?? 0,
  } : null, [verified]);

  // Preview community = include your rating if present
  const previewCommunity = useMemo(() => {
    if (!communityLc) return null;
    if (!myRating)   return communityLc;
    const n = communityLc.count || 0;
    const keys = ["floral","fruity","citrus","fresh","woody","spicy","sweet","smoky","strength"];
    const out = {};
    for (const k of keys) {
      const avg  = Number(communityLc[k] ?? 0);
      const mine = Number(myRating[k] ?? 0);
      out[k] = Math.round((avg * n + mine) / (n + 1));
    }
    return out;
  }, [communityLc, myRating]);

  // RADAR SOURCE: ratings-first (preview → verified → creator)
  const ratingsOnly = useMemo(() => {
    return (previewCommunity || communityLc || creatorLc);
  }, [previewCommunity, communityLc, creatorLc]);

  // Useful derived values for render
  const hero = gallery[active]?.url || "";
  const handle = (p?.handle || p?.slug || "").toLowerCase();
  const detailsHref = handle ? `/product/${handle}?fromQuick=1` : "/products";

  // Single return via portal
  return open && p ? createPortal(
    <>
      <div className="modalOverlay" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label={`${p.title} quick view`}>
        <div className="modalInner">
          {/* Glassy header */}
          <div className="glass-header">
            <div style={{ display: "grid" }}>
              <div className="modalTitle">{p.title}</div>
              {p.collection && <small style={{ opacity: 0.7 }}>{p.collection}</small>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <strong className="modalPrice">{fmtMoneyAmount(priceAmount, "USD")}</strong>
              <button className="btn btn--icon" onClick={onClose} aria-label="Close">✕</button>
            </div>
          </div>

          {/* Body */}
          <div className="modalBody">
            {/* Media */}
            <div>
              <div className="qv-hero">
                {hero ? (
                  <img
                    src={hero}
                    alt={p.title}
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
                      aria-pressed={i === active}
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
              <p style={{ margin: 0, opacity: 0.9 }}>{p.description || "—"}</p>

              {/* Variant selectors */}
              {options?.length ? (
                <div style={{ display: "grid", gap: 10, margin: "12px 0" }}>
                  {options.map(opt => (
                    <div key={opt.name}>
                      <div style={{ opacity: 0.8, marginBottom: 6 }}>{opt.name}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {(opt.values || []).map(val => {
                          const isActive = selected[opt.name] === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              className={`chip ${isActive ? "active" : ""}`}
                              style={{
                                padding: "6px 10px",
                                borderRadius: 999,
                                border: "1px solid var(--hairline)",
                                background: isActive ? "rgba(212,175,55,.12)" : "transparent",
                              }}
                              onClick={() => setSelected(prev => ({ ...prev, [opt.name]: val }))}
                              aria-pressed={isActive}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Compact scent radar — ratings-first, same as Product Detail */}
              <NotesRadar compact profile={ratingsOnly} chartScale={0.65} />

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  className="btn btn--gold"
                  disabled={!canBuy}
                  aria-disabled={!canBuy}
                  title={!canBuy ? "This variant is currently unavailable" : undefined}
                  onClick={() =>
                    add({
                      productId: p.id,
                      title: p.title,
                      variantId: selectedVariant?.id
                        ? `${p.id}:${selectedVariant.id}`
                        : `${p.id}:default`,
                      variantTitle: selectedVariant?.title || "Default",
                      image: hero ? { url: hero } : null,
                      price: { amount: priceAmount, currencyCode: "USD" },
                      qty: 1,
                      selectedOptions: selected, // already { name: value }
                    })
                  }
                >
                  {canBuy ? "Add to Cart" : "Unavailable"}
                </button>

                <Link
                  to={detailsHref}
                  className="btn btn--ghost"
                  onMouseEnter={() => handle && prefetchProductByHandle(handle)}
                  onClick={onClose}
                >
                  View details
                </Link>

                <button className="btn btn--ghost" onClick={onClose}>
                  Continue browsing
                </button>
              </div>
            </div>
          </div>
          {/* /Body */}
        </div>
      </div>
    </>,
    document.body
  ) : null;
}
