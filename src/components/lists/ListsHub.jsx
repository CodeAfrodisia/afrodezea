// /code/components/lists/ListsHub.jsx
import React, { useMemo, useState } from "react";
import { useAuth } from "@context/AuthContext.jsx";

// ✅ unified boards
import ListBoard from "./ListBoard.jsx";
import SecretSantaPanel from "./SecretSantaPanel.jsx";

export default function ListsHub() {
  const { user } = useAuth();
  const userId = user?.id;

  const [subtab, setSubtab] = useState("wishlist"); // "wishlist" | "gift-list" | "favorites" (later)
  const [giftList, setGiftList] = useState(null);   // resolved list meta for Secret Santa panel

  const tabs = useMemo(
    () => [
      { key: "wishlist",   label: "Wishlist (Try Next)" },
      { key: "gift-list",  label: "Gift List" },
      { key: "favorites",  label: "Favorites" }, // ← wire after we migrate favorites
    ],
    []
  );

  return (
    <div className="plate group--corners" style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Lists</h2>
      <p style={{ opacity: .8, marginTop: 0 }}>
        Rank and organize products. Publish a list to show it on your public profile.
      </p>

      {/* Subtabs */}
      <div className="ui-tabs ui-tabs--mini ui-tabs--separated" style={{ marginBottom: 12 }}>
        {tabs.map(t => (
          <button
            key={t.key}
            className="ui-tabs__btn"
            aria-selected={subtab === t.key}
            onClick={() => setSubtab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Boards */}
      {subtab === "wishlist" && (
        <section style={{ marginTop: 8 }}>
          <ListBoard
            userId={userId}
            slug="wishlist"
            title="Wishlist (Try Next)"
            emptyHint="Drag to rank what you want to try next."
          />
        </section>
      )}

      {subtab === "gift-list" && (
        <section style={{ marginTop: 8 }}>
          <ListBoard
            userId={userId}
            slug="gift-list"
            title="Gift List"
            emptyHint="Add items you plan to gift to others."
            onResolvedList={setGiftList} // expose list.id to Secret Santa
          />

          {/* Secret Santa (only when we have a concrete list id) */}
          {giftList?.id && (
            <div className="surface" style={{ marginTop: 16, padding: 16, borderRadius: 12 }}>
              <SecretSantaPanel listId={giftList.id} />
            </div>
          )}
        </section>
      )}

      
       {subtab === "favorites" && (
        <section style={{ marginTop: 8 }}>
          <ListBoard
            userId={userId}
            slug="favorites"
            title="Favorites"
            emptyHint="Rank your favorites (drag and drop)."
          />
        </section>
      )} 
    </div>
  );
}
