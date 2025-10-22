// src/lib/profileWidgets.js
import supabase from "@lib/supabaseClient.js";

/** List widgets for a user */
export async function listPublicWidgets(userId, { includePrivate = false } = {}) {
  let q = supabase
    .from("profile_widgets")
    .select("id, widget_key, type, payload, size, position, is_public")
    .eq("user_id", userId)
    .order("position", { ascending: true });

  if (!includePrivate) q = q.eq("is_public", true);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

/** Create/publish a widget.
 *  NOTE: we set BOTH `type` and `widget_key` to satisfy legacy NOT NULL on `type`.
 */
export async function publishWidget({
  userId,
  key,                      // e.g. "affirmation", "breathe", "favorites"
  payload = {},
  size = "md",
  position = null,
  isPublic = true,
}) {
  const row = {
    user_id: userId,
    type: key,              // <- legacy column still NOT NULL in your DB
    widget_key: key,        // <- what the renderer reads
    payload,
    size,
    is_public: !!isPublic,
  };
  if (position != null) row.position = position;

  const { data, error } = await supabase
    .from("profile_widgets")
    .insert(row)
    .select("id, widget_key, type, position, is_public")
    .single();

  if (error) throw error;
  return data;
}

/** Toggle visibility */
export async function setWidgetPublic({ userId, id, isPublic }) {
  const { data, error } = await supabase
    .from("profile_widgets")
    .update({ is_public: !!isPublic })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, is_public")
    .single();

  if (error) throw error;
  return data;
}

/** Persist order by updating only `position` (no upserts → no NOT NULL headaches) */
export async function persistWidgetOrder(userId, nextIds) {
  let pos = 1;
  for (const id of nextIds) {
    const { error } = await supabase
      .from("profile_widgets")
      .update({ position: pos++ })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  }
  return true;
}

/** Hard delete a widget */
export async function removeWidget({ userId, id }) {
  const { error } = await supabase
    .from("profile_widgets")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
  return true;
}
