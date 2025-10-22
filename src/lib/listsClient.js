import supabase from "./supabaseClient";

/** Ensure baseline lists exist for a user. */
export async function ensureDefaultLists(userId) {
  const wanted = [
    { name: "Wishlist", slug: "wishlist", description: "Rank in order of what you want to try next." },
    { name: "Gift List", slug: "gift-list", description: "Things you plan to gift (add an optional recipient)." },
    // Favorites will be added later and also live here ("favorites")
  ];

  const { data: existing } = await supabase
    .from("lists")
    .select("id, slug")
    .eq("user_id", userId);

  const have = new Set((existing || []).map(r => r.slug));
  const toInsert = wanted.filter(w => !have.has(w.slug))
                         .map((w, i) => ({ ...w, user_id: userId, sort_order: i + 1 }));

  if (toInsert.length) await supabase.from("lists").insert(toInsert);
}

/** Fetch lists + items (one round-trip per list for simplicity). */
export async function getListsWithItems(userId, slugs = ["wishlist","gift-list"]) {
  const { data: lists, error } = await supabase
    .from("lists")
    .select("*")
    .eq("user_id", userId)
    .in("slug", slugs)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  const out = [];
  for (const l of (lists || [])) {
    const { data: items } = await supabase
      .from("list_items")
      .select("*")
      .eq("list_id", l.id)
      .order("rank", { ascending: true });
    out.push({ ...l, items: items || [] });
  }
  return out;
}

export async function addItemToList(listId, { product_id, variant_id = null, note = "", recipient = "", qty = 1 }) {
  // compute next rank
  const { data: rows } = await supabase
    .from("list_items")
    .select("rank")
    .eq("list_id", listId)
    .order("rank", { ascending: false })
    .limit(1);
  const nextRank = (rows?.[0]?.rank || 0) + 1;

  return supabase.from("list_items").insert({
    list_id: listId,
    product_id, variant_id, note, recipient, qty,
    rank: nextRank
  });
}

export async function removeItemFromList(itemId) {
  return supabase.from("list_items").delete().eq("id", itemId);
}

/** Persist a new order after drag/drop. `idsInOrder` is top→bottom. */
export async function reorderListItems(listId, idsInOrder) {
  // batch updates (parallel)
  const updates = idsInOrder.map((id, i) =>
    supabase.from("list_items").update({ rank: i + 1 }).eq("id", id)
  );
  await Promise.all(updates);
}

/** Update note/recipient/qty/etc. */
export async function updateListItem(itemId, patch) {
  return supabase.from("list_items").update(patch).eq("id", itemId);
}

/* -------- Secret Santa (very basic) -------- */
export async function createGiftGroup(userId, name) {
  const { data, error } = await supabase
    .from("gift_groups").insert({ user_id: userId, name }).select("*").single();
  if (error) throw error;
  return data;
}
export async function addMember(groupId, { display_name, email = null }) {
  const { data, error } = await supabase
    .from("gift_group_members").insert({ group_id: groupId, display_name, email }).select("*").single();
  if (error) throw error;
  return data;
}
export async function listMembers(groupId) {
  const { data } = await supabase
    .from("gift_group_members").select("*").eq("group_id", groupId).order("display_name");
  return data || [];
}
export async function runSecretSantaDraw(groupId) {
  // fetch members
  const members = await listMembers(groupId);
  if ((members?.length || 0) < 2) throw new Error("Need at least 2 members.");

  // simple shuffle until no self-pairs (small N → fast)
  const ids = members.map(m => m.id);
  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
  let receivers = [...ids];

  for (let tries = 0; tries < 100; tries++) {
    shuffle(receivers);
    if (ids.every((giver, i) => giver !== receivers[i])) break;
  }
  if (!ids.every((giver, i) => giver !== receivers[i])) {
    // fallback simple rotate
    receivers = [...ids.slice(1), ids[0]];
  }

  // clear prior draw for this group (optional)
  await supabase.from("gift_draws").delete().eq("group_id", groupId);

  // write new draw
  const rows = ids.map((giver_id, i) => ({ group_id: groupId, giver_id, receiver_id: receivers[i] }));
  await supabase.from("gift_draws").insert(rows);
  return rows;
}
export async function getGiftDraw(groupId) {
  const { data } = await supabase
    .from("gift_draws").select("*, giver:gift_group_members!giver_id(*), receiver:gift_group_members!receiver_id(*)")
    .eq("group_id", groupId);
  return data || [];
}

