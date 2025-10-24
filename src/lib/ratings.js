// src/lib/ratings.js
import { supabase } from "@lib/supabaseClient.js";

export const RATINGS_TABLE = "product_ratings";
// One rating per (product_id, user_id)
const UPSERT_CONFLICT = "product_id,user_id";

/* ---------- utils ---------- */
function clamp05(n) {
  const x = Number(n ?? 0);
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(5, x));
}

function withDeadline(promise, ms = 12000, label = "op") {
  let t;
  return Promise.race([
    promise,
    new Promise((_, rej) => (t = setTimeout(() => rej(new Error(`[timeout] ${label} > ${ms}ms`)), ms))),
  ]).finally(() => clearTimeout(t));
}

function explain(error) {
  if (!error) return "Unknown error";
  // Supabase/PostgREST common messages
  if (error.code === "42501") return 'Permission denied (RLS). Check policies for inserts/updates on "product_ratings".';
  if (error.message) return error.message;
  return String(error);
}

/* ---------- write APIs ---------- */
/**
 * Create or update the current user's rating for a product.
 * Backend must have RLS policies allowing:
 *  - INSERT: auth.uid() = user_id
 *  - UPDATE: auth.uid() = user_id
 */
export async function submitRating(payload) {
  const {
    id,                 // optional: update-by-id
    product_id,
    floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength,
    comment,            // optional
    status,             // optional
    upsert = true,
    user_id,            // optional: usually omit; DB default should be auth.uid()
  } = payload ?? {};

  // Coerce and clamp
  const clean = {
    product_id,
    floral:   clamp05(floral),
    fruity:   clamp05(fruity),
    citrus:   clamp05(citrus),
    woody:    clamp05(woody),
    fresh:    clamp05(fresh),
    spicy:    clamp05(spicy),
    sweet:    clamp05(sweet),
    smoky:    clamp05(smoky),
    strength: clamp05(strength),
    ...(comment != null ? { comment } : {}),
    ...(status  != null ? { status }  : {}),
    ...(user_id != null ? { user_id } : {}), // if you pass it explicitly (e.g., admin)
  };

  try {
    if (id) {
      const q = supabase
        .from(RATINGS_TABLE)
        .update(clean)
        .eq("id", id)
        .select()
        .single();

      const { data, error } = await withDeadline(q, 12000, "rating.update");
      if (error) throw error;
      return data;
    }

    if (upsert) {
      // Prefer returning the representation reliably
      const q = supabase
        .from(RATINGS_TABLE)
        .upsert([clean], { onConflict: UPSERT_CONFLICT })
        .select()
        .single();

      const { data, error } = await withDeadline(q, 12000, "rating.upsert");
      if (error) throw error;
      return data;
    }

    const q = supabase
      .from(RATINGS_TABLE)
      .insert([clean])
      .select()
      .single();

    const { data, error } = await withDeadline(q, 12000, "rating.insert");
    if (error) throw error;
    return data;
  } catch (e) {
    throw new Error(explain(e));
  }
}

/* ---------- read APIs ---------- */
/** Current user's rating for a product (for editing/prefill). */
export async function fetchMyRating(product_id) {
  try {
    const auth = await withDeadline(supabase.auth.getUser(), 8000, "auth.getUser");
    const uid = auth?.data?.user?.id;
    if (!uid) return null;

    const q = supabase
      .from(RATINGS_TABLE)
      .select(
        "id, product_id, user_id, floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength, comment, status, created_at, updated_at"
      )
      .eq("product_id", product_id)
      .eq("user_id", uid)
      .limit(1)
      .maybeSingle();

    const { data, error } = await withDeadline(q, 10000, "rating.fetchMine");
    if (error) throw error;
    return data || null;
  } catch (e) {
    throw new Error(explain(e));
  }
}

/** Aggregated summary from your view/table (unchanged). */
export async function fetchRatingSummary(product_id) {
  const q = supabase.from("ratings_summary").select("*").eq("product_id", product_id).maybeSingle();
  const { data, error } = await withDeadline(q, 10000, "rating.summary");
  if (error) throw error;
  return data || null;
}

/** Verified-only averages. */
export async function fetchRatingSummaryVerified(product_id) {
  const q = supabase
    .from(RATINGS_TABLE)
    .select("floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength, status")
    .eq("product_id", product_id)
    .eq("status", "verified");

  const { data, error } = await withDeadline(q, 10000, "rating.summaryVerified");
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

/** Recent verified ratings. */
export async function fetchRecentVerifiedRatings(product_id, limit = 6) {
  const q = supabase
    .from(RATINGS_TABLE)
    .select("id, created_at, comment, floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength, status")
    .eq("product_id", product_id)
    .eq("status", "verified")
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data, error } = await withDeadline(q, 10000, "rating.recentVerified");
  if (error) throw error;
  return data || [];
}

/** Admin helpers (unchanged, but guarded). */
export async function updateRatingStatus(id, status) {
  const q = supabase.from(RATINGS_TABLE).update({ status }).eq("id", id).select().single();
  const { data, error } = await withDeadline(q, 10000, "rating.updateStatus");
  if (error) throw error;
  return data;
}

export async function deleteRating(id) {
  const q = supabase.from(RATINGS_TABLE).delete().eq("id", id);
  const { error } = await withDeadline(q, 10000, "rating.delete");
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

  const { data, error } = await withDeadline(query, 10000, "rating.listRecent");
  if (error) throw error;
  return data || [];
}

/** Raw rows if needed. */
export async function getProductRatings(product_id, { limit = 50 } = {}) {
  const q = supabase
    .from(RATINGS_TABLE)
    .select("id, floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength, status, created_at")
    .eq("product_id", product_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data, error } = await withDeadline(q, 10000, "rating.getProduct");
  if (error) throw error;
  return data ?? [];
}
