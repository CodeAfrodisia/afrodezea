import React, { useEffect, useState } from "react";
import { useTheme as useThemeCtx } from "@lib/useTheme.jsx";
import { fetchFavoritesForEdit, saveFavoritesOrder, removeFavorite, setFavoritesPublic } from "@lib/listsApi.js";

const defaultTheme = { border: "#333", card: "rgba(255,255,255,.03)", text:"#fff" };

export default function MyFavoritesManager({ userId, onChanged }) {
  const themeFromCtx = (() => { try { return useThemeCtx?.() } catch { return null }})();
  const theme = themeFromCtx || defaultTheme;

  const [rows, setRows] = useState([]);
  const [publicFlag, setPublicFlag] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { rows, isPublic } = await fetchFavoritesForEdit(userId);
      setRows(rows);
      setPublicFlag(isPublic);
    })();
  }, [userId]);

  function move(idx, dir) {
    const j = idx + dir;
    if (j < 0 || j >= rows.length) return;
    const copy = [...rows];
    [copy[idx], copy[j]] = [copy[j], copy[idx]];
    setRows(copy.map((r, i) => ({ ...r, rank: i + 1 })));
  }

  async function save() {
    setBusy(true);
    try {
      await saveFavoritesOrder(userId, rows);
      onChanged?.();
    } catch {
      alert("Failed to save ranks.");
    } finally {
      setBusy(false);
    }
  }

  async function removeOne(id) {
    await removeFavorite(userId, id);
    setRows(prev => prev.filter(r => r.item_id !== id).map((r, i) => ({ ...r, rank: i + 1 })));
  }

  async function togglePublic() {
    const next = !publicFlag;
    await setFavoritesPublic(userId, next);
    setPublicFlag(next);
  }

  return (
    <div style={{ display:"grid", gap: 8 }}>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom: 6 }}>
        <button className="chip" onClick={togglePublic}>
          {publicFlag ? "Make Private" : "Make Public"}
        </button>
      </div>

      {rows.map((r, i) => (
        <div key={r.item_id}
             style={{ display:"grid", gridTemplateColumns:"1fr auto auto auto", gap:8, alignItems:"center",
                      padding:12, border:`1px solid ${theme.border}`, borderRadius:10, background:theme.card, color:theme.text }}>
          <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            #{i + 1} · {r.name || r.item_id}
          </div>
          <button onClick={() => move(i, -1)} className="chip">↑</button>
          <button onClick={() => move(i, +1)} className="chip">↓</button>
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={() => removeOne(r.item_id)} className="chip">Remove</button>
          </div>
        </div>
      ))}

      <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
        <button onClick={save} className="chip" disabled={busy}>{busy ? "Saving…" : "Save Order"}</button>
      </div>
    </div>
  );
}
