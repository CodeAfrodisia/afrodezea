// lib/listsApi.js
import supabase from "./supabaseClient.js"; // your default export

const FAVORITES = "favorites";

async function ensureList(userId, slug = FAVORITES, name = "Favorites") {
  const { data: row } = await supabase
    .from("lists")
    .select("id, is_public")
    .eq("user_id", userId)
    .eq("slug", slug)
    .maybeSingle();

  if (row) return row;

  const { data, error } = await supabase
    .from("lists")
    .insert({ user_id: userId, slug, name, is_public: false })
    .select("id, is_public")
    .single();
  if (error) throw error;
  return data;
}

export async function fetchFavoritesPublicByUserId(userId, { limit = 10 } = {}) {
  // Primary (new schema)
  const { data: list } = await supabase
    .from("lists")
    .select("id, is_public")
    .eq("user_id", userId)
    .eq("slug", FAVORITES)
    .maybeSingle();

  if (list?.id && list.is_public) {
    const { data, error } = await supabase
      .from("list_items")
      .select("product_id, rank, products:products(id, name, image_url, slug)")
      .eq("list_id", list.id)
      .order("rank", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(r => ({
      item_id: r.product_id,
      rank: r.rank,
      name: r.products?.name ?? null,
      image_url: r.products?.image_url ?? null,
      slug: r.products?.slug ?? null,
    }));
  }

  // Fallback (old schema/view)
  const { data: legacy } = await supabase
    .from("old_favorites_v")   // the compat view from the migration plan
    .select("item_id, rank")
    .eq("user_id", userId)
    .order("rank", { ascending: true })
    .limit(limit);

  if (!legacy?.length) return [];

  const ids = legacy.map(r => r.item_id);
  const { data: products } = await supabase
    .from("products")
    .select("id, name, image_url, slug")
    .in("id", ids);

  const pmap = new Map((products || []).map(p => [p.id, p]));
  return legacy.map(r => {
    const p = pmap.get(r.item_id);
    return {
      item_id: r.item_id,
      rank: r.rank,
      name: p?.name ?? null,
      image_url: p?.image_url ?? null,
      slug: p?.slug ?? null,
    };
  });
}

export async function fetchFavoritesForEdit(userId) {
  const { id, is_public } = await ensureList(userId);
  const { data, error } = await supabase
    .from("list_items")
    .select("id, product_id, rank, products:products(id, name, image_url)")
    .eq("list_id", id)
    .order("rank", { ascending: true });
  if (error) throw error;

  return {
    listId: id,
    isPublic: !!is_public,
    rows: (data || []).map(r => ({
      item_id: r.product_id,
      rank: r.rank,
      name: r.products?.name ?? null,
      image_url: r.products?.image_url ?? null,
    })),
  };
}

export async function saveFavoritesOrder(userId, ordered) {
  const { id } = await ensureList(userId);
  // Upsert ranks (simple, reliable)
  const payload = ordered.map((it, i) => ({
    list_id: id,
    product_id: it.item_id,
    rank: i + 1,
  }));
  const { error } = await supabase.from("list_items").upsert(payload, {
    onConflict: "list_id,product_id",
  });
  if (error) throw error;
}

export async function removeFavorite(userId, productId) {
  const { id } = await ensureList(userId);
  const { error } = await supabase
    .from("list_items")
    .delete()
    .eq("list_id", id)
    .eq("product_id", productId);
  if (error) throw error;
}

export async function setFavoritesPublic(userId, flag) {
  const row = await ensureList(userId);
  const { error } = await supabase
    .from("lists")
    .update({ is_public: !!flag })
    .eq("id", row.id);
  if (error) throw error;
  return { ...row, is_public: !!flag };
}

