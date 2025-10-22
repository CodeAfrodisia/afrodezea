// /components/lists/ListBoard.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import supabase from "@lib/supabaseClient.js";

export default function ListBoard({
  userId,
  list,                       // optional: if you already resolved it upstream
  slug,                        // optional: if you want this component to resolve/create
  title = "List",
  emptyHint = "Nothing here yet.",
  onResolvedList,             // optional: callback(meta) when we resolve/create a list
  variant,                    // "wishlist" | "gift-list" | etc (styling/behavior hooks)
}) {
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [meta,    setMeta]    = useState(null);  // the lists row
  const [items,   setItems]   = useState([]);    // [{ id, product_id, rank, qty, note, products:{...} }]

  // resolve or create the list if we got slug+userId
  // 1) Resolve or create the list (safe against 409/races)
const resolveList = useCallback(async () => {
  if (!userId || !slug) return null;

  // Try to find it first
  {
    const { data, error } = await supabase
      .from("lists")
      .select("*")
      .eq("user_id", userId)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  // Not found -> try to create (handle 409/unique by re-selecting)
  const fallbackName =
    title || slug.replace(/[-_]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

  const ins = await supabase
    .from("lists")
    .insert([{ user_id: userId, slug, name: fallbackName, is_public: false, sort_order: 1 }])
    .select("*")
    .single();

  if (!ins.error && ins.data) return ins.data;

  const isConflict =
    ins.error?.code === "23505" || ins.status === 409 ||
    ins.error?.message?.toLowerCase?.().includes("duplicate");

  if (isConflict) {
    const { data, error } = await supabase
      .from("lists")
      .select("*")
      .eq("user_id", userId)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  }

  throw ins.error || new Error("Failed to create list");
}, [userId, slug, title]);

// 2) Load items, then hydrate products via a second query (no embedded join)
const loadItems = useCallback(async (listId) => {
  if (!listId) return [];

  // A) fetch list rows
  const { data: rows, error } = await supabase
    .from("list_items")
    .select("id,list_id,product_id,rank,qty,note")
    .eq("list_id", listId)
    .order("rank", { ascending: true });

  if (error) throw error;

  const base = Array.isArray(rows) ? rows : [];
  if (base.length === 0) return base.map((r) => ({ ...r, products: null }));

  // B) fetch products by id, then merge
  const ids = [...new Set(base.map((r) => r.product_id).filter(Boolean))];
  let map = new Map();
  if (ids.length) {
    const { data: prods, error: perr } = await supabase
      .from("products")
      .select("id,name,image_url,slug")
      .in("id", ids);
    if (!perr && Array.isArray(prods)) {
      map = new Map(prods.map((p) => [p.id, p]));
    }
  }

  return base.map((r) => ({ ...r, products: map.get(r.product_id) || null }));
}, []);


  // bootstrap: prefer `list` prop; otherwise resolve via slug+userId
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");

        let base = list ?? null;
        if (!base) {
          if (!userId || !slug) {
            // nothing we can do; render empty quietly
            setMeta(null);
            setItems([]);
            return;
          }
          base = await resolveList();
        }

        if (!alive) return;
        setMeta(base);
        onResolvedList?.(base);

        const rows = await loadItems(base?.id);
        if (!alive) return;
        setItems(rows);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || String(e));
        setMeta(null);
        setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [list, userId, slug, resolveList, loadItems, onResolvedList]);

  // safe deriveds
  const safeMeta  = meta ?? list ?? null;
  const safeItems = useMemo(() => Array.isArray(items) ? items : [], [items]);

  // simple reorder helpers (up/down)
  const move = useCallback((idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= safeItems.length) return;
    const copy = [...safeItems];
    [copy[idx], copy[j]] = [copy[j], copy[idx]];
    // reassign rank 1..N
    const reassigned = copy.map((r, i) => ({ ...r, rank: i + 1 }));
    setItems(reassigned);
  }, [safeItems]);

  // persist order
  const saveOrder = useCallback(async () => {
    if (!safeMeta?.id || !userId) return;
    try {
      const shaped = safeItems.map((it, i) => ({
        list_id: safeMeta.id,
        product_id: it.product_id,
        rank: i + 1,
        qty: it.qty ?? 1,
        note: it.note ?? null,
      }));

      // simplest: delete + insert (or use an RPC if you have one)
      await supabase.from("list_items").delete().eq("list_id", safeMeta.id);
      if (shaped.length) await supabase.from("list_items").insert(shaped);
    } catch (e) {
      setError(`Failed to save: ${e?.message || e}`);
    }
  }, [safeItems, safeMeta?.id, userId]);

  // remove one item
  const removeItem = useCallback(async (product_id) => {
    if (!safeMeta?.id) return;
    await supabase.from("list_items").delete().eq("list_id", safeMeta.id).eq("product_id", product_id);
    setItems((prev) => prev.filter((r) => r.product_id !== product_id));
  }, [safeMeta?.id]);

  // UI bits
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 12 };

  return (
    <div className="surface" style={{ padding: 12, borderRadius: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <div style={{ opacity: .75, fontSize: 12 }}>
          {loading ? "Loading…" : (safeItems.length ? `${safeItems.length} items` : "")}
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 8, color: "#f66" }}>
          {error}
        </div>
      )}

      {!loading && !error && (!safeMeta || safeItems.length === 0) && (
        <div style={{ marginTop: 8, opacity: .85 }}>{emptyHint}</div>
      )}

      {!loading && !error && safeMeta && safeItems.length > 0 && (
        <>
          <div style={{ marginTop: 12, ...grid }}>
            {safeItems.map((r, i) => {
              const p = r.products || {};
              const title = p.name || `Product ${r.product_id}`;
              return (
                <div key={r.product_id} className="card"
                     style={{ background:"#111", borderRadius:12, padding:12, border:"1px solid #333" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <strong>#{r.rank}</strong>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="chip" onClick={() => move(i,-1)} disabled={i===0}>↑</button>
                      <button className="chip" onClick={() => move(i,+1)} disabled={i===safeItems.length-1}>↓</button>
                    </div>
                  </div>

                  {p.image_url ? (
                    <img src={p.image_url} alt={title} style={{ width:"100%", aspectRatio:"1/1", objectFit:"cover", borderRadius:10 }} />
                  ) : (
                    <div style={{ width:"100%", aspectRatio:"1/1", borderRadius:10, background:"#1b1b1b", display:"grid", placeItems:"center" }}>🕯️</div>
                  )}

                  <div style={{ marginTop: 8, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {title}
                  </div>

                  <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <button className="btn btn--ghost" onClick={() => removeItem(r.product_id)}>Remove</button>
                    <a className="btn btn--ghost" href={p.slug ? `/product/${p.slug}` : "#"} aria-disabled={!p.slug}>
                      View
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop: 12 }}>
            <button className="btn btn-outline-gold" onClick={saveOrder}>Save Order</button>
          </div>
        </>
      )}
    </div>
  );
}
