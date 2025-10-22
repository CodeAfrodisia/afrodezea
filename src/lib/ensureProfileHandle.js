// src/lib/ensureProfileHandle.js
import supabase from "@lib/supabaseClient.js";

export async function ensureProfileHandle(user) {
  if (!user?.id) return null;
  const userId = user.id;

  // 1) Read existing (by user_id)
  const { data: existing, error: readErr } = await supabase
    .from("profiles")
    .select("user_id, handle")
    .eq("user_id", userId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (existing?.handle) return existing.handle;

  // 2) Generate a base from email prefix (not stored in DB)
  const base =
    (user.email?.split("@")[0] || "user")
      .toLowerCase()
      .replace(/[^a-z0-9._]/g, "_")
      .slice(0, 20) || "user";

  // Helper to try setting a handle atomically (won’t overwrite others)
  async function trySetHandle(handle) {
    // If you have a UNIQUE constraint on profiles.handle, you can just upsert and let the DB enforce uniqueness.
    // Otherwise we do a quick check to avoid likely duplicates.
    const { data: taken, error: tErr } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("handle", handle)
      .maybeSingle();
    if (tErr) throw tErr;
    if (taken) return false;

    const { error: upErr } = await supabase
      .from("profiles")
      .upsert({ user_id: userId, handle }, { onConflict: "id" })
      .select("handle")
      .single();
    if (upErr) return false; // could be a race; treat as not set

    return true;
  }

  // 3) Try base + a few numeric suffixes
  for (let i = 0; i < 5; i++) {
    const tryHandle = i === 0 ? base : `${base}${i}`;
    const ok = await trySetHandle(tryHandle);
    if (ok) return tryHandle;
  }

  // 4) Fallback random suffix
  const fallback = `${base}${Math.floor(Math.random() * 10000)}`;
  const ok = await trySetHandle(fallback);
  if (ok) return fallback;

  // If everything failed due to rare races, just return null (caller can retry)
  return null;
}
