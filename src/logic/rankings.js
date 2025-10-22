import { supabase } from "@lib/supabaseClient.js"

export async function getUserRankings(userId) {
  return supabase
    .from("user_item_rankings")
    .select("item_id, rank, is_public")
    .eq("user_id", userId)
    .order("rank", { ascending: true })
}

export async function upsertUserRankings(userId, rows) {
  return supabase
    .from("user_item_rankings")
    .upsert(rows, { onConflict: "user_id,item_id" })
}

