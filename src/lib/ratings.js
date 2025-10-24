// src/lib/ratings.js
import { supabase } from "@lib/supabaseClient.js";

export const RATINGS_TABLE = "product_ratings";
const UPSERT_CONFLICT = "product_id,user_id";

// small timeout helper
function withTimeout(promise, ms, label) {
  let t;
  return Promise.race([
    promise.finally(() => clearTimeout(t)),
    new Promise((_, rej) => (t = setTimeout(() => rej(new Error(`[timeout] ${label} > ${ms}ms`)), ms))),
  ]);
}

/**
 * Create or update the current user's rating for a product.
 * Members-only: one row per (product_id, user_id).
 */
export async function submitRating(payload) {
  const {
    id,
    product_id,
    floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength,
    comment,
    status,
    upsert = true,
    user_id, // usually omit; DB defaults to auth.uid()
  } = payload ?? {};

  const clean = {
    product_id,
    floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength,
    ...(comment != null ? { comment } : {}),
    ...(status  != null ? { status }  : {}),
    ...(user_id != null ? { user_id } : {}),
  };

  if (id) {
    const p = supabase
      .from(RATINGS_TABLE)
      .update(clean)
      .eq("id", id)
      .select()
      .single();

    const { data, error } = await withTimeout(p, 12000, "rating.update");
    if (error) throw error;
    return data;
  }

  if (upsert) {
    const p = supabase
      .from(RATINGS_TABLE)
      .upsert([clean], { onConflict: UPSERT_CONFLICT })
      .select()
      .single();

    const { data, error } = await withTimeout(p, 12000, "rating.upsert");
    if (error) throw error;
    return data;
  }

  const p = supabase
    .from(RATINGS_TABLE)
    .insert([clean])
    .select()
    .single();

  const { data, error } = await withTimeout(p, 12000, "rating.insert");
  if (error) throw error;
  return data;
}

/**
 * Fetch the CURRENT USER'S existing rating for a product (for editing).
 * Important: use getSession (in-memory) instead of getUser (network).
 */
export async function fetchMyRating(product_id) {
  // read from local session (no network)
  const { data: sess } = await withTimeout(
    supabase.auth.getSession(),
    8000,
    "auth.getSession"
  );
  const uid = sess?.session?.user?.id;
  if (!uid) return null;

  const p = supabase
    .from(RATINGS_TABLE)
    .select(
      "id, product_id, user_id, floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength, comment, status, created_at, updated_at"
    )
    .eq("product_id", product_id)
    .eq("user_id", uid)
    .limit(1)
    .maybeSingle();

  const { data, error } = await withTimeout(p, 10000, "rating.fetchMine");
  if (error) throw error;
  return data || null;
}

/** Aggregates (same as before) */
export async function fetchRatingSummary(product_id) {
  const p = supabase
    .from("ratings_summary")
    .select("*")
    .eq("product_id", product_id)
    .maybeSingle();

  const { data, error } = await withTimeout(p, 10000, "ratings.summary");
  if (error) throw error;
  return data || null;
}

export async function fetchRatingSummaryVerified(product_id) {
  const p = supabase
    .from(RATINGS_TABLE)
    .select("floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength, status")
    .eq("product_id", product_id)
    .eq("status", "verified");

  const { data, error } = await withTimeout(p, 10000, "ratings.verifiedList");
  if (error) throw error;

  const n = data?.length ?? 0;
  const avg = (k) => (n ? Math.round(data.reduce((s, r) => s + Number(r[k] ?? 0), 0) / n) : 0);

  return {
    count_verified: n,
    floral_avg:   avg("floral"),
    fruity_avg:   avg("fruity"),
    citrus_avg:   avg("citrus"),
    woody_avg:    avg("woody"),
    fresh_avg:    avg("fresh"),
    spicy_avg:    avg("spicy"),
    sweet_avg:    avg("sweet"),
    smoky_avg:    avg("smoky"),
    strength_avg: avg("strength"),
  };
}

export async function fetchRecentVerifiedRatings(product_id, limit = 6) {
  const p = supabase
    .from(RATINGS_TABLE)
    .select("id, created_at, comment, floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength, status")
    .eq("product_id", product_id)
    .eq("status", "verified")
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data, error } = await withTimeout(p, 10000, "ratings.recent");
  if (error) throw error;
  return data || [];
}

// Admin helpers unchanged but wrapped in timeouts for safety
export async function updateRatingStatus(id, status) {
  const p = supabase
    .from(RATINGS_TABLE)
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  const { data, error } = await withTimeout(p, 10000, "ratings.updateStatus");
  if (error) throw error;
  return data;
}

export async function deleteRating(id) {
  const p = supabase.from(RATINGS_TABLE).delete().eq("id", id);
  const { error } = await withTimeout(p, 10000, "ratings.delete");
  if (error) throw error;
  return true;
}

export async function listRecentRatings({ limit = 100, status, q } = {}) {
  let query = supabase
    .from(RATINGS_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && status !== "all") query = query.eq("status", status);
  if (q && q.trim()) {
    const needle = `%${q.trim()}%`;
    query = query.or([`comment.ilike.${needle}`, `product_id::text.ilike.${needle}`].join(","));
  }

  const { data, error } = await withTimeout(query, 10000, "ratings.list");
  if (error) throw error;
  return data || [];
}

export async function getProductRatings(product_id, { limit = 50 } = {}) {
  const p = supabase
    .from(RATINGS_TABLE)
    .select("id, floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength, status, created_at")
    .eq("product_id", product_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data, error } = await withTimeout(p, 10000, "ratings.productList");
  if (error) throw error;
  return data ?? [];
}
