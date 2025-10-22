// src/lib/profileLookup.js
import { supabase } from "@lib/supabaseClient.js";

const _cache = new Map(); // handle -> { id, handle, display_name, bio, avatar_url }

export async function getUserByHandle(handle) {
  if (!handle) return null;
  const key = handle.toLowerCase();
  if (_cache.has(key)) return _cache.get(key);

  const { data, error } = await supabase
    .from("profiles")
    .select("id, handle, display_name, bio, avatar_url")
    .eq("handle", key)
    .maybeSingle();

  if (error || !data) return null;
  _cache.set(key, data);
  return data;
}

