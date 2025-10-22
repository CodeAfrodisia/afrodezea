// src/components/lists/ListsTab.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@context/AuthContext.jsx";
import ListBoard from "@components/lists/ListBoard.jsx";
import SecretSantaPanel from "@components/lists/SecretSantaPanel.jsx";
import {
  getListWithItemsBySlug,
  removeItem,
  reorderItems,
  patchList,
  addMockItemToList, // optional helper you may have
} from "@lib/listsClient.js";

export default function ListsTab() {
  const { user } = useAuth();
  const userId = user?.id || null;

  const [subtab, setSubtab] = useState("wishlist"); // "wishlist" | "gift-list"
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(null);     // { id, slug, name, items: [...] }
  const [giftList, setGiftList] = useState(null);   // for Secret Santa panel

  // load the list for the active subtab
  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const list = await getListWithItemsBySlug(userId, subtab);
      setCurrent(list || null);
      if (subtab === "gift-list") setGiftList(list || null);
    } finally {
      setLoading(false);
    }
  }, [userId, subtab]);

  useEffect(() => { load(); }, [load]);

  // handlers passed through to ListBoard
  const handleRemove = useCallback(async (productId) => {
    if (!current?.id || !productId) return;
    await removeItem(current.id, productId);
    load();
  }, [current?.id, load]);

  const handleReorder = useCallback(async (orderedItems /* array with ranks */) => {
    if (!current?.id) return;
    await reorderItems(current.id, orderedItems);
    load();
  }, [current?.id, load]);

  const handlePatch = useCallback(async (patch) => {
    if (!current?.id) return;
    await patchList(current.id, patch); // e.g., { is_public: true }
    load();
  }, [current?.id, load]);

  const handleAddMockItem = useCallback(async () => {
    if (!current?.id) return;
    await addMockItemToList(current.id); // optional; safe no-op if you don’t have it
    load();
  }, [current?.id, load]);

  return (
    <section className="plate group--corners" style={{ padding: 16 }}>
      <div className="ui-tabs ui-tabs--mini ui-tabs--separated" style={{ marginBottom: 12 }}>
        <button
          className="ui-tabs__btn"
          aria-selected={subtab==="wishlist"}
          onClick={() => setSubtab("wishlist")}
        >
          Wishlist
        </button>
        <button
          className="ui-tabs__btn"
          aria-selected={subtab==="gift-list"}
          onClick={() => setSubtab("gift-list")}
        >
          Gift List
        </button>
        {/* Favorites gets added here later */}
        <div style={{ marginLeft: "auto" }}>
          <button className="btn btn-outline-gold" onClick={handleAddMockItem}>
            Add placeholder item
          </button>
        </div>
      </div>

      {loading && <div style={{ opacity: .7 }}>Loading your lists…</div>}
      {!loading && !current && <div>No list found.</div>}

      {!loading && current && (
        <>
          {/* You can pass `list={current}` (preferred when parent already loaded data)
              or simply pass slug="wishlist"/"gift-list" and let ListBoard do the fetch. */}
          <ListBoard
            list={current}
            onRemove={handleRemove}
            onReorder={handleReorder}
            onPatch={handlePatch}
            variant={current.slug}  // "wishlist" | "gift-list" (for small style tweaks)
          />

          {current.slug === "gift-list" && (
            <div className="surface" style={{ marginTop: 16, padding: 16, borderRadius: 12 }}>
              {/* Secret Santa attaches to the gift list */}
              <SecretSantaPanel listId={current.id} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
