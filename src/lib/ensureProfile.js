// src/lib/ensureProfile.js
import { supabase } from "@lib/supabaseClient.js";

const HANDLE_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789_.";

function makeHandleFromEmail(email, fallback) {
  if (!email) return fallback;
  const base = email.split("@")[0].toLowerCase();
  const clean = Array.from(base)
    .map(ch => (HANDLE_CHARS.includes(ch) ? ch : "-"))
    .join("")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return clean || fallback;
}

export async function ensureProfile(user) {
  if (!user?.id) throw new Error("No user");
  // Try to fetch existing
  const { data: prof } = await supabase
    .from("profiles")
    .select("id, handle")
    .eq("id", user.id)
    .maybeSingle();

  // If row exists and has handle → done
  if (prof?.handle) return prof.handle;

  // If row exists but no handle, propose one
  const proposed =
    makeHandleFromEmail(user.email, "soul") + "-" + String(user.id).slice(0, 6);

  const payload = {
    id: user.id,                 // important: id = auth.uid()
    handle: prof?.handle || proposed,
  };

  // Upsert (allowed by your self-upsert policy)
  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("handle")
    .maybeSingle();

  if (error) throw error;
  return data?.handle || payload.handle;
}

