// src/lib/productsSupabase.js
import supabase from "./supabaseClient.js";

/* ---------------- utils ---------------- */
const centsToAmount = (c) => (c ?? 0) / 100;

function parseMaybeJson(v) {
  if (Array.isArray(v) || v === null || typeof v === "object") return v;
  if (typeof v === "string") {
    try { return JSON.parse(v); } catch {/* noop */}
  }
  return null;
}

/* ---------------- mapping ---------------- */
function mapRow(row) {
  // Never reference undeclared identifiers — compute locally and use those.
  const slug = row?.slug ?? null;
  const handle = row?.handle ?? null;        // some older rows may still have this
  const handleValue = slug ?? handle ?? null;

  const variantsRaw = parseMaybeJson(row?.variants) ?? [];
  const optionsRaw  = parseMaybeJson(row?.options)  ?? [];
  const variants    = Array.isArray(variantsRaw) ? variantsRaw : [];
  const options     = Array.isArray(optionsRaw)  ? optionsRaw  : [];

  const variantPrices = variants
    .map(v => v?.price_cents)
    .filter((n) => typeof n === "number");
  const basePrices = variantPrices.length ? variantPrices : [row?.price_cents ?? 0];
  const min = Math.min(...basePrices);
  const max = Math.max(...basePrices);

  return {
    id: row?.id ?? null,
    title: row?.title ?? "",
    handle: handleValue, // ← unified field the UI expects
    description: row?.description || "",
    collection: row?.collection || "",
    images: { nodes: row?.image_url ? [{ url: row.image_url }] : [] },

    priceRange: {
      minVariantPrice: { amount: centsToAmount(min), currencyCode: "USD" },
      maxVariantPrice: { amount: centsToAmount(max), currencyCode: "USD" },
    },

    variants: {
      nodes: variants.map((v, idx) => ({
        id: v?.id ?? v?.sku ?? `${row?.id || "p"}:v${idx}`,
        title:
          v?.title ??
          (Array.isArray(v?.selectedOptions) && v.selectedOptions.length
            ? v.selectedOptions.map(o => o?.value).join(" / ")
            : "Default"),
        availableForSale:
          v?.availableForSale != null ? !!v.availableForSale : true,
        price: {
          amount: v?.price_cents != null ? centsToAmount(v.price_cents) : null,
          currencyCode: "USD",
        },
        selectedOptions: Array.isArray(v?.selectedOptions) ? v.selectedOptions : [],
      })),
    },

    options: options,

    collections: {
      nodes: row?.collection
        ? [{ title: row.collection, handle: String(row.collection).toLowerCase() }]
        : [],
    },

    tags: Array.isArray(row?.tags) ? row.tags : [],
    image_url: row?.image_url || null,
    price_cents: row?.price_cents ?? null,
    created_at: row?.created_at ?? null,
  };
}

/* ---------------- timeout helper ---------------- */
async function withTimeout(promise, ms = 20000, label = "op") {
  let timer;
  try {
    const raced = await Promise.race([
      promise,
      new Promise((_, rej) =>
        (timer = setTimeout(() => rej(new Error(`[timeout] ${label} > ${ms}ms`)), ms))
      ),
    ]);
    return raced;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------- list/search ---------------- */
export async function searchProducts({
  q = "",
  collection = "all",
  tags = [],
  minPriceCents,
  maxPriceCents,
  order = "new",
  page = 1,
  pageSize = 24,
} = {}) {
  const from = Math.max(0, (page - 1) * pageSize);
  const to   = from + pageSize - 1;

  let query = supabase.from("products").select("*", { count: "exact" });

  if (q && q.trim()) {
    const needle = `%${q.trim()}%`;
    query = query.or(`title.ilike.${needle},description.ilike.${needle}`);
  }

  if (collection && collection !== "all") {
    const LABEL_BY_KEY = {
      affirmation: "Affirmation",
      afrodisia:   "Afrodisia",
      pantheon:    "Pantheon",
      fall:        "Fall",
      winter:      "Winter",
    };
    const label = LABEL_BY_KEY[collection] ?? collection;
    query = query.eq("collection", label);
  }

  if (tags?.length) query = query.overlaps("tags", tags.map(t => t.toLowerCase()));
  if (typeof minPriceCents === "number") query = query.gte("price_cents", minPriceCents);
  if (typeof maxPriceCents === "number") query = query.lte("price_cents", maxPriceCents);

  if (order === "price_asc")       query = query.order("price_cents", { ascending: true,  nullsLast: true });
  else if (order === "price_desc") query = query.order("price_cents", { ascending: false, nullsLast: true });
  else                             query = query.order("created_at",  { ascending: false, nullsLast: true });

  query = query.range(from, to);

  const { data, error, count } = await withTimeout(query, 20000, "products.search");
  if (error) throw error;

  return { rows: (data || []).map(mapRow), total: count || 0, page, pageSize };
}

/* ---------------- single by slug (canonical) ---------------- */
export async function fetchProductBySlugFromSupabase(slug) {
  // Try the canonical column first
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRow(data) : null;
}

/* ---------------- single by “legacy handle” fallback ---------------- */
export async function fetchProductByLegacyHandle(handle) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("handle", handle)
    .maybeSingle();

  if (error) throw error;
  return data ? mapRow(data) : null;
}

/* ---------------- REST fallbacks (browser-friendly) ---------------- */
const REST_BASE = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1`;
const REST_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY;

function restHeaders() {
  return {
    apikey: REST_KEY,
    Authorization: `Bearer ${REST_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function fetchProductBySlugREST(slug) {
  const url = `${REST_BASE}/products?select=*&slug=eq.${encodeURIComponent(slug)}&limit=1`;
  const res = await fetch(url, { headers: restHeaders() });
  if (!res.ok) throw new Error(`REST ${res.status}`);
  const json = await res.json();
  return json?.[0] ? mapRow(json[0]) : null;
}

/* (export name retained for callers that still import it) */
export async function fetchProductByHandleFromSupabase(handle) {
  const slug = String(handle || "").toLowerCase();
  const url =
    `${SUPABASE_URL}/rest/v1/products` +
    `?select=*` +
    `&slug=eq.${encodeURIComponent(slug)}` +
    `&limit=1`;

  const res = await withTimeout(
    fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: "application/json",
        Prefer: "count=exact",
      },
    }),
    10000,
    "product.bySlug.rest"
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`REST ${res.status}: ${body || "failed"}`);
  }

  const arr = await res.json();
  return arr?.[0] ? mapRow(arr[0]) : null;
}


export async function fetchProductsREST({ limit = 36, offset = 0 } = {}) {
  const url = new URL(`${REST_BASE}/products`);
  url.searchParams.set(
    "select",
    [
      "id",
      "slug",
      "handle:slug", // expose slug under `handle` for legacy UI code
      "title",
      "price_cents",
      "image_url",
      "collection",
      "tags",
      "created_at",
      "variants",
      "options",
    ].join(",")
  );
  url.searchParams.set("order", "created_at.desc.nullslast");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  const res = await fetch(url.toString(), { headers: restHeaders() });
  if (!res.ok) {
    let body;
    try { body = await res.json(); } catch { body = null; }
    throw new Error(`REST ${res.status}${body?.message ? `: ${body.message}` : ""}`);
  }
  const json = await res.json();
  return Array.isArray(json) ? json.map(mapRow) : [];
}

export { mapRow, withTimeout };
