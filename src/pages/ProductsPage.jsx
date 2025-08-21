// src/pages/ProductsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { searchProducts } from "../lib/productsSupabase.js";
import ProductsGrid from "../components/shop/ProductsGrid.jsx";
import CollectionTabs from "../components/shop/CollectionTabs.jsx";
import Filters from "../components/shop/Filters.jsx";
import { getSiteOrigin } from "../lib/site.js";
import { Helmet } from "react-helmet-async";

const QuickViewModal = React.lazy(() => import("../components/shop/QuickViewModal.jsx"));

const COLLECTIONS = [
  { key: "all",        label: "All Collections" },
  { key: "affirmation",label: "Affirmation"     },
  { key: "afrodisia",  label: "Afrodisia"       },
  { key: "pantheon",   label: "Pantheon"        },
  { key: "fall",       label: "Fall"            },
  { key: "winter",     label: "Winter"          },
];

const SITE_URL = import.meta.env.VITE_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");

const parseCsv = (s) => (s ? s.split(",").map(t => t.trim()).filter(Boolean) : []);
const toCsv = (arr) => (arr && arr.length ? arr.join(",") : "");

export default function ProductsPage() {
  const origin = getSiteOrigin();

  const title = "Luxury Candles | Afrodezea";
  const desc = "Explore premium candles with rich scent profiles. Filter by notes and intensity.";
  const url = `${SITE_URL}/products`;

  const [sp, setSp] = useSearchParams();

  // URL → state
  const urlCollection = (sp.get("collection") || "all").toLowerCase();
  const urlQuery = sp.get("q") || "";
  const urlTags = parseCsv(sp.get("tags")).map(t => t.toLowerCase());
  const urlMin = sp.get("min") ? Number(sp.get("min")) : null; // cents
  const urlMax = sp.get("max") ? Number(sp.get("max")) : null; // cents
  const urlOrder = sp.get("order") || "new";                   // "new" | "price_asc" | "price_desc"
  const urlPage = sp.get("page") ? Math.max(1, Number(sp.get("page"))) : 1;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [activeCollection, setActiveCollection] = useState(urlCollection);
  const [query, setQuery] = useState(urlQuery);
  const [tags, setTags] = useState(urlTags);
  const [min, setMin] = useState(urlMin); // cents
  const [max, setMax] = useState(urlMax); // cents
  const [order, setOrder] = useState(urlOrder);
  const [page, setPage] = useState(urlPage);

  const [quickOpen, setQuickOpen] = useState(false);
  const [quickProduct, setQuickProduct] = useState(null);

  const pageSize = 24;

  // Fetch from Supabase (server-side)
  useEffect(() => {
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const { rows, total } = await searchProducts({
          q: query,                           // full-text on title/description/ft
          collection: activeCollection,       // explicit server-side filter
          tags,
          minPriceCents: typeof min === "number" ? min : undefined,
          maxPriceCents: typeof max === "number" ? max : undefined,
          order,
          page,
          pageSize,
        });

        if (alive) { setRows(rows); setTotal(total); }
      } catch (e) {
        console.error("[products] search failed", e);
        if (alive) { setRows([]); setTotal(0); }
      } finally {
        if (alive) setLoading(false);
      }
    }, 220); // debounce
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, activeCollection, tags.join("|"), min, max, order, page]);

  // State -> URL sync (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(sp);

      if (activeCollection && activeCollection !== "all") next.set("collection", activeCollection);
      else next.delete("collection");

      if (query.trim()) next.set("q", query.trim());
      else next.delete("q");

      if (tags.length) next.set("tags", toCsv(tags));
      else next.delete("tags");

      if (min != null) next.set("min", String(min)); else next.delete("min");
      if (max != null) next.set("max", String(max)); else next.delete("max");

      if (order && order !== "new") next.set("order", order); else next.delete("order");

      if (page && page !== 1) next.set("page", String(page)); else next.delete("page");

      if (next.toString() !== sp.toString()) {
        setSp(next, { replace: false });
      }
    }, 150);
    return () => clearTimeout(t);
  }, [activeCollection, query, tags, min, max, order, page, sp, setSp]);

  // Reflect back/forward into state
  useEffect(() => {
    const spCollection = (sp.get("collection") || "all").toLowerCase();
    const spQuery = sp.get("q") || "";
    const spTags = parseCsv(sp.get("tags")).map(t => t.toLowerCase());
    const spMin = sp.get("min") ? Number(sp.get("min")) : null;
    const spMax = sp.get("max") ? Number(sp.get("max")) : null;
    const spOrder = sp.get("order") || "new";
    const spPage = sp.get("page") ? Math.max(1, Number(sp.get("page"))) : 1;

    setActiveCollection((prev) => (prev !== spCollection ? spCollection : prev));
    setQuery((prev) => (prev !== spQuery ? spQuery : prev));
    if (spTags.join("|") !== tags.join("|")) setTags(spTags);
    if (spMin !== min) setMin(spMin);
    if (spMax !== max) setMax(spMax);
    if (spOrder !== order) setOrder(spOrder);
    if (spPage !== page) setPage(spPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.toString()]);

  const currentSearch = useMemo(() => {
  const next = new URLSearchParams();
  if (activeCollection && activeCollection !== "all") next.set("collection", activeCollection);
  if (query.trim()) next.set("q", query.trim());
  if (tags.length) next.set("tags", toCsv(tags));
  if (min != null) next.set("min", String(min));      // cents
  if (max != null) next.set("max", String(max));      // cents
  if (order && order !== "new") next.set("order", order);
  if (page && page !== 1) next.set("page", String(page));
  const s = next.toString();
  return s ? `?${s}` : "";
}, [activeCollection, query, tags, min, max, order, page]);

useEffect(() => {
  try {
    sessionStorage.setItem("afd:lastProductsSearch", currentSearch || "");
  } catch {}
}, [currentSearch]);


  const onToggleTag = (t) => {
    const low = t.toLowerCase();
    setTags((prev) => {
      const s = new Set(prev);
      s.has(low) ? s.delete(low) : s.add(low);
      if (page !== 1) setPage(1);
      return Array.from(s);
    });
  };
  const onPrice = (minCents, maxCents) => { setMin(minCents ?? null); setMax(maxCents ?? null); if (page !== 1) setPage(1); };
  const onOrder = (v) => { setOrder(v); if (page !== 1) setPage(1); };
  const onPage = (p) => setPage(Math.max(1, p));

  const products = rows;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={`${origin}/products`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
        <meta property="og:url" content={url} />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      {!loading && rows?.length > 0 && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: rows.map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${SITE_URL}/p/${p.handle || p.slug}`,
              name: p.title
            }))
          })}
        </script>
      )}

      <React.Suspense fallback={null}>
        <QuickViewModal
          open={quickOpen}
          onClose={() => setQuickOpen(false)}
          product={quickProduct}
        />
      </React.Suspense>

      <div className="container" style={{ padding: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24, alignItems: "start" }}>
          {/* Sidebar */}
          <aside style={{ position: "sticky", top: 84 }}>
            <div className="surface" style={{ padding: 12 }}>
              <CollectionTabs
                tabs={COLLECTIONS}
                active={activeCollection}
                onChange={(key) => { setActiveCollection(key); if (page !== 1) setPage(1); }}
              />
            </div>
            <div style={{ height: 12 }} />
            <div className="surface" style={{ padding: 12 }}>
              <Filters
                query={query}
                onQueryChange={(val) => { setQuery(val); if (page !== 1) setPage(1); }}

                selectedTags={tags}
                onToggleTag={onToggleTag}

                // Filters UI takes dollars; convert to cents for state
                minPrice={min != null ? Math.round(min / 100) : null}
                maxPrice={max != null ? Math.round(max / 100) : null}
                onPriceChange={(minDollars, maxDollars) => {
                  const mMin = minDollars == null ? null : Math.round(Number(minDollars) * 100);
                  const mMax = maxDollars == null ? null : Math.round(Number(maxDollars) * 100);
                  onPrice(mMin, mMax);
                }}

                order={order}
                onOrderChange={onOrder}
              />
            </div>
          </aside>

          {/* Main */}
          <main>
            <div style={{ marginBottom: 12, opacity: 0.85 }}>
              {loading ? "Loading…" : `${total} result${total === 1 ? "" : "s"}`}
              {query ? ` for “${query}”` : ""}
              {activeCollection !== "all" ? ` in ${activeCollection}` : ""}
            </div>

            {loading ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: 320,
                      borderRadius: 16,
                      background: "linear-gradient(90deg,#151515,#1a1a1a,#151515)",
                      animation: "shimmer 1.2s linear infinite",
                      backgroundSize: "300% 100%",
                    }}
                  />
                ))}
              </div>
            ) : (
              <>
                <ProductsGrid
                  products={products}
                  fromSearch={currentSearch}
                  onQuickView={(p) => { setQuickProduct(p); setQuickOpen(true); }}
                />
                {pages > 1 && (
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
                    <button className="btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</button>
                    <span style={{ alignSelf: "center" }}>{page} / {pages}</span>
                    <button className="btn" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
