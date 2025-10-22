// src/pages/ProductsPage.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from "react";
import { useSearchParams } from "react-router-dom";
import { searchProducts } from "../lib/productsSupabase.js";
import ProductsGrid from "../components/shop/ProductsGrid.jsx";
import CollectionTabs from "../components/shop/CollectionTabs.jsx";
import Filters from "../components/shop/Filters.jsx";
import { getSiteOrigin } from "../lib/site.js";
import { Helmet } from "react-helmet-async";

const QuickViewModal = React.lazy(() =>
  import("../components/shop/QuickViewModal.jsx")
);

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
        border: "1px solid var(--hairline)",
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

  // ---------- fetch tag catalog ----------
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const supabase = (await import("@lib/supabaseClient.js")).default;
        const { data, error } = await supabase
          .from("products_tags_catalog")
          .select("tag")
          .order("tag", { ascending: true });
        if (!error && alive) {
          setTagCatalog((data || []).map((r) => String(r.tag).toLowerCase()));
        }
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

  // ---------- fetch products (one big chunk; local paging) ----------
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr("");
    const t = setTimeout(async () => {
      try {
        const { rows, total } = await searchProducts({
          q: query,
          collection: activeCollection,
          tags,
          minPriceCents: typeof min === "number" ? min : undefined,
          maxPriceCents: typeof max === "number" ? max : undefined,
          order,
          page: 1,
          pageSize: 120, // generous upper bound
        });
        if (alive) {
          setRows(rows);
          setTotal(total);
          setSlide(1);
        }
      } catch (e) {
        if (alive) {
          setErr(e?.message || "Could not load products.");
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }, 160);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, activeCollection, tags.join("|"), min, max, order]);

// ---------- measure the REAL column count ----------
const gridRef = useRef(null); // pass this to the actual grid element
const [columns, setColumns] = useState(4);



  const GAP = 24;       // must match ProductsGrid
  const CARD_W = 300; // must match ProductsGrid

  // replace gridRef with a WRAPPER ref:
const gridWrapRef = useRef(null);


useEffect(() => {
  const el = gridWrapRef.current;
  if (!el || typeof ResizeObserver === "undefined") return;

  const calc = (width) => {
    const w = width ?? el.clientWidth ?? 0;
    // how many full tracks (card + gap) fit in the wrapper width?
    const cols = Math.max(1, Math.floor((w + GAP) / (CARD_W + GAP)));
    setColumns(cols);
  };

  const ro = new ResizeObserver(([entry]) => calc(entry?.contentRect?.width));
  ro.observe(el);
  calc(); // initial
  return () => ro.disconnect();
}, []);




  // ---------- derive 2-row slice ----------
  const perSlide = 2 * Math.max(1, columns);
  const totalSlides = Math.max(1, Math.ceil((rows?.length || 0) / perSlide));

  // clamp slide to bounds on any dependency change
  useLayoutEffect(() => {
    setSlide((prev) => Math.min(Math.max(prev, 1), totalSlides));
  }, [totalSlides]);

  const start = (slide - 1) * perSlide;
  const visible = (rows || []).slice(start, start + perSlide);

  // ---------- layout constants ----------
  const HEADER_H = 72; // adjust to your header height
  const SIDEBAR_W = 280;
useEffect(() => {
  console.log({ columns, perSlide: 2 * columns, visible: visible.length });
}, [columns, visible.length]);

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

      <React.Suspense fallback={null}>
        <QuickViewModal
          key={quickProduct?.id || "empty"}
          open={quickOpen}
          onClose={() => setQuickOpen(false)}
          product={quickProduct}
        />
      </React.Suspense>

      <div
  className="container"
  style={{
    padding: 24,
    height: `calc(100vh - ${HEADER_H}px)`,
    // do not clip horizontally; keep vertical lock
    //overflowY: "hidden",
   // overflowX: "visible",
    display: "grid",
    gridTemplateColumns: `${SIDEBAR_W}px 1fr`,
    gridTemplateRows: "auto 1fr",                    // header + body
    gridTemplateAreas: '"header header" "aside main"', // ✅ single string
    gap: 24,
  }}
>
  {/* Shared header — spans both columns */}
  <div style={{ gridArea: "header", opacity: 0.85 }}>
    {loading
      ? "Loading…"
      : `${total} result${total === 1 ? "" : "s"}`}
    {query ? ` for “${query}”` : ""}
    {activeCollection !== "all" ? ` in ${activeCollection}` : ""}
  </div>
          {/* Sidebar */}
  <aside
    style={{
      gridArea: "aside",
      position: "sticky",
      top: 84,
      alignSelf: "start",
      maxHeight: "100%",
      overflow: "auto",
    }}
  >
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
                onToggleTag={(t) => {
                  onToggleTag(t);
                }}
                tagsCatalog={tagCatalog}
                // Filters UI takes dollars; convert to cents for state
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
                onOrderChange={(v) => {
                  onOrder(v);
                }}
              />
            </div>
          </aside>

          {/* Main (no vertical scroll) */}
          <main
    style={{
      gridArea: "main",
      height: "100%",
      minHeight: 0,
     // overflowY: "hidden",
      //overflowX: "visible",
      display: "flex",
      flexDirection: "column",
    }}
  >
            

            {/* Content area */}
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
                        background:
                          "linear-gradient(90deg,#151515,#1a1a1a,#151515)",
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
                        border: "1px solid var(--hairline)",
                      }}
                    >
                      <strong>Heads up:</strong> {err}
                    </div>
                  )}

                  {/* The grid we're measuring */}
                 <div ref={gridWrapRef} style={{ width: "100%" }}>
  <ProductsGrid
    products={visible}
    fromSearch={currentSearch}
    onQuickView={(p) => { setQuickProduct(p); setQuickOpen(true); }}
    columns={columns}
    cardMin={CARD_W}
  />
</div>
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
                        onClick={() =>
                          setSlide((n) => Math.min(totalSlides, n + 1))
                        }
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
