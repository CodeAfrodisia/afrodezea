// src/pages/ProductDetail.jsx
import React, { useEffect, useRef, useState, useMemo, lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, useLocation, Link } from "react-router-dom";

import { useCart } from "../context/CartContext.jsx";
import { useWishlist } from "../context/WishlistContext.jsx";

import { fetchProductByHandleFromSupabase } from "../lib/productsSupabase.js";
import { profileFromText } from "../lib/profileHeuristics.js";
import {
  fetchRatingSummaryVerified,
  fetchRecentVerifiedRatings,
  fetchMyRating,
} from "../lib/ratings.js";
import { getSiteOrigin } from "../lib/site.js";

import StrengthBar from "../components/shop/StrengthBar.jsx";
import GalleryZoom from "../components/shop/GalleryZoom.jsx";
import ErrorBoundary from "../components/ErrorBoundary.jsx";

import { supabase } from "@lib/supabaseClient.js";
import { useAuth } from "@context/AuthContext.jsx";

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

  // Verified community summary + recent verified rows
  const [verified, setVerified] = useState(null);
  const [recent, setRecent] = useState([]);

  // “Just rated” optimistic payload (for showing pending influence)
  const [justRated, setJustRated] = useState(null);

  // Current user + their latest rating (persisted)
  const { user } = useAuth();
  const [myRating, setMyRating] = useState(null);

  const heroRef = useRef(null);
  const [parY, setParY] = useState(0);

  const options  = prod?.options || [];
  const variants = prod?.variants?.nodes || [];

  /* -------------------- URL params (no hooks) -------------------- */
  const qs = new URLSearchParams(location.search);
  const prefillEmail = qs.get("email") || ""; // harmless now, not used in members-only
  const fromQuick    = qs.get("fromQuick") === "1";

  /* -------------------- Effects -------------------- */

  // Load product by handle / slug
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

  // Load verified summary + recent verified whenever product changes
  useEffect(() => {
    if (!prod?.id) return;
    let alive = true;
    (async () => {
      try {
        const [sum, rec] = await Promise.all([
          fetchRatingSummaryVerified(prod.id),
          fetchRecentVerifiedRatings(prod.id, 6),
        ]);
        if (!alive) return;
        setVerified(sum);
        setRecent(rec);
        setJustRated(null); // reset optimistic state on product switch
      } catch {}
    })();
    return () => { alive = false; };
  }, [prod?.id]);

  // Fetch MY persisted rating for this product (so the page always shows it after refresh)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user?.id || !prod?.id) { if (alive) setMyRating(null); return; }
      try {
        const r = await fetchMyRating(prod.id);
        if (alive) setMyRating(r || null);
      } catch {
        if (alive) setMyRating(null);
      }
    })();
    return () => { alive = false; };
  }, [user?.id, prod?.id, rateOpen]); // refetch when drawer closes/opens (after updates)

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

  /* -------------------- Derived product/variant state -------------------- */

  const [selected, setSelected] = useState({});
  useEffect(() => {
    if (!variants.length) { setSelected({}); return; }
    const first = variants.find(v => v.availableForSale) || variants[0];
    const def = {};
    (first.selectedOptions || []).forEach(o => { def[o.name] = o.value; });
    setSelected(def);
  }, [prod?.id, variants.length]);

  const canon = (s) => String(s ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");

  const selectedVariant = useMemo(() => {
    if (!variants.length) return null;

    const exact = variants.find(v => {
      const opts = v.selectedOptions || [];
      return opts.every(o => canon(selected[o.name]) === canon(o.value));
    });
    if (exact) return exact;

    const keys = Object.keys(selected);
    if (keys.length) {
      const loose = variants.find(v => {
        const vmap = Object.fromEntries((v.selectedOptions || []).map(o => [o.name, o.value]));
        return keys.every(k => canon(selected[k]) === canon(vmap[k]));
      });
      if (loose) return loose;
    }

    return variants[0] || null;
  }, [variants, selected]);

  const displayPrice = useMemo(() => {
    if (selectedVariant?.price?.amount != null) return Number(selectedVariant.price.amount);
    if (prod?.priceRange?.minVariantPrice?.amount != null)
      return Number(prod.priceRange.minVariantPrice.amount);
    if (prod?.price_cents != null) return prod.price_cents / 100;
    return 0;
  }, [selectedVariant, prod]);

  /* -------------------- Meta / SEO -------------------- */

  const origin = getSiteOrigin();
  const hero = useMemo(() => prod?.image_url || prod?.images?.nodes?.[0]?.url || "", [prod]);

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

  /* -------------------- Profiles: creator, community, ratings-first -------------------- */

  const derivedProfile = useMemo(() => {
    const text = (prod?.description || "").replace(/<[^>]+>/g, " ");
    return profileFromText(text);
  }, [prod]);

  // Creator profile (Title-cased keys)
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

  // Verified community, Title-cased keys for blending with creator
  const communityProfile = useMemo(() => {
    if (!verified) return null;
    const base = {
      Floral:   verified.floral_avg,
      Fruity:   verified.fruity_avg,
      Woody:    verified.woody_avg,
      Fresh:    verified.fresh_avg,
      Spicy:    verified.spicy_avg,
      Strength: verified.strength_avg,
    };
    if (!justRated) return base;

    const count = Number(verified.count_verified || 0);
    const add = (avg, userVal) =>
      Math.round(((Number(avg || 0) * count) + Number(userVal || 0)) / (count + 1));

    return {
      Floral:   add(base.Floral,   justRated.floral),
      Fruity:   add(base.Fruity,   justRated.fruity),
      Woody:    add(base.Woody,    justRated.woody),
      Fresh:    add(base.Fresh,    justRated.fresh),
      Spicy:    add(base.Spicy,    justRated.spicy),
      Strength: add(base.Strength, justRated.strength),
    };
  }, [verified, justRated]);

  // Final “blended” Title-cased (creator + community)
  const blended = useMemo(() => {
    if (!communityProfile) return creator;
    const keys = ["Floral", "Fruity", "Woody", "Fresh", "Spicy", "Strength"];
    const out = {};
    keys.forEach(k => { out[k] = Math.round(((creator[k] ?? 0) + (communityProfile[k] ?? 0)) / 2); });
    return out;
  }, [creator, communityProfile]);

  // Lower-case creator map for radar (component expects lower-case keys)
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

  // Lower-case community map (from verified summary)
  const communityLc = useMemo(() => verified ? {
    floral:  verified.floral_avg   ?? 0,
    fruity:  verified.fruity_avg   ?? 0,
    citrus:  verified.citrus_avg   ?? 0,
    fresh:   verified.fresh_avg    ?? 0,
    woody:   verified.woody_avg    ?? 0,
    spicy:   verified.spicy_avg    ?? 0,
    sweet:   verified.sweet_avg    ?? 0,
    smoky:   verified.smoky_avg    ?? 0,
    count:   verified.count_verified ?? 0,
  } : null, [verified]);

  // “Preview community” that includes my (pending) rating if present
  const previewCommunity = useMemo(() => {
    if (!communityLc) return null;
    if (!myRating)   return communityLc;
    const n = communityLc.count || 0;
    const keys = ["floral","fruity","citrus","fresh","woody","spicy","sweet","smoky"];
    const out = {};
    for (const k of keys) {
      const avg  = Number(communityLc[k] ?? 0);
      const mine = Number(myRating[k] ?? 0);
      out[k] = Math.round((avg * n + mine) / (n + 1));
    }
    return out;
  }, [communityLc, myRating]);

  // Radar input: ratings-first (preview/community), fallback to creatorLc
  const ratingsOnly = useMemo(() => (previewCommunity || communityLc || creatorLc), [
    previewCommunity, communityLc, creatorLc
  ]);

  // Strength bar value: my rating first, then preview community, then verified, then creator
  const strengthValue = useMemo(() => {
    if (myRating?.strength != null) return Number(myRating.strength);
    if (justRated?.strength != null) return Number(justRated.strength);
    if (previewCommunity && Number.isFinite(previewCommunity.strength)) return Number(previewCommunity.strength);
    if (communityLc && Number.isFinite(communityLc.strength)) return Number(communityLc.strength);
    return Number(creator?.Strength ?? 0);
  }, [myRating, justRated, previewCommunity, communityLc, creator]);

  /* -------------------- Early returns AFTER hooks -------------------- */
  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!prod)   return <div style={{ padding: 24 }}>Not found.</div>;

  function AddToFavoritesButton({ productId }) {
    const { user } = useAuth();
    const userId = user?.id;

    const add = async () => {
      if (!userId) {
        alert("Please log in first.");
        return;
      }

      // get next rank
      const { data: existing, error: selErr } = await supabase
        .from("user_item_rankings")
        .select("rank")
        .eq("user_id", userId)
        .order("rank", { ascending: false })
        .limit(1);

      if (selErr) console.warn("rank lookup failed", selErr);

      const nextRank = existing?.[0]?.rank ? existing[0].rank + 1 : 1;

      const { error } = await supabase
        .from("user_item_rankings")
        .upsert(
          [{ user_id: userId, item_id: productId, rank: nextRank, is_public: false }],
          { onConflict: "user_id,item_id" }
        );

      if (error) {
        alert("Failed to add to favorites.");
        return;
      }
      alert("Added to favorites!");
    };

    return (
      <button onClick={add} className="chip" style={{ padding: "10px 14px" }}>
        ☆ Add to Favorites
      </button>
    );
  }

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

  const canBuy = variants.length
    ? (selectedVariant ? selectedVariant.availableForSale !== false : true)
    : true;

  const back = location.state?.from;
  let backHref = "/products";
  if (back && (back.search || back.pathname)) {
    backHref = `${back.pathname}${back.search || ""}`;
  } else {
    try {
      const cached = sessionStorage.getItem("afd:lastProductsSearch");
      if (cached) backHref = `/products${cached}`;
    } catch {}
  }

  /* -------------------- Render -------------------- */
  return (
    <div className="container" style={{ padding: 24, display: "grid", gap: 18 }}>
      <div>
        {back ? (
          <Link to={backHref} className="btn btn--ghost" aria-label="Back to results">
            ← Back to results
          </Link>
        ) : (
          <Link to="/products" className="btn btn--ghost">← Products</Link>
        )}
      </div>

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

            {/* Variant selectors */}
            {options?.length ? (
              <div style={{ display:"grid", gap:10, marginTop:8 }}>
                {options.map(opt => (
                  <div key={opt.name}>
                    <div style={{ opacity:.8, marginBottom:6 }}>{opt.name}</div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      {(opt.values || []).map(val => {
                        const active = selected[opt.name] === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            className={`chip ${active ? "active" : ""}`}
                            style={{
                              padding:"6px 10px",
                              borderRadius:999,
                              border:"1px solid var(--hairline)",
                              background: active ? "rgba(212,175,55,.12)" : "transparent",
                            }}
                            onClick={() => setSelected(prev => ({ ...prev, [opt.name]: val }))}
                            aria-pressed={active}
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

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <strong style={{ color: "var(--gold)", fontSize: 22 }}>
                {new Intl.NumberFormat(undefined, { style:"currency", currency:"USD" }).format(displayPrice)}
              </strong>

              <button
                className="btn btn--gold"
                disabled={!canBuy}
                aria-disabled={!canBuy}
                title={!canBuy ? "This variant is currently unavailable" : undefined}
                onClick={() =>
                  add({
                    productId: prod.id,
                    title: prod.title,
                    variantId: selectedVariant?.id ? `${prod.id}:${selectedVariant.id}` : `${prod.id}:default`,
                    variantTitle: selectedVariant?.title || "Default",
                    image: hero ? { url: hero } : null,
                    price: { amount: displayPrice, currencyCode: "USD" },
                    qty: 1,
                    selectedOptions: selected,
                  })
                }
              >
                {canBuy ? "Add to Cart" : "Unavailable"}
              </button>

              <button
                className="btn btn--ghost"
                onClick={() =>
                  toggleWish(prod.id, {
                    title: prod.title,
                    handle: prod.handle ?? prod.slug ?? null,
                    image_url: hero || null,
                    price_cents: prod.price_cents ?? Math.round(Number(displayPrice || 0) * 100),
                    priceRange: prod.priceRange || null,
                  })
                }
                aria-pressed={wished}
              >
                {wished ? "Remove from Wishlist" : "Add to Wishlist"}
              </button>

              <AddToFavoritesButton productId={prod.id} />
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
                profile={ratingsOnly}   // lower-case keys map
                chartScale={0.70}
              />
            </ErrorBoundary>
          </Suspense>

          <div>
            <p className="lead" style={{ marginTop: 0 }}>
              {verified?.count_verified
                ? <>
                    Blended from <strong>{verified.count_verified} verified rating{verified.count_verified > 1 ? "s" : ""}</strong>
                    {justRated ? " + your new rating (pending review)" : ""} + our profile.
                  </>
                : (justRated
                    ? "Blended with your rating (pending review) + our profile."
                    : "Be the first to rate this profile.")}
            </p>

            <div style={{ maxWidth: 520, marginTop: 10 }}>
              <StrengthBar value={strengthValue} />
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
          existingRating={myRating}     // prefill sliders with persisted rating
          userId={user?.id}             // for (product_id,user_id) upsert

          onSubmitted={(payload) => {
            // Optimistic: update myRating immediately
            setMyRating({
              ...payload,
              user_id: user?.id || null,
              product_id: prod.id,
            });
            setJustRated({
              floral:   payload.floral,
              fruity:   payload.fruity,
              citrus:   payload.citrus,
              woody:    payload.woody,
              fresh:    payload.fresh,
              spicy:    payload.spicy,
              sweet:    payload.sweet,
              smoky:    payload.smoky,
              strength: payload.strength,
            });

            // Background refresh of verified summary/recent
            (async () => {
              try {
                const [sum, rec] = await Promise.all([
                  fetchRatingSummaryVerified(prod.id),
                  fetchRecentVerifiedRatings(prod.id, 6),
                ]);
                setVerified(sum);
                setRecent(rec);
              } catch {}
            })();
          }}
        />
      </Suspense>
    </div>
  );
}
