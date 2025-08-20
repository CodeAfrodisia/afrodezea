// src/lib/productsSupabase.js
import supabase from "./supabaseClient.js";

const centsToAmount = (c) => (c ?? 0) / 100;

// ----------------------------
// Normalization (kept intact)
// ----------------------------
function mapRow(row) {
  const variants = Array.isArray(row.variants) ? row.variants : [];
  const prices = variants.length
    ? variants.map((v) => v.price_cents || 0)
    : [row.price_cents || 0];
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  return {
    id: row.id,
    title: row.title,
    handle: row.slug ?? row.handle ?? null, // tolerate either column
    description: row.description || "",
    collection: row.collection || "",
    images: { nodes: row.image_url ? [{ url: row.image_url }] : [] },
    priceRange: {
      minVariantPrice: { amount: centsToAmount(min), currencyCode: "USD" },
      maxVariantPrice: { amount: centsToAmount(max), currencyCode: "USD" },
    },
    variants: {
      nodes: (variants || []).map((v) => ({
        id: v.id ?? `${row.id}:${v.title ?? "default"}`,
        title: v.title ?? "Default",
        availableForSale: !!v.availableForSale,
        price: { amount: centsToAmount(v.price_cents), currencyCode: "USD" },
        selectedOptions: v.selectedOptions || [],
      })),
    },
    options: Array.isArray(row.options) ? row.options : [],
    collections: {
      nodes: row.collection
        ? [{ title: row.collection, handle: (row.collection || "").toLowerCase() }]
        : [],
    },
    tags: Array.isArray(row.tags) ? row.tags : [],
    image_url: row.image_url || null,
    price_cents: row.price_cents ?? null,
  };
}

// -----------------------------------
// Simple list fetch (kept, back-compat)
// -----------------------------------
/**
 * @param {object} args
 * @param {string} args.query
 * @param {string} args.collection
 * @param {number} args.limit
 */
export async function fetchProductsFromSupabase({
  query = "",
  collection = "all",
  limit = 60,
} = {}) {
  let q = supabase.from("products").select("*").order("created_at", { ascending: false });

  const LABEL_BY_KEY = {
    affirmation: "Affirmation",
    afrodisia: "Afrodisia",
    pantheon: "Pantheon",
    fall: "Fall",
    winter: "Winter",
  };

  if (collection && collection !== "all") {
    const label = LABEL_BY_KEY[collection] ?? collection;
    q = q.eq("collection", label);
  }

  if (query && query.trim()) {
    const needle = `%${query.trim()}%`;
    q = q.or(`title.ilike.${needle},description.ilike.${needle}`);
  }

  q = q.limit(limit);

  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(mapRow);
}

// Back-compat alias
export const fetchProductsSupabase = (args) => fetchProductsFromSupabase(args);

// ---------------------------------------
// Fetch single by slug/handle (tolerant)
// ---------------------------------------
export async function fetchProductByHandleFromSupabase(handle) {
  // Try slug first
  let { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", handle)
    .maybeSingle();

  // If column doesn't exist (42703) or not found, try handle
  if (error?.code === "42703" || (!data && !error)) {
    const res2 = await supabase
      .from("products")
      .select("*")
      .eq("handle", handle)
      .maybeSingle();
    data = res2.data;
    error = res2.error;
  }

  if (error) throw error;
  return data ? mapRow(data) : null;
}

// ----------------------------------------------------
// Advanced search: FTS + tags + price + sort + paging
// ----------------------------------------------------
/**
 * @param {Object} params
 * @param {string}   [params.q]                 Full-text query (plainto)
 * @param {string[]} [params.tags]              Any-overlap on text[] tags
 * @param {number}   [params.minPriceCents]     Inclusive
 * @param {number}   [params.maxPriceCents]     Inclusive
 * @param {"price_asc"|"price_desc"|"new"} [params.order="new"]
 * @param {number}   [params.page=1]
 * @param {number}   [params.pageSize=24]
 */
export async function searchProducts({
  q,
  tags,
  minPriceCents,
  maxPriceCents,
  order = "new",
  page = 1,
  pageSize = 24,
} = {}) {
  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;

  // Select * so we don't explode on optional columns (e.g., no 'handle')
  let query = supabase
    .from("products")
    .select("*", { count: "exact" });

  // --- Full-text search on 'ft' (fallback to ILIKE if column missing) ---
  if (q && q.trim()) {
    const term = q.trim();

    // Preferred: textSearch on 'ft'
    const tryTextSearch = async () => {
      let qq = supabase.from("products").select("*", { count: "exact" })
        .textSearch("ft", term, { type: "plain" });
      return await qq;
    };

    // Fallback: ILIKE on title/description
    const tryIlike = async () => {
      const needle = `%${term}%`;
      return await supabase.from("products").select("*", { count: "exact" })
        .or(`title.ilike.${needle},description.ilike.${needle}`);
    };

    let data, error, count;
    try {
      ({ data, error, count } = await tryTextSearch());
      if (error?.code === "42703") {
        ({ data, error, count } = await tryIlike());
      }
    } catch {
      ({ data, error, count } = await tryIlike());
    }
    if (error) throw error;

    const ids = (data || []).map((r) => r.id);
    if (ids.length === 0) return { rows: [], total: 0, page, pageSize };

    query = supabase.from("products").select("*", { count: "exact" }).in("id", ids);
  }

  // --- Tags overlap (ANY) ---
  if (tags && tags.length) query = query.overlaps("tags", tags);

  // --- Price range ---
  if (typeof minPriceCents === "number") query = query.gte("price_cents", minPriceCents);
  if (typeof maxPriceCents === "number") query = query.lte("price_cents", maxPriceCents);

  // --- Sorting ---
  if (order === "price_asc") query = query.order("price_cents", { ascending: true, nullsFirst: true });
  else if (order === "price_desc") query = query.order("price_cents", { ascending: false, nullsLast: true });
  else query = query.order("created_at", { ascending: false, nullsLast: true }); // "new"

  // --- Pagination ---
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    rows: (data || []).map(mapRow),
    total: count || 0,
    page,
    pageSize,
  };
}

