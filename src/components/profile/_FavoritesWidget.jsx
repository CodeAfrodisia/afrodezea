// src/components/profile/_FavoritesWidget.jsx
import React from "react";
import PublicFavorites from "@components/account/PublicFavorites.jsx";
export default function _FavoritesWidget({ userId, payload }) {
  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Favorites</div>
      <PublicFavorites userId={userId} limit={payload?.limit ?? 6} linkPrefix="/product/" heading="" />
    </div>
  );
}
