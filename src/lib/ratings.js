// src/lib/ratings.js
import supabase from "./supabaseClient.js";

const TABLE = "product_ratings"; // <-- was "ratings"
export const RATINGS_TABLE = "product_ratings"; // <-- use your actual table name

/** Insert one rating row */
export async function submitRating(payload) {
  // payload must include: product_id (uuid), optional email, numeric scores 0..5
  const toInsert = {
    status: "pending",
    ...payload,
  };

  const { data, error } = await supabase
    .from(RATINGS_TABLE)
    .insert([toInsert])
    .select()
    .single();

  if (error) throw error;
  return data;
}


/** Aggregate summary via RPC */
export async function fetchRatingSummary(product_id) {
  const { data, error } = await supabase
    .from("ratings_summary")
    .select("*")
    .eq("product_id", product_id)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}


/** NEW: update moderation/status for a rating (e.g., 'pending' | 'approved' | 'rejected') */
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

/** Optional: delete a rating */
export async function deleteRating(id) {
  const { error } = await supabase
    .from("product_ratings")
    .delete()
    .eq("id", id);
  if (error) throw error;
  return true;
}

/** List recent ratings across products (Admin/Insights) */
export async function listRecentRatings({ limit = 100, status, q } = {}) {
  let query = supabase
    .from(RATINGS_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  // optional status filter
  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  // optional free-text search across a few fields
  if (q && q.trim()) {
    const needle = `%${q.trim()}%`;
    query = query.or(
      [
        `email.ilike.${needle}`,
        `comment.ilike.${needle}`,
        `product_id::text.ilike.${needle}`
      ].join(",")
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}


/** Optional: list recent ratings for a single product */
export async function getProductRatings(productId, { limit = 50 } = {}) {
  const { data, error } = await supabase
    .from("product_ratings")
    .select("id, email, floral, fruity, woody, fresh, spicy, strength, status, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchRatingSummaryVerified(productId) {
  const { data, error } = await supabase
    .from("ratings")
    .select("floral, fruity, woody, fresh, spicy, strength, status", { count: "exact" })
    .eq("product_id", productId)
    .eq("status", "verified"); // verified-only

  if (error) throw error;

  const n = data?.length ?? 0;
  const avg = (k) => (n ? Math.round((data.reduce((s, r) => s + (Number(r[k] ?? 0)), 0) / n)) : 0);
  return {
    count_verified: n,
    floral_avg: avg("floral"),
    fruity_avg: avg("fruity"),
    woody_avg:  avg("woody"),
    fresh_avg:  avg("fresh"),
    spicy_avg:  avg("spicy"),
    strength_avg: avg("strength"),
  };
}

export async function fetchRecentVerifiedRatings(productId, limit = 6) {
  const { data, error } = await supabase
    .from("ratings")
    .select("id, created_at, comment, floral, fruity, woody, fresh, spicy, strength")
    .eq("product_id", productId)
    .eq("status", "verified")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}
