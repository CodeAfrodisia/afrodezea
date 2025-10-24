// src/pages/ProductsPage.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  Suspense,
} from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import ProductsGrid from "../components/shop/ProductsGrid.jsx";
import CollectionTabs from "../components/shop/CollectionTabs.jsx";
import Filters from "../components/shop/Filters.jsx";
import { getSiteOrigin } from "../lib/site.js";
import { mapRow } from "../lib/productsSupabase.js";

// We’ll keep Quick View
const QuickViewModal = React.lazy(() =>
  import("../components/shop/QuickViewModal.jsx")
);

// ---- tiny utils used by mapping ----
const centsToAmount = (c) => (c ?? 0) / 100;
const slugify = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const parseMaybeJson = (v) => {
  if (Array.isArray(v) || v === null || typeof v === "object") return v;
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {}
  }
  return null;
};

// ===== collections used by tabs =====
const COLLECTIONS = [
  { key: "all", label: "All Collections" },
  { key: "affirmation", label: "Affirmation" },
  { key: "afrodisia", label: "Afrodisia" },
  { key: "pantheon", label: "Pantheon" },
  { key: "fall", label: "Fall" },
  { key: "winter", label: "Winter" },
];

const SITE_URL =
  import.meta.env.VITE_SITE_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

const parseCsv = (s) =>
  s ? s.split(",").map((t) => t.trim()).filter(Boolean) : [];
const toCsv = (arr) => (arr && arr.length ? arr.join(",") : "");

// ---------- direct REST helpers ----------
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, "") ||
  "https://tepmeumtieuyqdtdsurb.supabase.co"; // fallback to your known project

const SUPABASE_ANON =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  // Fallback lets local dev work; anon keys are public by design
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlcG1ldW10aWV1eXFkdGRzdXJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0OTc4ODgsImV4cCI6MjA2NTA3Mzg4OH0.2__GntZeNhcqQrs9XrWKY20CK5zjISVYvm0tQ3SBhG0";

function esc(v) {
  return encodeURIComponent(v);
}

function buildQuery({ q, collection, tags, minPriceCents, maxPriceCents, order, from, to }) {
  const params = new URLSearchParams();

  params.set(
    "select",
    "id,slug,handle:slug,title,price_cents,image_url,collection,tags,created_at,variants,options"
  );

  if (q && q.trim()) {
    const needle = `*${q.trim().replace(/\s+/g, "*")}*`;
    params.set("or", `(title.ilike.${needle},description.ilike.${needle})`);
  }

  if (collection && collection !== "all") {
    const LABEL = { affirmation:"Affirmation", afrodisia:"Afrodisia", pantheon:"Pantheon", fall:"Fall", winter:"Winter" };
    const label = LABEL[collection] ?? collection;
    params.set("collection", `eq.${label}`);
  }

  if (Array.isArray(tags) && tags.length) {
    params.set("tags", `ov.{${tags.map((t)=>t.toLowerCase()).join(",")}}`);
  }

  if (typeof minPriceCents === "number") params.set("price_cents", `gte.${minPriceCents}`);
  if (typeof maxPriceCents === "number") params.set("price_cents", `lte.${maxPriceCents}`);

  if (order === "price_asc")       params.set("order", "price_cents.asc.nullslast");
  else if (order === "price_desc") params.set("order", "price_cents.desc.nullslast");
  else                             params.set("order", "created_at.desc.nullslast");

  const limit  = Math.max(1, (to - from + 1) | 0);
  const offset = Math.max(0, from | 0);
  params.set("limit", String(limit));
  params.set("offset", String(offset));

  return params.toString();
}

async function fetchProductsREST(args, deadlineMs = 20000) {
  const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_ANON) throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");

  const from = Math.max(0, (args.page - 1) * args.pageSize);
  const to   = from + args.pageSize - 1;

  const qs  = buildQuery({ ...args, from, to });
  const url = `${SUPABASE_URL}/rest/v1/products?${qs}`;

  const headers = {
    apikey: SUPABASE_ANON,
    Authorization: `Bearer ${SUPABASE_ANON}`,
    "Content-Type": "application/json",
    Prefer: "count=exact",
  };

  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort("[abort] products.rest deadline"), deadlineMs);

  try {
    console.time("[products] rest");
    console.log("[products] rest url", url);
    const res  = await fetch(url, { headers, signal: ctrl.signal });

    const raw  = await res.text();
    let body   = null;
    try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }

    if (!res.ok) {
      console.log("[products] rest status", res.status, "body:", body);
      const msg = body && typeof body === "object"
        ? (body.message || JSON.stringify(body))
        : String(body || "Bad request");
      throw new Error(`REST ${res.status}: ${msg}`);
    }

    const arr = Array.isArray(body) ? body : [];
    const range = res.headers.get("content-range");
    const total = range ? Number(range.split("/")[1]) : arr.length;

    return { rows: arr.map(mapRow), total };
  } finally {
    clearTimeout(timer);
    console.timeEnd("[products] rest");
  }
}

// small pill button
function Chip({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="chip"
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid var(--c-border-subtle)",
        background: "rgba(212,175,55,.10)",
        color: "inherit",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export default function ProductsPage() {
  const origin = getSiteOrigin();

  const title = "Luxury Candles | Afrodezea";
  const desc =
    "Explore premium candles with rich scent profiles. Filter by notes and intensity.";
  const url = `${SITE_URL}/products`;

  const [sp, setSp] = useSearchParams();

  // URL → state (no `page`; we paginate locally)
  const urlCollection = (sp.get("collection") || "all").toLowerCase();
  const urlQuery = sp.get("q") || "";
  const urlTags = parseCsv(sp.get("tags")).map((t) => t.toLowerCase());
  const urlMin = sp.get("min") ? Number(sp.get("min")) : null; // cents
  const urlMax = sp.get("max") ? Number(sp.get("max")) : null; // cents
  const urlOrder = sp.get("order") || "new";

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [activeCollection, setActiveCollection] = useState(urlCollection);
  const [query, setQuery] = useState(urlQuery);
  const [tags, setTags] = useState(urlTags);
  const [min, setMin] = useState(urlMin);
  const [max, setMax] = useState(urlMax);
  const [order, setOrder] = useState(urlOrder);

  // client-side pager (starts at 1)
  const [slide, setSlide] = useState(1);

  const [quickOpen, setQuickOpen] = useState(false);
  const [quickProduct, setQuickProduct] = useState(null);
  const [err, setErr] = useState("");

  const [tagCatalog, setTagCatalog] = useState([]);

  const PAGE_SIZE = 36;

  // ---------- fetch tag catalog ----------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url = `${SUPABASE_URL}/rest/v1/products_tags_catalog?select=tag&order=tag.asc`;
        const res = await fetch(url, {
          headers: {
            apikey: SUPABASE_ANON,
            Authorization: `Bearer ${SUPABASE_ANON}`,
          },
        });
        const data = await res.json();
        if (!alive) return;
        setTagCatalog((data || []).map((r) => String(r.tag).toLowerCase()));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ---------- URL sync (drop server page param) ----------
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(sp);

      if (activeCollection && activeCollection !== "all")
        next.set("collection", activeCollection);
      else next.delete("collection");

      if (query.trim()) next.set("q", query.trim());
      else next.delete("q");

      if (tags.length) next.set("tags", toCsv(tags));
      else next.delete("tags");

      if (min != null) next.set("min", String(min));
      else next.delete("min");
      if (max != null) next.set("max", String(max));
      else next.delete("max");

      if (order && order !== "new") next.set("order", order);
      else next.delete("order");

      next.delete("page");

      if (next.toString() !== sp.toString()) setSp(next, { replace: false });
    }, 100);
    return () => clearTimeout(t);
  }, [activeCollection, query, tags, min, max, order, sp, setSp]);

  // reflect history → state (ignores page)
  useEffect(() => {
    const spCollection = (sp.get("collection") || "all").toLowerCase();
    const spQuery = sp.get("q") || "";
    const spTags = parseCsv(sp.get("tags")).map((t) => t.toLowerCase());
    const spMin = sp.get("min") ? Number(sp.get("min")) : null;
    const spMax = sp.get("max") ? Number(sp.get("max")) : null;
    const spOrder = sp.get("order") || "new";

    setActiveCollection((prev) => (prev !== spCollection ? spCollection : prev));
    setQuery((prev) => (prev !== spQuery ? spQuery : prev));
    if (spTags.join("|") !== tags.join("|")) setTags(spTags);
    if (spMin !== min) setMin(spMin);
    if (spMax !== max) setMax(spMax);
    if (spOrder !== order) setOrder(spOrder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.toString()]);

  const currentSearch = useMemo(() => {
    const next = new URLSearchParams();
    if (activeCollection && activeCollection !== "all")
      next.set("collection", activeCollection);
    if (query.trim()) next.set("q", query.trim());
    if (tags.length) next.set("tags", toCsv(tags));
    if (min != null) next.set("min", String(min));
    if (max != null) next.set("max", String(max));
    if (order && order !== "new") next.set("order", order);
    const s = next.toString();
    return s ? `?${s}` : "";
  }, [activeCollection, query, tags, min, max, order]);

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
      return Array.from(s);
    });
    setSlide(1);
  };
  const onPrice = (minC, maxC) => {
    setMin(minC ?? null);
    setMax(maxC ?? null);
    setSlide(1);
  };
  const onOrder = (v) => {
    setOrder(v);
    setSlide(1);
  };

  // ---------- fetch products via direct REST (fast path) ----------
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr("");

    (async () => {
      try {
        const { rows, total } = await fetchProductsREST({
          q: query,
          collection: activeCollection,
          tags,
          minPriceCents: typeof min === "number" ? min : undefined,
          maxPriceCents: typeof max === "number" ? max : undefined,
          order,
          page: 1,
          pageSize: PAGE_SIZE,
        });
        if (!alive) return;
        setRows(rows);
        setTotal(total);
        setSlide(1);
      } catch (e) {
        if (!alive) return;
        console.warn("[products] rest error:", e);
        setErr(e?.message || "Could not load products.");
        setRows([]);
        setTotal(0);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [query, activeCollection, tags.join("|"), min, max, order]);

  // ---------- Layout & measurement ----------
const GAP = 24; // matches ProductsGrid gap
const CARD_W = 300; // matches ProductsGrid min

const gridWrapRef = useRef(null);
const [columns, setColumns] = useState(4);

const frameRef = useRef(null);
const [isNarrow, setIsNarrow] = useState(false); // breakpoint ~980px

// calculate column count based on gridWrapRef width
useEffect(() => {
  const el = gridWrapRef.current;
  if (!el || typeof ResizeObserver === "undefined") return;

  const calc = (width) => {
    const w = width ?? el.clientWidth ?? 0;
    const cols = Math.max(1, Math.floor((w + GAP) / (CARD_W + GAP)));
    setColumns(cols);
  };

  const ro = new ResizeObserver(([entry]) => calc(entry?.contentRect?.width));
  ro.observe(el);
  calc();
  return () => ro.disconnect();
}, []);

// detect narrow layout breakpoint
useEffect(() => {
  const el = frameRef.current;
  if (!el || typeof ResizeObserver === "undefined") return;

  const onResize = ([entry]) => {
    const w = entry?.contentRect?.width ?? el.clientWidth ?? 0;
    setIsNarrow(w < 980);
  };
  const ro = new ResizeObserver(onResize);
  ro.observe(el);
  onResize([{ contentRect: { width: el.clientWidth } }]);
  return () => ro.disconnect();
}, []);

// ---------- derive 2-row slice ----------
const perSlide = 2 * Math.max(1, columns);
const totalSlides = Math.max(1, Math.ceil((rows?.length || 0) / perSlide));

useLayoutEffect(() => {
  setSlide((prev) => Math.min(Math.max(prev, 1), totalSlides));
}, [totalSlides]);

const start = (slide - 1) * perSlide;
const visible = (rows || []).slice(start, start + perSlide);

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
            name: p.title,
          })),
        })}
      </script>
    )}

    <Suspense fallback={null}>
      <QuickViewModal
        key={quickProduct?.id || "empty"}
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        product={quickProduct}
      />
    </Suspense>

    {/* ───────────────────────── PAGE LAYOUT (fixed overlap) ───────────────────────── */}
    <div
      ref={frameRef}
      className="products-layout container"
      style={{
        padding: 24,
        paddingBottom: "calc(var(--footer-height, 0px) + 16px)",
      }}
    >
      {/* Sidebar */}
      <aside className="products-aside">
        <div className="surface" style={{ padding: 12 }}>
          <CollectionTabs
            tabs={COLLECTIONS}
            active={activeCollection}
            onChange={(key) => {
              setActiveCollection(key);
              setSlide(1);
            }}
          />
        </div>
        <div style={{ height: 12 }} />
        <div className="surface" style={{ padding: 12 }}>
          <Filters
            query={query}
            onQueryChange={(val) => {
              setQuery(val);
              setSlide(1);
            }}
            selectedTags={tags}
            onToggleTag={onToggleTag}
            tagsCatalog={tagCatalog}
            minPrice={min != null ? Math.round(min / 100) : null}
            maxPrice={max != null ? Math.round(max / 100) : null}
            onPriceChange={(minDollars, maxDollars) => {
              const mMin =
                minDollars == null ? null : Math.round(Number(minDollars) * 100);
              const mMax =
                maxDollars == null ? null : Math.round(Number(maxDollars) * 100);
              onPrice(mMin, mMax);
            }}
            order={order}
            onOrderChange={onOrder}
          />
        </div>
      </aside>

      {/* Main */}
      <main className="products-main">
        {/* Header */}
        <div style={{ opacity: 0.85, marginBottom: 8 }}>
          {loading ? "Loading…" : `${total} result${total === 1 ? "" : "s"}`}
          {query ? ` for “${query}”` : ""}
          {activeCollection !== "all" ? ` in ${activeCollection}` : ""}
        </div>

        <div style={{ position: "relative", flex: "1 1 auto" }}>
          {loading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 20,
              }}
            >
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
              {(tags.length ||
                min != null ||
                max != null ||
                order !== "new" ||
                query ||
                activeCollection !== "all") && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 12,
                  }}
                >
                  {activeCollection !== "all" && (
                    <Chip
                      onClick={() => {
                        setActiveCollection("all");
                        setSlide(1);
                      }}
                    >
                      Collection: {activeCollection} ×
                    </Chip>
                  )}
                  {query && (
                    <Chip
                      onClick={() => {
                        setQuery("");
                        setSlide(1);
                      }}
                    >
                      Search: “{query}” ×
                    </Chip>
                  )}
                  {tags.map((t) => (
                    <Chip
                      key={t}
                      onClick={() => {
                        onToggleTag(t);
                        setSlide(1);
                      }}
                    >
                      {t} ×
                    </Chip>
                  ))}
                  {min != null && (
                    <Chip
                      onClick={() => {
                        onPrice(null, max);
                        setSlide(1);
                      }}
                    >
                      Min ${Math.round(min / 100)} ×
                    </Chip>
                  )}
                  {max != null && (
                    <Chip
                      onClick={() => {
                        onPrice(min, null);
                        setSlide(1);
                      }}
                    >
                      Max ${Math.round(max / 100)} ×
                    </Chip>
                  )}
                  {order !== "new" && (
                    <Chip
                      onClick={() => {
                        onOrder("new");
                        setSlide(1);
                      }}
                    >
                      Sort {order.replace("_", " ")} ×
                    </Chip>
                  )}
                  <button
                    className="btn btn--ghost"
                    onClick={() => {
                      setActiveCollection("all");
                      setQuery("");
                      setTags([]);
                      onPrice(null, null);
                      onOrder("new");
                      setSlide(1);
                    }}
                  >
                    Clear all
                  </button>
                </div>
              )}

              {err && (
                <div
                  className="surface"
                  style={{
                    padding: 12,
                    marginBottom: 12,
                    border: "1px solid var(--c-border-subtle)",
                  }}
                >
                  <strong>Heads up:</strong> {err}
                </div>
              )}

              {/* Product Grid */}
              <div ref={gridWrapRef} className="products-grid" style={{ width: "100%" }}>
                <ProductsGrid
                  products={visible}
                  fromSearch={currentSearch}
                  onQuickView={(p) => {
                    setQuickProduct(p);
                    setQuickOpen(true);
                  }}
                  columns={columns}
                  cardMin={CARD_W}
                />
              </div>

              {/* Pagination */}
              {totalSlides > 1 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    marginTop: 16,
                  }}
                >
                  <button
                    className="btn btn--ghost"
                    onClick={() => setSlide((n) => Math.max(1, n - 1))}
                    disabled={slide <= 1}
                  >
                    ← Prev
                  </button>

                  <div style={{ display: "flex", gap: 6 }}>
                    {Array.from({ length: totalSlides }).map((_, i) => (
                      <button
                        key={i}
                        aria-label={`Go to page ${i + 1}`}
                        onClick={() => setSlide(i + 1)}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 9999,
                          opacity: i + 1 === slide ? 1 : 0.35,
                          background: "var(--c-gold, #f4c86a)",
                          border: "none",
                        }}
                      />
                    ))}
                  </div>

                  <button
                    className="btn btn--ghost"
                    onClick={() => setSlide((n) => Math.min(totalSlides, n + 1))}
                    disabled={slide >= totalSlides}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  </>
);

}
