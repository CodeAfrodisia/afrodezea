import React, { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useAuth } from "@context/AuthContext.jsx";
import { Link } from "react-router-dom";
import { fetchFavoritesForEdit, saveFavoritesOrder } from "@lib/listsApi.js";

export default function Tab_FavoritesRanking() {
  const { user } = useAuth();
  const userId = user?.id;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const { rows } = await fetchFavoritesForEdit(userId);
      setRows(rows);
    } catch (e) {
      console.error(e);
      setError("Could not load favorites.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const persist = useCallback(async (ordered) => {
    if (!userId) return;
    setSaving(true);
    try {
      await saveFavoritesOrder(userId, ordered);
    } catch (e) {
      console.error(e);
      setError("Failed to save order.");
    } finally {
      setSaving(false);
    }
  }, [userId]);

  const onDragEnd = useCallback((result) => {
    const { destination, source } = result;
    if (!destination) return;
    if (destination.index === source.index) return;

    const next = Array.from(rows);
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved);
    const reRanked = next.map((r, i) => ({ ...r, rank: i + 1 }));

    setRows(reRanked);
    persist(reRanked);
  }, [rows, persist]);

  const renderCard = (row, index) => {
    const title = row?.name ?? `Product ${row.item_id?.slice(0, 8) || "unknown"}`;
    const img = row?.image_url ?? null;
    const toHref = row?.slug ? `/product/${row.slug}` : null;

    return (
      <Draggable key={row.item_id} draggableId={row.item_id} index={index}>
        {(provided) => (
          <div
            className="card"
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={{
              background: "#111",
              borderRadius: "1rem",
              padding: "1rem",
              width: 240,
              ...provided.draggableProps.style,
            }}
          >
            <div style={{ position:"absolute", top:8, left:8, background:"#000", color:"#fff",
                          borderRadius:"50%", padding:"4px 8px", fontSize:"0.8rem" }}>
              #{index + 1}
            </div>

            <div className="image-wrap" style={{ marginBottom: "0.75rem" }}>
              {img ? (
                <img src={img} alt={title} style={{ width:"100%", height:160, objectFit:"cover", borderRadius:"0.5rem" }} />
              ) : (
                <div style={{ width:"100%", height:160, borderRadius:"0.5rem", background:"#222",
                              color:"#777", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  No image
                </div>
              )}
            </div>

            <div className="meta" style={{ color: "#fff" }}>
              <div style={{ fontWeight: 600, marginBottom: ".5rem", overflow:"hidden", textOverflow:"ellipsis" }}>
                {title}
              </div>

              {toHref ? (
                <Link className="btn btn--ghost" to={toHref}>View Product</Link>
              ) : (
                <button className="btn btn--ghost" disabled title="Product unavailable">View Product</button>
              )}
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ padding: "2rem", color: "#fff" }}>
      <h2 style={{ color: "var(--gold)" }}>Reorder Favorites</h2>

      {error && (
        <div style={{ background:"#330", border:"1px solid red", color:"red", padding:".75rem",
                      borderRadius:".5rem", marginBottom:"1rem" }}>
          {error}
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="favorites" direction="horizontal" type="ROW">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} style={{ display:"flex", gap:"1rem", flexWrap:"wrap" }}>
              {rows.map((row, idx) => renderCard(row, idx))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {saving && <div style={{ marginTop: ".5rem", fontSize: ".9rem", opacity: .7 }}>Saving…</div>}
    </div>
  );
}
