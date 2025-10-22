// src/components/profile/usePublishWidget.js
import { supabase } from "@lib/supabaseClient";

export async function publishWidget({ userId, key, payload, size = "1x1" }) {
  const { data, error } = await supabase
    .from("profile_widgets")
    .insert({ user_id: userId, widget_key: key, payload, size })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

