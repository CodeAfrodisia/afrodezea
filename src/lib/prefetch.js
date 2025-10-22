// src/lib/prefetch.js
// Tiny cache + helpers to prefetch product detail data and route chunks.
import { fetchProductByHandleFromSupabase } from "./productsSupabase.js";

/* ---------------- cache (with TTL) + inflight dedupe ---------------- */
const TTL_MS = 10 * 60 * 1000; // 10 minutes
const productCache = new Map();   // key -> { data, t }
const inflight = new Map();       // key -> Promise

const norm = (k) => String(k || "").trim().toLowerCase();

/* ---------------- route chunk warmers (code-split) ------------------ */
// These imports should match your lazy() calls elsewhere.
let warmedQuick = false;
export function prefetchQuickViewChunks() {
  if (warmedQuick) return;
  warmedQuick = true;
  // Lazy component lives at ../components/shop/QuickViewModal.jsx in ProductsPage
  import("../components/shop/QuickViewModal.jsx").catch(() => {});
}

let warmedDetail = false;
export function prefetchProductDetailChunks() {
  if (warmedDetail) return;
  warmedDetail = true;
  // Product detail route chunk
  import("../pages/ProductDetail.jsx").catch(() => {});
}

/* ---------------- product data prefetch ----------------------------- */
export async function prefetchProductByHandle(handleOrSlug) {
  const key = norm(handleOrSlug);
  if (!key) return null;

  // valid & fresh cache?
  const hit = productCache.get(key);
  if (hit && Date.now() - hit.t < TTL_MS) return hit.data;

  // dedupe concurrent requests
  if (inflight.has(key)) return inflight.get(key);

  const p = (async () => {
    try {
      const data = await fetchProductByHandleFromSupabase(key);
      if (data) productCache.set(key, { data, t: Date.now() });
      return data || null;
    } catch {
      return null; // prefetch failures are non-fatal
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}

/* ---------------- combo warmers for hover/focus --------------------- */
export function warmForQuickView(handleOrSlug) {
  // Warm data + modal chunk in parallel
  prefetchQuickViewChunks();
  return prefetchProductByHandle(handleOrSlug);
}

export function warmForProductDetail(handleOrSlug) {
  // Warm data + detail route chunk in parallel
  prefetchProductDetailChunks();
  return prefetchProductByHandle(handleOrSlug);
}

/* ---------------- read-through getter -------------------------------- */
export function getCachedProduct(handleOrSlug) {
  const key = norm(handleOrSlug);
  const hit = productCache.get(key);
  return hit ? hit.data : null;
}
