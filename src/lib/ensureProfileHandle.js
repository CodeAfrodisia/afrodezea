// src/lib/ensureProfileHandle.js
import supabase from "@lib/supabaseClient.js";

/**
 * Ensure the user has a unique, non-empty `profiles.handle`.
 * Returns the claimed handle (string) or null if we couldn't set one.
 */
export async function ensureProfileHandle(user) {
  if (!user?.id) return null;
  const userId = user.id;

  // 1) Do we already have a handle?
  const { data: existing, error: readErr } = await supabase
    .from("profiles")
    .select("user_id, handle")
    .eq("user_id", userId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (existing?.handle) return existing.handle;

  // 2) Build a clean base from email prefix
  const base =
    (user.email?.split("@")[0] || "user")
      .toLowerCase()
      .replace(/[^a-z0-9._]/g, "_")
      .slice(0, 20) || "user";

  // Candidate generator: base, base1..base4, then a random fallback
  const candidates = [base, ...Array.from({ length: 4 }, (_, i) => `${base}${i + 1}`)];
  candidates.push(`${base}${Math.floor(Math.random() * 10000)}`);

  // Attempt to claim a handle by upserting the user's row.
  // - Uses onConflict: "user_id" so it works whether the row exists or not.
  // - If `handle` has a UNIQUE constraint, a 23505/409 will be thrown and we try the next.
  async function tryClaim(handle) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .upsert({ id: userId, user_id: userId, handle }, { onConflict: "user_id" })
        .select("handle")
        .single();

      if (error) throw error;
      return !!data?.handle;
    } catch (e) {
      const code = e?.code || "";
      const msg = String(e?.message || "");
      // Unique violation surfaces as Postgres 23505 or PostgREST 409
      if (code === "23505" || /409\b/.test(msg)) return false;
      // Other errors: rethrow (likely RLS or schema issues)
      throw e;
    }
  }

  for (const h of candidates) {
    // Optional quick pre-check to avoid unnecessary conflicts if you don't have a UNIQUE index:
    // const { data: taken } = await supabase.from("profiles").select("user_id").eq("handle", h).maybeSingle();
    // if (taken) continue;

    const ok = await tryClaim(h);
    if (ok) return h;
  }

  // If everything failed due to rare races, give up quietly (caller can retry later)
  return null;
}
