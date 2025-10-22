// src/lib/ratings.js
import { supabase } from "@lib/supabaseClient.js";

export const RATINGS_TABLE = "product_ratings";
// Members-only: one rating per (product_id, user_id)
const UPSERT_CONFLICT = "product_id,user_id";

/**
 * Create or update the current user's rating for a product.
 * Pass numeric fields (0..5). Backend enforces RLS with auth.uid().
 */
export async function submitRating(payload) {
  // Accept only fields we store (no email/token in members-only mode)
  const {
    id,           // optional: force update-by-id
    product_id,
    floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength,
    comment,      // optional
    status,       // optional (usually set by admin/moderation)
    upsert = true, // default to upsert by (product_id,user_id)
    user_id,      // optional: only include if you want to override (e.g., admin/server)
  } = payload ?? {};

  const clean = {
    product_id,
    floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength,
    ...(comment != null ? { comment } : {}),
    ...(status  != null ? { status }  : {}),
    ...(user_id != null ? { user_id } : {}), // usually omitted; DB default = auth.uid()
  };

  if (id) {
    const { data, error } = await supabase
      .from(RATINGS_TABLE)
      .update(clean)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  if (upsert) {
    const { data, error } = await supabase
      .from(RATINGS_TABLE)
      .upsert([clean], { onConflict: UPSERT_CONFLICT })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from(RATINGS_TABLE)
    .insert([clean])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Fetch the CURRENT USER'S existing rating for a product (for editing).
 * RLS should allow: auth.uid() = user_id. We also filter explicitly by user_id.
 */
export async function fetchMyRating(product_id) {
  // get the currently signed-in user id
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  const uid = authData?.user?.id;
  if (!uid) return null;

  const { data, error } = await supabase
    .from(RATINGS_TABLE)
    .select(
      "id, product_id, user_id, floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength, comment, status, created_at, updated_at"
    )
    .eq("product_id", product_id)
    .eq("user_id", uid)     // ← explicit user scoping
    .limit(1)               // upsert ensures at most 1 per user
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

/**
 * Aggregate summary from your precomputed table/view (keep name you already use).
 */
export async function fetchRatingSummary(product_id) {
  const { data, error } = await supabase
    .from("ratings_summary")
    .select("*")
    .eq("product_id", product_id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

/**
 * Verified-only averages (kept for callers that import this).
 * If your verified data lives in product_ratings with status='verified', this works.
 */
export async function fetchRatingSummaryVerified(product_id) {
  const { data, error } = await supabase
    .from(RATINGS_TABLE)
    .select("floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength, status")
    .eq("product_id", product_id)
    .eq("status", "verified");
  if (error) throw error;

  const n = data?.length ?? 0;
  const avg = (k) =>
    n ? Math.round(data.reduce((s, r) => s + Number(r[k] ?? 0), 0) / n) : 0;

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

/** Recent verified ratings for a product (kept for compatibility) */
export async function fetchRecentVerifiedRatings(product_id, limit = 6) {
  const { data, error } = await supabase
    .from(RATINGS_TABLE)
    .select("id, created_at, comment, floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength, status")
    .eq("product_id", product_id)
    .eq("status", "verified")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/** Admin/moderation helpers (unchanged) */
export async function updateRatingStatus(id, status) {
  const { data, error } = await supabase
    .from(RATINGS_TABLE)
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRating(id) {
  const { error } = await supabase
    .from(RATINGS_TABLE)
    .delete()
    .eq("id", id);
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
    query = query.or(
      [
        `comment.ilike.${needle}`,
        `product_id::text.ilike.${needle}`,
      ].join(",")
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/** For product detail pages, if you still need raw rows (non-verified filter) */
export async function getProductRatings(product_id, { limit = 50 } = {}) {
  const { data, error } = await supabase
    .from(RATINGS_TABLE)
    .select("id, floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength, status, created_at")
    .eq("product_id", product_id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
