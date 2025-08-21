// src/lib/productsSupabase.js
import supabase from "./supabaseClient.js";

const centsToAmount = (c) => (c ?? 0) / 100;

function mapRow(row) {
  const variants = Array.isArray(row.variants) ? row.variants : [];
  const prices = variants.length ? variants.map((v) => v.price_cents || 0) : [row.price_cents || 0];
  const min = Math.min(...prices);
  const max = Math.max(...prices);

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
      nodes: row.collection ? [{ title: row.collection, handle: (row.collection || "").toLowerCase() }] : [],
    },
    tags: Array.isArray(row.tags) ? row.tags : [],
    image_url: row.image_url || null,
    price_cents: row.price_cents ?? null,
  };
}

// Simple list (kept)
export async function fetchProductsFromSupabase({ query = "", collection = "all", limit = 60 } = {}) {
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

export const fetchProductsSupabase = (args) => fetchProductsFromSupabase(args);

// Single by handle (kept)
export async function fetchProductByHandleFromSupabase(handle) {
  let { data, error } = await supabase.from("products").select("*").eq("slug", handle).maybeSingle();
  if (error?.code === "42703" || (!data && !error)) {
    const res2 = await supabase.from("products").select("*").eq("handle", handle).maybeSingle();
    data = res2.data;
    error = res2.error;
  }
  if (error) throw error;
  return data ? mapRow(data) : null;
}

// Advanced search: FTS + collection + tags + price + sort + paging
export async function searchProducts({
  q,
  collection,               // "all" | key | label
  tags,
  minPriceCents,
  maxPriceCents,
  order = "new",
  page = 1,
  pageSize = 24,
} = {}) {
  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;

  let base = supabase.from("products").select("*", { count: "exact" });

  // Full-text (attempt ft, fallback to ILIKE)
  if (q && q.trim()) {
    const term = q.trim();
    const tryTextSearch = async () => {
      return await supabase.from("products").select("*", { count: "exact" }).textSearch("ft", term, { type: "plain" });
    };
    const tryIlike = async () => {
      const needle = `%${term}%`;
      return await supabase.from("products").select("*", { count: "exact" })
        .or(`title.ilike.${needle},description.ilike.${needle}`);
    };

    let data, error;
    try {
      ({ data, error } = await tryTextSearch());
      if (error?.code === "42703") ({ data, error } = await tryIlike());
    } catch {
      ({ data, error } = await tryIlike());
    }
    if (error) throw error;
    const ids = (data || []).map(r => r.id);
    if (ids.length === 0) return { rows: [], total: 0, page, pageSize };
    base = supabase.from("products").select("*", { count: "exact" }).in("id", ids);
  }

  // Explicit collection filter
  if (collection && collection !== "all") {
    const LABEL_BY_KEY = {
      affirmation: "Affirmation",
      afrodisia: "Afrodisia",
      pantheon: "Pantheon",
      fall: "Fall",
      winter: "Winter",
    };
    const label = LABEL_BY_KEY[collection] ?? collection;
    base = base.eq("collection", label);
  }

  // Tags overlap
  if (tags && tags.length) base = base.overlaps("tags", tags);

  // Price
  if (typeof minPriceCents === "number") base = base.gte("price_cents", minPriceCents);
  if (typeof maxPriceCents === "number") base = base.lte("price_cents", maxPriceCents);

  // Sort
  if (order === "price_asc") base = base.order("price_cents", { ascending: true, nullsFirst: true });
  else if (order === "price_desc") base = base.order("price_cents", { ascending: false, nullsLast: true });
  else base = base.order("created_at", { ascending: false, nullsLast: true });

  // Page
  const query = base.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return { rows: (data || []).map(mapRow), total: count || 0, page, pageSize };
}
