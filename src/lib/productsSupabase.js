// src/lib/productsSupabase.js
import supabase from "./supabaseClient.js";

/* ---------- helpers ---------- */
const centsToAmount = (c) => (c ?? 0) / 100;
const slugify = (s) => String(s ?? "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

function parseMaybeJson(v) {
  if (Array.isArray(v) || v === null || typeof v === "object") return v;
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch {}
  }
  return null;
}

/* Map only the fields the UI needs */
function mapRow(row) {
  const variantsRaw = parseMaybeJson(row.variants) ?? [];
  const optionsRaw  = parseMaybeJson(row.options)  ?? [];

  const variants = Array.isArray(variantsRaw) ? variantsRaw : [];
  const options  = Array.isArray(optionsRaw)  ? optionsRaw  : [];

  const variantPrices = variants.map(v => v.price_cents).filter(n => n != null);
  const basePrices = variantPrices.length ? variantPrices : [row.price_cents ?? 0];
  const min = Math.min(...basePrices);
  const max = Math.max(...basePrices);

  return {
    id: row.id,
    title: row.title,
    handle: row.slug ?? row.handle ?? null,
    description: row.description || "",
    collection: row.collection || "",
    images: { nodes: row.image_url ? [{ url: row.image_url }] : [] },

    priceRange: {
      minVariantPrice: { amount: centsToAmount(min), currencyCode: "USD" },
      maxVariantPrice: { amount: centsToAmount(max), currencyCode: "USD" },
    },

    variants: {
      nodes: (variants || []).map((v) => {
        const selectedOptions = Array.isArray(v.selectedOptions) && v.selectedOptions.length
          ? v.selectedOptions
          : [
              v.wax  ? { name: "Wax",  value: String(v.wax) }   : null,
              v.size ? { name: "Size", value: String(v.size) }  : null,
            ].filter(Boolean);

        const vid =
          v.id ??
          v.sku ??
          `${row.id}:${slugify(
            v.title || [v.wax, v.size].filter(Boolean).join(" / ") || "default"
          )}`;

        return {
          id: vid,
          title: v.title ?? (selectedOptions.length
            ? selectedOptions.map(o => o.value).join(" / ")
            : "Default"),
          availableForSale: v.availableForSale != null ? !!v.availableForSale : true,
          price: {
            amount: v.price_cents != null ? centsToAmount(v.price_cents) : null,
            currencyCode: "USD",
          },
          selectedOptions,
        };
      }),
    },

    options,
    collections: {
      nodes: row.collection
        ? [{ title: row.collection, handle: String(row.collection).toLowerCase() }]
        : [],
    },
    tags: Array.isArray(row.tags) ? row.tags : [],
    image_url: row.image_url || null,
    price_cents: row.price_cents ?? null,
  };
}

/* timeout helper */
async function withTimeout(promise, ms = 20000, label = "op") {
  let t;
  try {
    return await Promise.race([
      promise,
      new Promise((_, rej) => (t = setTimeout(() => rej(new Error(`[timeout] ${label} > ${ms}ms`)), ms))),
    ]);
  } finally {
    clearTimeout(t);
  }
}

/* label map for collections */
const LABEL_BY_KEY = {
  affirmation: "Affirmation",
  afrodisia:   "Afrodisia",
  pantheon:    "Pantheon",
  fall:        "Fall",
  winter:      "Winter",
};

/* ---------- list (light) ---------- */
export async function fetchProductsFromSupabase({ query = "", collection = "all", limit = 60 } = {}) {
  let q = supabase
    .from("products")
    .select("id, slug, handle, title, price_cents, image_url, collection, tags, created_at", { count: "planned" })
    .order("created_at", { ascending: false, nullsLast: true })
    .limit(limit);

  if (collection && collection !== "all") {
    const label = LABEL_BY_KEY[collection] ?? collection;
    q = q.eq("collection", label);
  }

  if (query && query.trim()) {
    const needle = `%${query.trim()}%`;
    q = q.ilike("title", needle); // title-only for speed
  }

  const { data, error } = await withTimeout(q, 20000, "products.list");
  if (error) throw error;
  return (data || []).map(mapRow);
}
export const fetchProductsSupabase = (args) => fetchProductsFromSupabase(args);

/* ---------- single by handle (kept for ProductDetail) ---------- */
export async function fetchProductByHandleFromSupabase(handle) {
  // Try slug first (new schema)
  let { data, error } = await supabase
    .from("products")
    .select("id, slug, handle, title, description, price_cents, image_url, collection, tags, created_at, variants, options")
    .eq("slug", handle)
    .maybeSingle();

  // Fallback to legacy "handle" column if slug didn’t hit
  if ((!data && !error) || (error && error.code === "42703")) {
    const res2 = await supabase
      .from("products")
      .select("id, slug, handle, title, description, price_cents, image_url, collection, tags, created_at, variants, options")
      .eq("handle", handle)
      .maybeSingle();
    data = res2.data; error = res2.error;
  }

  if (error) throw error;
  return data ? mapRow(data) : null;
}

/* ---------- search for grid (optimized) ---------- */
export async function searchProducts({
  q, collection, tags, minPriceCents, maxPriceCents, order = "new", page = 1, pageSize = 24,
} = {}) {
  const from = Math.max(0, (page - 1) * pageSize);
  const to   = from + pageSize - 1;

  let base = supabase
    .from("products")
    .select("id, slug, handle, title, price_cents, image_url, collection, tags, created_at, variants, options", {
      count: "planned", // fast estimate
    });

  if (collection && collection !== "all") {
    const label = LABEL_BY_KEY[collection] ?? collection;
    base = base.eq("collection", label);
  }

  if (q && q.trim()) {
    const needle = `%${q.trim()}%`;
    base = base.ilike("title", needle); // fast with trigram index
  }

  if (Array.isArray(tags) && tags.length) {
    base = base.overlaps("tags", tags.map(t => String(t).toLowerCase()));
  }

  if (typeof minPriceCents === "number") base = base.gte("price_cents", minPriceCents);
  if (typeof maxPriceCents === "number") base = base.lte("price_cents", maxPriceCents);

  if (order === "price_asc")       base = base.order("price_cents", { ascending: true,  nullsLast: true });
  else if (order === "price_desc") base = base.order("price_cents", { ascending: false, nullsLast: true });
  else                             base = base.order("created_at",  { ascending: false, nullsLast: true });

  base = base.range(from, to);

  const { data, error, count } = await withTimeout(base, 20000, "products.search");
  if (error) throw error;

  return { rows: (data || []).map(mapRow), total: count || 0, page, pageSize };
}
