// src/lib/fetchInsights.js
import { supabase } from "./supabaseClient";

export async function fetchInsights({ userId, domains = ["giving","receiving","apology","forgiveness","attachment","weaving"] }) {
  const { data, error } = await supabase.functions.invoke("generate-insights", {
    body: { user_id: userId, domains }
  });
  if (error) throw error;
  return data?.insights || null;
}

