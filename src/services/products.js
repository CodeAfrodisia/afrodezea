import { supabase } from "../lib/supabaseClient.js"

/** Fetch a page of products */
export async function fetchProducts({ from = 0, to = 23 } = {}) {
  const q = supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range(from, to)

  const { data, error, count } = await q
  if (error) throw error
  return { items: data ?? [], count }
}

/** Search + filter (server side where possible) */
export async function searchProducts({ query = "", collection, from = 0, to = 23 } = {}) {
  let qb = supabase.from("products").select("*").eq("is_active", true)

  if (collection && collection !== "all") {
    qb = qb.ilike("collection", `%${collection}%`)
  }
  if (query.trim()) {
    // simple OR search on title/description
    qb = qb.or(`title.ilike.%${query}%,description.ilike.%${query}%`)
  }

  qb = qb.order("created_at", { ascending: false }).range(from, to)

  const { data, error, count } = await qb
  if (error) throw error
  return { items: data ?? [], count }
}

/** Single item (for PDP) */
export async function fetchProductBySlug(slug) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle()

  if (error) throw error
  return data
}

