// src/lib/ratings.js
import { supabase } from "@lib/supabaseClient.js";

export const RATINGS_TABLE = "product_ratings";
const UPSERT_CONFLICT = "product_id,user_id";

// Robust timeout wrapper (works for plain values, thenables, and builders)
function withTimeout(task, ms, label) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`[timeout] ${label} > ${ms}ms`)),
      ms
    );
    Promise.resolve(task)
      .then((v) => { clearTimeout(t); resolve(v); })
      .catch((e) => { clearTimeout(t); reject(e); });
  });
}

/**
 * Create or update rating (members-only).
 */
export async function submitRating(payload) {
  const {
    id,
    product_id,
    floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength,
    comment,
    status,
    upsert = true,
    user_id, // usually omit; DB default/auth.uid() covers it
  } = payload ?? {};

  const clean = {
    product_id,
    floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength,
    ...(comment != null ? { comment } : {}),
    ...(status  != null ? { status }  : {}),
    ...(user_id != null ? { user_id } : {}),
  };

  if (id) {
    const { data, error } = await withTimeout(
      supabase.from(RATINGS_TABLE).update(clean).eq("id", id).select().single(),
      12000,
      "rating.update"
    );
    if (error) throw error;
    return data;
  }

  if (upsert) {
    const { data, error } = await withTimeout(
      supabase.from(RATINGS_TABLE).upsert([clean], { onConflict: UPSERT_CONFLICT }).select().single(),
      12000,
      "rating.upsert"
    );
    if (error) throw error;
    return data;
  }

  const { data, error } = await withTimeout(
    supabase.from(RATINGS_TABLE).insert([clean]).select().single(),
    12000,
    "rating.insert"
  );
  if (error) throw error;
  return data;
}

/**
 * Fetch the current user's rating for a product.
 * If caller passes userId, we **do not** call auth at all.
 */
export async function fetchMyRating(product_id, userId) {
  const uid = userId ?? (await (async () => {
    try {
      const { data } = await withTimeout(supabase.auth.getSession(), 4000, "auth.getSession");
      return data?.session?.user?.id || null;
    } catch {
      return null; // treat as not logged in rather than stalling the UI
    }
  })());
  if (!uid) return null;

  const { data, error } = await withTimeout(
    supabase
      .from(RATINGS_TABLE)
      .select("id, product_id, user_id, floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength, comment, status, created_at, updated_at")
      .eq("product_id", product_id)
      .eq("user_id", uid)
      .limit(1)
      .maybeSingle(),
    10000,
    "rating.fetchMine"
  );
  if (error) throw error;
  return data || null;
}

export async function fetchRatingSummary(product_id) {
  const { data, error } = await withTimeout(
    supabase.from("ratings_summary").select("*").eq("product_id", product_id).maybeSingle(),
    10000,
    "ratings.summary"
  );
  if (error) throw error;
  return data || null;
}

export async function fetchRatingSummaryVerified(product_id) {
  const { data, error } = await withTimeout(
    supabase
      .from(RATINGS_TABLE)
      .select("floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength, status")
      .eq("product_id", product_id)
      .eq("status", "verified"),
    10000,
    "ratings.verifiedList"
  );
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
  const { data, error } = await withTimeout(
    supabase
      .from(RATINGS_TABLE)
      .select("id, created_at, comment, floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength, status")
      .eq("product_id", product_id)
      .eq("status", "verified")
      .order("created_at", { ascending: false })
      .limit(limit),
    10000,
    "ratings.recent"
  );
  if (error) throw error;
  return data || [];
}

// Admin helpers (wrapped with timeouts)
export async function updateRatingStatus(id, status) {
  const { data, error } = await withTimeout(
    supabase.from(RATINGS_TABLE).update({ status }).eq("id", id).select().single(),
    10000,
    "ratings.updateStatus"
  );
  if (error) throw error;
  return data;
}

export async function deleteRating(id) {
  const { error } = await withTimeout(
    supabase.from(RATINGS_TABLE).delete().eq("id", id),
    10000,
    "ratings.delete"
  );
  if (error) throw error;
  return true;
}

export async function listRecentRatings({ limit = 100, status, q } = {}) {
  let qy = supabase.from(RATINGS_TABLE).select("*").order("created_at", { ascending: false }).limit(limit);
  if (status && status !== "all") qy = qy.eq("status", status);
  if (q && q.trim()) {
    const needle = `%${q.trim()}%`;
    qy = qy.or([`comment.ilike.${needle}`, `product_id::text.ilike.${needle}`].join(","));
  }
  const { data, error } = await withTimeout(qy, 10000, "ratings.list");
  if (error) throw error;
  return data || [];
}

export async function getProductRatings(product_id, { limit = 50 } = {}) {
  const { data, error } = await withTimeout(
    supabase
      .from(RATINGS_TABLE)
      .select("id, floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength, status, created_at")
      .eq("product_id", product_id)
      .order("created_at", { ascending: false })
      .limit(limit),
    10000,
    "ratings.productList"
  );
  if (error) throw error;
  return data ?? [];
}
