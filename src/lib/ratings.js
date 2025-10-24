// src/lib/ratings.js
import { supabase } from "@lib/supabaseClient.js";

export const RATINGS_TABLE = "product_ratings";
const UPSERT_CONFLICT = "product_id,user_id";

// Generic timeout that doesn't rely on .finally()
function withTimeout(task, ms, label) {
  return new Promise((resolve, reject) => {
    const to = setTimeout(() => {
      try { ctrl?.abort?.(); } catch {}
      reject(new Error(`[timeout] ${label} > ${ms}ms`));
    }, ms);

    // If the task is a PostgREST builder we may have attached an AbortController to it.
    const ctrl = task?.__abortCtrl;

    Promise.resolve(task)
      .then((v) => { clearTimeout(to); resolve(v); })
      .catch((e) => { clearTimeout(to); reject(e); });
  });
}

// Small helper to attach AbortController to a PostgREST builder chain.
function withAbort(builder) {
  if (typeof builder?.abortSignal === "function") {
    const ctrl = new AbortController();
    const next = builder.abortSignal(ctrl.signal);
    // keep a private handle for withTimeout to abort on timeout
    next.__abortCtrl = ctrl;
    return next;
  }
  return builder;
}

/**
 * QUICK session guard:
 * - If caller gave userId, we skip auth calls entirely.
 * - Else we try getSession() but cap it at 3s.
 */
async function getUserIdFast(optionalUserId) {
  if (optionalUserId) return optionalUserId;
  try {
    const { data } = await withTimeout(supabase.auth.getSession(), 3000, "auth.getSession");
    return data?.session?.user?.id || null;
  } catch {
    return null; // behave as anonymous if it’s slow/unavailable
  }
}

/**
 * Create or update the current user's rating for a product.
 */
export async function submitRating(payload) {
  const {
    id,
    product_id,
    floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength,
    comment,
    status,
    upsert = true,
    user_id, // usually omit; DB default = auth.uid()
  } = payload ?? {};

  // Ensure we have (or don’t require) a logged-in user before hitting DB
  const uid = await getUserIdFast(user_id);
  if (!uid) {
    // If your RLS requires auth.uid() for insert/update, fail fast here
    throw new Error("Your session has expired. Please log in and try again.");
  }

  const clean = {
    product_id,
    floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength,
    ...(comment != null ? { comment } : {}),
    ...(status  != null ? { status }  : {}),
    user_id: uid, // ensure row has the same uid RLS checks
  };

  if (id) {
    const op = withAbort(
      supabase.from(RATINGS_TABLE).update(clean).eq("id", id).select().single()
    );
    const { data, error } = await withTimeout(op, 12000, "rating.update");
    if (error) throw error;
    return data;
  }

  if (upsert) {
    const op = withAbort(
      supabase
        .from(RATINGS_TABLE)
        .upsert([clean], { onConflict: UPSERT_CONFLICT })
        .select()
        .single()
    );
    const { data, error } = await withTimeout(op, 12000, "rating.upsert");
    if (error) throw error;
    return data;
  }

  const op = withAbort(
    supabase.from(RATINGS_TABLE).insert([clean]).select().single()
  );
  const { data, error } = await withTimeout(op, 12000, "rating.insert");
  if (error) throw error;
  return data;
}

/**
 * Fetch the CURRENT USER'S existing rating for a product.
 * If userId is provided, we do zero auth calls.
 */
export async function fetchMyRating(product_id, userId) {
  const uid = await getUserIdFast(userId);
  if (!uid) return null;

  const op = withAbort(
    supabase
      .from(RATINGS_TABLE)
      .select(
        "id, product_id, user_id, floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength, comment, status, created_at, updated_at"
      )
      .eq("product_id", product_id)
      .eq("user_id", uid)
      .limit(1)
      .maybeSingle()
  );

  const { data, error } = await withTimeout(op, 10000, "rating.fetchMine");
  if (error) throw error;
  return data || null;
}

export async function fetchRatingSummary(product_id) {
  const op = withAbort(
    supabase.from("ratings_summary").select("*").eq("product_id", product_id).maybeSingle()
  );
  const { data, error } = await withTimeout(op, 10000, "ratings.summary");
  if (error) throw error;
  return data || null;
}

export async function fetchRatingSummaryVerified(product_id) {
  const op = withAbort(
    supabase
      .from(RATINGS_TABLE)
      .select("floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength, status")
      .eq("product_id", product_id)
      .eq("status", "verified")
  );
  const { data, error } = await withTimeout(op, 10000, "ratings.verifiedList");
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
  const op = withAbort(
    supabase
      .from(RATINGS_TABLE)
      .select("id, created_at, comment, floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength, status")
      .eq("product_id", product_id)
      .eq("status", "verified")
      .order("created_at", { ascending: false })
      .limit(limit)
  );
  const { data, error } = await withTimeout(op, 10000, "ratings.recent");
  if (error) throw error;
  return data || [];
}

export async function updateRatingStatus(id, status) {
  const op = withAbort(
    supabase.from(RATINGS_TABLE).update({ status }).eq("id", id).select().single()
  );
  const { data, error } = await withTimeout(op, 10000, "ratings.updateStatus");
  if (error) throw error;
  return data;
}

export async function deleteRating(id) {
  const op = withAbort(supabase.from(RATINGS_TABLE).delete().eq("id", id));
  const { error } = await withTimeout(op, 10000, "ratings.delete");
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
  const op = withAbort(qy);
  const { data, error } = await withTimeout(op, 10000, "ratings.list");
  if (error) throw error;
  return data || [];
}

export async function getProductRatings(product_id, { limit = 50 } = {}) {
  const op = withAbort(
    supabase
      .from(RATINGS_TABLE)
      .select("id, floral, fruity, citrus, woody, fresh, spicy, sweet, smoky, strength, status, created_at")
      .eq("product_id", product_id)
      .order("created_at", { ascending: false })
      .limit(limit)
  );
  const { data, error } = await withTimeout(op, 10000, "ratings.productList");
  if (error) throw error;
  return data ?? [];
}
