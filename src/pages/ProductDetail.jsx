// src/pages/ProductDetail.jsx
import React, { useEffect, useRef, useState, useMemo, lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useLocation } from "react-router-dom";

import { useCart } from "../context/CartContext.jsx";
import { useWishlist } from "../context/WishlistContext.jsx";

import { fetchProductByHandleFromSupabase } from "../lib/productsSupabase.js";
import { profileFromText } from "../lib/profileHeuristics.js";
import { fetchRatingSummaryVerified, fetchRecentVerifiedRatings } from "../lib/ratings.js";
import { getSiteOrigin } from "../lib/site.js";

import StrengthBar from "../components/shop/StrengthBar.jsx";
import GalleryZoom from "../components/shop/GalleryZoom.jsx";
import ErrorBoundary from "../components/ErrorBoundary.jsx";

// code-split heavier widgets
const NotesRadar = lazy(() => import("../components/shop/NotesRadar.jsx"));
const RateDrawer = lazy(() => import("../components/shop/RateDrawer.jsx"));

function money(amount = 0, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `$${Number(amount).toFixed(2)}`;
  }
}

export default function ProductDetail() {
  /* -------------------- HOOKS (fixed order) -------------------- */
  const { handle } = useParams();
  const location = useLocation();
  const { add } = useCart();
  const { toggle: toggleWish, has: hasWish } = useWishlist();

  const [prod, setProd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rateOpen, setRateOpen] = useState(false);
  const [verified, setVerified] = useState(null);
  const [recent, setRecent] = useState([]);

  const heroRef = useRef(null);
  const [parY, setParY] = useState(0);

  /* -------------------- URL params (no hooks) -------------------- */
  const qs = new URLSearchParams(location.search);
  const rateToken    = qs.get("rateToken") || qs.get("rt") || "";
  const prefillEmail = qs.get("email") || "";
  const fromQuick    = qs.get("fromQuick") === "1";

  /* -------------------- Effects -------------------- */
  // Load product
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchProductByHandleFromSupabase(handle);
        if (alive) setProd(data);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [handle]);

  // Ratings
  useEffect(() => {
    if (!prod?.id) return;
    (async () => {
      const [sum, rec] = await Promise.all([
        fetchRatingSummaryVerified(prod.id),
        fetchRecentVerifiedRatings(prod.id, 6),
      ]);
      setVerified(sum);
      setRecent(rec);
    })();
  }, [prod?.id]);

  // Subtle entry animation if coming from Quick View
  useEffect(() => {
    if (!fromQuick) return;
    const el = document.querySelector(".surface");
    if (el) el.style.animation = "fadeUp .18s ease both";
  }, [fromQuick]);

  // Simple parallax for hero
  useEffect(() => {
    function onScroll() {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const viewport = Math.max(1, window.innerHeight);
      const t = Math.max(0, Math.min(1, 1 - rect.top / viewport));
      setParY(t * 10);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* -------------------- Always-called memos (safe) -------------------- */
  const origin = getSiteOrigin();

  const hero = useMemo(
    () => prod?.image_url || prod?.images?.nodes?.[0]?.url || "",
    [prod]
  );

  const price = useMemo(() => {
    if (!prod) return 0;
    const v = prod.priceRange?.minVariantPrice?.amount;
    return v != null ? Number(v) : (prod.price_cents ?? 0) / 100;
  }, [prod]);

  const canonical = useMemo(
    () => (prod ? `${origin}/product/${prod.handle || prod.slug}` : origin),
    [origin, prod]
  );

  const title = useMemo(
    () => (prod ? `${prod.title} | Afrodezea` : "Afrodezea"),
    [prod]
  );

  const desc = useMemo(
    () => (prod ? (prod.description || "").replace(/<[^>]+>/g, "").slice(0, 155) : ""),
    [prod]
  );

  const wished = useMemo(() => (prod ? hasWish(prod.id) : false), [prod, hasWish]);

  // Creator & community profiles
  const derivedProfile = useMemo(() => {
    const text = (prod?.description || "").replace(/<[^>]+>/g, " ");
    return profileFromText(text);
  }, [prod]);

  const creator = useMemo(() => {
    if (prod?.profile) {
      return {
        Floral:   prod.profile.floral   ?? 0,
        Fruity:   prod.profile.fruity   ?? 0,
        Woody:    prod.profile.woody    ?? 0,
        Fresh:    prod.profile.fresh    ?? 0,
        Spicy:    prod.profile.spice    ?? 0,
        Strength: prod.profile.strength ?? 0,
      };
    }
    return {
      Floral: derivedProfile.floral,
      Fruity: derivedProfile.fruity,
      Woody:  derivedProfile.woody,
      Fresh:  derivedProfile.fresh,
      Spicy:  derivedProfile.spicy,
      Strength: derivedProfile.strength,
    };
  }, [prod, derivedProfile]);

  const communityProfile = useMemo(() => {
    if (!verified) return null;
    return {
      Floral: verified.floral_avg,
      Fruity: verified.fruity_avg,
      Woody:  verified.woody_avg,
      Fresh:  verified.fresh_avg,
      Spicy:  verified.spicy_avg,
      Strength: verified.strength_avg,
    };
  }, [verified]);

  const blended = useMemo(() => {
    if (!communityProfile) return creator;
    const keys = ["Floral","Fruity","Woody","Fresh","Spicy","Strength"];
    const out = {};
    keys.forEach(k => { out[k] = Math.round(((creator[k] ?? 0) + (communityProfile[k] ?? 0)) / 2); });
    return out;
  }, [creator, communityProfile]);

  /* -------------------- Early returns AFTER hooks -------------------- */
  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!prod)   return <div style={{ padding: 24 }}>Not found.</div>;

  /* -------------------- JSON-LD (computed at render) -------------------- */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: prod.title,
    image: prod.image_url ? [prod.image_url] : [],
    description: desc,
    brand: { "@type": "Brand", name: "Afrodezea" },
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: Number(price).toFixed(2),
      availability: "https://schema.org/InStock",
      url: canonical,
    },
    ...(verified?.count_verified > 0 ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Math.round(
          ((verified.floral_avg + verified.fruity_avg + verified.woody_avg + verified.fresh_avg + verified.spicy_avg) / 5) * 10
        ) / 10,
        reviewCount: verified.count_verified,
      },
    } : {}),
  };

  /* -------------------- Render -------------------- */
  return (
    <div className="container" style={{ padding: 24, display: "grid", gap: 18 }}>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="product" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
        <meta property="og:url" content={canonical} />
        {prod.image_url && <meta property="og:image" content={prod.image_url} />}
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* Header block */}
      <section className="surface" style={{ padding: 18 }}>
        <div style={{ display: "grid", gap: 20, gridTemplateColumns: "min(560px, 42vw) 1fr", alignItems: "start" }}>
          {/* Hero */}
          <div
            ref={heroRef}
            style={{
              borderRadius: 16, overflow: "hidden", border: "1px solid var(--hairline)",
              background: "#0a0a0a", aspectRatio: "1 / 1",
              transform:`translateY(${parY}px)`, transition:"transform .08s linear",
              willChange:"transform"
            }}
          >
            {hero ? (
              <ErrorBoundary fallback={<div style={{opacity:.8}}>Gallery is unavailable.</div>}>
                <GalleryZoom
                  src={hero}
                  alt={prod.title}
                  aspect={1}
                  imgHints={{
                    loading: "eager",
                    fetchpriority: "high",
                    decoding: "async",
                    sizes: "(min-width: 900px) 560px, 90vw",
                  }}
                />
              </ErrorBoundary>
            ) : null}
          </div>

          {/* Info */}
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ borderBottom: "1px solid var(--hairline)", paddingBottom: 12 }}>
              <h1 className="display" style={{ marginBottom: 4 }}>{prod.title}</h1>
              {prod.collection && <div style={{ opacity: 0.75 }}>{prod.collection}</div>}
            </div>

            {/* recent chips */}
            {recent?.length ? (
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:12 }}>
                {recent.map(r => (
                  <span key={r.id}
                        style={{ padding:"6px 10px", borderRadius:999, border:"1px solid var(--hairline)", opacity:.85 }}>
                    {new Date(r.created_at).toLocaleDateString()} • Str {r.strength}
                  </span>
                ))}
              </div>
            ) : null}

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <strong style={{ color: "var(--gold)", fontSize: 22 }}>{money(price)}</strong>

              <button
                className="btn btn--gold"
                onClick={() =>
                  add({
                    productId: prod.id,
                    title: prod.title,
                    variantId: `${prod.id}:default`,
                    variantTitle: "Default",
                    image: hero ? { url: hero } : null,
                    price: { amount: price, currencyCode: "USD" },
                    qty: 1,
                  })
                }
              >
                Add to Cart
              </button>

              <button
                className="btn btn--ghost"
                onClick={() =>
                  toggleWish(prod.id, {
                    title: prod.title,
                    handle: prod.handle ?? prod.slug ?? null,
                    image_url: hero || null,
                    price_cents: prod.price_cents ?? Math.round(Number(price || 0) * 100),
                    priceRange: prod.priceRange || null,
                  })
                }
                aria-pressed={wished}
              >
                {wished ? "Remove from Wishlist" : "Add to Wishlist"}
              </button>
            </div>

            {prod.description && <p style={{ marginTop: 8, opacity: 0.9 }}>{prod.description}</p>}
          </div>
        </div>
      </section>

      {/* Scent profile + Rate */}
      <section className="surface" style={{ padding: 18 }}>
        <h3 style={{ margin: 0, marginBottom: 12 }}>Scent Profile</h3>

        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "min(380px, 40%) 1fr", alignItems: "center" }}>
          <Suspense fallback={null}>
            <ErrorBoundary fallback={<div style={{opacity:.8}}>Profile visualization unavailable.</div>}>
              <NotesRadar
                values={{
                  Floral: blended.Floral,
                  Fruity: blended.Fruity,
                  Woody:  blended.Woody,
                  Fresh:  blended.Fresh,
                  Spicy:  blended.Spicy,
                }}
              />
            </ErrorBoundary>
          </Suspense>

          <div>
            <p className="lead" style={{ marginTop: 0 }}>
              {verified?.count_verified
                ? <>Blended from <strong>{verified.count_verified} verified rating{verified.count_verified > 1 ? "s" : ""}</strong> + our profile.</>
                : "Be the first to rate this profile."}
            </p>

            <div style={{ maxWidth: 520, marginTop: 10 }}>
              <StrengthBar value={blended.Strength} />
            </div>

            <div style={{ marginTop: 12 }}>
              <button className="btn btn--gold" onClick={() => setRateOpen(true)}>
                Rate this Candle’s Profile
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Rating drawer */}
      <Suspense fallback={null}>
        <RateDrawer
          open={rateOpen}
          onClose={() => setRateOpen(false)}
          product={prod}
          prefillEmail={prefillEmail}
          rateToken={rateToken}
        />
      </Suspense>
    </div>
  );
}
