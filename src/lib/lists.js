// /src/lib/lists.ts
import supabase from "@lib/supabaseClient.js";

export type List = {
  id: string; user_id: string; name: string; slug: string;
  description?: string | null; is_public: boolean; sort_order: number;
};

export type ListItem = {
  id: string; list_id: string; product_id: string;
  rank: number; qty: number; note?: string | null;
  product?: { id: string; title?: string; name?: string; slug?: string; image_url?: string | null };
};

export async function getLists(userId: string) {
  const { data, error } = await supabase
    .from("lists")
    .select("id, user_id, name, slug, description, is_public, sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data as List[];
}

export async function getListWithItems(listId: string) {
  const { data, error } = await supabase
    .from("list_items")
    .select(`id, list_id, product_id, rank, qty, note,
             products:products(id, name, title, slug, image_url)`)
    .eq("list_id", listId)
    .order("rank", { ascending: true });
  if (error) throw error;
  return (data || []).map((r: any) => ({
    ...r,
    product: r.products ? {
      id: r.products.id, name: r.products.name ?? r.products.title,
      slug: r.products.slug, image_url: r.products.image_url
    } : undefined
  })) as ListItem[];
}

export async function createList(userId: string, name: string, slug: string, description = "") {
  const { data, error } = await supabase
    .from("lists")
    .insert([{ user_id: userId, name, slug, description, is_public: false, sort_order: 99 }])
    .select()
    .single();
  if (error) throw error;
  return data as List;
}

export async function addItem(listId: string, productId: string, atRank?: number) {
  // If rank omitted, append at end
  const { data: rows } = await supabase
    .from("list_items")
    .select("rank")
    .eq("list_id", listId)
    .order("rank", { ascending: false })
    .limit(1);
  const rank = atRank ?? ((rows?.[0]?.rank ?? 0) + 1);

  const { data, error } = await supabase
    .from("list_items")
    .upsert([{ list_id: listId, product_id: productId, rank, qty: 1 }], { onConflict: "list_id,product_id" })
    .select()
    .single();
  if (error) throw error;
  return data as ListItem;
}

export async function removeItem(listId: string, productId: string) {
  const { error } = await supabase
    .from("list_items")
    .delete()
    .eq("list_id", listId)
    .eq("product_id", productId);
  if (error) throw error;
}

export async function reorderItems(listId: string, ordered: { product_id: string; rank: number }[]) {
  // Use RPC if installed; else fall back to delete+insert
  const { error } = await supabase.rpc("rpc_reorder_list_items", {
    p_list: listId,
    p_rows: ordered
  });
  if (!error) return;

  // Fallback
  await supabase.from("list_items").delete().eq("list_id", listId);
  const payload = ordered.map(r => ({ list_id: listId, product_id: r.product_id, rank: r.rank, qty: 1 }));
  await supabase.from("list_items").insert(payload);
}

export async function setListPublic(listId: string, isPublic: boolean) {
  const { error } = await supabase.from("lists").update({ is_public: isPublic }).eq("id", listId);
  if (error) throw error;
}

