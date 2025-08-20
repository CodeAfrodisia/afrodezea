// Tiny cache + helpers to prefetch product detail data.
import { fetchProductByHandleFromSupabase } from "./productsSupabase.js";

const productCache = new Map(); // key: handle/slug -> normalized product

export async function prefetchProductByHandle(handleOrSlug) {
  const key = String(handleOrSlug || "").trim();
  if (!key) return null;
  if (productCache.has(key)) return productCache.get(key);
  try {
    const p = await fetchProductByHandleFromSupabase(key);
    if (p) productCache.set(key, p);
    return p;
  } catch {
    // swallow; just a prefetch
    return null;
  }
}

export function getCachedProduct(handleOrSlug) {
  const key = String(handleOrSlug || "").trim();
  return productCache.get(key) || null;
}

